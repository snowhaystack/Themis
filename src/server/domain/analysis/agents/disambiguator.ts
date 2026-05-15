import { z } from 'zod'
import { SchemaType, type Schema } from '@google/generative-ai'
import { generateJson } from '@/server/infrastructure/gemini/client'
import { createUsageCollector } from '@/server/infrastructure/gemini/usage'
import {
  ChatOptionSchema,
  DisambiguatorOutputSchema,
  type ChatResponse,
  type ChatState,
  EMPLOYEE_RANGES,
  type CompanySize,
} from '@/shared/types'

const ALLOWED_QUESTION_KEYS = [
  'use_cases',
  'active_users',
  'roles_involved',
  'role_frequency',
  'role_count',
  'role_literacy',
  'use_case_priority',
  'budget_appetite',
  'data_sensitivity',
] as const

const SYSTEM = `You are AGENT 1 — DISAMBIGUATOR for an AI advisory system.

Guide a business owner / manager through a short closed-options conversation (max 10 questions, usually 4-6) to profile how their company should adopt AI.

You already know from the initial form:
- industry sector
- employee range

You still need to gather:
1) Desired AI use cases (multi-select)
2) Number of active users
3) Roles involved + usage frequency

RULES:
- One question at a time. Always 2-8 closed options. No free text.
- Reply text in English.
- Infer tech literacy from role: developer/data_scientist=high, manager/analyst=medium, sales/HR/operations=low.
- Infer user count per role from total employees.
- When you have enough data → done=true with a full "output" object.

multiSelect RULES (mandatory):
- use_cases: multiSelect=true (a company often has multiple)
- roles_involved: multiSelect=true (multiple roles can use AI — e.g. "which roles will perform data analysis?" must allow multiple picks)
- data_sensitivity: multiSelect=true (multiple data types can be sensitive)
- role_frequency / role_count / role_literacy / active_users / use_case_priority / budget_appetite: multiSelect=false
- Generic rule: if the natural answer is "more than one of these can be true", multiSelect=true.

PER-ROLE DATA COLLECTION (mandatory):
- AFTER 'roles_involved' is answered with N roles, you MUST collect TWO things PER role (not inferred): count and usage frequency.
- For each role, ask first a 'role_count' question, then a 'role_frequency' question, in separate turns. NEVER batch multiple roles into one question.

role_count question:
- Phrase: "How many <Role Name> will actively use AI?" — name the role in the question text.
- Options (closed brackets): "1", "2-3", "4-7", "8-15", "16-30", "30+".
- multiSelect=false.
- In final "output.roles", use the MIDPOINT of the chosen bracket as 'count' (e.g. "2-3" → 2, "4-7" → 5, "8-15" → 11, "16-30" → 23, "30+" → 40).

role_frequency question:
- Phrase: "How often will <Role Name> use AI?" — name the role in the question text.
- Options: [{value:"daily",label:"Daily"}, {value:"weekly",label:"Weekly"}, {value:"rarely",label:"Rarely (monthly or less)"}].
- multiSelect=false.

Tracking: use the history to know which role+question pair you already covered. The role being asked about is identified by the question text. Don't ask the same (role, attribute) twice.

EXAMPLE FLOW (after roles_involved selected ["IT & Developers", "Operations Analysts"]):
Turn N+1: questionKey="role_count",     question="How many IT & Developers will actively use AI?"
Turn N+2: questionKey="role_frequency", question="How often will IT & Developers use AI?"
Turn N+3: questionKey="role_count",     question="How many Operations Analysts will actively use AI?"
Turn N+4: questionKey="role_frequency", question="How often will Operations Analysts use AI?"
Turn N+5: done=true with output.roles fully populated.

OUTPUT FORMAT (single JSON object, no markdown, no backticks):

You MUST always populate ALL of: done, questionKey, question, options, multiSelect — even on the final turn (use them to phrase a brief confirmation question if no more questions are needed).

When done=true → ALSO populate "output" with the full company profile.
When done=false → "output" must be omitted.

EXAMPLES:

A) Next question (done=false):
{
  "done": false,
  "questionKey": "use_cases",
  "question": "Which AI use cases matter most for your company?",
  "options": [
    { "value": "customer_support", "label": "Customer support" },
    { "value": "data_analysis",    "label": "Data analysis" }
  ],
  "multiSelect": true
}

B) Final turn (done=true):
{
  "done": true,
  "questionKey": "use_cases",
  "question": "Confirmed — preparing your plan.",
  "options": [{ "value": "ok", "label": "Continue" }],
  "multiSelect": false,
  "output": {
    "company": { "sector": "fintech", "employeeCount": 120, "size": "media_azienda" },
    "useCases": ["customer_support", "data_analysis"],
    "activeUsers": 35,
    "roles": [
      { "title": "developer", "count": 8, "frequency": "daily", "techLiteracy": "high" }
    ],
    "conversationSummary": "Mid-size fintech focused on CS and document analysis."
  }
}

CONSTRAINTS:
- "questionKey": one of the enum values, max 30 chars. Do NOT write descriptions or reasoning inside it.
- "question": short English text, max 150 chars.
- "options.value": short snake_case slug, max 40 chars.
- "options.label": short English text, max 60 chars.
- "size" ∈ {artigiano, piccola_azienda, media_azienda, enterprise}
- "frequency" ∈ {daily, weekly, rarely}
- "techLiteracy" ∈ {low, medium, high}

Return ONLY valid JSON. Nothing else.`

const FlatDisambiguatorResponseSchema = z
  .object({
    done: z.boolean(),
    questionKey: z.string().max(60),
    question: z.string().max(300),
    options: z.array(ChatOptionSchema).min(1),
    multiSelect: z.boolean(),
    output: DisambiguatorOutputSchema.optional(),
  })
  .superRefine((val, ctx) => {
    if (val.done && !val.output) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'done=true but "output" is missing',
        path: ['output'],
      })
    }
  })

type FlatDisambiguatorResponse = z.infer<typeof FlatDisambiguatorResponseSchema>

const DISAMBIGUATOR_RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  description:
    'Disambiguator turn: either the next closed-option question (done=false) or the final profile (done=true with output).',
  properties: {
    done: {
      type: SchemaType.BOOLEAN,
      description:
        'true when you have all the data and have populated "output"; false otherwise.',
    },
    questionKey: {
      type: SchemaType.STRING,
      enum: [...ALLOWED_QUESTION_KEYS],
      description:
        'Short identifier of the current question. EXACTLY one of the enum values.',
    },
    question: {
      type: SchemaType.STRING,
      description: 'Short English question. Max 150 characters.',
    },
    options: {
      type: SchemaType.ARRAY,
      description: '2-8 closed answer options.',
      items: {
        type: SchemaType.OBJECT,
        properties: {
          value: { type: SchemaType.STRING },
          label: { type: SchemaType.STRING },
        },
        required: ['value', 'label'],
      },
    },
    multiSelect: { type: SchemaType.BOOLEAN },
    output: {
      type: SchemaType.OBJECT,
      description: 'Final company profile. Populate ONLY when done=true.',
      properties: {
        company: {
          type: SchemaType.OBJECT,
          properties: {
            sector: { type: SchemaType.STRING },
            employeeCount: { type: SchemaType.INTEGER },
            size: {
              type: SchemaType.STRING,
              enum: ['artigiano', 'piccola_azienda', 'media_azienda', 'enterprise'],
            },
          },
          required: ['sector', 'employeeCount', 'size'],
        },
        useCases: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
        activeUsers: { type: SchemaType.INTEGER },
        roles: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              title: { type: SchemaType.STRING },
              count: { type: SchemaType.INTEGER },
              frequency: {
                type: SchemaType.STRING,
                enum: ['daily', 'weekly', 'rarely'],
              },
              techLiteracy: {
                type: SchemaType.STRING,
                enum: ['low', 'medium', 'high'],
              },
            },
            required: ['title', 'count', 'frequency', 'techLiteracy'],
          },
        },
        conversationSummary: { type: SchemaType.STRING },
      },
      required: ['company', 'useCases', 'activeUsers', 'roles', 'conversationSummary'],
    },
  },
  required: ['done', 'questionKey', 'question', 'options', 'multiSelect'],
}

function sizeFromRange(range: string): CompanySize {
  const found = EMPLOYEE_RANGES.find((r) => r.value === range)
  const mid = found?.mid ?? 50
  if (mid <= 9) return 'artigiano'
  if (mid <= 49) return 'piccola_azienda'
  if (mid <= 249) return 'media_azienda'
  return 'enterprise'
}

function flatToChatResponse(flat: FlatDisambiguatorResponse): ChatResponse {
  if (flat.done) {
    if (!flat.output) {
      throw new Error('Disambiguator: done=true but output missing')
    }
    return { done: true, output: flat.output }
  }
  return {
    done: false,
    questionKey: flat.questionKey,
    question: flat.question,
    options: flat.options,
    multiSelect: flat.multiSelect,
  }
}

export interface RunDisambiguatorArgs {
  state: ChatState
}

export async function runDisambiguator({
  state,
}: RunDisambiguatorArgs): Promise<ChatResponse> {
  const employeeMid =
    EMPLOYEE_RANGES.find((r) => r.value === state.employeeRange)?.mid ?? 50
  const suggestedSize = sizeFromRange(state.employeeRange)

  const historyText =
    state.history.length === 0
      ? '(no user answers yet — ask the FIRST question)'
      : state.history
          .map(
            (t, i) =>
              `${i + 1}) ${t.questionKey} — Q: ${t.question}\n   user answer: ${JSON.stringify(t.selectedOptions)}`
          )
          .join('\n')

  const prompt = `COMPANY CONTEXT:
- Sector: ${state.sector}
- Employee range: ${state.employeeRange} (use employeeCount=${employeeMid})
- Suggested size: ${suggestedSize}

CONVERSATION HISTORY:
${historyText}

Questions asked so far: ${state.history.length}/10

DECIDE:
- If you have enough info (use cases + active users + at least 1 role with frequency), return done=true with a complete "output" (employeeCount=${employeeMid}, size="${suggestedSize}").
- Otherwise return done=false with the NEXT single closed-option question.

Remember: ALWAYS populate questionKey, question, options, multiSelect even on the final turn.

Return ONLY one JSON object matching the schema.`

  const collector = createUsageCollector()
  const started = Date.now()

  const flat = await generateJson<FlatDisambiguatorResponse>({
    model: 'gemini-flash-latest',
    fallbackModel: 'gemini-2.5-flash-lite',
    systemInstruction: SYSTEM,
    prompt,
    schema: FlatDisambiguatorResponseSchema,
    responseSchema: DISAMBIGUATOR_RESPONSE_SCHEMA,
    temperature: 0.2,
    maxOutputTokens: 1500,
    label: 'AGENT1',
    collector,
  })

  const elapsedMs = Date.now() - started
  const tokens = collector.summary().totals.total || undefined

  const response = flatToChatResponse(flat)
  return { ...response, elapsedMs, tokens } as ChatResponse
}
