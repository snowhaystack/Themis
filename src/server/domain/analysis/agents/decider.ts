import { generateJson } from '@/server/infrastructure/gemini/client'
import type { UsageCollector } from '@/server/infrastructure/gemini/usage'
import {
  DeciderOutputSchema,
  type DeciderOutput,
  type DisambiguatorOutput,
  type AnalyzerOutput,
} from '@/shared/types'
import { MODEL_CATALOG } from '@/server/domain/analysis/data/catalog'

const SYSTEM = `You are AGENT 3 — DECISION-MAKER for an AI advisory system.

You receive the company profile (Agent 1) and the quantitative analysis (Agent 2, including multi-provider recommendations: Google, Anthropic, OpenAI).

Produce a set of executive DECISIONS balancing:
- Monthly / annual cost
- Reliability score
- Carbon footprint
- ROI in months
- Implementation risk
- Vendor diversification (don't tie everything to a single provider unless justified)

Categories for "category": "Model stack", "Rollout priority", "Team training", "Cost optimization", "Carbon optimization", "Risk mitigation", "Quick wins", "Vendor strategy".

You MUST respond with JSON exactly in this shape (camelCase, no markdown):

{
  "decisions": [
    {
      "category": "Model stack",
      "choice": "Adopt Gemini 2.5 Flash-Lite for tier-1 customer support, Claude Sonnet 4.6 for document analysis",
      "motivation": "Mixed-provider stack avoids vendor lock-in and uses each model's strength.",
      "tradeoffs": ["Two API contracts to maintain", "Slightly higher integration cost"],
      "realWorldExample": "Klarna runs Claude for high-risk replies and Gemini for high-volume FAQ."
    }
  ],
  "recommendedStack": ["gemini-2.5-flash-lite", "claude-sonnet-4-6"],
  "roiMonths": 8.5,
  "riskFactors": ["End-user adoption", "Hallucination on regulated content"],
  "carbonOptimizationTips": [
    "Cache repeated queries",
    "Route trivial tasks to budget-tier models",
    "Batch nightly processing in off-peak hours"
  ],
  "rationale": "3-5 sentence summary in English of your decisional line."
}

RULES:
- decisions.length between 5 and 8.
- Each decision has ALL fields: category, choice, motivation, tradeoffs (1-3 strings), realWorldExample.
- recommendedStack: array of model IDs from the catalog (mix providers when useful).
- Available catalog IDs: ${MODEL_CATALOG.map((m) => m.id).join(', ')}
- roiMonths: positive number.
- riskFactors: 2-4 strings.
- carbonOptimizationTips: 3-5 strings.
- rationale: 3-5 English sentences.

Reply in English. Only valid JSON.`

export async function runDecider(
  disambiguator: DisambiguatorOutput,
  analyzer: AnalyzerOutput,
  collector?: UsageCollector
): Promise<DeciderOutput> {
  const prompt = `COMPANY PROFILE (Agent 1):
${JSON.stringify(disambiguator, null, 2)}

QUANTITATIVE ANALYSIS (Agent 2):
${JSON.stringify(
  {
    useCases: analyzer.useCases.map((u) => ({
      name: u.name,
      primary: u.recommendedModel,
      alternatives: u.alternativeModels,
      reliability: u.reliabilityScore,
      monthlyCostEur: u.monthlyCostEur,
      monthlyCarbonKg: u.monthlyCarbonKg,
      carbonRating: u.carbonRating,
    })),
    totals: analyzer.totals,
  },
  null,
  2
)}

Produce a complete DeciderOutput JSON.`

  return generateJson<DeciderOutput>({
    model: 'gemini-pro-latest',
    fallbackModel: 'gemini-2.5-pro',
    systemInstruction: SYSTEM,
    prompt,
    schema: DeciderOutputSchema,
    temperature: 0.5,
    maxOutputTokens: 6000,
    label: 'AGENT3',
    collector,
  })
}
