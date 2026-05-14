import { generateJson } from '@/lib/gemini/client'
import type { UsageCollector } from '@/lib/gemini/usage'
import {
  FinalReportSchema,
  type FinalReport,
  type DisambiguatorOutput,
  type AnalyzerOutput,
  type DeciderOutput,
} from '@/lib/types'
import { pickBenchmarks } from '@/lib/data/benchmarks'
import { carbonEquivalents } from '@/lib/data/carbon'

const SYSTEM = `You are AGENT 4 — FORMATTER for an AI advisory system.

You receive all previous agent outputs and produce a final executive REPORT, in English, ready for frontend rendering.

You MUST respond with JSON exactly in this shape (camelCase, no markdown):

{
  "executiveSummary": "4-6 punchy sentences in McKinsey/BCG style that cite the annual cost, ROI, CO₂ rating, and the multi-provider stack.",
  "sections": [
    {
      "type": "stats",
      "title": "Key metrics",
      "items": [
        { "label": "Annual cost", "value": "€ 28,000", "emphasis": true },
        { "label": "ROI", "value": "8.5 months" }
      ]
    },
    {
      "type": "list",
      "title": "Quick wins",
      "items": ["Automate Tier-1 support in 30 days", "Cut onboarding time by 35%"]
    },
    {
      "type": "chart",
      "title": "Monthly cost by use case (€)",
      "chartType": "bar",
      "data": [
        { "label": "Customer support", "value": 1240 },
        { "label": "Document analysis", "value": 760 }
      ]
    },
    {
      "type": "comparison",
      "title": "Recommended stack vs alternatives",
      "columns": ["Provider", "Cost / 1M tok", "Reliability", "Carbon"],
      "rows": [
        { "name": "Gemini 2.5 Flash-Lite", "values": ["Google", "€ 0.23", "8/10", "A"] },
        { "name": "Claude Haiku 4.5",      "values": ["Anthropic", "€ 2.76", "9/10", "B"] }
      ]
    },
    {
      "type": "text",
      "title": "Strategic context",
      "content": "Narrative paragraph in English."
    }
  ],
  "benchmarks": [
    { "company": "Klarna", "useCase": "customer_support", "outcome": "2/3 of tickets handled by AI, -82% mean resolution time", "source": "Klarna press release Feb 2024" }
  ],
  "recommendations": [
    { "title": "8-week pilot on customer support", "description": "What to do, how to measure", "reasoning": "Why it's the right priority" }
  ],
  "carbonRating": "B",
  "generatedAt": "2026-05-14T16:00:00.000Z"
}

RULES:
- sections.length between 5 and 10. Use DIFFERENT types (alternate stats, list, chart, comparison, text).
- Each section ALWAYS has "type" and "title".
- Type-specific fields:
  • "stats" → "items" (array of {label, value, optional unit, optional emphasis})
  • "list"  → "items" (array of strings)
  • "chart" → "chartType" ("bar"|"pie") and "data" (array of {label: string, value: number})
  • "comparison" → "columns" (string[]), "rows" (array of {name, values})
  • "text"  → "content" (string)
- AT LEAST ONE section MUST be a "comparison" that compares the recommended Google model with Anthropic/OpenAI alternatives (4 columns: Provider / Cost / Reliability / Carbon).
- benchmarks: array of 2-3 elements with company, useCase, outcome, source.
- recommendations: array of 3-5 elements with title, description, reasoning.
- carbonRating: always one of "A","B","C","D","E".
- generatedAt: ISO 8601 string.
- Stats values are formatted strings ("€ 1,245", "8.5 months", "Rating B").
- Chart data values are NUMBERS, not strings.

Reply in English. Only valid JSON.`

export async function runFormatter(
  args: {
    disambiguator: DisambiguatorOutput
    analyzer: AnalyzerOutput
    decider: DeciderOutput
  },
  collector?: UsageCollector
): Promise<FinalReport> {
  const { disambiguator, analyzer, decider } = args
  const benchmarks = pickBenchmarks(
    disambiguator.company.sector,
    disambiguator.useCases,
    3
  )
  const equiv = carbonEquivalents(analyzer.totals.annualCarbonKg)

  const prompt = `FULL CONTEXT:

[AGENT 1 — Profile]
${JSON.stringify(disambiguator, null, 2)}

[AGENT 2 — Analysis]
${JSON.stringify(analyzer, null, 2)}

[AGENT 3 — Decisions]
${JSON.stringify(decider, null, 2)}

[BENCHMARKS available]
${JSON.stringify(benchmarks, null, 2)}

[CARBON EQUIVALENCES]
- ${analyzer.totals.annualCarbonKg.toFixed(2)} kg CO₂/year ≈ ${equiv.kmAuto.toLocaleString('en-US')} km by car, ${equiv.alberiAnno} trees/year, ${equiv.smartphoneCariche.toLocaleString('en-US')} smartphone charges

Produce one complete FinalReport JSON. Current timestamp: ${new Date().toISOString()}`

  return generateJson<FinalReport>({
    model: 'gemini-flash-latest',
    fallbackModel: 'gemini-2.5-flash-lite',
    systemInstruction: SYSTEM,
    prompt,
    schema: FinalReportSchema,
    temperature: 0.5,
    maxOutputTokens: 10000,
    label: 'AGENT4',
    collector,
  })
}
