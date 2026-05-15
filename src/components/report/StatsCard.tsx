'use client'

interface StatItem {
  label: string
  value: string
  unit?: string
  emphasis?: boolean
}

interface Props {
  title?: string
  items: StatItem[]
}

export function StatsCard({ title, items }: Props) {
  return (
    <div className="card">
      {title && <h3 className="mb-4 text-sm font-semibold text-fg">{title}</h3>}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {items.map((it, i) => (
          <div
            key={i}
            className={`rounded-lg border border-border px-3 py-2.5 sm:px-4 sm:py-3 ${
              it.emphasis ? 'bg-accent/10 border-accent/40' : 'bg-surface-hi'
            }`}
          >
            <p className="text-xs text-muted">{it.label}</p>
            <p
              className={`mt-1 text-base sm:text-xl font-semibold ${
                it.emphasis ? 'text-accent-hi' : 'text-fg'
              }`}
            >
              {it.value}
              {it.unit && (
                <span className="ml-1 text-sm font-normal text-muted">
                  {it.unit}
                </span>
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
