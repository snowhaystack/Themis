'use client'

import type { AnalyzerOutput, CarbonRating } from '@/shared/types'
import { carbonEquivalents } from '@/shared/utils/carbon-display'

interface Props {
  analyzer: AnalyzerOutput
  rating: CarbonRating
}

const RATING_THEME: Record<
  CarbonRating,
  { bg: string; text: string; border: string; label: string; glow: string }
> = {
  A: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-300',
    border: 'border-emerald-500/40',
    label: 'Excellent',
    glow: 'shadow-[0_0_60px_-10px_rgba(16,185,129,0.5)]',
  },
  B: {
    bg: 'bg-green-500/15',
    text: 'text-green-300',
    border: 'border-green-500/40',
    label: 'Good',
    glow: 'shadow-[0_0_60px_-10px_rgba(34,197,94,0.5)]',
  },
  C: {
    bg: 'bg-yellow-500/15',
    text: 'text-yellow-300',
    border: 'border-yellow-500/40',
    label: 'Moderate',
    glow: 'shadow-[0_0_60px_-10px_rgba(234,179,8,0.5)]',
  },
  D: {
    bg: 'bg-orange-500/15',
    text: 'text-orange-300',
    border: 'border-orange-500/40',
    label: 'Needs work',
    glow: 'shadow-[0_0_60px_-10px_rgba(249,115,22,0.5)]',
  },
  E: {
    bg: 'bg-red-500/15',
    text: 'text-red-300',
    border: 'border-red-500/40',
    label: 'Critical',
    glow: 'shadow-[0_0_60px_-10px_rgba(239,68,68,0.5)]',
  },
}

function formatCount(n: number, unit: 'int' | 'trees'): string {
  if (unit === 'trees') {
    if (n < 1) return n.toFixed(2)
    if (n < 10) return n.toFixed(1)
    return Math.round(n).toLocaleString('en-US')
  }
  return Math.max(0, Math.round(n)).toLocaleString('en-US')
}

export function CarbonHero({ analyzer, rating }: Props) {
  const annual = analyzer.totals.annualCarbonKg
  const monthly = analyzer.totals.monthlyCarbonKg
  const eq = carbonEquivalents(annual)
  const theme = RATING_THEME[rating]
  // How many days of a single tree's CO2 absorption (~21 kg/year)
  const treeDays = Math.max(1, Math.round((annual / 21) * 365))

  return (
    <section
      className={`card relative overflow-hidden ${theme.border} ${theme.glow}`}
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-40"
        style={{
          backgroundImage: `radial-gradient(42rem 22rem at 100% 0%, rgb(var(--agent4) / 0.18), transparent 60%)`,
        }}
        aria-hidden="true"
      />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
        {/* Big rating + main number */}
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-2">
              Carbon footprint · annual
            </span>
            <span className={`chip ${theme.text} ${theme.bg} ${theme.border}`}>
              {theme.label}
            </span>
          </div>
          <div className="flex items-baseline gap-4">
            <div
              className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl font-display text-5xl font-bold ${theme.bg} ${theme.text} ${theme.border} border`}
            >
              {rating}
            </div>
            <div>
              <div className="font-display text-5xl font-bold leading-none text-fg sm:text-6xl">
                {annual.toFixed(1)}
                <span className="ml-2 text-2xl font-medium text-muted">
                  kg CO₂
                </span>
              </div>
              <div className="mt-2 font-mono text-xs text-muted-2">
                {monthly.toFixed(2)} kg / month · EU energy-efficiency scale A–E
              </div>
            </div>
          </div>
        </div>

        {/* Equivalences */}
        <div className="grid w-full grid-cols-3 gap-3 lg:max-w-md">
          <Equivalence
            icon="🚗"
            value={formatCount(eq.kmAuto, 'int')}
            unit="km by car"
          />
          <Equivalence
            icon="🌳"
            value={
              eq.alberiAnno < 1
                ? `${treeDays}`
                : formatCount(eq.alberiAnno, 'trees')
            }
            unit={
              eq.alberiAnno < 1
                ? "days of 1 tree's absorption"
                : 'trees / year'
            }
          />
          <Equivalence
            icon="📱"
            value={formatCount(eq.smartphoneCariche, 'int')}
            unit="phone charges"
          />
        </div>
      </div>
    </section>
  )
}

function Equivalence({
  icon,
  value,
  unit,
}: {
  icon: string
  value: string
  unit: string
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-surface px-3 py-3">
      <span className="text-lg" aria-hidden="true">
        {icon}
      </span>
      <span className="font-mono text-lg font-semibold tabular-nums text-fg">
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-wide text-muted-2">
        {unit}
      </span>
    </div>
  )
}
