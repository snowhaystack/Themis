'use client'

import { useState } from 'react'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { DashboardShell } from '@/components/layout/DashboardShell'

const FEATURES = [
  {
    dot: 'bg-agent1',
    title: 'Gemini 2.5',
    desc: 'Multi-model pipeline powered by Google, Anthropic & OpenAI',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    dot: 'bg-agent4',
    title: 'Carbon-aware',
    desc: 'EU carbon rating A–E for every model recommendation',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 8C17 5.24 14.76 3 12 3S7 5.24 7 8c0 3.73 5 10 5 10s5-6.27 5-10z" /><circle cx="12" cy="8" r="2" />
      </svg>
    ),
  },
  {
    dot: 'bg-agent3',
    title: 'EU pricing',
    desc: 'Monthly & annual cost estimates in euros, ready for budgets',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M8 12h6M8 15h4M14.5 9a3 3 0 0 0-5 0" />
      </svg>
    ),
  },
] as const

export function ChatPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeAgent, setActiveAgent] = useState<1 | 2 | 3 | 4 | null>(null)

  return (
    <DashboardShell
      sessionRefreshKey={refreshKey}
      activeAgent={activeAgent}
      lockHeight
      headerActions={
        <span className="chip-accent hidden md:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-soft" />
          Online
        </span>
      }
    >
      <div className="flex h-full flex-col overflow-hidden lg:flex-row">

        {/* Info panel — top on mobile, left sidebar on desktop */}
        <div className="shrink-0 border-b border-border/50 bg-surface/40 px-5 py-4 backdrop-blur-xl lg:w-72 lg:border-b-0 lg:border-r lg:py-6 lg:overflow-y-auto">
          <div className="lg:sticky lg:top-0 space-y-5">
            <div>
              <h1 className="text-lg font-bold text-fg lg:text-xl" style={{ letterSpacing: '-0.01em' }}>
                How much AI do you{' '}
                <span className="text-gradient">really need?</span>
              </h1>
              <p className="mt-1.5 text-xs text-muted leading-relaxed hidden lg:block">
                Answer 5–6 quick questions and get a personalised AI adoption plan in ~60 seconds.
              </p>
            </div>

            {/* Three features — horizontal chips on mobile, vertical cards on desktop */}
            <div className="flex flex-wrap items-center gap-1.5 lg:hidden">
              {FEATURES.map((f) => (
                <span key={f.title} className="chip text-[11px]">
                  <span className={`h-1.5 w-1.5 rounded-full ${f.dot}`} />
                  {f.title}
                </span>
              ))}
            </div>

            <div className="hidden lg:flex lg:flex-col lg:gap-3">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="flex items-start gap-3 rounded-xl border border-border/60 bg-bg-elev/50 p-3 backdrop-blur-xl"
                >
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${f.dot}/15 text-fg`}>
                    {f.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-fg">{f.title}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chat — takes all remaining space */}
        <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
          <div className="flex h-full flex-col px-4 py-4 sm:px-6 sm:py-5">
            <ChatWindow
              onSessionCreated={() => setRefreshKey((k) => k + 1)}
              onAgentChange={setActiveAgent}
            />
          </div>
        </div>

      </div>
    </DashboardShell>
  )
}
