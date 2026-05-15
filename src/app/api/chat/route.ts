import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { runDisambiguator } from '@/server/domain/analysis/agents/disambiguator'
import { ChatStateSchema, type ChatResponse } from '@/shared/types'
import { resolveUserFromRequest, apiError } from '@/server/domain/identity/session-resolver'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const RequestSchema = z.object({
  state: ChatStateSchema,
})

export async function POST(req: NextRequest) {
  try {
    await resolveUserFromRequest(req)

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
    return apiError(err, 'API /chat')
  }
}
