import { NextResponse } from 'next/server'
import { z } from 'zod'
import { loadSession, saveSession } from '@/lib/agents/orchestrator'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await ctx.params
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }
    const record = await loadSession(sessionId)
    if (!record) {
      return NextResponse.json(
        { error: 'Session not found or expired' },
        { status: 404 }
      )
    }
    return NextResponse.json(record)
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
  req: Request,
  ctx: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await ctx.params
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }
    const body = await req.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', issues: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const record = await loadSession(sessionId)
    if (!record) {
      return NextResponse.json(
        { error: 'Session not found or expired' },
        { status: 404 }
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
