'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SessionSummary } from '@/shared/types/session-summary'
import { BrandWordmark } from '@/components/brand/BrandMark'

interface Props {
  open: boolean
  onClose: () => void
  /** Tick this to force a refresh (e.g., after creating a session). */
  refreshKey?: number
  /** Pipeline agent currently running (1-4), or null when idle. */
  activeAgent?: 1 | 2 | 3 | 4 | null
}

interface WhoAmI {
  ip: string
  browser: string
  os: string
  device: string
  engine: string
  location: string
  isp: string
  timezone: string
  lat: string
  lon: string
  lang: string
  connection: string
  screenHint: string
}

const PIPELINE_AGENTS: Array<{
  n: 0 | 1 | 2 | 3 | 4
  label: string
  role: string
  bg: string
}> = [
  { n: 0, label: 'Supervisor', role: 'Quality checks in parallel', bg: 'bg-supervisor' },
  { n: 1, label: 'Disambiguator', role: 'Profiles your company', bg: 'bg-agent1' },
  { n: 2, label: 'Analyzer', role: 'Quantifies cost & carbon', bg: 'bg-agent2' },
  { n: 3, label: 'Decider', role: 'Picks the strategy', bg: 'bg-agent3' },
  { n: 4, label: 'Formatter', role: 'Builds the report', bg: 'bg-agent4' },
]

const SECTOR_LABELS: Record<string, string> = {
  manifatturiero: 'Manufacturing',
  fintech: 'Fintech',
  retail: 'Retail',
  sanitario: 'Healthcare',
  education: 'Education',
  servizi_professionali: 'Prof. services',
  logistica: 'Logistics',
  energia_utilities: 'Energy',
  agritech: 'Agritech',
  media_entertainment: 'Media',
  pubblica_amministrazione: 'Public admin',
  altro: 'Other',
}

const STATUS_LABEL: Record<string, string> = {
  analyzing: 'Analyzing',
  deciding: 'Deciding',
  formatting: 'Formatting',
  done: 'Done',
  error: 'Error',
}

function statusDotClass(status: string): string {
  switch (status) {
    case 'done':
      return 'bg-success'
    case 'error':
      return 'bg-danger'
    case 'analyzing':
      return 'bg-agent2 animate-pulse-soft'
    case 'deciding':
      return 'bg-agent3 animate-pulse-soft'
    case 'formatting':
      return 'bg-agent4 animate-pulse-soft'
    default:
      return 'bg-muted'
  }
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export function Sidebar({
  open,
  onClose,
  refreshKey = 0,
  activeAgent = null,
}: Props) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const canViewDashboard = session?.user?.role === 'admin' || session?.user?.role === 'guest'
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [net, setNet] = useState<WhoAmI | null>(null)

  const hasActive = sessions.some((s) =>
    ['analyzing', 'deciding', 'formatting'].includes(s.status)
  )

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions?limit=30', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { sessions: SessionSummary[] }
      setSessions(data.sessions ?? [])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchSessions()
  }, [fetchSessions, refreshKey])

  // Best-effort fetch of the visitor's connection details.
  useEffect(() => {
    fetch('/api/whoami', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<WhoAmI>) : null))
      .then((d) => setNet(d))
      .catch(() => {})
  }, [])

  // Poll while there are active sessions to surface progress in the sidebar.
  useEffect(() => {
    if (!hasActive) return
    const id = setInterval(() => void fetchSessions(), 4000)
    return () => clearInterval(id)
  }, [hasActive, fetchSessions])

  const filtered = useMemo(() => {
    if (!query.trim()) return sessions
    const q = query.toLowerCase()
    return sessions.filter(
      (s) =>
        (s.sector?.toLowerCase().includes(q) ?? false) ||
        (s.size?.toLowerCase().includes(q) ?? false) ||
        s.title.toLowerCase().includes(q)
    )
  }, [sessions, query])

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col overflow-y-auto border-r border-border bg-bg-elev/85 backdrop-blur-2xl transition-transform duration-200 ease-out lg:z-0 lg:h-dvh lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        aria-label="Chat history"
      >
        {/* Brand */}
        <div className="flex items-center justify-between gap-2 px-4 pt-4">
          <Link href="/" className="inline-flex items-center">
            <BrandWordmark stacked subtitle="AI Advisor" iconSize={24} />
          </Link>
          <button
            type="button"
            className="btn-icon lg:hidden"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* New chat */}
        <div className="px-4 pt-4">
          <Link
            href="/"
            className="btn-primary w-full justify-center"
            onClick={onClose}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            New analysis
          </Link>
        </div>

        {/* Dashboard link */}
        {canViewDashboard && (
          <div className="px-4 pt-2">
            <Link
              href="/admin"
              onClick={onClose}
              className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all ${
                pathname === '/admin'
                  ? 'border-accent/40 bg-accent/10 text-accent-hi'
                  : 'border-border bg-surface/60 text-muted hover:border-accent/30 hover:bg-accent/5 hover:text-fg'
              }`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-agent-gradient text-white">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                </svg>
              </span>
              <span className="flex-1">Platform stats</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-40"><path d="m9 18 6-6-6-6" /></svg>
            </Link>
          </div>
        )}

        {/* Search */}
        <div className="px-4 pt-3">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-2"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              type="search"
              className="input pl-8"
              placeholder="Search sector…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Filter history"
            />
          </div>
        </div>

        {/* Agent pipeline — live status of the 5-agent run (supervisor + 4 agents) */}
        <div className="px-4 pt-4">
          <div className="pb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-2">
            Pipeline
          </div>
          <ol>
            {PIPELINE_AGENTS.map((a, i) => {
              const isSupervisor = a.n === 0
              const state = isSupervisor
                ? activeAgent == null
                  ? 'pending'
                  : activeAgent >= 1 && activeAgent <= 3
                    ? 'active'
                    : 'done'
                : activeAgent == null
                  ? 'pending'
                  : a.n < activeAgent
                    ? 'done'
                    : a.n === activeAgent
                      ? 'active'
                      : 'pending'
              const isLast = i === PIPELINE_AGENTS.length - 1
              return (
                <li key={a.n} className="flex gap-2.5">
                  <div className="flex flex-col items-center">
                    <span
                      className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition ${
                        state === 'done'
                          ? 'bg-success text-white'
                          : state === 'active'
                            ? `${a.bg} text-white shadow-glow-strong`
                            : 'bg-surface-2 text-muted-2 ring-1 ring-border'
                      }`}
                    >
                      {state === 'active' && (
                        <span
                          className={`absolute inset-0 animate-ping rounded-full ${a.bg} opacity-60`}
                          aria-hidden="true"
                        />
                      )}
                      {state === 'done' ? (
                        '✓'
                      ) : state === 'active' ? (
                        <span className="relative h-1.5 w-1.5 rounded-full bg-white" />
                      ) : isSupervisor ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      ) : (
                        a.n
                      )}
                    </span>
                    {!isLast && (
                      <span className="sap-line-v my-1 h-4" aria-hidden="true" />
                    )}
                  </div>
                  <div className="pb-2">
                    <p
                      className={`text-sm font-medium leading-6 ${
                        state === 'pending' ? 'text-muted' : 'text-fg'
                      }`}
                    >
                      {a.label}
                    </p>
                    <p className="text-[10px] leading-tight text-muted-2">
                      {a.role}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>

        {/* List */}
        <div className="flex-1 overflow-hidden px-2 pt-3">
          <div className="px-2 pb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-2">
            History
          </div>
          <div className="h-full overflow-y-auto pb-4 pr-1">
            {loading && (
              <div className="space-y-1 px-2 py-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-12 animate-pulse rounded-lg bg-surface/60"
                  />
                ))}
              </div>
            )}

            {!loading && error && (
              <div className="mx-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                Error: {error}
              </div>
            )}

            {!loading && !error && filtered.length === 0 && (
              <div className="mx-2 rounded-lg border border-dashed border-border bg-surface/40 px-3 py-6 text-center text-xs text-muted">
                {sessions.length === 0
                  ? 'No analyses yet.\nStart a new one.'
                  : 'No matches for this search.'}
              </div>
            )}

            <ul className="space-y-0.5">
              {filtered.map((s) => {
                const href = `/report/${s.sessionId}`
                const active = pathname?.includes(s.sessionId)
                // Prefer the user-chosen reportName; fall back to sector-derived title.
                const primaryLabel =
                  s.reportName ||
                  (s.sector && SECTOR_LABELS[s.sector]) ||
                  s.title ||
                  'Session'
                const subParts: string[] = []
                if (s.sector && SECTOR_LABELS[s.sector] && s.reportName) {
                  subParts.push(SECTOR_LABELS[s.sector])
                }
                if (s.employeeCount) subParts.push(`${s.employeeCount} emp`)
                subParts.push(STATUS_LABEL[s.status] ?? s.status)
                subParts.push(relativeTime(s.createdAt))
                return (
                  <li key={s.sessionId}>
                    <Link
                      href={href}
                      onClick={onClose}
                      className={active ? 'nav-item-active' : 'nav-item'}
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDotClass(
                          s.status
                        )}`}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-fg">
                          {primaryLabel}
                        </span>
                        <span className="block truncate text-[11px] text-muted-2">
                          {subParts.join(' · ')}
                        </span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        {/* Footer — digital fingerprint awareness panel */}
        <div className="border-t border-border px-4 py-3">
          <div className="mb-2 flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-danger animate-pulse" />
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-danger/80">
              Your digital trace
            </p>
          </div>
          {net ? (
            <div className="space-y-1">
              <NetRow label="IP" value={net.ip} />
              <NetRow label="Location" value={net.location} />
              {net.lat && net.lon && (
                <NetRow label="Coords" value={`${net.lat}, ${net.lon}`} />
              )}
              <NetRow label="ISP" value={net.isp} />
              <NetRow label="Timezone" value={net.timezone} />
              <NetRow label="Browser" value={net.browser} />
              <NetRow label="Engine" value={net.engine} />
              <NetRow label="OS" value={net.os} />
              <NetRow label="Device" value={net.device} />
              <NetRow label="Platform" value={net.screenHint} />
              <NetRow label="Language" value={net.lang} />
              <div className="pt-1.5">
                <p className="text-[9px] leading-relaxed text-danger/60">
                  All of this is visible to every website you visit. Stay aware.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-3.5 animate-pulse rounded bg-surface/60"
                />
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

function NetRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-2">
        {label}
      </span>
      <span className="truncate font-mono text-[11px] text-fg" title={value}>
        {value}
      </span>
    </div>
  )
}
