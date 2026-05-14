import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { loadSession, saveSession } from '@/lib/agents/orchestrator'
import { resolveUserFromRequest, GUEST_COOKIE, GUEST_COOKIE_MAX_AGE } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function canViewSession(
  userRole: string,
  userId: string,
  sessionUserId: string | undefined
): boolean {
  if (userRole === 'admin') return true
  return userId === sessionUserId
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await ctx.params
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    const { user, newGuestId } = await resolveUserFromRequest(req)
    const record = await loadSession(sessionId)

    if (!record) {
      return NextResponse.json(
        { error: 'Session not found or expired' },
        { status: 404 }
      )
    }

    if (!canViewSession(user.role, user.id, record.userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Strip cost data for non-admin users
    const responseRecord = user.role === 'admin' ? record : stripCosts(record)

    const res = NextResponse.json(responseRecord)
    if (newGuestId) {
      res.cookies.set(GUEST_COOKIE, newGuestId, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: GUEST_COOKIE_MAX_AGE,
        path: '/',
      })
    }
    return res
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[API /report] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

const PatchSchema = z.object({
  reportName: z.string().min(1).max(120),
})

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await ctx.params
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    const { user } = await resolveUserFromRequest(req)
    const record = await loadSession(sessionId)

    if (!record) {
      return NextResponse.json(
        { error: 'Session not found or expired' },
        { status: 404 }
      )
    }

    if (!canViewSession(user.role, user.id, record.userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', issues: parsed.error.flatten() },
        { status: 400 }
      )
    }

    await saveSession({ ...record, reportName: parsed.data.reportName })
    return NextResponse.json({ ok: true, reportName: parsed.data.reportName })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[API /report PATCH] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/** Remove cost and token usage data from session record for non-admin users. */
function stripCosts(record: ReturnType<typeof Object.assign>) {
  const stripped = { ...record }

  if (stripped.analyzer) {
    stripped.analyzer = {
      ...stripped.analyzer,
      useCases: stripped.analyzer.useCases?.map((uc: Record<string, unknown>) => ({
        ...uc,
        monthlyCostEur: undefined,
        annualCostEur: undefined,
        monthlyTokens: undefined,
      })),
      byRole: stripped.analyzer.byRole?.map((r: Record<string, unknown>) => ({
        ...r,
        monthlyCostEur: undefined,
        monthlyTokens: undefined,
      })),
      totals: stripped.analyzer.totals
        ? {
            ...stripped.analyzer.totals,
            monthlyCostEur: undefined,
            annualCostEur: undefined,
            monthlyTokens: undefined,
          }
        : undefined,
    }
  }

  stripped.pipelineUsage = undefined

  return stripped
}
