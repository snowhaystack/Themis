import { NextRequest, NextResponse } from 'next/server'
import { loadSession } from '@/lib/agents/orchestrator'
import {
  deindexSession,
  listSessionIds,
} from '@/lib/redis/client'
import { listSessionIdsForUser } from '@/lib/redis/users'
import { resolveUserFromRequest, GUEST_COOKIE, GUEST_COOKIE_MAX_AGE } from '@/lib/auth/session'
import type { SessionStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface SessionSummary {
  sessionId: string
  status: SessionStatus
  createdAt: string
  updatedAt: string
  sector: string | null
  employeeCount: number | null
  size: string | null
  useCasesCount: number | null
  reportName: string | null
  title: string
}

function titleFor(sector: string | null, size: string | null): string {
  const niceSector = sector
    ? sector.charAt(0).toUpperCase() + sector.slice(1).replace(/_/g, ' ')
    : 'Sessione'
  const niceSize = size ? size.replace(/_/g, ' ') : ''
  return niceSize ? `${niceSector} · ${niceSize}` : niceSector
}

export async function GET(req: NextRequest) {
  try {
    const { user, newGuestId } = await resolveUserFromRequest(req)

    const url = new URL(req.url)
    const limitParam = Number(url.searchParams.get('limit') ?? '30')
    const limit = Number.isFinite(limitParam)
      ? Math.min(100, Math.max(1, Math.floor(limitParam)))
      : 30

    // Admin sees all sessions; others see only their own
    const ids =
      user.role === 'admin'
        ? await listSessionIds(limit)
        : await listSessionIdsForUser(user.id, limit)

    const results: SessionSummary[] = []

    for (const id of ids) {
      const rec = await loadSession(id)
      if (!rec) {
        await deindexSession(id).catch(() => {})
        continue
      }
      const company = rec.disambiguator?.company
      results.push({
        sessionId: rec.sessionId,
        status: rec.status,
        createdAt: rec.createdAt,
        updatedAt: rec.updatedAt,
        sector: company?.sector ?? null,
        employeeCount: company?.employeeCount ?? null,
        size: company?.size ?? null,
        useCasesCount: rec.disambiguator?.useCases?.length ?? null,
        reportName: rec.reportName ?? null,
        title:
          rec.reportName ??
          titleFor(company?.sector ?? null, company?.size ?? null),
      })
    }

    const res = NextResponse.json({ sessions: results })
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
    console.error('[API /sessions] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
