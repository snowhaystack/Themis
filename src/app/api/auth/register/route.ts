import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createUser, getUserByEmail } from '@/lib/redis/users'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).max(80).optional(),
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

    const user = await createUser({
      email,
      password,
      name,
      role: 'normal',
      provider: 'credentials',
    })

    return NextResponse.json(
      { ok: true, userId: user.id, email: user.email },
      { status: 201 }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[API /auth/register] error:', msg)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
