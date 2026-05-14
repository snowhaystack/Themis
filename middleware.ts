import { auth } from './src/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default auth(function middleware(req) {
  const { pathname } = req.nextUrl
  const role = (req as NextRequest & { auth?: { user?: { role?: string } } }).auth?.user?.role

  if (pathname.startsWith('/admin')) {
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/login?callbackUrl=/admin', req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/admin/:path*'],
}
