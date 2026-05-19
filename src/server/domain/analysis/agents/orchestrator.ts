import {
  deindexSession,
  getRedis,
  indexSession,
  sessionKey,
  SESSION_TTL_SECONDS,
  SESSION_TTL_DONE_SECONDS,
} from '@/server/infrastructure/redis/client'
import { indexSessionForUser } from '@/server/domain/identity/users'
import {
  type DisambiguatorOutput,
  type SessionRecord,
  SessionRecordSchema,
} from '@/shared/types'
import type { SupervisorCheck } from './supervisor'
import { runAnalyzer } from './analyzer'
import { runDecider } from './decider'
import { runFormatter } from './formatter'
import { evaluateAnalyzer, evaluateDecider, type EvalResult } from './evaluator'
import {
  checkDisambiguator,
  checkAnalyzer,
  checkDecider,
  checkReport,
  checkPipelineConsistency,
  buildSupervisorReport,
} from './supervisor'
import { createUsageCollector } from '@/server/infrastructure/gemini/usage'

/**
 * Runs an agent, sanity-checks its output, and retries ONCE if the check
 * fails. After a failed retry it proceeds anyway — a slightly imperfect
 * report beats a hard crash. The check is deterministic (no extra LLM call).
 */
async function runWithEval<T>(
  label: string,
  run: () => Promise<T>,
  evaluate: (out: T) => EvalResult
): Promise<T> {
  let out = await run()
  let result = evaluate(out)
  if (result.ok) return out

  console.warn(
    `[ORCH] ${label} validation failed: ${result.issues.join(' · ')} — retrying once`
  )
  out = await run()
  result = evaluate(out)
  if (!result.ok) {
    console.warn(
      `[ORCH] ${label} still imperfect after retry: ${result.issues.join(' · ')} — proceeding`
    )
  }
  return out
}

export async function loadSession(
  sessionId: string
): Promise<SessionRecord | null> {
  const raw = await getRedis().get(sessionKey(sessionId))
  if (!raw) return null
  try {
    return SessionRecordSchema.parse(JSON.parse(raw))
  } catch (e) {
    console.error('[ORCH] failed to parse session', sessionId, e)
    return null
  }
}

export async function saveSession(record: SessionRecord): Promise<void> {
  const next: SessionRecord = {
    ...record,
    updatedAt: new Date().toISOString(),
  }
  // Completed/error sessions keep the full report for 7 days; active pipelines use 4h.
  const ttl = record.status === 'done' || record.status === 'error'
    ? SESSION_TTL_DONE_SECONDS
    : SESSION_TTL_SECONDS
  await getRedis().set(
    sessionKey(record.sessionId),
    JSON.stringify(next),
    'EX',
    ttl
  )
}

export async function createSession(
  sessionId: string,
  disambiguator: DisambiguatorOutput,
  reportName?: string,
  userId?: string
): Promise<SessionRecord> {
  const now = new Date().toISOString()
  const record: SessionRecord = {
    sessionId,
    userId,
    status: 'analyzing',
    reportName,
    createdAt: now,
    updatedAt: now,
    disambiguator,
  }
  await saveSession(record)
  const createdAtMs = Date.parse(now)
  await indexSession(sessionId, createdAtMs)
  if (userId) {
    await indexSessionForUser(userId, sessionId, createdAtMs)
  }
  return record
}

export { deindexSession }

export async function runPipeline(sessionId: string): Promise<void> {
  console.log(`[ORCH] start pipeline session=${sessionId}`)
  const start = Date.now()
  const collector = createUsageCollector()
  const allChecks: SupervisorCheck[] = []

  try {
    const current = await loadSession(sessionId)
    if (!current || !current.disambiguator) {
      throw new Error('Session not found or missing disambiguator output')
    }
    const disambiguator = current.disambiguator

    // Supervisor: validate disambiguator input before pipeline starts
    const disambChecks = checkDisambiguator(disambiguator)
    allChecks.push(...disambChecks)
    console.log(`[SUPERVISOR] disambiguator: ${disambChecks.filter(c => c.passed).length}/${disambChecks.length} passed`)

    // AGENT 2: Analyzer — supervisor checks run in parallel with next agent
    await saveSession({ ...current, status: 'analyzing' })
    const analyzer = await runWithEval(
      'analyzer',
      () => runAnalyzer(disambiguator, collector),
      (out) => evaluateAnalyzer(out, disambiguator)
    )
    console.log(`[ORCH] analyzer done (${Date.now() - start}ms)`)

    // Supervisor + Decider run in parallel
    let withAnalyzer = await loadSession(sessionId)
    if (!withAnalyzer) throw new Error('Session lost during analyze phase')
    await saveSession({ ...withAnalyzer, status: 'deciding', analyzer })

    const [decider, analyzerChecks] = await Promise.all([
      runWithEval(
        'decider',
        () => runDecider(disambiguator, analyzer, collector),
        (out) => evaluateDecider(out)
      ),
      Promise.resolve(checkAnalyzer(analyzer, disambiguator)),
    ])
    allChecks.push(...analyzerChecks)
    console.log(`[SUPERVISOR] analyzer: ${analyzerChecks.filter(c => c.passed).length}/${analyzerChecks.length} passed`)
    console.log(`[ORCH] decider done (${Date.now() - start}ms)`)

    // Supervisor + Formatter run in parallel
    let withDecider = await loadSession(sessionId)
    if (!withDecider) throw new Error('Session lost during decide phase')
    await saveSession({ ...withDecider, status: 'formatting', analyzer, decider })

    const [report, deciderChecks] = await Promise.all([
      runFormatter({ disambiguator, analyzer, decider }, collector),
      Promise.resolve(checkDecider(decider, analyzer, disambiguator)),
    ])
    allChecks.push(...deciderChecks)
    console.log(`[SUPERVISOR] decider: ${deciderChecks.filter(c => c.passed).length}/${deciderChecks.length} passed`)
    console.log(`[ORCH] formatter done (${Date.now() - start}ms)`)

    // Final supervisor checks: report quality + pipeline consistency
    const usage = collector.summary()
    const reportChecks = checkReport(report, decider, analyzer)
    const pipelineChecks = checkPipelineConsistency(usage, analyzer)
    allChecks.push(...reportChecks, ...pipelineChecks)
    console.log(`[SUPERVISOR] report: ${reportChecks.filter(c => c.passed).length}/${reportChecks.length} passed`)
    console.log(`[SUPERVISOR] pipeline consistency: ${pipelineChecks.filter(c => c.passed).length}/${pipelineChecks.length} passed`)

    const supervisorReport = buildSupervisorReport(allChecks)

    let withReport = await loadSession(sessionId)
    if (!withReport) throw new Error('Session lost during format phase')
    await saveSession({
      ...withReport,
      status: 'done',
      analyzer,
      decider,
      report,
      pipelineUsage: usage,
      supervisor: supervisorReport,
    })
    console.log(
      `[ORCH] pipeline COMPLETE session=${sessionId} total=${Date.now() - start}ms · ${
        usage.totals.total
      } tokens · supervisor ${supervisorReport.score}%`
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[ORCH] pipeline ERROR session=${sessionId}: ${msg}`)
    const current = await loadSession(sessionId)
    if (current) {
      const supervisorReport = allChecks.length > 0
        ? buildSupervisorReport(allChecks)
        : undefined
      await saveSession({ ...current, status: 'error', error: msg, supervisor: supervisorReport })
    }
  }
}
