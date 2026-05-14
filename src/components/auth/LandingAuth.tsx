'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { BrandMark } from '@/components/brand/BrandMark'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === 'true'
const githubEnabled = process.env.NEXT_PUBLIC_GITHUB_ENABLED === 'true'
const oauthEnabled = googleEnabled || githubEnabled

export function LandingAuth() {
  const [mounted, setMounted] = useState(false)
  const [tab, setTab] = useState<'choose' | 'login' | 'register'>('choose')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => setMounted(true), [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const result = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (result?.error) {
      setError('Email o password non corretti')
      return
    }
    window.location.href = '/chat'
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Registrazione fallita'); setLoading(false); return }
      const login = await signIn('credentials', { email, password, redirect: false })
      if (login?.error) { window.location.href = '/login'; return }
      window.location.href = '/chat'
    } catch {
      setError('Errore di rete, riprova')
    } finally {
      setLoading(false)
    }
  }

  async function handleOAuth(provider: 'google' | 'github') {
    await signIn(provider, { callbackUrl: '/chat' })
  }

  if (!mounted) return null

  return (
    <div className="relative min-h-dvh flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <BrandMark size={22} className="text-fg" />
          <span className="text-lg font-bold tracking-tight text-fg" style={{ letterSpacing: '-0.01em' }}>
            Themis
          </span>
        </div>
        <ThemeToggle />
      </header>

      {/* Main */}
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8 animate-fade-in-up">

          {/* Hero */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs font-medium text-muted backdrop-blur-xl">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-soft" />
              4-agent AI pipeline · Gemini 2.5
            </div>
            <h1 className="text-4xl font-bold leading-tight text-fg" style={{ letterSpacing: '-0.03em' }}>
              How much AI does your<br />
              <span className="text-gradient">business really need?</span>
            </h1>
            <p className="text-sm text-muted max-w-sm mx-auto leading-relaxed">
              Rispondi a poche domande. Ricevi un report con modelli raccomandati,
              costi mensili e impatto ambientare EU A–E.
            </p>
          </div>

          {/* Auth card */}
          <div className="card space-y-5">

            {tab === 'choose' && (
              <>
                <div className="space-y-3">
                  <button
                    onClick={() => setTab('login')}
                    className="option-button group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent-hi">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </span>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-fg">Accedi</p>
                        <p className="text-xs text-muted">Hai già un account</p>
                      </div>
                    </div>
                    <svg className="text-muted group-hover:text-fg transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </button>

                  <button
                    onClick={() => setTab('register')}
                    className="option-button group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-agent1/10 text-agent1">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <line x1="19" y1="8" x2="19" y2="14" />
                          <line x1="22" y1="11" x2="16" y2="11" />
                        </svg>
                      </span>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-fg">Registrati</p>
                        <p className="text-xs text-muted">Crea un nuovo account gratuito</p>
                      </div>
                    </div>
                    <svg className="text-muted group-hover:text-fg transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs text-muted">
                    <span className="bg-surface px-2">oppure</span>
                  </div>
                </div>

                <a
                  href="/api/auth/guest?redirect=/chat"
                  className="btn-ghost w-full justify-center text-muted"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Continua come ospite
                </a>

                {oauthEnabled && (
                  <div className="grid grid-cols-2 gap-2">
                    {googleEnabled && (
                      <button onClick={() => handleOAuth('google')} className="btn-ghost justify-center gap-2 text-xs">
                        <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                        Google
                      </button>
                    )}
                    {githubEnabled && (
                      <button onClick={() => handleOAuth('github')} className="btn-ghost justify-center gap-2 text-xs">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                        GitHub
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            {tab === 'login' && (
              <>
                <div className="flex items-center gap-3">
                  <button onClick={() => { setTab('choose'); setError(null) }} className="btn-icon h-7 w-7">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </button>
                  <h2 className="text-base font-semibold text-fg">Accedi</h2>
                </div>

                <form onSubmit={handleLogin} className="space-y-3">
                  <div suppressHydrationWarning><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="input" suppressHydrationWarning /></div>
                  <div suppressHydrationWarning><input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="input" suppressHydrationWarning /></div>
                  {error && <p className="text-xs text-danger">{error}</p>}
                  <button type="submit" disabled={loading} className="btn-primary w-full">
                    {loading ? 'Accesso…' : 'Accedi'}
                  </button>
                </form>

                {oauthEnabled && (<>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                    <div className="relative flex justify-center text-xs text-muted"><span className="bg-surface px-2">oppure</span></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {googleEnabled && <button onClick={() => handleOAuth('google')} className="btn-ghost justify-center gap-2 text-xs"><svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>Google</button>}
                    {githubEnabled && <button onClick={() => handleOAuth('github')} className="btn-ghost justify-center gap-2 text-xs"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>GitHub</button>}
                  </div>
                </>)}

                <p className="text-center text-xs text-muted">
                  Non hai un account?{' '}
                  <button onClick={() => { setTab('register'); setError(null) }} className="text-accent-hi hover:underline">Registrati</button>
                </p>
              </>
            )}

            {tab === 'register' && (
              <>
                <div className="flex items-center gap-3">
                  <button onClick={() => { setTab('choose'); setError(null) }} className="btn-icon h-7 w-7">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </button>
                  <h2 className="text-base font-semibold text-fg">Crea account</h2>
                </div>

                <form onSubmit={handleRegister} className="space-y-3">
                  <div suppressHydrationWarning><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nome (opzionale)" className="input" suppressHydrationWarning /></div>
                  <div suppressHydrationWarning><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="input" suppressHydrationWarning /></div>
                  <div suppressHydrationWarning><input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (min 8 caratteri)" className="input" suppressHydrationWarning /></div>
                  {error && <p className="text-xs text-danger">{error}</p>}
                  <button type="submit" disabled={loading} className="btn-primary w-full">
                    {loading ? 'Registrazione…' : 'Crea account'}
                  </button>
                </form>

                {oauthEnabled && (<>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                    <div className="relative flex justify-center text-xs text-muted"><span className="bg-surface px-2">oppure</span></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {googleEnabled && <button onClick={() => handleOAuth('google')} className="btn-ghost justify-center gap-2 text-xs"><svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>Google</button>}
                    {githubEnabled && <button onClick={() => handleOAuth('github')} className="btn-ghost justify-center gap-2 text-xs"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>GitHub</button>}
                  </div>
                </>)}

                <p className="text-center text-xs text-muted">
                  Hai già un account?{' '}
                  <button onClick={() => { setTab('login'); setError(null) }} className="text-accent-hi hover:underline">Accedi</button>
                </p>
              </>
            )}
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {['Modelli Google · Anthropic · OpenAI', 'Costi stimati in €', 'Carbon rating EU A–E'].map(f => (
              <span key={f} className="chip text-[10px]">{f}</span>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
