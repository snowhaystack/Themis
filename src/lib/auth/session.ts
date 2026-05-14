import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { getOrCreateGuestUser, touchUser } from '@/lib/redis/users'
import { v4 as uuidv4 } from 'uuid'
import type { UserRole } from '@/lib/types/user'

export const GUEST_COOKIE = 'themis_guest'
export const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 30

export interface CurrentUser {
  id: string
  role: UserRole
  isGuest: boolean
}

export interface ResolvedUser {
  user: CurrentUser
}

/**
 * Resolves the current user from NextAuth session.
 * All users (including guests) now have a proper session.
 */
export async function resolveUserFromRequest(_req: NextRequest): Promise<ResolvedUser> {
  const session = await auth()

  if (session?.user?.id) {
    await touchUser(session.user.id)
    return {
      user: {
        id: session.user.id,
        role: session.user.role,
        isGuest: session.user.role === 'guest',
      },
    }
  }

  // Fallback: create an anonymous guest (only hit if a route is called without session)
  const guestId = uuidv4()
  const guestUser = await getOrCreateGuestUser(guestId)
  return {
    user: { id: guestUser.id, role: 'guest', isGuest: true },
  }
}

/**
 * Resolves the current user for Server Components (reads from next/headers).
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  const session = await auth()

  if (session?.user?.id) {
    await touchUser(session.user.id)
    return {
      id: session.user.id,
      role: session.user.role,
      isGuest: session.user.role === 'guest',
    }
  }

  return { id: 'anonymous', role: 'guest', isGuest: true }
}
