'use client'

import type { AnalyzerOutput, ModelProvider } from '@/shared/types'
import { humanize, formatEur } from '@/shared/utils/format'

interface Props {
  analyzer: AnalyzerOutput
}

const PROVIDER_LABEL: Record<ModelProvider, string> = {
  google: 'Google',
  anthropic: 'Anthropic',
  openai: 'OpenAI',
}

const PROVIDER_DOT: Record<ModelProvider, string> = {
  google: 'bg-agent1',
  anthropic: 'bg-agent3',
  openai: 'bg-agent4',
}

export function CostBreakdown({ analyzer }: Props) {
  const maxCost = Math.max(
    ...analyzer.useCases.map((u) => u.monthlyCostEur),
    0.0001
  )
  return (
    <div className="card">
      <h3 className="mb-4 text-sm font-semibold text-fg">
        Cost breakdown per use case (monthly)
      </h3>
      <div className="space-y-4">
        {analyzer.useCases.map((u) => {
          const pct = (u.monthlyCostEur / maxCost) * 100
          return (
            <div key={u.id} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium text-fg">{humanize(u.name)}</span>
                <span className="font-mono text-muted">
                  {formatEur(u.monthlyCostEur, 2)} / mo
                </span>
              </div>
              <div className="relative h-2 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-agent-gradient"
                  style={{ width: `${Math.max(2, pct)}%` }}
                />
              </div>
              {/* Modelli consigliati */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent-hi`}
                  title={u.recommendedModel.rationale}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      PROVIDER_DOT[u.recommendedModel.provider]
                    }`}
                  />
                  {u.recommendedModel.name}
                  <span className="text-[9px] uppercase tracking-wider opacity-70">
                    primary
                  </span>
                </span>
                {u.alternativeModels.map((alt) => (
                  <span
                    key={alt.id}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-0.5 text-[11px] text-muted"
                    title={alt.rationale}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${PROVIDER_DOT[alt.provider]}`}
                    />
                    {alt.name}
                    <span className="text-[9px] uppercase tracking-wider opacity-60">
                      {PROVIDER_LABEL[alt.provider]}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
