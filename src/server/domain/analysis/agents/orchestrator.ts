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
import { runAnalyzer } from './analyzer'
import { runDecider } from './decider'
import { runFormatter } from './formatter'
import { evaluateAnalyzer, evaluateDecider, type EvalResult } from './evaluator'
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
  try {
    const current = await loadSession(sessionId)
    if (!current || !current.disambiguator) {
      throw new Error('Sessione non trovata o priva di disambiguator output')
    }
    const disambiguator = current.disambiguator

    await saveSession({ ...current, status: 'analyzing' })
    const analyzer = await runWithEval(
      'analyzer',
      () => runAnalyzer(disambiguator, collector),
      (out) => evaluateAnalyzer(out, disambiguator)
    )
    console.log(`[ORCH] analyzer done (${Date.now() - start}ms)`)

    let withAnalyzer = await loadSession(sessionId)
    if (!withAnalyzer) throw new Error('Sessione persa durante analyze')
    await saveSession({ ...withAnalyzer, status: 'deciding', analyzer })
    const decider = await runWithEval(
      'decider',
      () => runDecider(disambiguator, analyzer, collector),
      (out) => evaluateDecider(out)
    )
    console.log(`[ORCH] decider done (${Date.now() - start}ms)`)

    let withDecider = await loadSession(sessionId)
    if (!withDecider) throw new Error('Sessione persa durante decide')
    await saveSession({ ...withDecider, status: 'formatting', analyzer, decider })
    const report = await runFormatter(
      { disambiguator, analyzer, decider },
      collector
    )
    console.log(`[ORCH] formatter done (${Date.now() - start}ms)`)

    let withReport = await loadSession(sessionId)
    if (!withReport) throw new Error('Sessione persa durante format')
    await saveSession({
      ...withReport,
      status: 'done',
      analyzer,
      decider,
      report,
      pipelineUsage: collector.summary(),
    })
    console.log(
      `[ORCH] pipeline COMPLETE session=${sessionId} totale=${Date.now() - start}ms · ${
        collector.summary().totals.total
      } tokens`
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[ORCH] pipeline ERROR session=${sessionId}: ${msg}`)
    const current = await loadSession(sessionId)
    if (current) {
      await saveSession({ ...current, status: 'error', error: msg })
    }
  }
}
