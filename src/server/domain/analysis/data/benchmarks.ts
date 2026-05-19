export interface BenchmarkCase {
  company: string
  sector: string
  useCase: string
  outcome: string
  source: string
}

export const BENCHMARKS: BenchmarkCase[] = [
  {
    company: 'Klarna',
    sector: 'fintech',
    useCase: 'customer_support',
    outcome:
      'AI assistant handles ~2/3 of customer conversations, equivalent to 700 FTE, with average resolution time reduced from 11 to 2 minutes.',
    source: 'Klarna press release, feb 2024',
  },
  {
    company: 'Air India',
    sector: 'servizi_professionali',
    useCase: 'customer_support',
    outcome:
      '97% of customer requests handled by AI agent, with operating costs reduced by approximately 40%.',
    source: 'Air India case study, 2024',
  },
  {
    company: 'GitHub Copilot @ Accenture',
    sector: 'servizi_professionali',
    useCase: 'sviluppo_software',
    outcome:
      'Developers report +55% completion speed on repetitive tasks and -50% time spent on boilerplate.',
    source: 'GitHub research 2023',
  },
  {
    company: 'Morgan Stanley',
    sector: 'fintech',
    useCase: 'analisi_documenti',
    outcome:
      'Wealth advisors interrogano 100k+ documenti interni in linguaggio naturale, risparmio stimato di ore/settimana per consulente.',
    source: 'Morgan Stanley + OpenAI, 2023',
  },
  {
    company: 'Bayer',
    sector: 'sanitario',
    useCase: 'analisi_documenti',
    outcome:
      'Researchers use LLMs to synthesize scientific literature: average review time cut by ~30%.',
    source: 'Bayer R&D 2024',
  },
  {
    company: "L'Oréal",
    sector: 'retail',
    useCase: 'analisi_immagini',
    outcome:
      'AI-powered virtual try-on tool increased e-commerce conversion rate by 60% on make-up categories.',
    source: "L'Oréal earnings call 2024",
  },
  {
    company: 'Siemens',
    sector: 'manifatturiero',
    useCase: 'flussi_aziendali',
    outcome:
      'Industrial copilot for line operators: -30% average fault diagnosis time and -20% new hire training time.',
    source: 'Siemens Industrial AI 2024',
  },
  {
    company: 'Duolingo',
    sector: 'education',
    useCase: 'helper_dipendenti',
    outcome:
      'AI tutor "Max" personalises learning paths: +5pt average weekly engagement, paying subscribers +54% YoY.',
    source: 'Duolingo Q2 2024 letter',
  },
  {
    company: 'Mercedes-Benz',
    sector: 'manifatturiero',
    useCase: 'decisioni',
    outcome:
      'AI advisor for supply chain buyers: average lead time reduced by 12% in a 6-month pilot.',
    source: 'Mercedes-Benz supply chain report 2024',
  },
  {
    company: 'Stripe',
    sector: 'fintech',
    useCase: 'sviluppo_software',
    outcome:
      'Internal developers use GPT-style assistant to reduce distributed systems debugging time by ~25%.',
    source: 'Stripe engineering blog 2023',
  },
]

export function pickBenchmarks(
  sector: string,
  useCases: string[],
  limit = 3
): BenchmarkCase[] {
  const matchScore = (b: BenchmarkCase): number => {
    let s = 0
    if (b.sector === sector) s += 3
    if (useCases.includes(b.useCase)) s += 2
    return s
  }
  return [...BENCHMARKS]
    .map((b) => ({ b, score: matchScore(b) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.b)
}
