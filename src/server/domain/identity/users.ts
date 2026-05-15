import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'
import { getRedis, GUEST_USER_TTL_SECONDS } from '@/server/infrastructure/redis/client'
import {
  User,
  UserSchema,
  CreateUserInput,
  UserRole,
  AuthProvider,
} from '@/shared/types/user'

const USERS_INDEX_KEY = 'themis:users:index'

export function userKey(userId: string): string {
  return `themis:user:${userId}`
}

export function userEmailKey(email: string): string {
  return `themis:users:email:${email.toLowerCase()}`
}

export function userSessionsKey(userId: string): string {
  return `themis:user:${userId}:sessions`
}

export async function saveUser(user: User): Promise<void> {
  const redis = getRedis()
  const key = userKey(user.id)
  const flat: Record<string, string> = {
    id: user.id,
    email: user.email,
    role: user.role,
    provider: user.provider,
    createdAt: user.createdAt,
    lastActiveAt: user.lastActiveAt,
  }
  if (user.name) flat.name = user.name
  if (user.passwordHash) flat.passwordHash = user.passwordHash

  if (user.provider !== 'guest') {
    // Atomically claim the email slot to prevent concurrent registration TOCTOU.
    // SET NX returns 'OK' on success, null if key already exists.
    const claimed = await redis.set(userEmailKey(user.email), user.id, 'NX')
    if (!claimed) throw new Error('EMAIL_TAKEN')
    await redis
      .multi()
      .hset(key, flat)
      .zadd(USERS_INDEX_KEY, new Date(user.createdAt).getTime(), user.id)
      .exec()
  } else {
    // Guest accounts: use a TTL so they auto-clean from Redis.
    await redis
      .multi()
      .hset(key, flat)
      .set(userEmailKey(user.email), user.id)
      .zadd(USERS_INDEX_KEY, new Date(user.createdAt).getTime(), user.id)
      .exec()
    // Set TTL outside the transaction (not atomic but acceptable for cleanup purposes).
    await redis.expire(key, GUEST_USER_TTL_SECONDS)
    await redis.expire(userEmailKey(user.email), GUEST_USER_TTL_SECONDS)
  }
}

export async function getUserById(id: string): Promise<User | null> {
  const raw = await getRedis().hgetall(userKey(id))
  if (!raw || !raw.id) return null
  const parsed = UserSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const id = await getRedis().get(userEmailKey(email))
  if (!id) return null
  return getUserById(id)
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const provider: AuthProvider = input.provider ?? 'credentials'

  if (provider !== 'guest') {
    const existing = await getUserByEmail(input.email)
    if (existing) throw new Error('EMAIL_TAKEN')
  }

  const now = new Date().toISOString()
  const user: User = {
    id: uuidv4(),
    email: input.email,
    name: input.name,
    role: input.role ?? 'normal',
    provider,
    createdAt: now,
    lastActiveAt: now,
  }

  if (input.password) {
    user.passwordHash = await bcrypt.hash(input.password, 10)
  }

  await saveUser(user)
  return user
}

export async function verifyPassword(
  user: User,
  plainPassword: string
): Promise<boolean> {
  if (!user.passwordHash) return false
  return bcrypt.compare(plainPassword, user.passwordHash)
}

export async function touchUser(userId: string): Promise<void> {
  await getRedis().hset(userKey(userId), 'lastActiveAt', new Date().toISOString())
}

export async function setUserRole(userId: string, role: UserRole): Promise<void> {
  await getRedis().hset(userKey(userId), 'role', role)
}

export async function listUserIds(limit = 200): Promise<string[]> {
  return getRedis().zrevrange(USERS_INDEX_KEY, 0, Math.max(0, limit - 1))
}

export async function countUsers(): Promise<number> {
  return getRedis().zcard(USERS_INDEX_KEY)
}

export async function countActiveUsers(windowMs = 7 * 24 * 60 * 60 * 1000): Promise<number> {
  const ids = await listUserIds(500)
  if (ids.length === 0) return 0
  const cutoff = new Date(Date.now() - windowMs).toISOString()
  const pipeline = getRedis().pipeline()
  for (const id of ids) pipeline.hget(userKey(id), 'lastActiveAt')
  const results = await pipeline.exec()
  if (!results) return 0
  return results.filter(([, val]) => typeof val === 'string' && val > cutoff).length
}

export async function indexSessionForUser(
  userId: string,
  sessionId: string,
  createdAtMs: number
): Promise<void> {
  await getRedis().zadd(userSessionsKey(userId), createdAtMs, sessionId)
}

export async function deindexSessionForUser(
  userId: string,
  sessionId: string
): Promise<void> {
  await getRedis().zrem(userSessionsKey(userId), sessionId)
}

export async function listSessionIdsForUser(
  userId: string,
  limit = 50
): Promise<string[]> {
  return getRedis().zrevrange(
    userSessionsKey(userId),
    0,
    Math.max(0, limit - 1)
  )
}

export async function getOrCreateGuestUser(guestId: string): Promise<User> {
  const existing = await getUserById(guestId)
  if (existing) return existing

  const now = new Date().toISOString()
  const user: User = {
    id: guestId,
    email: `guest_${guestId}@themis.local`,
    role: 'guest',
    provider: 'guest',
    createdAt: now,
    lastActiveAt: now,
  }
  await saveUser(user)
  return user
}
