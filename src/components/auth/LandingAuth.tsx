'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { BrandMark } from '@/components/brand/BrandMark'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

export function LandingAuth() {
  const [mounted, setMounted] = useState(false)
  const [tab, setTab] = useState<'choose' | 'login' | 'register'>('choose')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)

  useEffect(() => setMounted(true), [])

  async function handleGuest() {
    setGuestLoading(true)
    try {
      const res = await fetch('/api/auth/guest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const { guestId } = await res.json()
      const result = await signIn('guest', { guestId, redirect: false })
      if (result?.error) { setGuestLoading(false); return }
      window.location.href = '/chat'
    } catch {
      setGuestLoading(false)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const result = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (result?.error) { setError('Incorrect email or password'); return }
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
      if (!res.ok) { setError(data.error ?? 'Registration failed'); setLoading(false); return }
      const login = await signIn('credentials', { email, password, redirect: false })
      if (login?.error) { window.location.href = '/login'; return }
      window.location.href = '/chat'
    } catch {
      setError('Network error, please try again')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  return (
    <div className="relative min-h-dvh flex flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <BrandMark size={22} className="text-fg" />
          <span className="text-lg font-bold tracking-tight text-fg" style={{ letterSpacing: '-0.01em' }}>
            Themis
          </span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8 animate-fade-in-up">

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
              Answer a few questions. Get a report with recommended models,
              monthly costs, and environmental impact rated A–E.
            </p>
          </div>

          <div className="card space-y-5">

            {tab === 'choose' && (
              <>
                <div className="space-y-3">
                  <button onClick={() => setTab('login')} className="option-button group flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent-hi">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                        </svg>
                      </span>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-fg">Sign in</p>
                        <p className="text-xs text-muted">Already have an account</p>
                      </div>
                    </div>
                    <svg className="text-muted group-hover:text-fg transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                  </button>

                  <button onClick={() => setTab('register')} className="option-button group flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-agent1/10 text-agent1">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                          <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
                        </svg>
                      </span>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-fg">Create account</p>
                        <p className="text-xs text-muted">Free, no credit card required</p>
                      </div>
                    </div>
                    <svg className="text-muted group-hover:text-fg transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-xs text-muted"><span className="bg-surface px-2">or</span></div>
                </div>

                <button onClick={handleGuest} disabled={guestLoading} className="btn-ghost w-full justify-center text-muted">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  {guestLoading ? 'Signing in…' : 'Continue as guest'}
                </button>
              </>
            )}

            {tab === 'login' && (
              <>
                <div className="flex items-center gap-3">
                  <button onClick={() => { setTab('choose'); setError(null) }} className="btn-icon h-7 w-7">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                  </button>
                  <h2 className="text-base font-semibold text-fg">Sign in</h2>
                </div>
                <form onSubmit={handleLogin} className="space-y-3">
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="input" />
                  <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="input" />
                  {error && <p className="text-xs text-danger">{error}</p>}
                  <button type="submit" disabled={loading} className="btn-primary w-full">
                    {loading ? 'Signing in…' : 'Sign in'}
                  </button>
                </form>
                <p className="text-center text-xs text-muted">
                  No account yet?{' '}
                  <button onClick={() => { setTab('register'); setError(null) }} className="text-accent-hi hover:underline">Create one</button>
                </p>
              </>
            )}

            {tab === 'register' && (
              <>
                <div className="flex items-center gap-3">
                  <button onClick={() => { setTab('choose'); setError(null) }} className="btn-icon h-7 w-7">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                  </button>
                  <h2 className="text-base font-semibold text-fg">Create account</h2>
                </div>
                <form onSubmit={handleRegister} className="space-y-3">
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Name (optional)" className="input" />
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="input" />
                  <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (min. 8 characters)" className="input" />
                  {error && <p className="text-xs text-danger">{error}</p>}
                  <button type="submit" disabled={loading} className="btn-primary w-full">
                    {loading ? 'Creating account…' : 'Create account'}
                  </button>
                </form>
                <p className="text-center text-xs text-muted">
                  Already have an account?{' '}
                  <button onClick={() => { setTab('login'); setError(null) }} className="text-accent-hi hover:underline">Sign in</button>
                </p>
              </>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {['Google · Anthropic · OpenAI models', 'Costs estimated in €', 'Carbon rating EU A–E'].map(f => (
              <span key={f} className="chip text-[10px]">{f}</span>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
