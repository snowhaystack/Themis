'use client'

import type { AnalyzerOutput, ImpactLevel } from '@/shared/types'
import { humanize } from '@/shared/utils/format'

interface Props {
  analyzer: AnalyzerOutput
}

const LEVEL_THEME: Record<
  ImpactLevel,
  { dot: string; chip: string; label: string }
> = {
  high: {
    dot: 'bg-emerald-400',
    chip: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
    label: 'High impact',
  },
  medium: {
    dot: 'bg-amber-400',
    chip: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
    label: 'Medium impact',
  },
  low: {
    dot: 'bg-slate-400',
    chip: 'border-slate-500/40 bg-slate-500/15 text-slate-300',
    label: 'Low impact',
  },
}

export function RoleImpact({ analyzer }: Props) {
  if (!analyzer.byRole.length) return null

  // Sort by impact level (high → low) for visual hierarchy
  const order: Record<ImpactLevel, number> = { high: 0, medium: 1, low: 2 }
  const sorted = [...analyzer.byRole].sort(
    (a, b) => order[a.impactLevel] - order[b.impactLevel]
  )

  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        Estimated impact per role
      </h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sorted.map((r, i) => {
          const theme = LEVEL_THEME[r.impactLevel]
          return (
            <div key={`${r.role}-${i}`} className="card flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-fg">
                    {humanize(r.role)}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-2">
                    {r.count} user{r.count === 1 ? '' : 's'}
                  </p>
                </div>
                <span
                  className={`chip border ${theme.chip}`}
                  aria-label={theme.label}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${theme.dot}`}
                    aria-hidden="true"
                  />
                  {theme.label}
                </span>
              </div>

              <p className="text-sm leading-relaxed text-fg">
                {r.estimatedImpact}
              </p>

              <div className="rounded-lg border border-border bg-surface-hi p-2.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-2">
                  Why
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">
                  {r.impactRationale}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
