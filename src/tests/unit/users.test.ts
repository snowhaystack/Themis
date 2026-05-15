import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'

// ── Redis mock ────────────────────────────────────────────────────────────────
const store: Record<string, Record<string, string> | string> = {}
const sortedSets: Record<string, Array<{ score: number; value: string }>> = {}

const redisMock = {
  hset: vi.fn(async (key: string, fields: Record<string, string>) => {
    store[key] = { ...(store[key] as Record<string, string> ?? {}), ...fields }
    return Object.keys(fields).length
  }),
  hget: vi.fn(async (key: string, field: string) => {
    const obj = store[key] as Record<string, string>
    return obj?.[field] ?? null
  }),
  hgetall: vi.fn(async (key: string) => {
    return (store[key] as Record<string, string>) ?? null
  }),
  set: vi.fn(async (key: string, value: string) => {
    store[key] = value
    return 'OK'
  }),
  get: vi.fn(async (key: string) => {
    return (store[key] as string) ?? null
  }),
  zadd: vi.fn(async (key: string, score: number, member: string) => {
    if (!sortedSets[key]) sortedSets[key] = []
    sortedSets[key] = sortedSets[key].filter(e => e.value !== member)
    sortedSets[key].push({ score, value: member })
    return 1
  }),
  zrevrange: vi.fn(async (key: string, start: number, stop: number) => {
    const set = sortedSets[key] ?? []
    const sorted = [...set].sort((a, b) => b.score - a.score)
    const end = stop === -1 ? sorted.length : stop + 1
    return sorted.slice(start, end).map(e => e.value)
  }),
  zcard: vi.fn(async (key: string) => (sortedSets[key]?.length ?? 0)),
  expire: vi.fn(async () => 1),
  pipeline: vi.fn(() => {
    const ops: Array<() => Promise<unknown>> = []
    const pipe = {
      hget: vi.fn((key: string, field: string) => {
        ops.push(() => redisMock.hget(key, field))
        return pipe
      }),
      exec: vi.fn(async () => ops.map(async (op) => [null, await op()])),
    }
    return pipe
  }),
  multi: vi.fn(() => {
    let chain = redisMock as typeof redisMock & { exec: () => Promise<unknown> }
    const queued: Array<() => Promise<unknown>> = []
    const multiChain = {
      hset: vi.fn((key: string, fields: Record<string, string>) => {
        queued.push(() => redisMock.hset(key, fields))
        return multiChain
      }),
      set: vi.fn((key: string, val: string) => {
        queued.push(() => redisMock.set(key, val))
        return multiChain
      }),
      zadd: vi.fn((key: string, score: number, member: string) => {
        queued.push(() => redisMock.zadd(key, score, member))
        return multiChain
      }),
      exec: vi.fn(async () => {
        const results = await Promise.all(queued.map(fn => fn()))
        return results.map(r => [null, r])
      }),
    }
    chain = multiChain as unknown as typeof chain
    return chain
  }),
}

vi.mock('@/server/infrastructure/redis/client', () => ({
  getRedis: () => redisMock,
  GUEST_USER_TTL_SECONDS: 30 * 24 * 60 * 60,
}))

// ── Import after mock ─────────────────────────────────────────────────────────
import {
  createUser,
  getUserByEmail,
  getUserById,
  verifyPassword,
  setUserRole,
  countUsers,
  getOrCreateGuestUser,
} from '@/server/domain/identity/users'

// ── Helpers ───────────────────────────────────────────────────────────────────
function clearStore() {
  for (const k of Object.keys(store)) delete store[k]
  for (const k of Object.keys(sortedSets)) delete sortedSets[k]
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('User CRUD', () => {
  beforeEach(() => {
    clearStore()
    vi.clearAllMocks()
    // Re-attach mock after clear
    redisMock.hset.mockImplementation(async (key: string, fields: Record<string, string>) => {
      store[key] = { ...(store[key] as Record<string, string> ?? {}), ...fields }
      return Object.keys(fields).length
    })
    redisMock.hgetall.mockImplementation(async (key: string) => (store[key] as Record<string, string>) ?? null)
    redisMock.set.mockImplementation(async (key: string, value: string) => { store[key] = value; return 'OK' })
    redisMock.get.mockImplementation(async (key: string) => (store[key] as string) ?? null)
    redisMock.zadd.mockImplementation(async (key: string, score: number, member: string) => {
      if (!sortedSets[key]) sortedSets[key] = []
      sortedSets[key] = sortedSets[key].filter(e => e.value !== member)
      sortedSets[key].push({ score, value: member })
      return 1
    })
    redisMock.zcard.mockImplementation(async (key: string) => sortedSets[key]?.length ?? 0)
  })

  it('creates a user with hashed password', async () => {
    const user = await createUser({
      email: 'test@example.com',
      password: 'password123',
      role: 'normal',
      provider: 'credentials',
    })

    expect(user.email).toBe('test@example.com')
    expect(user.role).toBe('normal')
    expect(user.provider).toBe('credentials')
    expect(user.passwordHash).toBeDefined()
    expect(user.passwordHash).not.toBe('password123')
  })

  it('stores the user so it can be retrieved by email', async () => {
    await createUser({ email: 'lookup@test.com', password: 'secure123', role: 'normal', provider: 'credentials' })
    const found = await getUserByEmail('lookup@test.com')
    expect(found).not.toBeNull()
    expect(found!.email).toBe('lookup@test.com')
  })

  it('retrieves user by id', async () => {
    const created = await createUser({ email: 'byid@test.com', password: 'abc12345', role: 'normal', provider: 'credentials' })
    const found = await getUserById(created.id)
    expect(found).not.toBeNull()
    expect(found!.id).toBe(created.id)
  })

  it('throws EMAIL_TAKEN when registering duplicate email', async () => {
    await createUser({ email: 'dup@test.com', password: 'pass1234', role: 'normal', provider: 'credentials' })
    await expect(
      createUser({ email: 'dup@test.com', password: 'other5678', role: 'normal', provider: 'credentials' })
    ).rejects.toThrow('EMAIL_TAKEN')
  })

  it('returns null for non-existent email', async () => {
    const found = await getUserByEmail('nobody@test.com')
    expect(found).toBeNull()
  })

  it('verifies correct password', async () => {
    const user = await createUser({ email: 'verify@test.com', password: 'mypassword', role: 'normal', provider: 'credentials' })
    const ok = await verifyPassword(user, 'mypassword')
    expect(ok).toBe(true)
  })

  it('rejects wrong password', async () => {
    const user = await createUser({ email: 'wrong@test.com', password: 'correct1', role: 'normal', provider: 'credentials' })
    const ok = await verifyPassword(user, 'wrongpass')
    expect(ok).toBe(false)
  })

  it('rejects password check for OAuth user (no hash)', async () => {
    const user = await createUser({ email: 'oauth@test.com', role: 'normal', provider: 'google' })
    const ok = await verifyPassword(user, 'anything')
    expect(ok).toBe(false)
  })
})

describe('Guest user', () => {
  beforeEach(() => {
    clearStore()
    vi.clearAllMocks()
    redisMock.hset.mockImplementation(async (key: string, fields: Record<string, string>) => {
      store[key] = { ...(store[key] as Record<string, string> ?? {}), ...fields }
      return Object.keys(fields).length
    })
    redisMock.hgetall.mockImplementation(async (key: string) => (store[key] as Record<string, string>) ?? null)
    redisMock.set.mockImplementation(async (key: string, value: string) => { store[key] = value; return 'OK' })
    redisMock.get.mockImplementation(async (key: string) => (store[key] as string) ?? null)
    redisMock.zadd.mockImplementation(async (key: string, score: number, member: string) => {
      if (!sortedSets[key]) sortedSets[key] = []
      sortedSets[key].push({ score, value: member })
      return 1
    })
  })

  it('creates a guest user on first call', async () => {
    const guestId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    const guest = await getOrCreateGuestUser(guestId)
    expect(guest.id).toBe(guestId)
    expect(guest.role).toBe('guest')
    expect(guest.provider).toBe('guest')
  })

  it('returns the same guest on subsequent calls', async () => {
    const guestId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    const first = await getOrCreateGuestUser(guestId)
    const second = await getOrCreateGuestUser(guestId)
    expect(first.id).toBe(second.id)
    expect(first.createdAt).toBe(second.createdAt)
  })
})

describe('User roles', () => {
  beforeEach(() => {
    clearStore()
    vi.clearAllMocks()
    redisMock.hset.mockImplementation(async (key: string, fields: Record<string, string>) => {
      store[key] = { ...(store[key] as Record<string, string> ?? {}), ...fields }
      return Object.keys(fields).length
    })
    redisMock.hgetall.mockImplementation(async (key: string) => (store[key] as Record<string, string>) ?? null)
    redisMock.set.mockImplementation(async (key: string, value: string) => { store[key] = value; return 'OK' })
    redisMock.get.mockImplementation(async (key: string) => (store[key] as string) ?? null)
    redisMock.zadd.mockImplementation(async (key: string, score: number, member: string) => {
      if (!sortedSets[key]) sortedSets[key] = []
      sortedSets[key].push({ score, value: member })
      return 1
    })
    redisMock.zcard.mockImplementation(async (key: string) => sortedSets[key]?.length ?? 0)
  })

  it('creates admin user with admin role', async () => {
    const admin = await createUser({ email: 'admin@themis.it', password: 'adminpass', role: 'admin', provider: 'credentials' })
    expect(admin.role).toBe('admin')
  })

  it('setUserRole updates the role in Redis', async () => {
    const user = await createUser({ email: 'promote@test.com', password: 'pass1234', role: 'normal', provider: 'credentials' })
    await setUserRole(user.id, 'admin')
    // hset should have been called with the new role
    expect(redisMock.hset).toHaveBeenCalledWith(
      `themis:user:${user.id}`,
      'role',
      'admin'
    )
  })

  it('countUsers returns correct count', async () => {
    await createUser({ email: 'u1@test.com', password: 'pass1234', role: 'normal', provider: 'credentials' })
    await createUser({ email: 'u2@test.com', password: 'pass1234', role: 'normal', provider: 'credentials' })
    const count = await countUsers()
    expect(count).toBe(2)
  })
})

describe('Password hashing', () => {
  it('bcrypt hash is not reversible', async () => {
    const hash = await bcrypt.hash('mypassword', 10)
    expect(hash).not.toBe('mypassword')
    expect(hash.length).toBeGreaterThan(20)
  })

  it('bcrypt compare works correctly', async () => {
    const hash = await bcrypt.hash('correct', 10)
    expect(await bcrypt.compare('correct', hash)).toBe(true)
    expect(await bcrypt.compare('wrong', hash)).toBe(false)
  })
})
