import { getRedis } from './client'

/**
 * Sliding-window rate limiter backed by Redis INCR + EXPIRE.
 * Returns allowed=false and a Retry-After header value when the limit is exceeded.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; retryAfterSeconds?: number }> {
  const redis = getRedis()
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, windowSeconds)
  const remaining = Math.max(0, limit - count)
  if (count > limit) {
    const ttl = await redis.ttl(key)
    return { allowed: false, remaining: 0, retryAfterSeconds: ttl > 0 ? ttl : windowSeconds }
  }
  return { allowed: true, remaining }
}
