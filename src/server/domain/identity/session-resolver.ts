import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { touchUser } from '@/server/domain/identity/users'
import type { UserRole } from '@/shared/types/user'

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

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized')
    this.name = 'UnauthorizedError'
  }
}

/**
 * Resolves the authenticated user from the NextAuth session.
 * Throws UnauthorizedError if no valid session exists.
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

  throw new UnauthorizedError()
}

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

/**
 * Unified error handler for API routes.
 * Maps UnauthorizedError → 401, everything else → sanitized 500.
 */
export function apiError(err: unknown, label: string): NextResponse {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  console.error(`[${label}]`, err)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
