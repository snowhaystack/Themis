import { NextRequest, NextResponse } from 'next/server'

/**
 * Edge-compatible middleware: checks for the presence of a session cookie.
 * Full JWT validation + role enforcement happens inside each route handler
 * via resolveUserFromRequest(), which runs in Node.js runtime.
 *
 * We cannot call auth() here because @/auth transitively imports bcryptjs
 * which is Node.js-only and unavailable in the Edge Runtime.
 */
export function middleware(req: NextRequest) {
  // Auth.js v5 uses these cookie names (HTTP / HTTPS)
  const hasSession =
    req.cookies.has('authjs.session-token') ||
    req.cookies.has('__Secure-authjs.session-token')

  if (!hasSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export const config = {
  // Match all /api/* routes EXCEPT /api/auth/* (NextAuth internals) and /api/health
  matcher: ['/api/((?!auth/|health).*)'],
}
