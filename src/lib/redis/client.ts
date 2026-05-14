import Redis from 'ioredis'

let _redis: Redis | null = null

export function getRedis(): Redis {
  if (_redis) return _redis
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379'
  _redis = new Redis(url, {
    maxRetriesPerRequest: 3,
    lazyConnect: false,
    enableReadyCheck: true,
  })
  _redis.on('error', (err) => {
    console.error('[REDIS] error:', err.message)
  })
  return _redis
}

export const SESSION_TTL_SECONDS = 60 * 60 // 1h
export const SESSIONS_INDEX_KEY = 'themis:sessions'

export function sessionKey(sessionId: string): string {
  return `themis:session:${sessionId}`
}

/** Add a session to the sorted-set index, scored by createdAt. */
export async function indexSession(
  sessionId: string,
  createdAtMs: number
): Promise<void> {
  await getRedis().zadd(SESSIONS_INDEX_KEY, createdAtMs, sessionId)
}

/** Remove a session from the index (e.g. on cleanup). */
export async function deindexSession(sessionId: string): Promise<void> {
  await getRedis().zrem(SESSIONS_INDEX_KEY, sessionId)
}

/** Most recent session IDs, newest first. */
export async function listSessionIds(limit = 50): Promise<string[]> {
  return getRedis().zrevrange(SESSIONS_INDEX_KEY, 0, Math.max(0, limit - 1))
}
