import {
  type AnalyzerOutput,
  type DeciderOutput,
  type DisambiguatorOutput,
} from '@/shared/types'
import { MODEL_CATALOG, MODEL_IDS } from '@/server/domain/analysis/data/catalog'
import { carbonRating } from '@/server/domain/analysis/data/carbon'

export interface EvalResult {
  ok: boolean
  issues: string[]
}

const VALID_MODEL_IDS = new Set(MODEL_IDS)

// recommendedStack may reference a model by id OR display name — accept both.
const VALID_STACK_REFS = new Set(
  MODEL_CATALOG.flatMap((m) => [m.id.toLowerCase(), m.name.toLowerCase()])
)

/** Generous coherence test: passes unless `actual` is grossly off `expected`. */
function roughlyEqual(
  actual: number,
  expected: number,
  relTol = 0.15,
  absFloor = 1
): boolean {
  return Math.abs(actual - expected) <= Math.max(absFloor, expected * relTol)
}

/**
 * Deterministic sanity check on the Analyzer output — no LLM call.
 * Catches the failures that would poison the Decider downstream:
 * hallucinated model ids, dropped roles, totals that don't add up.
 */
export function evaluateAnalyzer(
  output: AnalyzerOutput,
  disambiguator: DisambiguatorOutput
): EvalResult {
  const issues: string[] = []

  // 1) Every recommended / alternative model must exist in the catalog.
  for (const uc of output.useCases) {
    if (!VALID_MODEL_IDS.has(uc.recommendedModel.id)) {
      issues.push(
        `use case "${uc.name}": unknown primary model "${uc.recommendedModel.id}"`
      )
    }
    for (const alt of uc.alternativeModels) {
      if (!VALID_MODEL_IDS.has(alt.id)) {
        issues.push(
          `use case "${uc.name}": unknown alternative model "${alt.id}"`
        )
      }
    }
  }

  // 2) Every company role must appear in the per-role breakdown.
  if (output.byRole.length !== disambiguator.roles.length) {
    issues.push(
      `byRole has ${output.byRole.length} entries but the company has ${disambiguator.roles.length} roles`
    )
  }

  // 3) Use-case figures must add up to the stated totals.
  const sumCost = output.useCases.reduce((s, u) => s + u.monthlyCostEur, 0)
  if (!roughlyEqual(output.totals.monthlyCostEur, sumCost)) {
    issues.push(
      `totals.monthlyCostEur (${output.totals.monthlyCostEur}) ≠ sum of use cases (${sumCost.toFixed(2)})`
    )
  }
  const sumTokens = output.useCases.reduce((s, u) => s + u.monthlyTokens, 0)
  if (!roughlyEqual(output.totals.monthlyTokens, sumTokens, 0.15, 1000)) {
    issues.push(
      `totals.monthlyTokens (${output.totals.monthlyTokens}) ≠ sum of use cases (${sumTokens})`
    )
  }

  // 4) Annual figures must be ~12× the monthly ones.
  for (const uc of output.useCases) {
    if (!roughlyEqual(uc.annualCostEur, uc.monthlyCostEur * 12, 0.1)) {
      issues.push(
        `use case "${uc.name}": annualCostEur (${uc.annualCostEur}) is not ~12× monthlyCostEur (${uc.monthlyCostEur})`
      )
    }
  }

  // 5) Carbon rating must match the computed threshold.
  const expectedRating = carbonRating(output.totals.annualCarbonKg)
  if (output.totals.overallCarbonRating !== expectedRating) {
    issues.push(
      `overallCarbonRating "${output.totals.overallCarbonRating}" ≠ computed "${expectedRating}" for ${output.totals.annualCarbonKg} kg/yr`
    )
  }

  return { ok: issues.length === 0, issues }
}

/**
 * Deterministic sanity check on the Decider output — no LLM call.
 * Catches a stack that references models outside the catalog and an
 * implausible ROI horizon before they reach the report.
 */
export function evaluateDecider(output: DeciderOutput): EvalResult {
  const issues: string[] = []

  // 1) recommendedStack must reference real catalog models.
  for (const ref of output.recommendedStack) {
    if (!VALID_STACK_REFS.has(ref.toLowerCase())) {
      issues.push(`recommendedStack references unknown model "${ref}"`)
    }
  }

  // 2) Decision count: the brief asks for 5-8 — flag gross under-delivery.
  if (output.decisions.length < 3) {
    issues.push(
      `only ${output.decisions.length} decisions (expected at least 3)`
    )
  }

  // 3) ROI must be a sane positive horizon (0-120 months).
  if (output.roiMonths <= 0 || output.roiMonths > 120) {
    issues.push(
      `roiMonths ${output.roiMonths} is outside a plausible 0-120 month range`
    )
  }

  return { ok: issues.length === 0, issues }
}
