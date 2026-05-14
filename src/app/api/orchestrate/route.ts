import { NextResponse } from 'next/server'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { DisambiguatorOutputSchema } from '@/lib/types'
import { createSession, runPipeline } from '@/lib/agents/orchestrator'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const RequestSchema = z.object({
  disambiguator: DisambiguatorOutputSchema,
  reportName: z.string().min(1).max(120).optional(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = RequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', issues: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const sessionId = uuidv4()
    await createSession(
      sessionId,
      parsed.data.disambiguator,
      parsed.data.reportName
    )

    void runPipeline(sessionId).catch((e) => {
      console.error('[API /orchestrate] pipeline crash:', e)
    })

    return NextResponse.json(
      { sessionId, status: 'analyzing' },
      { status: 202 }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[API /orchestrate] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
