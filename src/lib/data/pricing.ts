/**
 * Pricing Gemini (USD per 1M token).
 * Fonte: Google AI Pricing (famiglia 2.5, fine 2025). Modificabili al volo.
 * Per semplicità usiamo un prezzo blended (50/50 input/output).
 */

export interface ModelPricing {
  inputPer1M: number
  outputPer1M: number
  blendedPer1M: number
}

export const PRICING_USD: Record<
  'gemini-2.5-flash' | 'gemini-2.5-flash-lite' | 'gemini-2.5-pro',
  ModelPricing
> = {
  'gemini-2.5-flash-lite': {
    inputPer1M: 0.1,
    outputPer1M: 0.4,
    blendedPer1M: 0.25,
  },
  'gemini-2.5-flash': {
    inputPer1M: 0.3,
    outputPer1M: 2.5,
    blendedPer1M: 1.4,
  },
  'gemini-2.5-pro': {
    inputPer1M: 1.25,
    outputPer1M: 10.0,
    blendedPer1M: 5.625,
  },
}

/** Tasso EUR/USD usato per le conversioni (modificabile). */
export const EUR_USD_RATE = 0.92

export function blendedCostEur(
  model: keyof typeof PRICING_USD,
  tokens: number
): number {
  const usd = (tokens / 1_000_000) * PRICING_USD[model].blendedPer1M
  return Number((usd * EUR_USD_RATE).toFixed(4))
}

/**
 * Token medi consumati per utente attivo, in base alla frequenza d'uso.
 * Calibrati per uso "office worker" (chat + analisi documenti).
 */
export const TOKENS_PER_DAY: Record<'daily' | 'weekly' | 'rarely', number> = {
  daily: 5000,
  weekly: 1500,
  rarely: 300,
}

export const DAYS_PER_MONTH = 22 // giorni lavorativi medi

/**
 * Moltiplicatore di efficienza: chi sa meno di tech consuma più token
 * (prompt più lunghi, più tentativi, meno editing).
 */
export const LITERACY_EFFICIENCY: Record<'low' | 'medium' | 'high', number> = {
  high: 0.9,
  medium: 0.65,
  low: 0.4,
}

/** Token mensili stimati per un singolo utente di un certo ruolo. */
export function estimateMonthlyTokensPerUser(
  frequency: keyof typeof TOKENS_PER_DAY,
  literacy: keyof typeof LITERACY_EFFICIENCY
): number {
  const baseDaily = TOKENS_PER_DAY[frequency]
  const efficiency = LITERACY_EFFICIENCY[literacy]
  const dailyAdjusted = baseDaily / efficiency
  return Math.round(dailyAdjusted * DAYS_PER_MONTH)
}
