'use client'

import { useState } from 'react'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { DashboardShell } from '@/components/layout/DashboardShell'

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
      <section className="mx-auto flex h-full w-full max-w-5xl flex-col gap-4 overflow-hidden px-4 py-4 sm:px-6 sm:py-6">
        <div className="card animate-fade-in-up shrink-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 max-w-2xl">
              <h2
                className="text-2xl font-bold leading-tight text-fg sm:text-3xl"
                style={{ letterSpacing: '-0.02em' }}
              >
                How much AI do you <span className="text-gradient">really need?</span>
              </h2>
              <p className="mt-2 text-sm text-muted">
                Answer a few multiple-choice questions. A 4-agent AI pipeline
                will profile your company and produce a report with recommended
                models across Google, Anthropic and OpenAI, monthly &amp;
                annual costs, and environmental impact on the EU A–E scale.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="chip">
                <span className="h-1.5 w-1.5 rounded-full bg-agent1" />
                Gemini 2.5
              </span>
              <span className="chip">
                <span className="h-1.5 w-1.5 rounded-full bg-agent4" />
                Carbon-aware
              </span>
              <span className="chip">
                <span className="h-1.5 w-1.5 rounded-full bg-agent3" />
                EU pricing
              </span>
            </div>
          </div>
        </div>

        <section className="flex-1 min-h-0">
          <ChatWindow
            onSessionCreated={() => setRefreshKey((k) => k + 1)}
            onAgentChange={setActiveAgent}
          />
        </section>

        <footer className="shrink-0 text-center text-[11px] text-muted-2">
          © {new Date().getFullYear()} Themis — Hackathon prototype · 4-agent Gemini pipeline
        </footer>
      </section>
    </DashboardShell>
  )
}
