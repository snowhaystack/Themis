import { SchemaType, type Schema } from '@google/generative-ai'
import { generateJson } from '@/lib/gemini/client'
import {
  AnalyzerOutputSchema,
  type AnalyzerOutput,
  type DisambiguatorOutput,
  type CarbonRating,
} from '@/lib/types'
import {
  MODEL_CATALOG,
  MODEL_IDS,
  PROVIDERS,
  EUR_USD_RATE,
  estimateMonthlyTokensPerUser,
  getModel,
  findAlternatives,
} from '@/lib/data/catalog'
import { carbonRating } from '@/lib/data/carbon'

const SYSTEM = `You are AGENT 2 — ANALYZER for an AI advisory system.

You receive a company profile and must produce a complete quantitative analysis in JSON.

CROSS-PROVIDER MODEL CATALOG (you MUST pick from this list — one primary + 1-2 alternatives per use case from a DIFFERENT provider when one exists in the same tier):

${MODEL_CATALOG.map(
  (m) =>
    `• ${m.id} (${m.provider}, ${m.tier}) — $${m.blendedPer1M}/1M blended, ${m.carbonPer1KTokensKg} kg CO₂/1k tok. Best for: ${m.bestFor.join(', ')}. ${m.notes}`
).join('\n')}

For EACH use case identified by the user:
- Pick the BEST PRIMARY model from the catalog. Match by use case fit + cost sensitivity.
- Pick 1-2 ALTERNATIVE models from a DIFFERENT provider in the same tier. The user should see options across vendors (Google + Anthropic + OpenAI).
- Compute monthly token usage based on the PRE-COMPUTED token totals you receive (DO NOT invent token numbers).
- Compute monthly EUR cost: (tokens / 1,000,000) × blendedPer1M × ${EUR_USD_RATE}.
- Compute monthly carbon: (tokens / 1000) × carbonPer1KTokensKg.
- Reliability score 0-10 with short rationale.

For EACH role in byRole, you MUST also produce:
- estimatedImpact: a single concrete sentence with a QUANTIFIED expected outcome (e.g. "≈ 4 hours saved per analyst per week on document review" or "20-30% reduction in mean ticket resolution time"). Tie it to what AI can realistically do for that role.
- impactRationale: a single sentence explaining WHY this impact applies to that specific role (what tasks AI replaces or augments).
- impactLevel: "high" / "medium" / "low" based on the magnitude of expected benefit (high = significant time savings or new capability; low = incremental quality-of-life).

Totals: sum all use cases. carbonRating thresholds (annual kg CO₂):
A ≤ 50, B ≤ 200, C ≤ 500, D ≤ 1500, E > 1500.

MUST return JSON exactly in this shape (camelCase, no markdown):

{
  "useCases": [
    {
      "id": "uc-1",
      "name": "customer_support",
      "description": "Tier-1 ticket triage bot",
      "recommendedModel": {
        "id": "gemini-2.5-flash-lite",
        "name": "Gemini 2.5 Flash-Lite",
        "provider": "google",
        "rationale": "Cheapest high-volume option, latency under 1s."
      },
      "alternativeModels": [
        {
          "id": "claude-haiku-4-5",
          "name": "Claude Haiku 4.5",
          "provider": "anthropic",
          "rationale": "Best instruction-following at budget tier; choose if you need stricter tone control."
        },
        {
          "id": "gpt-5-mini",
          "name": "GPT-5 Mini",
          "provider": "openai",
          "rationale": "Good multi-language support across EU markets."
        }
      ],
      "reliabilityScore": 8.5,
      "rationale": "High-volume standardized responses — budget tier is sufficient.",
      "monthlyTokens": 1500000,
      "monthlyCostEur": 0.35,
      "annualCostEur": 4.14,
      "monthlyCarbonKg": 0.225,
      "annualCarbonKg": 2.7,
      "carbonRating": "A"
    }
  ],
  "byRole": [
    {
      "role": "developer",
      "count": 5,
      "monthlyTokens": 550000,
      "monthlyCostEur": 0.13,
      "estimatedImpact": "≈ 6 hours saved per developer per week on routine coding and code review",
      "impactRationale": "AI copilots handle scaffolding, refactors and test stubs that currently consume ~15% of dev time, redirecting effort to harder problems.",
      "impactLevel": "high"
    }
  ],
  "totals": {
    "monthlyTokens": 2000000,
    "monthlyCostEur": 0.5,
    "annualCostEur": 6.0,
    "monthlyCarbonKg": 0.3,
    "annualCarbonKg": 3.6,
    "overallCarbonRating": "A"
  },
  "notes": "Optional commentary on edge cases."
}

ALL fields above are required (except "notes"). Numeric fields are numbers, not strings.
recommendedModel.id and alternativeModels[*].id MUST be one of the catalog IDs above.
Reply in English. SOLO JSON.`

const MODEL_REC_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    id: { type: SchemaType.STRING, enum: [...MODEL_IDS] },
    name: { type: SchemaType.STRING },
    provider: { type: SchemaType.STRING, enum: [...PROVIDERS] },
    rationale: { type: SchemaType.STRING },
  },
  required: ['id', 'name', 'provider', 'rationale'],
}

const ANALYZER_RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    useCases: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          name: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
          recommendedModel: MODEL_REC_SCHEMA,
          alternativeModels: {
            type: SchemaType.ARRAY,
            items: MODEL_REC_SCHEMA,
          },
          reliabilityScore: { type: SchemaType.NUMBER },
          rationale: { type: SchemaType.STRING },
          monthlyTokens: { type: SchemaType.NUMBER },
          monthlyCostEur: { type: SchemaType.NUMBER },
          annualCostEur: { type: SchemaType.NUMBER },
          monthlyCarbonKg: { type: SchemaType.NUMBER },
          annualCarbonKg: { type: SchemaType.NUMBER },
          carbonRating: {
            type: SchemaType.STRING,
            enum: ['A', 'B', 'C', 'D', 'E'],
          },
        },
        required: [
          'id',
          'name',
          'description',
          'recommendedModel',
          'alternativeModels',
          'reliabilityScore',
          'rationale',
          'monthlyTokens',
          'monthlyCostEur',
          'annualCostEur',
          'monthlyCarbonKg',
          'annualCarbonKg',
          'carbonRating',
        ],
      },
    },
    byRole: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          role: { type: SchemaType.STRING },
          count: { type: SchemaType.INTEGER },
          monthlyTokens: { type: SchemaType.NUMBER },
          monthlyCostEur: { type: SchemaType.NUMBER },
          estimatedImpact: {
            type: SchemaType.STRING,
            description:
              'Single concrete sentence with a quantified expected outcome (e.g. "≈ 4 hours/week saved").',
          },
          impactRationale: {
            type: SchemaType.STRING,
            description:
              'Single sentence explaining WHY this impact applies to this role.',
          },
          impactLevel: {
            type: SchemaType.STRING,
            enum: ['high', 'medium', 'low'],
          },
        },
        required: [
          'role',
          'count',
          'monthlyTokens',
          'monthlyCostEur',
          'estimatedImpact',
          'impactRationale',
          'impactLevel',
        ],
      },
    },
    totals: {
      type: SchemaType.OBJECT,
      properties: {
        monthlyTokens: { type: SchemaType.NUMBER },
        monthlyCostEur: { type: SchemaType.NUMBER },
        annualCostEur: { type: SchemaType.NUMBER },
        monthlyCarbonKg: { type: SchemaType.NUMBER },
        annualCarbonKg: { type: SchemaType.NUMBER },
        overallCarbonRating: {
          type: SchemaType.STRING,
          enum: ['A', 'B', 'C', 'D', 'E'],
        },
      },
      required: [
        'monthlyTokens',
        'monthlyCostEur',
        'annualCostEur',
        'monthlyCarbonKg',
        'annualCarbonKg',
        'overallCarbonRating',
      ],
    },
    notes: { type: SchemaType.STRING },
  },
  required: ['useCases', 'byRole', 'totals'],
}

function totalMonthlyTokens(d: DisambiguatorOutput): {
  total: number
  byRole: Array<{ role: string; count: number; monthlyTokens: number }>
} {
  const byRole = d.roles.map((r) => {
    const perUser = estimateMonthlyTokensPerUser(r.frequency, r.techLiteracy)
    return {
      role: r.title,
      count: r.count,
      monthlyTokens: perUser * r.count,
    }
  })
  const total = byRole.reduce((s, x) => s + x.monthlyTokens, 0)
  return { total, byRole }
}

import type { UsageCollector } from '@/lib/gemini/usage'

export async function runAnalyzer(
  d: DisambiguatorOutput,
  collector?: UsageCollector
): Promise<AnalyzerOutput> {
  const { total: totalTokens, byRole } = totalMonthlyTokens(d)

  const prompt = `COMPANY PROFILE:
${JSON.stringify(d, null, 2)}

TOTAL ESTIMATED MONTHLY TOKENS: ${totalTokens.toLocaleString('en-US')}

BREAKDOWN BY ROLE:
${byRole
  .map(
    (r) =>
      `- ${r.role} (${r.count} users): ${r.monthlyTokens.toLocaleString('en-US')} tokens/month`
  )
  .join('\n')}

EUR/USD conversion: ${EUR_USD_RATE}

For EACH user-selected use case (${d.useCases.join(', ')}):
- Pick a PRIMARY model from the catalog (best fit).
- Pick 1-2 ALTERNATIVES from DIFFERENT providers in the same tier when available.
- Compute all numeric fields using the catalog values, NOT made-up numbers.

Return ONE complete AnalyzerOutput JSON.`

  return generateJson<AnalyzerOutput>({
    model: 'gemini-pro-latest',
    fallbackModel: 'gemini-2.5-pro',
    systemInstruction: SYSTEM,
    prompt,
    schema: AnalyzerOutputSchema,
    responseSchema: ANALYZER_RESPONSE_SCHEMA,
    temperature: 0.3,
    maxOutputTokens: 12000,
    label: 'AGENT2',
    collector,
  })
}

// Deterministic fallback if Gemini is unreachable.
export function fallbackAnalyzer(d: DisambiguatorOutput): AnalyzerOutput {
  const { total, byRole } = totalMonthlyTokens(d)
  const primary = getModel('gemini-2.5-flash-lite')!
  const alternatives = findAlternatives(primary.id, 2)

  const perCase = Math.round(total / Math.max(1, d.useCases.length))
  const useCases = d.useCases.map((uc, i) => {
    const monthlyTokens = perCase
    const monthlyCostEur = Number(
      ((monthlyTokens / 1_000_000) * primary.blendedPer1M * EUR_USD_RATE).toFixed(4)
    )
    const monthlyCarbonKg = Number(
      ((monthlyTokens / 1000) * primary.carbonPer1KTokensKg).toFixed(4)
    )
    const annualCarbonKg = Number((monthlyCarbonKg * 12).toFixed(4))
    return {
      id: `uc-${i + 1}`,
      name: uc,
      description: `Use case: ${uc}`,
      recommendedModel: {
        id: primary.id,
        name: primary.name,
        provider: primary.provider,
        rationale: 'Deterministic fallback — cheapest balanced option.',
      },
      alternativeModels: alternatives.map((m) => ({
        id: m.id,
        name: m.name,
        provider: m.provider,
        rationale: 'Equivalent-tier alternative from a different provider.',
      })),
      reliabilityScore: 7,
      rationale: 'Fallback output (Gemini unreachable).',
      monthlyTokens,
      monthlyCostEur,
      annualCostEur: Number((monthlyCostEur * 12).toFixed(4)),
      monthlyCarbonKg,
      annualCarbonKg,
      carbonRating: carbonRating(annualCarbonKg) as CarbonRating,
    }
  })

  const totalMonthly = useCases.reduce((s, u) => s + u.monthlyCostEur, 0)
  const totalCarbon = useCases.reduce((s, u) => s + u.monthlyCarbonKg, 0)

  return {
    useCases,
    byRole: byRole.map((r) => ({
      role: r.role,
      count: r.count,
      monthlyTokens: r.monthlyTokens,
      monthlyCostEur: Number(
        ((r.monthlyTokens / 1_000_000) * primary.blendedPer1M * EUR_USD_RATE).toFixed(4)
      ),
      estimatedImpact: 'Estimated 5-10% productivity gain on routine work.',
      impactRationale:
        'Fallback default: AI handles repetitive tasks for this role.',
      impactLevel: 'medium' as const,
    })),
    totals: {
      monthlyTokens: total,
      monthlyCostEur: Number(totalMonthly.toFixed(2)),
      annualCostEur: Number((totalMonthly * 12).toFixed(2)),
      monthlyCarbonKg: Number(totalCarbon.toFixed(4)),
      annualCarbonKg: Number((totalCarbon * 12).toFixed(4)),
      overallCarbonRating: carbonRating(totalCarbon * 12),
    },
    notes: 'Output produced in fallback mode.',
  }
}
