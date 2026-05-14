import {
  deindexSession,
  getRedis,
  indexSession,
  sessionKey,
  SESSION_TTL_SECONDS,
} from '@/lib/redis/client'
import {
  type DisambiguatorOutput,
  type SessionRecord,
  SessionRecordSchema,
} from '@/lib/types'
import { runAnalyzer } from './analyzer'
import { runDecider } from './decider'
import { runFormatter } from './formatter'
import { createUsageCollector } from '@/lib/gemini/usage'

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
  await getRedis().set(
    sessionKey(record.sessionId),
    JSON.stringify(next),
    'EX',
    SESSION_TTL_SECONDS
  )
}

export async function createSession(
  sessionId: string,
  disambiguator: DisambiguatorOutput,
  reportName?: string
): Promise<SessionRecord> {
  const now = new Date().toISOString()
  const record: SessionRecord = {
    sessionId,
    status: 'analyzing',
    reportName,
    createdAt: now,
    updatedAt: now,
    disambiguator,
  }
  await saveSession(record)
  await indexSession(sessionId, Date.parse(now))
  return record
}

export { deindexSession }

/**
 * Pipeline 2→3→4. Aggiorna lo stato in Redis ad ogni passo.
 * Da invocare NON-awaited dall'API route (fire-and-forget).
 */
export async function runPipeline(sessionId: string): Promise<void> {
  console.log(`[ORCH] start pipeline session=${sessionId}`)
  const start = Date.now()
  const collector = createUsageCollector()
  try {
    const current = await loadSession(sessionId)
    if (!current || !current.disambiguator) {
      throw new Error('Sessione non trovata o priva di disambiguator output')
    }

    // === FASE A: Analyzer ===
    await saveSession({ ...current, status: 'analyzing' })
    const analyzer = await runAnalyzer(current.disambiguator, collector)
    console.log(`[ORCH] analyzer done (${Date.now() - start}ms)`)

    // === FASE B: Decider ===
    let withAnalyzer = await loadSession(sessionId)
    if (!withAnalyzer) throw new Error('Sessione persa durante analyze')
    await saveSession({ ...withAnalyzer, status: 'deciding', analyzer })
    const decider = await runDecider(
      current.disambiguator,
      analyzer,
      collector
    )
    console.log(`[ORCH] decider done (${Date.now() - start}ms)`)

    // === FASE C: Formatter ===
    let withDecider = await loadSession(sessionId)
    if (!withDecider) throw new Error('Sessione persa durante decide')
    await saveSession({
      ...withDecider,
      status: 'formatting',
      analyzer,
      decider,
    })
    const report = await runFormatter(
      {
        disambiguator: current.disambiguator,
        analyzer,
        decider,
      },
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
