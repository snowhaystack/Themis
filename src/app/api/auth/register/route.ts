import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createUser, getUserByEmail } from '@/server/domain/identity/users'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().max(80).optional().transform(v => v?.trim() || undefined),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = RegisterSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { email, password, name } = parsed.data

    const existing = await getUserByEmail(email)
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    await createUser({ email, password, name, role: 'normal', provider: 'credentials' })

    // Do not return the user ID — not needed by the client and leaks internal identifiers.
    return NextResponse.json({ ok: true, email }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg === 'EMAIL_TAKEN') {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }
    console.error('[API /auth/register] error:', err)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
