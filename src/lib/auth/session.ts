import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { getOrCreateGuestUser, touchUser } from '@/lib/redis/users'
import type { UserRole } from '@/lib/types/user'
import { v4 as uuidv4 } from 'uuid'

export const GUEST_COOKIE = 'themis_guest'
export const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export interface CurrentUser {
  id: string
  role: UserRole
  isGuest: boolean
}

export interface ResolvedUser {
  user: CurrentUser
  /** Non-null only for brand-new guests — route handler must set this cookie. */
  newGuestId?: string
}

/**
 * Resolves the current user from NextAuth session or guest cookie.
 * Use this in API Route Handlers (reads cookies from NextRequest).
 */
export async function resolveUserFromRequest(req: NextRequest): Promise<ResolvedUser> {
  const session = await auth()

  if (session?.user?.id) {
    await touchUser(session.user.id)
    return {
      user: { id: session.user.id, role: session.user.role, isGuest: false },
    }
  }

  let guestId = req.cookies.get(GUEST_COOKIE)?.value
  let newGuestId: string | undefined

  if (!guestId) {
    guestId = uuidv4()
    newGuestId = guestId
  }

  const guestUser = await getOrCreateGuestUser(guestId)
  return {
    user: { id: guestUser.id, role: 'guest', isGuest: true },
    newGuestId,
  }
}

/**
 * Resolves the current user for Server Components (reads from next/headers).
 * Does NOT set cookies — use only for read-only access.
 */
export async function getCurrentUser(guestIdFromCookie?: string): Promise<CurrentUser> {
  const session = await auth()

  if (session?.user?.id) {
    await touchUser(session.user.id)
    return { id: session.user.id, role: session.user.role, isGuest: false }
  }

  if (!guestIdFromCookie) {
    // No auth, no guest cookie — return anonymous guest (no Redis write)
    return { id: 'anonymous', role: 'guest', isGuest: true }
  }

  const guestUser = await getOrCreateGuestUser(guestIdFromCookie)
  return { id: guestUser.id, role: 'guest', isGuest: true }
}

/** For Server Components: read the guest cookie from next/headers. */
export async function getGuestIdFromCookies(): Promise<string | null> {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  return cookieStore.get(GUEST_COOKIE)?.value ?? null
}
