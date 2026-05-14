import { NextRequest, NextResponse } from 'next/server'
import { resolveUserFromRequest } from '@/lib/auth/session'
import { listSessionIds } from '@/lib/redis/client'
import { loadSession } from '@/lib/agents/orchestrator'
import {
  countUsers,
  countActiveUsers,
  listUserIds,
  getUserById,
} from '@/lib/redis/users'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { user } = await resolveUserFromRequest(req)

  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Load all sessions (up to 500 for stats)
    const sessionIds = await listSessionIds(500)
    let totalRequests = 0
    let totalCostEur = 0
    let completedRequests = 0

    for (const id of sessionIds) {
      const session = await loadSession(id)
      if (!session) continue
      totalRequests++
      if (session.status === 'done' && session.analyzer?.totals) {
        totalCostEur += session.analyzer.totals.annualCostEur ?? 0
        completedRequests++
      }
    }

    const costPerRequest = completedRequests > 0 ? totalCostEur / completedRequests : 0

    // User stats
    const totalUsers = await countUsers()
    const activeUsersLast7d = await countActiveUsers(7 * 24 * 60 * 60 * 1000)
    const activeUsersLast30d = await countActiveUsers(30 * 24 * 60 * 60 * 1000)

    // Average cost per active user
    const avgCostPerActiveUser =
      activeUsersLast30d > 0 ? totalCostEur / activeUsersLast30d : 0

    // Role distribution
    const userIds = await listUserIds(500)
    const roleCounts: Record<string, number> = { admin: 0, normal: 0, guest: 0 }
    for (const uid of userIds) {
      const u = await getUserById(uid)
      if (u?.role) roleCounts[u.role] = (roleCounts[u.role] ?? 0) + 1
    }

    return NextResponse.json({
      totalRequests,
      completedRequests,
      totalCostEur: Math.round(totalCostEur * 100) / 100,
      costPerRequest: Math.round(costPerRequest * 100) / 100,
      totalUsers,
      activeUsersLast7d,
      activeUsersLast30d,
      avgCostPerActiveUser: Math.round(avgCostPerActiveUser * 100) / 100,
      roleCounts,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[API /admin/stats] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
