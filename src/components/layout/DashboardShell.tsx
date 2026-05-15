'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { BrandMark } from '@/components/brand/BrandMark'
import { AuthButton } from '@/components/auth/AuthButton'

interface Props {
  children: React.ReactNode
  /** Bump to ask the sidebar to refetch (e.g. after creating a session). */
  sessionRefreshKey?: number
  /** Optional pipeline phase to highlight one of the 4 agent dots in the header. */
  activeAgent?: 1 | 2 | 3 | 4 | null
  /** Optional content rendered in the header right area (e.g. status chip). */
  headerActions?: React.ReactNode
  /**
   * When true, locks the shell to exactly 100dvh and clips overflow on the body.
   * Use on pages whose own scroll is internal (e.g. the chat).
   * Default: false (body grows naturally — for long pages like the report).
   */
  lockHeight?: boolean
}

export function DashboardShell({
  children,
  sessionRefreshKey = 0,
  activeAgent = null,
  headerActions,
  lockHeight = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const sizingCls = lockHeight ? 'h-dvh overflow-hidden' : 'min-h-dvh'

  return (
    <div className={`relative flex ${sizingCls}`}>
      <Sidebar
        open={open}
        onClose={() => setOpen(false)}
        refreshKey={sessionRefreshKey}
        activeAgent={activeAgent}
      />

      <div className={`flex flex-1 flex-col lg:ml-72 ${sizingCls}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center gap-2 sm:gap-3 border-b border-border bg-bg/70 px-3 py-2 sm:px-6 sm:py-3 backdrop-blur-2xl">
          <button
            type="button"
            className="btn-icon lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open history"
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
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <BrandMark
              size={22}
              className="hidden shrink-0 text-fg lg:block"
            />
            <div className="min-w-0">
              <h1
                className="truncate text-base font-bold leading-none tracking-tight text-fg sm:text-xl"
                style={{ letterSpacing: '-0.01em' }}
              >
                Themis
              </h1>
              <p className="mt-0.5 sm:mt-1 hidden sm:block truncate text-[11px] text-muted">
                AI Advisor for Business · 4-agent pipeline
              </p>
            </div>
          </div>

          {/* Agent pipeline indicator */}
          <div
            className="hidden items-center gap-1.5 rounded-full border border-border bg-surface/60 px-2.5 py-1.5 backdrop-blur-xl sm:flex"
            aria-label="4-agent pipeline"
          >
            <AgentDot color="agent1" active={activeAgent === 1} label="Disambiguator" />
            <Connector />
            <AgentDot color="agent2" active={activeAgent === 2} label="Analyzer" />
            <Connector />
            <AgentDot color="agent3" active={activeAgent === 3} label="Decider" />
            <Connector />
            <AgentDot color="agent4" active={activeAgent === 4} label="Formatter" />
          </div>

          {headerActions}

          <AuthButton />

          <ThemeToggle />
        </header>

        <main
          className={`flex-1 min-h-0 ${lockHeight ? 'overflow-hidden' : ''}`}
        >
          {children}
        </main>
      </div>
    </div>
  )
}

const AGENT_BG: Record<'agent1' | 'agent2' | 'agent3' | 'agent4', string> = {
  agent1: 'bg-agent1',
  agent2: 'bg-agent2',
  agent3: 'bg-agent3',
  agent4: 'bg-agent4',
}

function AgentDot({
  color,
  active,
  label,
}: {
  color: 'agent1' | 'agent2' | 'agent3' | 'agent4'
  active: boolean
  label: string
}) {
  const bg = AGENT_BG[color]
  return (
    <span
      className={`relative inline-block h-2 w-2 rounded-full ${bg} ${
        active ? '' : 'opacity-70'
      }`}
      style={
        active
          ? {
              boxShadow: `0 0 12px rgb(var(--${color}) / 0.9)`,
            }
          : undefined
      }
      title={label}
      aria-label={label}
    >
      {active && (
        <span
          className={`absolute inset-0 animate-ping rounded-full ${bg} opacity-60`}
          aria-hidden="true"
        />
      )}
    </span>
  )
}

function Connector() {
  return <span className="sap-line w-3.5" aria-hidden="true" />
}
