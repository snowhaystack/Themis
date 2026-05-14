import { NextRequest, NextResponse } from 'next/server'
import { resolveUserFromRequest, apiError } from '@/server/domain/identity/session-resolver'
import { listSessionIds } from '@/server/infrastructure/redis/client'
import { loadSession } from '@/server/domain/analysis/agents/orchestrator'
import {
  countUsers,
  countActiveUsers,
  listUserIds,
  userKey,
} from '@/server/domain/identity/users'
import { getRedis } from '@/server/infrastructure/redis/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { user } = await resolveUserFromRequest(req)

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const sessionIds = await listSessionIds(500)
    let totalRequests = 0
    let completedRequests = 0
    // Actual tokens consumed by our Gemini pipeline
    let totalPipelineTokens = 0
    // Client-projected annual AI spend (what the analyzer estimates for the client)
    let totalProjectedClientSpendEur = 0

    for (const id of sessionIds) {
      const session = await loadSession(id)
      if (!session) continue
      totalRequests++
      if (session.status === 'done') {
        completedRequests++
        totalPipelineTokens += session.pipelineUsage?.totals?.total ?? 0
        totalProjectedClientSpendEur += session.analyzer?.totals?.annualCostEur ?? 0
      }
    }

    const tokensPerRequest = completedRequests > 0
      ? Math.round(totalPipelineTokens / completedRequests)
      : 0

    const totalUsers = await countUsers()
    const activeUsersLast7d = await countActiveUsers(7 * 24 * 60 * 60 * 1000)
    const activeUsersLast30d = await countActiveUsers(30 * 24 * 60 * 60 * 1000)

    // Role distribution — use pipeline to batch Redis reads
    const userIds = await listUserIds(500)
    const roleCounts: Record<string, number> = { admin: 0, normal: 0, guest: 0 }
    if (userIds.length > 0) {
      const pipeline = getRedis().pipeline()
      for (const uid of userIds) pipeline.hget(userKey(uid), 'role')
      const results = await pipeline.exec()
      if (results) {
        for (const [, role] of results) {
          if (typeof role === 'string' && role in roleCounts) {
            roleCounts[role]++
          }
        }
      }
    }

    return NextResponse.json({
      totalRequests,
      completedRequests,
      // Actual platform usage: tokens consumed by our Gemini pipeline
      totalPipelineTokens,
      tokensPerRequest,
      // Client-facing projection: estimated annual AI spend across all analysed companies
      totalProjectedClientSpendEur: Math.round(totalProjectedClientSpendEur * 100) / 100,
      totalUsers,
      activeUsersLast7d,
      activeUsersLast30d,
      roleCounts,
    })
  } catch (err) {
    return apiError(err, 'API /admin/stats')
  }
}
