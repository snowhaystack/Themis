import { NextResponse } from 'next/server'
import { GUEST_COOKIE } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(GUEST_COOKIE, '', { maxAge: 0, path: '/' })
  return res
}
