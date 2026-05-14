'use client'

import { useEffect, useState } from 'react'

interface AdminStats {
  totalRequests: number
  completedRequests: number
  totalCostEur: number
  costPerRequest: number
  totalUsers: number
  activeUsersLast7d: number
  activeUsersLast30d: number
  avgCostPerActiveUser: number
  roleCounts: { admin: number; normal: number; guest: number }
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
}) {
  return (
    <div className={`rounded-xl border p-5 space-y-1 ${accent ? 'border-accent/40 bg-accent/10' : 'border-border bg-surface/80'}`}>
      <p className="text-xs text-muted font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-fg">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  )
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setStats(data)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <p className="text-muted animate-pulse">Caricamento statistiche…</p>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <p className="text-danger">Errore: {error ?? 'Dati non disponibili'}</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg" style={{ letterSpacing: '-0.02em' }}>Dashboard Admin</h1>
        <p className="text-sm text-muted mt-1">Statistiche aggregate della piattaforma</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wide">Richieste</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard label="Richieste totali" value={stats.totalRequests} />
          <StatCard
            label="Completate"
            value={stats.completedRequests}
            sub={`${stats.totalRequests > 0 ? Math.round((stats.completedRequests / stats.totalRequests) * 100) : 0}% del totale`}
          />
          <StatCard label="In sospeso / errore" value={stats.totalRequests - stats.completedRequests} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wide">Costi di ragionamento</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard label="Costo totale stimato" value={`€ ${stats.totalCostEur.toFixed(2)}`} accent />
          <StatCard label="Costo per richiesta" value={`€ ${stats.costPerRequest.toFixed(2)}`} sub="Media sulle richieste completate" />
          <StatCard label="Costo medio/utente attivo" value={`€ ${stats.avgCostPerActiveUser.toFixed(2)}`} sub="Ultimi 30 giorni" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wide">Utenti</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Utenti totali" value={stats.totalUsers} />
          <StatCard label="Attivi (7 gg)" value={stats.activeUsersLast7d} />
          <StatCard label="Attivi (30 gg)" value={stats.activeUsersLast30d} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wide">Distribuzione ruoli</h2>
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Admin" value={stats.roleCounts.admin} />
          <StatCard label="Registrati (normal)" value={stats.roleCounts.normal} />
          <StatCard label="Ospiti (guest)" value={stats.roleCounts.guest} />
        </div>
      </section>

      <p className="text-xs text-muted text-right">
        I costi sono stime calcolate dall&apos;analizzatore AI sulla base dei modelli raccomandati.
      </p>
    </div>
  )
}
