'use client'

import { BrandMark } from '@/components/brand/BrandMark'

interface Props {
  role: 'agent' | 'user'
  children: React.ReactNode
}

export function MessageBubble({ role, children }: Props) {
  if (role === 'agent') {
    return (
      <div className="flex animate-fade-in-up items-start gap-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-agent-gradient text-white shadow-glow"
          aria-label="Themis"
        >
          <BrandMark size={16} />
        </div>
        <div className="max-w-[50%] rounded-2xl rounded-tl-sm border border-border/60 bg-surface/80 px-4 py-3 shadow-soft backdrop-blur-xl">
          {children}
        </div>
      </div>
    )
  }
  return (
    <div className="flex animate-fade-in-up justify-end">
      <div className="max-w-[50%] rounded-2xl rounded-tr-sm bg-accent/15 px-4 py-2.5 text-sm font-medium text-fg ring-1 ring-accent/25">
        {children}
      </div>
    </div>
  )
}
