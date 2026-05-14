'use client'

import type { CarbonRating } from '@/lib/types'

const STYLES: Record<CarbonRating, { bg: string; text: string; label: string }> = {
  A: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', label: 'Eccellente' },
  B: { bg: 'bg-green-500/20', text: 'text-green-300', label: 'Buono' },
  C: { bg: 'bg-yellow-500/20', text: 'text-yellow-300', label: 'Medio' },
  D: { bg: 'bg-orange-500/20', text: 'text-orange-300', label: 'Da migliorare' },
  E: { bg: 'bg-red-500/20', text: 'text-red-300', label: 'Critico' },
}

interface Props {
  rating: CarbonRating
  size?: 'sm' | 'md' | 'lg'
}

export function CarbonBadge({ rating, size = 'md' }: Props) {
  const s = STYLES[rating]
  const sizeCls =
    size === 'lg'
      ? 'h-16 w-16 text-3xl'
      : size === 'sm'
        ? 'h-7 w-7 text-xs'
        : 'h-10 w-10 text-base'
  return (
    <div className="inline-flex items-center gap-3">
      <div
        className={`${s.bg} ${s.text} ${sizeCls} flex items-center justify-center rounded-lg font-bold`}
      >
        {rating}
      </div>
      {size !== 'sm' && (
        <div>
          <p className={`text-sm font-medium ${s.text}`}>Rating {rating}</p>
          <p className="text-xs text-muted">{s.label}</p>
        </div>
      )}
    </div>
  )
}
