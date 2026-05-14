import { NextResponse } from 'next/server'
import { z } from 'zod'
import { runDisambiguator } from '@/lib/agents/disambiguator'
import {
  ChatStateSchema,
  type ChatResponse,
} from '@/lib/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const RequestSchema = z.object({
  state: ChatStateSchema,
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

    const response: ChatResponse = await runDisambiguator({
      state: parsed.data.state,
    })
    return NextResponse.json(response)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[API /chat] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
