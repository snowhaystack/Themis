'use client'

import type {
  FinalReport,
  AnalyzerOutput,
  DeciderOutput,
  DisambiguatorOutput,
  PipelineUsage,
  ReportSection,
  SupervisorReport,
} from '@/shared/types'
import { StatsCard } from './StatsCard'
import { CarbonHero } from './CarbonHero'
import { CostBreakdown } from './CostBreakdown'
import { DecisionCard } from './DecisionCard'
import { RoleImpact } from './RoleImpact'
import { humanize, formatEur } from '@/shared/utils/format'

interface Props {
  report: FinalReport
  analyzer: AnalyzerOutput
  decider: DeciderOutput
  disambiguator: DisambiguatorOutput
  supervisor?: SupervisorReport
  pipelineUsage?: PipelineUsage
}

const SIZE_LABEL: Record<DisambiguatorOutput['company']['size'], string> = {
  artigiano: 'Micro (1–9)',
  piccola_azienda: 'Small (10–49)',
  media_azienda: 'Mid-size (50–249)',
  enterprise: 'Enterprise (250+)',
}

const SECTOR_LABEL: Record<string, string> = {
  manifatturiero: 'Manufacturing',
  fintech: 'Fintech',
  retail: 'Retail',
  sanitario: 'Healthcare',
  education: 'Education',
  servizi_professionali: 'Professional services',
  logistica: 'Logistics',
  energia_utilities: 'Energy / Utilities',
  agritech: 'Agritech',
  media_entertainment: 'Media / Entertainment',
  pubblica_amministrazione: 'Public administration',
  altro: 'Other',
}

function ProfileStat({
  label,
  value,
  sub,
  emphasis,
}: {
  label: string
  value: string
  sub?: string
  emphasis?: boolean
}) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-2">
        {label}
      </p>
      <p
        className={`mt-1 font-display text-base sm:text-xl font-semibold leading-tight ${
          emphasis ? 'text-gradient' : 'text-fg'
        }`}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 truncate text-[11px] text-muted">{sub}</p>
      )}
    </div>
  )
}

function SectionRenderer({ section }: { section: ReportSection }) {
  switch (section.type) {
    case 'text':
      return (
        <div className="card">
          <h3 className="mb-2 text-sm font-semibold text-fg">
            {section.title}
          </h3>
          <p className="whitespace-pre-line text-sm text-muted">
            {section.content}
          </p>
        </div>
      )
    case 'stats':
      return <StatsCard title={section.title} items={section.items} />
    case 'list':
      return (
        <div className="card">
          <h3 className="mb-3 text-sm font-semibold text-fg">
            {section.title}
          </h3>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted">
            {section.items.map((it, i) => (
              <li key={i}>{it}</li>
            ))}
          </ul>
        </div>
      )
    case 'chart': {
      const max = Math.max(...section.data.map((d) => d.value), 0.0001)
      return (
        <div className="card">
          <h3 className="mb-4 text-sm font-semibold text-fg">
            {section.title}
          </h3>
          <div className="space-y-2">
            {section.data.map((d, i) => {
              const pct = (d.value / max) * 100
              return (
                <div key={i}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-fg">{humanize(d.label)}</span>
                    <span className="text-muted">
                      {d.value.toLocaleString('en-US')}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-agent-gradient"
                      style={{ width: `${Math.max(2, pct)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )
    }
    case 'comparison':
      return (
        <div className="card overflow-x-auto">
          <h3 className="mb-3 text-sm font-semibold text-fg">
            {section.title}
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-4 font-medium">Item</th>
                {section.columns.map((c) => (
                  <th key={c} className="py-2 pr-4 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.rows.map((r, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="py-2 pr-4 text-fg">{humanize(r.name)}</td>
                  {r.values.map((v, j) => (
                    <td key={j} className="py-2 pr-4 text-muted">
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    default:
      return null
  }
}

function pipelineCarbonKg(usage?: PipelineUsage): number {
  if (!usage) return 0
  return (usage.totals.total / 1000) * 0.0003
}

function formatTreeTime(carbonKg: number): string {
  const treeHoursRaw = carbonKg / (21 / 365 / 24)
  const mins = Math.round(treeHoursRaw * 60)
  if (mins < 60) return `${Math.max(1, mins)}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h < 24) return m > 0 ? `${h}h ${m}m` : `${h}h`
  const d = Math.floor(h / 24)
  return `${d}d ${h % 24}h`
}

export function ReportView({
  report,
  analyzer,
  decider,
  disambiguator,
  supervisor,
  pipelineUsage,
}: Props) {
  const company = disambiguator.company
  const handleDownloadPdf = () => {
    if (typeof window !== 'undefined') window.print()
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="card relative overflow-hidden no-print:hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-50"
          style={{
            backgroundImage:
              'radial-gradient(40rem 24rem at 0% 0%, rgb(var(--agent2) / 0.18), transparent 60%), radial-gradient(36rem 24rem at 100% 100%, rgb(var(--agent1) / 0.18), transparent 60%)',
          }}
          aria-hidden="true"
        />
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent-hi">
              Executive summary
            </p>
            <h2 className="mt-1 font-display text-2xl sm:text-3xl font-semibold text-fg">
              Your AI plan
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {report.executiveSummary}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="btn-primary text-xs print:hidden"
              aria-label="Export report as PDF"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-3.5 w-3.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16"
                />
              </svg>
              Export PDF
            </button>
            <p className="text-xs text-muted">
              Generated{' '}
              {new Date(report.generatedAt).toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          </div>
        </div>
      </section>

      {/* Company profile strip — what the user picked in the chat */}
      <section className="card">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-2">
          Company profile
        </p>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <ProfileStat
            label="Sector"
            value={SECTOR_LABEL[company.sector] ?? humanize(company.sector)}
          />
          <ProfileStat
            label="Employees"
            value={company.employeeCount.toLocaleString('en-US')}
            sub={SIZE_LABEL[company.size]}
            emphasis
          />
          <ProfileStat
            label="Active AI users"
            value={disambiguator.activeUsers.toLocaleString('en-US')}
            sub={`of ${company.employeeCount.toLocaleString('en-US')} total`}
          />
          <ProfileStat
            label="Use cases"
            value={disambiguator.useCases.length.toString()}
            sub={disambiguator.useCases
              .slice(0, 2)
              .map((u) => humanize(u))
              .join(', ') + (disambiguator.useCases.length > 2 ? '…' : '')}
          />
        </div>
      </section>

      {/* CARBON HERO — first badge, focus of the report */}
      <CarbonHero analyzer={analyzer} rating={report.carbonRating} />

      {/* Supervisor + tree-hours — pipeline metadata, excluded from PDF */}
      <section className="grid gap-4 sm:grid-cols-2 print:hidden">
        {supervisor && (
          <div className="card flex items-center gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
              supervisor.score >= 80 ? 'bg-supervisor/15' : supervisor.score >= 50 ? 'bg-warning/15' : 'bg-danger/15'
            }`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={
                supervisor.score >= 80 ? 'text-supervisor' : supervisor.score >= 50 ? 'text-warning' : 'text-danger'
              }><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-2">Supervisor quality score</p>
              <p className={`mt-1 font-display text-2xl font-semibold ${
                supervisor.score >= 80 ? 'text-supervisor' : supervisor.score >= 50 ? 'text-warning' : 'text-danger'
              }`}>
                {supervisor.score}%
              </p>
              <p className="text-[11px] text-muted">{supervisor.passed} passed · {supervisor.failed} failed of {supervisor.checks.length} checks</p>
            </div>
          </div>
        )}

        {pipelineUsage && (
          <div className="card flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
              <span className="text-2xl" aria-hidden="true">🌳</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-2">Tree time to compensate this report</p>
              <p className="mt-1 font-display text-2xl font-semibold text-emerald-300">
                {formatTreeTime(pipelineCarbonKg(pipelineUsage))}
              </p>
              <p className="text-[11px] text-muted">
                of one tree&apos;s CO₂ absorption to offset {pipelineCarbonKg(pipelineUsage).toFixed(4)} kg CO₂ from {pipelineUsage.totals.total.toLocaleString('en-US')} tokens
              </p>
            </div>
          </div>
        )}
      </section>

      {/* KPI strip (without CO2 — that's in CarbonHero) */}
      <StatsCard
        items={[
          {
            label: 'Annual cost',
            value: formatEur(analyzer.totals.annualCostEur),
            emphasis: true,
          },
          {
            label: 'Monthly cost',
            value: formatEur(analyzer.totals.monthlyCostEur),
          },
          {
            label: 'Tokens / month',
            value: analyzer.totals.monthlyTokens.toLocaleString('en-US'),
          },
          {
            label: 'Estimated ROI',
            value: `${decider.roiMonths.toFixed(1)} months`,
          },
          {
            label: 'Stack',
            value: decider.recommendedStack.length.toString(),
            unit: 'models',
          },
          {
            label: 'Use cases',
            value: analyzer.useCases.length.toString(),
          },
        ]}
      />

      {/* Cost breakdown with multi-provider models */}
      <CostBreakdown analyzer={analyzer} />

      {/* Per-role impact analysis */}
      <RoleImpact analyzer={analyzer} />

      {/* Decisions */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Strategic decisions
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          {decider.decisions.map((d, i) => (
            <DecisionCard key={i} decision={d} />
          ))}
        </div>
      </section>

      {/* Dynamic sections from Agent 4 */}
      {report.sections.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Deep dives
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {report.sections.map((s, i) => (
              <SectionRenderer key={i} section={s} />
            ))}
          </div>
        </section>
      )}

      {/* Benchmarks */}
      {report.benchmarks.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Market benchmarks (indicative examples)
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            {report.benchmarks.map((b, i) => (
              <div key={i} className="card">
                <p className="text-xs uppercase tracking-wide text-accent-hi">
                  {humanize(b.useCase)}
                </p>
                <p className="mt-1 text-base font-semibold text-fg">
                  {b.company}
                </p>
                <p className="mt-2 text-sm text-muted">{b.outcome}</p>
                <p className="mt-3 text-xs italic text-muted">{b.source}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Final recommendations */}
      {report.recommendations.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Final recommendations
          </h3>
          <div className="space-y-3">
            {report.recommendations.map((r, i) => (
              <div key={i} className="card card-accent">
                <p className="text-base font-semibold text-fg">{r.title}</p>
                <p className="mt-1 text-sm text-muted">{r.description}</p>
                <p className="mt-2 text-xs italic text-accent-hi">
                  Why: {r.reasoning}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
