import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { DisambiguatorOutputSchema } from '@/shared/types'
import { createSession, runPipeline } from '@/server/domain/analysis/agents/orchestrator'
import { resolveUserFromRequest, apiError } from '@/server/domain/identity/session-resolver'
import { checkRateLimit } from '@/server/infrastructure/redis/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const RequestSchema = z.object({
  disambiguator: DisambiguatorOutputSchema,
  reportName: z.string().min(1).max(120).optional(),
})

// Rate limits per role (requests / window)
const RATE_LIMITS: Record<string, { limit: number; windowSeconds: number }> = {
  guest:  { limit: 3,   windowSeconds: 24 * 60 * 60 }, // 3/day for guests
  normal: { limit: 20,  windowSeconds: 60 * 60 },       // 20/hour for registered users
  admin:  { limit: 500, windowSeconds: 60 * 60 },       // effectively unlimited for admins
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await resolveUserFromRequest(req)

    const rl = RATE_LIMITS[user.role] ?? RATE_LIMITS.normal
    const { allowed, remaining, retryAfterSeconds } = await checkRateLimit(
      `themis:ratelimit:orch:${user.id}`,
      rl.limit,
      rl.windowSeconds
    )
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before starting a new analysis.' },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfterSeconds ?? rl.windowSeconds) },
        }
      )
    }

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
      parsed.data.reportName,
      user.id
    )

    void runPipeline(sessionId).catch((e) => {
      console.error('[API /orchestrate] pipeline crash:', e)
    })

    return NextResponse.json(
      { sessionId, status: 'analyzing', remainingRequests: remaining },
      { status: 202 }
    )
  } catch (err) {
    return apiError(err, 'API /orchestrate')
  }
}
