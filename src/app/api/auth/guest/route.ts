import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { GUEST_COOKIE, GUEST_COOKIE_MAX_AGE } from '@/lib/auth/session'
import { getOrCreateGuestUser } from '@/lib/redis/users'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const redirectTo = req.nextUrl.searchParams.get('redirect') ?? '/chat'

  let guestId = req.cookies.get(GUEST_COOKIE)?.value
  if (!guestId) {
    guestId = uuidv4()
    await getOrCreateGuestUser(guestId)
  }

  const res = NextResponse.redirect(new URL(redirectTo, req.url))
  res.cookies.set(GUEST_COOKIE, guestId, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: GUEST_COOKIE_MAX_AGE,
    path: '/',
  })
  return res
}
