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

export const SESSION_TTL_SECONDS = 4 * 60 * 60       // 4h for active/pending pipelines
export const SESSION_TTL_DONE_SECONDS = 7 * 24 * 60 * 60  // 7 days for completed reports
export const SESSIONS_INDEX_KEY = 'themis:sessions'
export const GUEST_USER_TTL_SECONDS = 30 * 24 * 60 * 60   // 30 days for guest accounts

export function sessionKey(sessionId: string): string {
  return `themis:session:${sessionId}`
}

export async function indexSession(
  sessionId: string,
  createdAtMs: number
): Promise<void> {
  await getRedis().zadd(SESSIONS_INDEX_KEY, createdAtMs, sessionId)
}

export async function deindexSession(sessionId: string): Promise<void> {
  await getRedis().zrem(SESSIONS_INDEX_KEY, sessionId)
}

export async function listSessionIds(limit = 50): Promise<string[]> {
  return getRedis().zrevrange(SESSIONS_INDEX_KEY, 0, Math.max(0, limit - 1))
}
