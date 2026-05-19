import {
  type AnalyzerOutput,
  type DeciderOutput,
  type DisambiguatorOutput,
  type FinalReport,
  type PipelineUsage,
} from '@/shared/types'
import { MODEL_IDS } from '@/server/domain/analysis/data/catalog'
import { carbonRating } from '@/server/domain/analysis/data/carbon'

export interface SupervisorCheck {
  gate: string
  passed: boolean
  message: string
}

export interface SupervisorReport {
  checks: SupervisorCheck[]
  passed: number
  failed: number
  score: number
  completedAt: string
}

const VALID_MODEL_IDS = new Set(MODEL_IDS)

function check(gate: string, passed: boolean, message: string): SupervisorCheck {
  return { gate, passed, message }
}

export function checkDisambiguator(d: DisambiguatorOutput): SupervisorCheck[] {
  const checks: SupervisorCheck[] = []
  const roleSum = d.roles.reduce((s, r) => s + r.count, 0)

  checks.push(
    check(
      'disambiguator.activeUsers',
      d.activeUsers <= d.company.employeeCount,
      d.activeUsers <= d.company.employeeCount
        ? `Active users (${d.activeUsers}) ≤ employee count (${d.company.employeeCount})`
        : `Active users (${d.activeUsers}) exceeds employee count (${d.company.employeeCount})`
    )
  )

  checks.push(
    check(
      'disambiguator.roleCounts',
      roleSum <= d.company.employeeCount * 1.1,
      roleSum <= d.company.employeeCount * 1.1
        ? `Role headcount sum (${roleSum}) consistent with employee count (${d.company.employeeCount})`
        : `Role headcount sum (${roleSum}) exceeds employee count (${d.company.employeeCount})`
    )
  )

  checks.push(
    check(
      'disambiguator.useCases',
      d.useCases.length >= 1 && d.useCases.length <= 15,
      `${d.useCases.length} use cases identified`
    )
  )

  checks.push(
    check(
      'disambiguator.roles',
      d.roles.length >= 1,
      `${d.roles.length} roles defined`
    )
  )

  return checks
}

export function checkAnalyzer(
  a: AnalyzerOutput,
  d: DisambiguatorOutput
): SupervisorCheck[] {
  const checks: SupervisorCheck[] = []

  const ucCountMatch = a.useCases.length === d.useCases.length
  checks.push(
    check(
      'analyzer.useCaseCount',
      ucCountMatch,
      ucCountMatch
        ? `Use case count matches disambiguator (${a.useCases.length})`
        : `Analyzer has ${a.useCases.length} use cases but disambiguator has ${d.useCases.length}`
    )
  )

  const roleCountMatch = a.byRole.length === d.roles.length
  checks.push(
    check(
      'analyzer.roleCount',
      roleCountMatch,
      roleCountMatch
        ? `Role count matches disambiguator (${a.byRole.length})`
        : `Analyzer has ${a.byRole.length} role entries but disambiguator has ${d.roles.length}`
    )
  )

  const costPerEmployee = a.totals.monthlyCostEur / d.company.employeeCount
  const costReasonable = costPerEmployee >= 0.5 && costPerEmployee <= 500
  checks.push(
    check(
      'analyzer.costPerEmployee',
      costReasonable,
      costReasonable
        ? `Cost per employee €${costPerEmployee.toFixed(2)}/mo is within reasonable range`
        : `Cost per employee €${costPerEmployee.toFixed(2)}/mo seems ${costPerEmployee < 0.5 ? 'too low' : 'too high'}`
    )
  )

  const allModelsValid = a.useCases.every(
    (uc) =>
      VALID_MODEL_IDS.has(uc.recommendedModel.id) &&
      uc.alternativeModels.every((alt) => VALID_MODEL_IDS.has(alt.id))
  )
  checks.push(
    check(
      'analyzer.modelIds',
      allModelsValid,
      allModelsValid
        ? 'All recommended and alternative model IDs exist in catalog'
        : 'Some model IDs not found in catalog'
    )
  )

  const expectedRating = carbonRating(a.totals.annualCarbonKg)
  const ratingMatch = a.totals.overallCarbonRating === expectedRating
  checks.push(
    check(
      'analyzer.carbonRating',
      ratingMatch,
      ratingMatch
        ? `Carbon rating ${a.totals.overallCarbonRating} matches computed threshold for ${a.totals.annualCarbonKg.toFixed(1)} kg/yr`
        : `Carbon rating ${a.totals.overallCarbonRating} doesn't match expected ${expectedRating} for ${a.totals.annualCarbonKg.toFixed(1)} kg/yr`
    )
  )

  const sumCost = a.useCases.reduce((s, u) => s + u.monthlyCostEur, 0)
  const totalsDrift = Math.abs(a.totals.monthlyCostEur - sumCost) / Math.max(sumCost, 1)
  const totalsOk = totalsDrift <= 0.15
  checks.push(
    check(
      'analyzer.costTotals',
      totalsOk,
      totalsOk
        ? `Monthly cost totals consistent (drift ${(totalsDrift * 100).toFixed(1)}%)`
        : `Monthly cost totals diverge by ${(totalsDrift * 100).toFixed(1)}% — sum €${sumCost.toFixed(2)} vs stated €${a.totals.monthlyCostEur.toFixed(2)}`
    )
  )

  return checks
}

export function checkDecider(
  dec: DeciderOutput,
  a: AnalyzerOutput,
  d: DisambiguatorOutput
): SupervisorCheck[] {
  const checks: SupervisorCheck[] = []

  checks.push(
    check(
      'decider.decisionCount',
      dec.decisions.length >= 5,
      dec.decisions.length >= 5
        ? `${dec.decisions.length} strategic decisions (target: 5–8)`
        : `Only ${dec.decisions.length} decisions — expected at least 5`
    )
  )

  const roiOk = dec.roiMonths > 0 && dec.roiMonths <= 120
  checks.push(
    check(
      'decider.roiRange',
      roiOk,
      roiOk
        ? `ROI horizon ${dec.roiMonths} months is plausible`
        : `ROI horizon ${dec.roiMonths} months is outside 0–120 range`
    )
  )

  checks.push(
    check(
      'decider.riskFactors',
      dec.riskFactors.length >= 2,
      dec.riskFactors.length >= 2
        ? `${dec.riskFactors.length} risk factors identified`
        : `Only ${dec.riskFactors.length} risk factor(s) — expected at least 2`
    )
  )

  const needsCarbonTips =
    a.totals.overallCarbonRating === 'C' ||
    a.totals.overallCarbonRating === 'D' ||
    a.totals.overallCarbonRating === 'E'
  if (needsCarbonTips) {
    checks.push(
      check(
        'decider.carbonTips',
        dec.carbonOptimizationTips.length >= 1,
        dec.carbonOptimizationTips.length >= 1
          ? `${dec.carbonOptimizationTips.length} carbon optimization tips for rating ${a.totals.overallCarbonRating}`
          : `No carbon tips despite rating ${a.totals.overallCarbonRating}`
      )
    )
  }

  const substantiveRisks = dec.riskFactors.every((r) => r.length >= 10)
  checks.push(
    check(
      'decider.riskSubstance',
      substantiveRisks,
      substantiveRisks
        ? 'All risk factors are substantive'
        : 'Some risk factors are too brief to be useful'
    )
  )

  return checks
}

export function checkReport(
  report: FinalReport,
  dec: DeciderOutput,
  a: AnalyzerOutput
): SupervisorCheck[] {
  const checks: SupervisorCheck[] = []

  checks.push(
    check(
      'report.sectionCount',
      report.sections.length >= 5,
      report.sections.length >= 5
        ? `${report.sections.length} report sections`
        : `Only ${report.sections.length} sections — expected at least 5`
    )
  )

  const hasChart = report.sections.some((s) => s.type === 'chart')
  checks.push(
    check(
      'report.hasChart',
      hasChart,
      hasChart
        ? 'Report includes at least one chart section'
        : 'Report has no chart sections — visual data is expected'
    )
  )

  const ratingMatch = report.carbonRating === a.totals.overallCarbonRating
  checks.push(
    check(
      'report.carbonConsistency',
      ratingMatch,
      ratingMatch
        ? `Report carbon rating (${report.carbonRating}) matches analyzer`
        : `Report carbon rating (${report.carbonRating}) doesn't match analyzer (${a.totals.overallCarbonRating})`
    )
  )

  checks.push(
    check(
      'report.recommendations',
      report.recommendations.length >= 3,
      report.recommendations.length >= 3
        ? `${report.recommendations.length} recommendations`
        : `Only ${report.recommendations.length} recommendation(s) — expected at least 3`
    )
  )

  const summaryLength = report.executiveSummary.length
  checks.push(
    check(
      'report.summaryLength',
      summaryLength >= 100,
      summaryLength >= 100
        ? `Executive summary is ${summaryLength} chars — adequate`
        : `Executive summary is only ${summaryLength} chars — may be too brief`
    )
  )

  checks.push(
    check(
      'report.benchmarks',
      report.benchmarks.length >= 1,
      report.benchmarks.length >= 1
        ? `${report.benchmarks.length} benchmark case studies included`
        : 'No benchmark case studies — expected at least 1'
    )
  )

  return checks
}

export function checkPipelineConsistency(
  usage: PipelineUsage,
  a: AnalyzerOutput
): SupervisorCheck[] {
  const checks: SupervisorCheck[] = []

  const pipelineCarbonKg = (usage.totals.total / 1000) * 0.0003
  const projectedAnnualKg = a.totals.annualCarbonKg

  checks.push(
    check(
      'pipeline.carbonVsProjected',
      pipelineCarbonKg < projectedAnnualKg,
      pipelineCarbonKg < projectedAnnualKg
        ? `Pipeline carbon (${pipelineCarbonKg.toFixed(4)} kg) is far below projected annual (${projectedAnnualKg.toFixed(1)} kg) — consistent`
        : `Pipeline carbon (${pipelineCarbonKg.toFixed(4)} kg) exceeds projected annual (${projectedAnnualKg.toFixed(1)} kg) — inconsistent`
    )
  )

  const entryTotalTokens = usage.entries.reduce((s, e) => s + e.usage.total, 0)
  const tokenSumMatch = Math.abs(entryTotalTokens - usage.totals.total) <= 1
  checks.push(
    check(
      'pipeline.tokenSumConsistency',
      tokenSumMatch,
      tokenSumMatch
        ? `Token sum across agents (${entryTotalTokens.toLocaleString()}) matches pipeline total (${usage.totals.total.toLocaleString()})`
        : `Token sum across agents (${entryTotalTokens.toLocaleString()}) doesn't match pipeline total (${usage.totals.total.toLocaleString()})`
    )
  )

  const treeHours = pipelineCarbonKg / (21 / 365 / 24)
  const treeMins = Math.round(treeHours * 60)
  checks.push(
    check(
      'pipeline.treeTimeReasonable',
      treeMins < 60 * 24,
      treeMins < 60 * 24
        ? `Tree compensation for pipeline: ${treeMins}m from ${usage.totals.total.toLocaleString()} tokens — reasonable`
        : `Tree compensation for pipeline: ${treeMins}m — unexpectedly high for a single report generation`
    )
  )

  return checks
}

export function buildSupervisorReport(checks: SupervisorCheck[]): SupervisorReport {
  const passed = checks.filter((c) => c.passed).length
  const failed = checks.length - passed
  return {
    checks,
    passed,
    failed,
    score: checks.length > 0 ? Math.round((passed / checks.length) * 100) : 100,
    completedAt: new Date().toISOString(),
  }
}
