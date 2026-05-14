import { describe, it, expect } from 'vitest'
import type { UserRole } from '@/lib/types/user'

// Replicated from report route — pure logic, no I/O
function canViewSession(role: UserRole, userId: string, sessionUserId: string | undefined): boolean {
  if (role === 'admin') return true
  return userId === sessionUserId
}

// Replicated strip logic (simplified)
function stripCosts(record: Record<string, unknown>): Record<string, unknown> {
  const stripped = { ...record }
  stripped.pipelineUsage = undefined

  if (stripped.analyzer && typeof stripped.analyzer === 'object') {
    const analyzer = stripped.analyzer as Record<string, unknown>
    stripped.analyzer = {
      ...analyzer,
      useCases: (analyzer.useCases as Array<Record<string, unknown>>)?.map(uc => ({
        ...uc,
        monthlyCostEur: undefined,
        annualCostEur: undefined,
        monthlyTokens: undefined,
      })),
      totals: analyzer.totals
        ? { ...(analyzer.totals as object), monthlyCostEur: undefined, annualCostEur: undefined, monthlyTokens: undefined }
        : undefined,
    }
  }

  return stripped
}

describe('Session access control', () => {
  it('admin can access any session', () => {
    expect(canViewSession('admin', 'admin-id', 'user-a')).toBe(true)
    expect(canViewSession('admin', 'admin-id', undefined)).toBe(true)
  })

  it('normal user can access their own session', () => {
    expect(canViewSession('normal', 'user-a', 'user-a')).toBe(true)
  })

  it('normal user blocked from other sessions', () => {
    expect(canViewSession('normal', 'user-a', 'user-b')).toBe(false)
  })

  it('guest can access their own session', () => {
    expect(canViewSession('guest', 'guest-uuid', 'guest-uuid')).toBe(true)
  })

  it('guest blocked from sessions with no userId', () => {
    expect(canViewSession('guest', 'guest-uuid', undefined)).toBe(false)
  })
})

describe('Cost stripping for non-admin', () => {
  const sampleRecord = {
    sessionId: 'abc',
    userId: 'user-1',
    status: 'done',
    pipelineUsage: { entries: [], totals: { input: 100, output: 200, total: 300 } },
    analyzer: {
      useCases: [
        { id: 'uc1', name: 'Test', monthlyCostEur: 50, annualCostEur: 600, monthlyTokens: 100000 },
      ],
      totals: { monthlyCostEur: 50, annualCostEur: 600, monthlyTokens: 100000, overallCarbonRating: 'B' },
    },
  }

  it('strips pipelineUsage', () => {
    const stripped = stripCosts(sampleRecord)
    expect(stripped.pipelineUsage).toBeUndefined()
  })

  it('strips monthlyCostEur from use cases', () => {
    const stripped = stripCosts(sampleRecord) as typeof sampleRecord
    const uc = (stripped.analyzer as typeof sampleRecord.analyzer).useCases[0]
    expect(uc.monthlyCostEur).toBeUndefined()
    expect(uc.annualCostEur).toBeUndefined()
  })

  it('strips totals costs', () => {
    const stripped = stripCosts(sampleRecord) as typeof sampleRecord
    const totals = (stripped.analyzer as typeof sampleRecord.analyzer).totals
    expect(totals.monthlyCostEur).toBeUndefined()
    expect(totals.annualCostEur).toBeUndefined()
  })

  it('preserves non-cost fields', () => {
    const stripped = stripCosts(sampleRecord) as typeof sampleRecord
    expect(stripped.sessionId).toBe('abc')
    expect(stripped.status).toBe('done')
    expect(stripped.userId).toBe('user-1')
    const totals = (stripped.analyzer as typeof sampleRecord.analyzer).totals
    expect(totals.overallCarbonRating).toBe('B')
  })
})
