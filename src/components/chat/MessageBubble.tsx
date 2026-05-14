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
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-hi text-fg"
          aria-label="Themis"
        >
          <BrandMark size={18} />
        </div>
        <div className="card max-w-2xl flex-1">{children}</div>
      </div>
    )
  }
  return (
    <div className="flex animate-fade-in-up justify-end">
      <div className="max-w-2xl rounded-xl border border-border bg-surface/70 px-4 py-2.5 text-sm text-fg shadow-soft backdrop-blur-xl">
        {children}
      </div>
    </div>
  )
}
