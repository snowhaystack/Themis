import { z } from 'zod'

/* ============================================================
 *  CONDIVISI
 * ============================================================ */

export const CompanySizeSchema = z.enum([
  'artigiano',
  'piccola_azienda',
  'media_azienda',
  'enterprise',
])
export type CompanySize = z.infer<typeof CompanySizeSchema>

export const TechLiteracySchema = z.enum(['low', 'medium', 'high'])
export type TechLiteracy = z.infer<typeof TechLiteracySchema>

export const FrequencySchema = z.enum(['daily', 'weekly', 'rarely'])
export type Frequency = z.infer<typeof FrequencySchema>

export const GeminiModelSchema = z.enum([
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
])
export type GeminiModel = z.infer<typeof GeminiModelSchema>

export const CarbonRatingSchema = z.enum(['A', 'B', 'C', 'D', 'E'])
export type CarbonRating = z.infer<typeof CarbonRatingSchema>

/* ============================================================
 *  AGENTE 1 — DISAMBIGUATORE
 * ============================================================ */

export const SECTORS = [
  'manifatturiero',
  'fintech',
  'retail',
  'sanitario',
  'education',
  'servizi_professionali',
  'logistica',
  'energia_utilities',
  'agritech',
  'media_entertainment',
  'pubblica_amministrazione',
  'altro',
] as const

export const SectorSchema = z.enum(SECTORS)
export type Sector = z.infer<typeof SectorSchema>

export const EMPLOYEE_RANGES = [
  { value: '1-9', label: '1–9 (artigiano)', mid: 5 },
  { value: '10-49', label: '10–49 (piccola)', mid: 25 },
  { value: '50-249', label: '50–249 (media)', mid: 120 },
  { value: '250-999', label: '250–999 (enterprise)', mid: 500 },
  { value: '1000+', label: '1000+ (enterprise)', mid: 2000 },
] as const

export const EmployeeRangeSchema = z.enum([
  '1-9',
  '10-49',
  '50-249',
  '250-999',
  '1000+',
])
export type EmployeeRange = z.infer<typeof EmployeeRangeSchema>

export const ChatTurnSchema = z.object({
  questionKey: z.string().max(50),
  question: z.string().max(300),
  selectedOptions: z.array(z.string().max(100)).max(10),
})
export type ChatTurn = z.infer<typeof ChatTurnSchema>

export const ChatStateSchema = z.object({
  sector: SectorSchema,
  employeeRange: EmployeeRangeSchema,
  history: z.array(ChatTurnSchema).max(20),
})
export type ChatState = z.infer<typeof ChatStateSchema>

export const ChatOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
})
export type ChatOption = z.infer<typeof ChatOptionSchema>

export const NextQuestionSchema = z.object({
  done: z.literal(false),
  questionKey: z.string(),
  question: z.string(),
  options: z.array(ChatOptionSchema).min(2).max(8),
  multiSelect: z.boolean(),
})
export type NextQuestion = z.infer<typeof NextQuestionSchema>

export const RoleSchema = z.object({
  title: z.string(),
  count: z.number().int().min(0),
  frequency: FrequencySchema,
  techLiteracy: TechLiteracySchema,
})
export type Role = z.infer<typeof RoleSchema>

export const DisambiguatorOutputSchema = z.object({
  company: z.object({
    sector: z.string().max(80),
    employeeCount: z.number().int().min(1).max(500000),
    size: CompanySizeSchema,
  }),
  useCases: z.array(z.string().max(80)).min(1).max(15),
  activeUsers: z.number().int().min(1).max(100000),
  roles: z.array(RoleSchema).min(1).max(20),
  conversationSummary: z.string().min(10).max(1000),
})
export type DisambiguatorOutput = z.infer<typeof DisambiguatorOutputSchema>

export const ChatResponseSchema = z.discriminatedUnion('done', [
  NextQuestionSchema,
  z.object({
    done: z.literal(true),
    output: DisambiguatorOutputSchema,
  }),
])
export type ChatResponse = z.infer<typeof ChatResponseSchema>

/* ============================================================
 *  AGENTE 2 — ANALIZZATORE
 * ============================================================ */

export const ModelProviderSchema = z.enum(['google', 'anthropic', 'openai'])
export type ModelProvider = z.infer<typeof ModelProviderSchema>

export const ModelRecommendationSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: ModelProviderSchema,
  rationale: z.string(),
})
export type ModelRecommendation = z.infer<typeof ModelRecommendationSchema>

export const UseCaseAnalysisSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  recommendedModel: ModelRecommendationSchema,
  alternativeModels: z.array(ModelRecommendationSchema).max(4),
  reliabilityScore: z.number().min(0).max(10),
  rationale: z.string(),
  monthlyTokens: z.number().min(0),
  monthlyCostEur: z.number().min(0),
  annualCostEur: z.number().min(0),
  monthlyCarbonKg: z.number().min(0),
  annualCarbonKg: z.number().min(0),
  carbonRating: CarbonRatingSchema,
})
export type UseCaseAnalysis = z.infer<typeof UseCaseAnalysisSchema>

export const ImpactLevelSchema = z.enum(['high', 'medium', 'low'])
export type ImpactLevel = z.infer<typeof ImpactLevelSchema>

export const RoleConsumptionSchema = z.object({
  role: z.string(),
  count: z.number().int().min(0),
  monthlyTokens: z.number().min(0),
  monthlyCostEur: z.number().min(0),
  estimatedImpact: z.string().min(3).max(220),
  impactRationale: z.string().min(3).max(280),
  impactLevel: ImpactLevelSchema,
})
export type RoleConsumption = z.infer<typeof RoleConsumptionSchema>

export const AnalyzerOutputSchema = z.object({
  useCases: z.array(UseCaseAnalysisSchema).min(1),
  byRole: z.array(RoleConsumptionSchema),
  totals: z.object({
    monthlyTokens: z.number().min(0),
    monthlyCostEur: z.number().min(0),
    annualCostEur: z.number().min(0),
    monthlyCarbonKg: z.number().min(0),
    annualCarbonKg: z.number().min(0),
    overallCarbonRating: CarbonRatingSchema,
  }),
  notes: z.string().optional(),
})
export type AnalyzerOutput = z.infer<typeof AnalyzerOutputSchema>

/* ============================================================
 *  AGENTE 3 — DECISIONALE
 * ============================================================ */

export const DecisionSchema = z.object({
  category: z.string(),
  choice: z.string(),
  motivation: z.string(),
  tradeoffs: z.array(z.string()),
  realWorldExample: z.string(),
})
export type Decision = z.infer<typeof DecisionSchema>

export const DeciderOutputSchema = z.object({
  decisions: z.array(DecisionSchema).min(1),
  recommendedStack: z.array(z.string()).min(1),
  roiMonths: z.number().min(0),
  riskFactors: z.array(z.string()),
  carbonOptimizationTips: z.array(z.string()),
  rationale: z.string(),
})
export type DeciderOutput = z.infer<typeof DeciderOutputSchema>

/* ============================================================
 *  AGENTE 4 — FORMATTATORE
 * ============================================================ */

export const ReportSectionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text'),
    title: z.string(),
    content: z.string(),
  }),
  z.object({
    type: z.literal('stats'),
    title: z.string(),
    items: z.array(
      z.object({
        label: z.string(),
        value: z.string(),
        unit: z.string().optional(),
        emphasis: z.boolean().optional(),
      })
    ),
  }),
  z.object({
    type: z.literal('chart'),
    title: z.string(),
    chartType: z.enum(['bar', 'pie']),
    data: z.array(z.object({ label: z.string(), value: z.number() })),
  }),
  z.object({
    type: z.literal('list'),
    title: z.string(),
    items: z.array(z.string()),
  }),
  z.object({
    type: z.literal('comparison'),
    title: z.string(),
    columns: z.array(z.string()),
    rows: z.array(
      z.object({ name: z.string(), values: z.array(z.string()) })
    ),
  }),
])
export type ReportSection = z.infer<typeof ReportSectionSchema>

export const BenchmarkSchema = z.object({
  company: z.string(),
  useCase: z.string(),
  outcome: z.string(),
  source: z.string(),
})
export type Benchmark = z.infer<typeof BenchmarkSchema>

export const RecommendationSchema = z.object({
  title: z.string(),
  description: z.string(),
  reasoning: z.string(),
})
export type Recommendation = z.infer<typeof RecommendationSchema>

export const FinalReportSchema = z.object({
  executiveSummary: z.string(),
  sections: z.array(ReportSectionSchema).min(1),
  benchmarks: z.array(BenchmarkSchema),
  recommendations: z.array(RecommendationSchema).min(1),
  carbonRating: CarbonRatingSchema,
  generatedAt: z.string(),
})
export type FinalReport = z.infer<typeof FinalReportSchema>

/* ============================================================
 *  SESSION (Redis)
 * ============================================================ */

export const SessionStatusSchema = z.enum([
  'collecting',
  'analyzing',
  'deciding',
  'formatting',
  'done',
  'error',
])
export type SessionStatus = z.infer<typeof SessionStatusSchema>

export const TokenUsageSchema = z.object({
  input: z.number().min(0),
  output: z.number().min(0),
  total: z.number().min(0),
})
export type TokenUsage = z.infer<typeof TokenUsageSchema>

export const PipelineUsageEntrySchema = z.object({
  agent: z.string(),
  model: z.string(),
  usage: TokenUsageSchema,
})
export type PipelineUsageEntry = z.infer<typeof PipelineUsageEntrySchema>

export const PipelineUsageSchema = z.object({
  entries: z.array(PipelineUsageEntrySchema),
  totals: TokenUsageSchema,
})
export type PipelineUsage = z.infer<typeof PipelineUsageSchema>

export const SessionRecordSchema = z.object({
  sessionId: z.string(),
  userId: z.string().optional(),
  status: SessionStatusSchema,
  reportName: z.string().min(1).max(120).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  disambiguator: DisambiguatorOutputSchema.optional(),
  analyzer: AnalyzerOutputSchema.optional(),
  decider: DeciderOutputSchema.optional(),
  report: FinalReportSchema.optional(),
  pipelineUsage: PipelineUsageSchema.optional(),
  error: z.string().optional(),
})
export type SessionRecord = z.infer<typeof SessionRecordSchema>
