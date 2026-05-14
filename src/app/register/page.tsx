'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => setMounted(true), [])

  async function handleSubmit(e: React.FormEvent) {
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

      if (!res.ok) {
        setError(data.error ?? 'Registrazione fallita')
        setLoading(false)
        return
      }

      const loginResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (loginResult?.error) {
        router.push('/login')
        return
      }

      router.push('/')
    } catch {
      setError('Errore di rete, riprova')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground">Crea un account</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Hai già un account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Accedi
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div suppressHydrationWarning>
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
              Nome (opzionale)
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Mario Rossi"
              suppressHydrationWarning
            />
          </div>

          <div suppressHydrationWarning>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="tu@esempio.it"
              suppressHydrationWarning
            />
          </div>

          <div suppressHydrationWarning>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Minimo 8 caratteri"
              suppressHydrationWarning
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Registrazione…' : 'Registrati'}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          <Link href="/" className="hover:underline">
            Torna alla home
          </Link>
        </p>
      </div>
    </div>
  )
}
