'use client'

import type { Decision } from '@/shared/types'

interface Props {
  decision: Decision
}

export function DecisionCard({ decision }: Props) {
  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-accent-hi">
            {decision.category}
          </p>
          <p className="mt-1 text-base font-semibold text-fg">
            {decision.choice}
          </p>
        </div>
      </div>
      <p className="text-sm text-muted">{decision.motivation}</p>
      {decision.tradeoffs.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Tradeoffs
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted">
            {decision.tradeoffs.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}
      {decision.realWorldExample && (
        <div className="rounded-lg border border-border bg-surface-hi p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Real-world example
          </p>
          <p className="mt-1 text-sm text-fg">{decision.realWorldExample}</p>
        </div>
      )}
    </div>
  )
}
