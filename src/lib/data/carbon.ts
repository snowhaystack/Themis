/**
 * Fattori di emissione carbonio per LLM inference.
 * Fonti: paper "The Carbon Emissions of Writing and Illustrating Are Lower for AI"
 * (Tomlinson et al., 2024) + dati Google sustainability report 2024-2025.
 * I valori sono in kg CO₂eq per 1000 token. Modificabili.
 *
 * Modelli più grandi → più energia → più emissioni.
 */

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

/**
 * Rating europeo A-E sulle emissioni annuali (kg CO₂).
 * Allineato in modo qualitativo alle scale energy efficiency UE.
 */
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

/** Equivalenze per il report (umanizzano il dato CO2). */
export function carbonEquivalents(annualKg: number): {
  kmAuto: number
  alberiAnno: number
  smartphoneCariche: number
} {
  return {
    kmAuto: Math.round(annualKg / 0.12), // ~120 g CO2/km auto media UE
    alberiAnno: Math.round(annualKg / 21), // 1 albero adulto ~21 kg CO2/anno
    smartphoneCariche: Math.round(annualKg / 0.0084), // ~8.4g CO2 per carica
  }
}
