import { describe, it, expect } from 'vitest'
import type { UserRole } from '@/lib/types/user'

// ── RBAC helpers (pure functions, no Redis) ───────────────────────────────────
function canViewAllSessions(role: UserRole): boolean {
  return role === 'admin'
}

function canViewCosts(role: UserRole): boolean {
  return role === 'admin'
}

function canAccessAdminDashboard(role: UserRole): boolean {
  return role === 'admin'
}

function canViewSession(
  role: UserRole,
  currentUserId: string,
  sessionUserId: string | undefined
): boolean {
  if (role === 'admin') return true
  return currentUserId === sessionUserId
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('RBAC — session visibility', () => {
  it('admin can view all sessions', () => {
    expect(canViewAllSessions('admin')).toBe(true)
  })

  it('normal cannot view all sessions', () => {
    expect(canViewAllSessions('normal')).toBe(false)
  })

  it('guest cannot view all sessions', () => {
    expect(canViewAllSessions('guest')).toBe(false)
  })

  it('admin can view any specific session', () => {
    expect(canViewSession('admin', 'admin-id', 'other-user-id')).toBe(true)
  })

  it('normal can view their own session', () => {
    expect(canViewSession('normal', 'user-1', 'user-1')).toBe(true)
  })

  it('normal cannot view another user session', () => {
    expect(canViewSession('normal', 'user-1', 'user-2')).toBe(false)
  })

  it('guest can view their own session', () => {
    expect(canViewSession('guest', 'guest-uuid', 'guest-uuid')).toBe(true)
  })

  it('guest cannot view another session', () => {
    expect(canViewSession('guest', 'guest-1', 'guest-2')).toBe(false)
  })

  it('cannot view session with no userId (edge case)', () => {
    expect(canViewSession('normal', 'user-1', undefined)).toBe(false)
  })
})

describe('RBAC — cost visibility', () => {
  it('admin can view costs', () => {
    expect(canViewCosts('admin')).toBe(true)
  })

  it('normal cannot view costs', () => {
    expect(canViewCosts('normal')).toBe(false)
  })

  it('guest cannot view costs', () => {
    expect(canViewCosts('guest')).toBe(false)
  })
})

describe('RBAC — admin dashboard', () => {
  it('admin can access dashboard', () => {
    expect(canAccessAdminDashboard('admin')).toBe(true)
  })

  it('normal cannot access dashboard', () => {
    expect(canAccessAdminDashboard('normal')).toBe(false)
  })

  it('guest cannot access dashboard', () => {
    expect(canAccessAdminDashboard('guest')).toBe(false)
  })
})

describe('Role hierarchy', () => {
  const roles: UserRole[] = ['guest', 'normal', 'admin']

  it('only admin has all privileges', () => {
    const adminPrivileges = [canViewAllSessions, canViewCosts, canAccessAdminDashboard]
    for (const role of roles) {
      const allTrue = adminPrivileges.every(fn => fn(role))
      expect(allTrue).toBe(role === 'admin')
    }
  })

  it('guest and normal have identical cost visibility (both hidden)', () => {
    expect(canViewCosts('guest')).toBe(canViewCosts('normal'))
  })
})
