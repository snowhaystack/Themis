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
      <div className="flex h-full flex-col overflow-hidden">

        {/* Context bar */}
        <div className="shrink-0 border-b border-border/50 bg-surface/40 px-6 py-3 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-base font-bold text-fg" style={{ letterSpacing: '-0.01em' }}>
              How much AI do you{' '}
              <span className="text-gradient">really need?</span>
            </h1>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="chip text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-agent1" />
                Gemini 2.5
              </span>
              <span className="chip text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-agent4" />
                Carbon-aware
              </span>
              <span className="chip text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-agent3" />
                EU pricing
              </span>
            </div>
          </div>
        </div>

        {/* Chat — centred, takes all remaining height */}
        <div className="flex-1 min-h-0 overflow-hidden">
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
