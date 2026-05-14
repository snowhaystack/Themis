# Themis — Architecture

This document describes how Themis works under the hood: the agentic pipeline,
the cross-provider model catalog, the data contracts, and the reliability
mechanisms that keep the LLM output predictable.

---

## 1. High-level architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser                                                          │
│  ┌────────────────────────────┐   ┌─────────────────────────┐    │
│  │  Chat UI (closed-options)  │   │  Report UI (typed view) │    │
│  └─────────────┬──────────────┘   └────────────▲────────────┘    │
└────────────────┼────────────────────────────────┼────────────────┘
                 │ fetch (POST /api/chat,         │ fetch
                 │  POST /api/orchestrate,        │ GET /api/report/[id]
                 │  PATCH /api/report/[id])       │
┌────────────────▼────────────────────────────────┼────────────────┐
│  Next.js 15 (App Router · standalone runtime)                    │
│                                                                  │
│  /api/chat                       /api/orchestrate                │
│      │                                │                          │
│      ▼                                ▼                          │
│  ┌─────────────┐              ┌──────────────────────────────┐   │
│  │  AGENT 1    │              │  Orchestrator (background)   │   │
│  │ Disambiguator│             │                              │   │
│  └──────┬──────┘              │  AGENT 2 → AGENT 3 → AGENT 4 │   │
│         │                     │   ▲          ▲          ▲   │   │
│         │                     │   │          │          │   │   │
│         │   (returns         │   └──────────┴──────────┘   │   │
│         │   ChatResponse)     │       UsageCollector         │   │
│         │                     └────────────┬──────────────┬─┘   │
│         ▼                                  │              │     │
│   ChatWindow polls until done              ▼              ▼     │
│                                         Redis        Sessions    │
│                                       (sessions)      (status,   │
│                                                       output)    │
└──────────────────────────────────────────────────────────────────┘
```

Two distinct runtimes:

- **AGENT 1 (Disambiguator)** is *synchronous & turn-based*. The browser calls
  `/api/chat` once per user answer. Each call invokes Gemini once and returns
  either the next closed-option question or a `done=true` profile.
- **AGENT 2 / 3 / 4** are run by a *fire-and-forget* orchestrator triggered by
  `POST /api/orchestrate`. The browser starts the job, then polls
  `GET /api/report/[sessionId]` until `status === "done"`.

---

## 2. The 4-agent pipeline

Each agent is a single Gemini call with a strict JSON schema (Zod + Gemini
`responseSchema`).

| # | Role | Model (primary / fallback) | Output | Why |
|---|------|---------------------------|--------|-----|
| 1 | **Disambiguator** | `gemini-flash-latest` / `gemini-2.5-flash-lite` | `ChatResponse` (next question OR final profile) | Closed-options conversational profiling |
| 2 | **Analyzer**      | `gemini-pro-latest` / `gemini-2.5-pro`          | `AnalyzerOutput` (use cases, multi-provider recs, costs, carbon, per-role impact) | Heavy reasoning, structured numeric output |
| 3 | **Decider**       | `gemini-pro-latest` / `gemini-2.5-pro`          | `DeciderOutput` (decisions, ROI, risks, carbon tips, mixed stack) | Synthesis with explicit trade-offs |
| 4 | **Formatter**     | `gemini-flash-latest` / `gemini-2.5-flash-lite` | `FinalReport` (executive summary, typed sections, benchmarks) | Fast rendering of long text |

The orchestrator persists the partial state in Redis after each agent, so the
client can render real-time progress (`analyzing → deciding → formatting → done`).

---

## 3. Cross-provider model catalog

The Analyzer doesn't only recommend Gemini. The full catalog lives in
[`src/lib/data/catalog.ts`](src/lib/data/catalog.ts):

| Provider | Tier      | Model               | Blended $ / 1M tok | kg CO₂ / 1k tok |
|----------|-----------|---------------------|--------------------|-----------------|
| Google   | budget    | gemini-2.5-flash-lite | 0.25             | 0.00015         |
| Google   | balanced  | gemini-2.5-flash      | 1.40             | 0.0003          |
| Google   | premium   | gemini-2.5-pro        | 5.625            | 0.0008          |
| Anthropic| budget    | claude-haiku-4-5      | 3.00             | 0.00025         |
| Anthropic| balanced  | claude-sonnet-4-6     | 9.00             | 0.0005          |
| Anthropic| premium   | claude-opus-4-7       | 45.00            | 0.0015          |
| OpenAI   | budget    | gpt-5-mini            | 1.125            | 0.0002          |
| OpenAI   | balanced  | gpt-5                 | 5.625            | 0.0006          |
| OpenAI   | premium   | gpt-5-pro             | 67.50            | 0.0025          |

For each use case the Analyzer picks **one primary + 1-2 cross-provider
alternatives in the same tier**. The Decider can mix providers in the final
stack (e.g. `["gemini-2.5-flash-lite", "claude-sonnet-4-6"]`) and the report
shows each option side-by-side in a Comparison section.

Pricing and carbon factors are plain TypeScript constants — change them in
`catalog.ts` and every downstream calculation updates.

---

## 4. Data contracts (Zod schemas)

Every agent input and output is validated end-to-end with
[Zod](https://zod.dev) in `src/lib/types/index.ts`. The same schemas are
re-encoded as Gemini `responseSchema` objects inside each agent, which is what
makes the pipeline reliable: the model is forced to emit conforming JSON.

Key types:

- **`DisambiguatorOutput`** — company (sector / employeeCount / size), use cases,
  active users, **per-role entries** with explicit `count`, `frequency` and
  `techLiteracy` (collected one question per role in the chat).
- **`UseCaseAnalysis`** — recommendedModel + alternativeModels (multi-provider),
  reliabilityScore, monthly tokens / cost / carbon, EU A–E rating.
- **`RoleConsumption`** — per-role cost AND `estimatedImpact` /
  `impactRationale` / `impactLevel` (high/medium/low) — populated by the
  Analyzer with a single-sentence quantified outcome per role.
- **`PipelineUsage`** — total input/output/total tokens consumed by the pipeline
  itself (collected via the `UsageCollector` and displayed in the report).
- **`SessionRecord`** — the whole thing keyed by `sessionId` in Redis with a
  1h TTL, plus the optional user-chosen `reportName`.

---

## 5. Reliability mechanisms

LLMs misbehave. The wrapper around Gemini in
[`src/lib/gemini/client.ts`](src/lib/gemini/client.ts) handles it:

1. **`responseMimeType: 'application/json'`** is always set.
2. **`responseSchema`** is passed for every agent — Gemini constrains the
   output to the JSON-Schema subset we define (enum values, required fields,
   number types, etc.).
3. **Zod validation** runs on every response. Failures are explicit.
4. **Smart retries** distinguish two error families:
   - *Transient* (`429 / 500 / 502 / 503 / 504 / RESOURCE_EXHAUSTED / "overloaded"`):
     longer backoff (3s → 6s → 12s → 24s) and the prompt is **not** modified.
   - *Parse/Schema*: shorter backoff (0.6s → 1.2s → 2.4s) and the failing raw
     response is fed back to the model in the next attempt with the error
     message.
5. **Fallback model** after exhausting retries (e.g. `gemini-pro-latest` →
   `gemini-2.5-pro`).
6. **Raw response logging** when validation fails — easy debugging in
   `docker compose logs app`.

The Disambiguator uses an additional trick: its Zod schema is a *discriminated
union* (`{ done: true | false, ... }`) but Gemini's responseSchema doesn't
support unions, so the agent uses a **flat all-fields-required schema** and a
server-side post-processor converts it to the union shape.

---

## 6. Chat flow (closed-options only)

```
Sector (dropdown)
  └─→ Employee range (dropdown)
        └─→ AGENT 1 turn 1: use_cases (multi-select)
              └─→ AGENT 1 turn 2: roles_involved (multi-select)
                    └─→ For each role:
                          • role_count (1 / 2-3 / 4-7 / 8-15 / 16-30 / 30+)
                          • role_frequency (daily / weekly / rarely)
                    └─→ AGENT 1 turn N: done=true → DisambiguatorOutput
        └─→ Name your report (free text — only place where the user can type)
        └─→ POST /api/orchestrate → pipeline starts
```

No step except the report name accepts free input. This:

- eliminates an entire class of prompt-injection issues at the user boundary,
- gives the Analyzer clean, structured input,
- lets every downstream computation be deterministic for given choices.

---

## 7. Carbon scoring

Annual kg CO₂eq is converted to the **EU energy-efficiency A–E scale**:

| Rating | Annual kg CO₂ |
|--------|---------------|
| A      | ≤ 50          |
| B      | ≤ 200         |
| C      | ≤ 500         |
| D      | ≤ 1500        |
| E      | > 1500        |

The `CarbonHero` component shows the rating prominently with three
human-readable equivalences (km by car @ 120 g/km, trees/year @ 21 kg/tree,
phone charges @ 8.4 g/charge). When the footprint is below one tree's annual
absorption, the unit auto-switches to "days of one tree's absorption" so the
number is never `0`.

---

## 8. Pipeline cost telemetry

Every Gemini call optionally records its usage to a per-pipeline
`UsageCollector` (see [`src/lib/gemini/usage.ts`](src/lib/gemini/usage.ts)).
The orchestrator creates one collector, threads it through the three pipeline
agents, then stores the summary on the SessionRecord:

```ts
pipelineUsage: {
  entries: [
    { agent: 'AGENT2', model: 'gemini-pro-latest', usage: { input, output, total } },
    { agent: 'AGENT3', model: 'gemini-pro-latest', usage: { ... } },
    { agent: 'AGENT4', model: 'gemini-flash-latest', usage: { ... } },
  ],
  totals: { input, output, total },
}
```

A dedicated section at the bottom of the report shows this breakdown — the
user can see exactly how many tokens were spent generating their plan.

---

## 9. UI / UX choices

- **Light theme by default** with a working dark-mode toggle persisted to
  `localStorage`.
- **Locked viewport** on the home page: the body never scrolls, only the chat
  panel does (via the `lockHeight` prop on `DashboardShell` + a clipping
  container with a mask gradient on the scroll edges).
- **Stop & start over** button is always visible during chat/orchestration
  and aborts every in-flight `fetch` via `AbortController`.
- **PDF export** via `window.print()` with a dedicated print stylesheet
  (white background, page breaks per section, gradient → solid colours).
- **English UI** throughout (chips, status labels, sidebar relative times,
  agent system prompts).
- **Inline rename** of the report on the report page (`PATCH /api/report/[id]`)
  with optimistic flash feedback.

---

## 10. Tech stack reference

| Layer        | Tech                                |
|--------------|-------------------------------------|
| Framework    | Next.js 15 (App Router, TS)         |
| LLM          | Google Gemini via `@google/generative-ai` |
| Validation   | Zod                                 |
| Persistence  | Redis 7 (ioredis)                   |
| Styling      | Tailwind v3 with custom design tokens |
| Container    | Docker multi-stage (Next standalone) |
| Deploy       | Vultr VPS via rsync + docker compose |

---

## 11. Where to extend

- **Add a new provider**: append to `MODEL_CATALOG` in `catalog.ts` and the
  Analyzer responseSchema enum will pick it up automatically (the field is
  generated from `MODEL_IDS`).
- **Tweak token estimates**: `TOKENS_PER_DAY`, `LITERACY_EFFICIENCY` and
  `DAYS_PER_MONTH` in the same file.
- **Change carbon factors**: same file (`carbonPer1KTokensKg` per model).
- **New report section type**: add it to the `ReportSectionSchema`
  discriminated union, then handle it in `SectionRenderer`.
- **New question key**: extend the `ALLOWED_QUESTION_KEYS` tuple in the
  Disambiguator — Gemini will be constrained to that enum.
