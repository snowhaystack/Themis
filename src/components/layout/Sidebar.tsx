'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SessionSummary } from '@/shared/types/session-summary'
import { BrandWordmark } from '@/components/brand/BrandMark'

interface Props {
  open: boolean
  onClose: () => void
  /** Tick this to force a refresh (e.g., after creating a session). */
  refreshKey?: number
}

const SECTOR_LABELS: Record<string, string> = {
  manifatturiero: 'Manifatturiero',
  fintech: 'Fintech',
  retail: 'Retail',
  sanitario: 'Sanitario',
  education: 'Education',
  servizi_professionali: 'Servizi prof.',
  logistica: 'Logistica',
  energia_utilities: 'Energia',
  agritech: 'Agritech',
  media_entertainment: 'Media',
  pubblica_amministrazione: 'PA',
  altro: 'Altro',
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

export function Sidebar({ open, onClose, refreshKey = 0 }: Props) {
  const pathname = usePathname()
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

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
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border bg-bg-elev/85 backdrop-blur-2xl transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:z-0 lg:h-dvh lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        aria-label="Cronologia chat"
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
            aria-label="Chiudi sidebar"
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
            Nuova analisi
          </Link>
        </div>

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
              placeholder="Cerca settore…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Filtra cronologia"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-hidden px-2 pt-3">
          <div className="px-2 pb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-2">
            Cronologia
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

        {/* Footer / profile */}
        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-hi text-xs font-semibold text-fg">
              ◐
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-fg">
                Hackathon mode
              </div>
              <div className="truncate text-[10px] text-muted-2">
                Sessioni · 1h TTL · Redis
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
