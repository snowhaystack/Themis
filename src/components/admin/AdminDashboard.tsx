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

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function StatCard({
  label,
  value,
  sub,
  color = 'default',
  icon,
}: {
  label: string
  value: string | number
  sub?: string
  color?: 'default' | 'agent1' | 'agent2' | 'agent3' | 'agent4' | 'accent' | 'success'
  icon: React.ReactNode
}) {
  const colorMap: Record<string, string> = {
    default:  'border-border bg-surface/60',
    accent:   'border-accent/30 bg-accent/8',
    agent1:   'border-agent1/30 bg-agent1/8',
    agent2:   'border-agent2/30 bg-agent2/8',
    agent3:   'border-agent3/30 bg-agent3/8',
    agent4:   'border-agent4/30 bg-agent4/8',
    success:  'border-success/30 bg-success/8',
  }
  const iconMap: Record<string, string> = {
    default:  'bg-surface-hi text-muted',
    accent:   'bg-accent/20 text-accent-hi',
    agent1:   'bg-agent1/20 text-agent1',
    agent2:   'bg-agent2/20 text-agent2',
    agent3:   'bg-agent3/20 text-agent3',
    agent4:   'bg-agent4/20 text-agent4',
    success:  'bg-success/20 text-success',
  }
  return (
    <div className={`rounded-2xl border p-3 sm:p-5 space-y-2 sm:space-y-3 backdrop-blur-xl transition-all hover:scale-[1.01] ${colorMap[color]}`}>
      <div className={`flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-xl ${iconMap[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-muted">{label}</p>
        <p className="mt-0.5 text-xl sm:text-3xl font-bold tabular-nums text-fg" style={{ letterSpacing: '-0.03em' }}>{value}</p>
        {sub && <p className="mt-1 text-[11px] text-muted">{sub}</p>}
      </div>
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
      <div className="flex h-full items-center justify-center">
        <div className="space-y-2 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
          <p className="text-sm text-muted">Loading stats…</p>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-2xl border border-danger/30 bg-danger/10 px-6 py-5 text-center">
          <p className="text-sm font-semibold text-danger">Failed to load stats</p>
          <p className="mt-1 text-xs text-muted">{error ?? 'Data unavailable'}</p>
        </div>
      </div>
    )
  }

  const completionPct = stats.totalRequests > 0
    ? Math.round((stats.completedRequests / stats.totalRequests) * 100)
    : 0

  const totalRoles = stats.roleCounts.admin + stats.roleCounts.normal + stats.roleCounts.guest

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-8 space-y-6 sm:space-y-8 animate-fade-in-up">

        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs font-medium text-muted backdrop-blur-xl">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-soft" />
              Live platform data
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-fg" style={{ letterSpacing: '-0.03em' }}>
              Platform <span className="text-gradient">Stats</span>
            </h1>
            <p className="mt-1 text-sm text-muted">Real-time usage metrics from the Themis pipeline</p>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total analyses"
            value={stats.totalRequests}
            color="accent"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>}
          />
          <StatCard
            label="Completed"
            value={stats.completedRequests}
            sub={`${completionPct}% success rate`}
            color="success"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>}
          />
          <StatCard
            label="Total users"
            value={stats.totalUsers}
            sub={`${stats.activeUsersLast7d} active this week`}
            color="agent3"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          />
          <StatCard
            label="Client AI spend"
            value={`€${stats.totalProjectedClientSpendEur.toFixed(0)}`}
            sub="projected annual (all clients)"
            color="agent4"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
          />
        </div>

        {/* Pipeline + completion */}
        <div className="grid md:grid-cols-2 gap-4">

          {/* Gemini pipeline */}
          <div className="rounded-2xl border border-agent1/30 bg-agent1/5 p-5 space-y-4 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-agent1/20">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-agent1"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
              </span>
              <p className="text-sm font-semibold text-fg">Gemini Pipeline</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] text-muted uppercase tracking-wider">Total tokens</p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums text-fg" style={{ letterSpacing: '-0.02em' }}>
                  {formatTokens(stats.totalPipelineTokens)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted uppercase tracking-wider">Avg per request</p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums text-fg" style={{ letterSpacing: '-0.02em' }}>
                  {formatTokens(stats.tokensPerRequest)}
                </p>
              </div>
            </div>
          </div>

          {/* Completion rate */}
          <div className="rounded-2xl border border-border bg-surface/60 p-5 space-y-4 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-fg">Completion rate</p>
              <span className="text-2xl font-bold text-fg tabular-nums" style={{ letterSpacing: '-0.02em' }}>{completionPct}%</span>
            </div>
            <div className="space-y-2">
              <div className="relative h-3 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-agent-gradient transition-all duration-700"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-muted">
                <span>{stats.completedRequests} completed</span>
                <span>{stats.totalRequests - stats.completedRequests} pending / error</span>
              </div>
            </div>
          </div>
        </div>

        {/* Users + role distribution */}
        <div className="grid md:grid-cols-2 gap-4">

          {/* Active users */}
          <div className="rounded-2xl border border-border bg-surface/60 p-5 space-y-4 backdrop-blur-xl">
            <p className="text-sm font-semibold text-fg">User activity</p>
            <div className="space-y-3">
              {[
                { label: 'Total users', value: stats.totalUsers, pct: 100 },
                { label: 'Active last 7 days', value: stats.activeUsersLast7d, pct: stats.totalUsers > 0 ? (stats.activeUsersLast7d / stats.totalUsers) * 100 : 0 },
                { label: 'Active last 30 days', value: stats.activeUsersLast30d, pct: stats.totalUsers > 0 ? (stats.activeUsersLast30d / stats.totalUsers) * 100 : 0 },
              ].map((row) => (
                <div key={row.label} className="space-y-1">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-muted">{row.label}</span>
                    <span className="font-semibold tabular-nums text-fg">{row.value}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-agent-gradient transition-all duration-700" style={{ width: `${row.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Role distribution */}
          <div className="rounded-2xl border border-border bg-surface/60 p-5 space-y-4 backdrop-blur-xl">
            <p className="text-sm font-semibold text-fg">Role distribution</p>
            <div className="space-y-3">
              {[
                { label: 'Admin', value: stats.roleCounts.admin, color: 'bg-accent' },
                { label: 'Registered', value: stats.roleCounts.normal, color: 'bg-agent3' },
                { label: 'Guests', value: stats.roleCounts.guest, color: 'bg-agent1' },
              ].map((row) => (
                <div key={row.label} className="space-y-1">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-muted">{row.label}</span>
                    <span className="font-semibold tabular-nums text-fg">{row.value}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${row.color}`}
                      style={{ width: totalRoles > 0 ? `${(row.value / totalRoles) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-[11px] text-muted-2 text-right pb-2">
          Pipeline tokens = actual Gemini API usage · Projected spend = AI budget estimated per client
        </p>

      </div>
    </div>
  )
}
