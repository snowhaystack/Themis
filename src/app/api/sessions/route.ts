import { NextResponse } from 'next/server'
import { loadSession } from '@/lib/agents/orchestrator'
import {
  deindexSession,
  listSessionIds,
} from '@/lib/redis/client'
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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const limitParam = Number(url.searchParams.get('limit') ?? '30')
    const limit = Number.isFinite(limitParam)
      ? Math.min(100, Math.max(1, Math.floor(limitParam)))
      : 30

    const ids = await listSessionIds(limit)
    const results: SessionSummary[] = []

    for (const id of ids) {
      const rec = await loadSession(id)
      if (!rec) {
        // session expired but still in index — clean it up
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

    return NextResponse.json({ sessions: results })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[API /sessions] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
