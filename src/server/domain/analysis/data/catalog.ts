export type ModelProvider = 'google' | 'anthropic' | 'openai'
export type ModelTier = 'budget' | 'balanced' | 'premium'

export interface ModelInfo {
  id: string
  name: string
  provider: ModelProvider
  tier: ModelTier
  inputPer1M: number
  outputPer1M: number
  blendedPer1M: number
  carbonPer1KTokensKg: number
  bestFor: string[]
  notes: string
}

export const MODEL_CATALOG: ModelInfo[] = [
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash-Lite',
    provider: 'google',
    tier: 'budget',
    inputPer1M: 0.1,
    outputPer1M: 0.4,
    blendedPer1M: 0.25,
    carbonPer1KTokensKg: 0.00015,
    bestFor: ['customer_support', 'helper_dipendenti', 'high_volume', 'classification'],
    notes: 'Cheapest Google option. Best for high-volume, low-complexity tasks.',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    tier: 'balanced',
    inputPer1M: 0.3,
    outputPer1M: 2.5,
    blendedPer1M: 1.4,
    carbonPer1KTokensKg: 0.0003,
    bestFor: ['analisi_documenti', 'multimodal', 'analisi_immagini', 'analisi_audio'],
    notes: 'Strong general-purpose model with native multimodal input.',
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    tier: 'premium',
    inputPer1M: 1.25,
    outputPer1M: 10.0,
    blendedPer1M: 5.625,
    carbonPer1KTokensKg: 0.0008,
    bestFor: ['decisioni', 'sviluppo_software', 'reasoning', 'long_context'],
    notes: 'Largest Google context window (2M tokens). Best for deep reasoning.',
  },
  {
    id: 'claude-haiku-4-5',
    name: 'Claude Haiku 4.5',
    provider: 'anthropic',
    tier: 'budget',
    inputPer1M: 1.0,
    outputPer1M: 5.0,
    blendedPer1M: 3.0,
    carbonPer1KTokensKg: 0.00025,
    bestFor: ['customer_support', 'helper_dipendenti', 'classification'],
    notes: 'Fast and inexpensive — strong instruction following at low cost.',
  },
  {
    id: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6',
    provider: 'anthropic',
    tier: 'balanced',
    inputPer1M: 3.0,
    outputPer1M: 15.0,
    blendedPer1M: 9.0,
    carbonPer1KTokensKg: 0.0005,
    bestFor: ['analisi_documenti', 'sviluppo_software', 'reasoning'],
    notes: 'Industry-leading code generation and structured-output quality.',
  },
  {
    id: 'claude-opus-4-7',
    name: 'Claude Opus 4.7',
    provider: 'anthropic',
    tier: 'premium',
    inputPer1M: 15.0,
    outputPer1M: 75.0,
    blendedPer1M: 45.0,
    carbonPer1KTokensKg: 0.0015,
    bestFor: ['decisioni', 'long_context', 'reasoning', 'research'],
    notes: 'Top-of-line Anthropic reasoning — 1M context. Premium-tier cost.',
  },
  {
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: 'openai',
    tier: 'budget',
    inputPer1M: 0.25,
    outputPer1M: 2.0,
    blendedPer1M: 1.125,
    carbonPer1KTokensKg: 0.0002,
    bestFor: ['customer_support', 'helper_dipendenti', 'high_volume'],
    notes: 'Cost-effective workhorse. Good for assistants and helper agents.',
  },
  {
    id: 'gpt-5',
    name: 'GPT-5',
    provider: 'openai',
    tier: 'balanced',
    inputPer1M: 1.25,
    outputPer1M: 10.0,
    blendedPer1M: 5.625,
    carbonPer1KTokensKg: 0.0006,
    bestFor: ['analisi_documenti', 'sviluppo_software', 'multimodal'],
    notes: 'OpenAI flagship general model with strong multimodal support.',
  },
  {
    id: 'gpt-5-pro',
    name: 'GPT-5 Pro',
    provider: 'openai',
    tier: 'premium',
    inputPer1M: 15.0,
    outputPer1M: 120.0,
    blendedPer1M: 67.5,
    carbonPer1KTokensKg: 0.0025,
    bestFor: ['decisioni', 'reasoning', 'research'],
    notes: 'Deep-reasoning, slower output. Use for high-stakes one-shot analysis.',
  },
]

export const MODEL_IDS = MODEL_CATALOG.map((m) => m.id)
export const PROVIDERS = ['google', 'anthropic', 'openai'] as const

export function getModel(id: string): ModelInfo | undefined {
  return MODEL_CATALOG.find((m) => m.id === id)
}

export function findAlternatives(primaryId: string, n = 2): ModelInfo[] {
  const primary = getModel(primaryId)
  if (!primary) return []
  return MODEL_CATALOG.filter(
    (m) => m.id !== primary.id && m.tier === primary.tier
  ).slice(0, n)
}

export const TOKENS_PER_DAY: Record<'daily' | 'weekly' | 'rarely', number> = {
  daily: 5000,
  weekly: 1500,
  rarely: 300,
}

export const DAYS_PER_MONTH = 22

export const LITERACY_EFFICIENCY: Record<'low' | 'medium' | 'high', number> = {
  high: 0.9,
  medium: 0.65,
  low: 0.4,
}

export const EUR_USD_RATE = 0.92

export function estimateMonthlyTokensPerUser(
  frequency: keyof typeof TOKENS_PER_DAY,
  literacy: keyof typeof LITERACY_EFFICIENCY
): number {
  const baseDaily = TOKENS_PER_DAY[frequency]
  const efficiency = LITERACY_EFFICIENCY[literacy]
  const dailyAdjusted = baseDaily / efficiency
  return Math.round(dailyAdjusted * DAYS_PER_MONTH)
}

export function blendedCostEur(modelId: string, tokens: number): number {
  const m = getModel(modelId)
  if (!m) return 0
  const usd = (tokens / 1_000_000) * m.blendedPer1M
  return Number((usd * EUR_USD_RATE).toFixed(4))
}

export function carbonKg(modelId: string, tokens: number): number {
  const m = getModel(modelId)
  if (!m) return 0
  return Number(((tokens / 1000) * m.carbonPer1KTokensKg).toFixed(4))
}
