export const CARBON_PER_1K_TOKENS_KG: Record<
  'gemini-2.5-flash' | 'gemini-2.5-flash-lite' | 'gemini-2.5-pro',
  number
> = {
  'gemini-2.5-flash-lite': 0.00015,
  'gemini-2.5-flash': 0.0003,
  'gemini-2.5-pro': 0.0008,
}

export function carbonKg(
  model: keyof typeof CARBON_PER_1K_TOKENS_KG,
  tokens: number
): number {
  const factor = CARBON_PER_1K_TOKENS_KG[model]
  return Number(((tokens / 1000) * factor).toFixed(4))
}

export const CARBON_RATING_THRESHOLDS: Array<{
  max: number
  rating: 'A' | 'B' | 'C' | 'D' | 'E'
}> = [
  { max: 50, rating: 'A' },
  { max: 200, rating: 'B' },
  { max: 500, rating: 'C' },
  { max: 1500, rating: 'D' },
  { max: Infinity, rating: 'E' },
]

export function carbonRating(annualKg: number): 'A' | 'B' | 'C' | 'D' | 'E' {
  for (const t of CARBON_RATING_THRESHOLDS) {
    if (annualKg <= t.max) return t.rating
  }
  return 'E'
}
