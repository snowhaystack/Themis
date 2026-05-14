'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'

export function AuthButton() {
  const { data: session, status } = useSession()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    await signOut({ callbackUrl: '/' })
  }

  if (status === 'loading') return null

  if (session?.user) {
    return (
      <div className="flex items-center gap-2">
        {session.user.role === 'admin' && (
          <Link
            href="/admin"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-fg transition-colors px-2 py-1 rounded-md hover:bg-surface"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
            Admin
          </Link>
        )}
        <div className="flex items-center gap-2">
          <span className="hidden sm:block text-xs text-muted truncate max-w-[120px]">
            {session.user.name ?? session.user.email}
          </span>
          <button
            onClick={handleLogout}
            className="text-xs font-medium text-muted hover:text-fg transition-colors px-2 py-1 rounded-md hover:bg-surface"
          >
            Esci
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <Link
        href="/login"
        className="text-xs font-medium text-muted hover:text-fg transition-colors px-2 py-1 rounded-md hover:bg-surface"
      >
        Accedi
      </Link>
      <Link
        href="/register"
        className="text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors px-2.5 py-1 rounded-md"
      >
        Registrati
      </Link>
    </div>
  )
}
