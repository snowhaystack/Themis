/**
 * Casi d'uso reali / benchmark indicativi.
 * Usati dal Formatter come fonte di ispirazione per arricchire il report.
 * Sono "esempi indicativi", presentati come tali nel report.
 */

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
      'Assistente AI gestisce ~2/3 delle conversazioni clienti, equivalente a 700 FTE, con tempo medio di risoluzione ridotto da 11 a 2 minuti.',
    source: 'Klarna press release, feb 2024',
  },
  {
    company: 'Air India',
    sector: 'servizi_professionali',
    useCase: 'customer_support',
    outcome:
      "97% delle richieste clienti gestite da agente AI, con costi operativi ridotti di circa l'40%.",
    source: 'Air India case study, 2024',
  },
  {
    company: 'GitHub Copilot @ Accenture',
    sector: 'servizi_professionali',
    useCase: 'sviluppo_software',
    outcome:
      "Sviluppatori riportano +55% velocità di completamento dei task ripetitivi e -50% tempo speso su boilerplate.",
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
      'Ricercatori usano LLM per sintetizzare letteratura scientifica: tempo medio di review tagliato di ~30%.',
    source: 'Bayer R&D 2024',
  },
  {
    company: 'L\'Oréal',
    sector: 'retail',
    useCase: 'analisi_immagini',
    outcome:
      'Tool di virtual try-on con AI ha aumentato conversion rate e-commerce del 60% su categorie make-up.',
    source: "L'Oréal earnings call 2024",
  },
  {
    company: 'Siemens',
    sector: 'manifatturiero',
    useCase: 'flussi_aziendali',
    outcome:
      "Industrial copilot per operatori di linea: -30% tempo medio di diagnosi guasto e -20% tempo di formazione nuovi assunti.",
    source: 'Siemens Industrial AI 2024',
  },
  {
    company: 'Duolingo',
    sector: 'education',
    useCase: 'helper_dipendenti',
    outcome:
      'AI tutor "Max" personalizza i percorsi: +5pt engagement medio settimanale, paying subscribers +54% YoY.',
    source: 'Duolingo Q2 2024 letter',
  },
  {
    company: 'Mercedes-Benz',
    sector: 'manifatturiero',
    useCase: 'decisioni',
    outcome:
      'AI advisor per buyer di supply chain: lead time medio ridotto del 12% in pilot di 6 mesi.',
    source: 'Mercedes-Benz supply chain report 2024',
  },
  {
    company: 'Stripe',
    sector: 'fintech',
    useCase: 'sviluppo_software',
    outcome:
      'Sviluppatori interni usano GPT-style assistant per ridurre tempo di debugging di sistemi distribuiti di ~25%.',
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
