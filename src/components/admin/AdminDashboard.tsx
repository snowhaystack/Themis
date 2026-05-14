'use client'

import { useEffect, useState } from 'react'

interface AdminStats {
  totalRequests: number
  completedRequests: number
  totalPipelineTokens: number
  tokensPerRequest: number
  totalProjectedClientSpendEur: number
  totalUsers: number
  activeUsersLast7d: number
  activeUsersLast30d: number
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

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
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
        <p className="text-muted animate-pulse">Loading stats…</p>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <p className="text-danger">Error: {error ?? 'Data unavailable'}</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg" style={{ letterSpacing: '-0.02em' }}>Admin Dashboard</h1>
        <p className="text-sm text-muted mt-1">Aggregate platform statistics</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wide">Requests</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard label="Total requests" value={stats.totalRequests} />
          <StatCard
            label="Completed"
            value={stats.completedRequests}
            sub={`${stats.totalRequests > 0 ? Math.round((stats.completedRequests / stats.totalRequests) * 100) : 0}% of total`}
          />
          <StatCard label="Pending / error" value={stats.totalRequests - stats.completedRequests} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wide">Platform usage (Gemini pipeline)</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard
            label="Total pipeline tokens"
            value={formatTokens(stats.totalPipelineTokens)}
            sub="Actual tokens consumed by our pipeline"
            accent
          />
          <StatCard
            label="Tokens / completed request"
            value={formatTokens(stats.tokensPerRequest)}
            sub="Average across completed analyses"
          />
          <StatCard
            label="Projected client AI spend"
            value={`€ ${stats.totalProjectedClientSpendEur.toFixed(0)}`}
            sub="Sum of annual AI budgets estimated for clients"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wide">Users</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard label="Total users" value={stats.totalUsers} />
          <StatCard label="Active (7 days)" value={stats.activeUsersLast7d} />
          <StatCard label="Active (30 days)" value={stats.activeUsersLast30d} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wide">Role distribution</h2>
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Admin" value={stats.roleCounts.admin} />
          <StatCard label="Registered (normal)" value={stats.roleCounts.normal} />
          <StatCard label="Guests" value={stats.roleCounts.guest} />
        </div>
      </section>

      <p className="text-xs text-muted text-right">
        Pipeline tokens = actual Gemini API usage. Projected client spend = AI budget estimated by the analyser for each client company.
      </p>
    </div>
  )
}
