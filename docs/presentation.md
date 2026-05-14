---
marp: true
theme: gaia
paginate: true
backgroundColor: "#0a0a0a"
color: "#e0e0e0"
style: |
  section {
    background-color: #0a0a0a;
    color: #e0e0e0;
    font-family: 'Inter', 'Helvetica Neue', sans-serif;
  }
  h1, h2, h3 { color: #ffffff; }
  a { color: #60a5fa; }
  table { font-size: 0.78em; }
  th { background-color: #1a1a2e; color: #ffffff; }
  td { background-color: #111118; }
  code { background-color: #1a1a2e; color: #a5b4fc; font-size: 0.85em; }
  pre { background-color: #111118 !important; }
  strong { color: #ffffff; }
  .columns { display: flex; gap: 2em; }
  .col { flex: 1; }
---

<!-- _class: lead -->

# Themis

### AI Advisor for Business

**From AI curiosity to a costed, carbon-rated adoption plan in 5 minutes.**

snowhaystack --- AI Week --- Enterprise Utility track

<!-- speaker notes
Themis is the Greek goddess of good counsel. That's what we built: an AI advisor that gives businesses a concrete, defensible plan to adopt AI — not a vague "you should try ChatGPT." Five minutes, structured output, real numbers.
-->

---

## The Friction

Managers and entrepreneurs want AI **but can't get started.**

- **Which models fit which use cases?** 9+ providers, dozens of models, no clear map
- **What will it cost?** No way to estimate monthly/annual spend before committing
- **What's the carbon impact?** EU CSRD/CBAM makes this a compliance question, not a nice-to-have
- **Consultancies are slow and expensive.** Generic chatbots don't produce a defensible plan

<!-- speaker notes
This is the exact friction the Enterprise Utility track asks us to solve. Every manager at AI Week has this problem — they left inspired but with no actionable plan. Themis fills that gap in under 5 minutes.
-->

---

## The Solution

**Themis turns a 3-minute guided conversation into a typed, costed, carbon-rated AI adoption plan.**

- Guided closed-option chat (never free text)
- 4-agent pipeline with Zod-typed contracts
- Report: cost in EUR + A-E carbon rating + ROI + decision rationale

<!-- speaker notes
No prompt engineering required from the user. No hallucinated numbers. Every data point traces back to typed constants we maintain and expose. The user picks from dropdowns, Themis does the reasoning.
-->

---

## How It Works --- Agentic Pipeline

```
  User input ──> Agent 1  Disambiguator   (flash)
                  Classifies company, asks closed-option Q&A

             ──> Agent 2  Analyzer         (pro)
                  Models per use case, token/cost/CO2 estimates

             ──> Agent 3  Decider          (pro)
                  Optimal stack, ROI in months, risk factors

             ──> Agent 4  Formatter        (flash)
                  Typed FinalReport ready for rendering
```

Every step: **Zod-validated I/O** + `responseMimeType: application/json` + retry-on-parse-failure

<!-- speaker notes
Sequential pipeline orchestrated in Redis. Each agent has a typed contract — if Agent 2's output doesn't pass Zod validation, we retry with the error message injected into the prompt. This is reliable engineering, not prompt-and-pray. Exponential backoff + fallback model support built in.
-->

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 15** (App Router, TypeScript) |
| LLM | **Google Gemini API** (2.5-flash + 2.5-pro) |
| State | **Redis** (1h TTL session, pipeline status) |
| Validation | **Zod** (typed agent contracts) |
| Styling | **TailwindCSS** (dark mode, custom design system) |
| Infra | **Docker Compose** (multi-stage build) |
| Deploy | **Vultr VPS** (one-command deploy script) |

Cheap to host, fast to demo, ready to scale.

<!-- speaker notes
We also built a cross-provider model catalog covering 9 models across Google, Anthropic, and OpenAI — with pricing, carbon factors, and capability tags. All in TypeScript constants, not hidden in prompts. The Analyzer recommends from this catalog, not just Gemini models.
-->

---

## Live Demo

**`<DEMO_URL>`**

1. Pick **sector** + **employee range** from dropdowns
2. Answer closed-option Q&A (max 10 questions, often fewer)
3. Watch pipeline status: **Analyzing --> Deciding --> Formatting --> Done**
4. Land on the report: cost in EUR, A-E carbon rating, decision cards

Sidebar shows session history with live status indicators and search.

<!-- speaker notes
THIS IS THE DEMO SLIDE — spend ~90 seconds here. Show a real session: pick "fintech" + "50-249 employees", answer 5-6 questions, watch the pipeline run live in the sidebar, then walk through the report. Point out the carbon badge, cost breakdown by role, and decision cards with real-world benchmarks.
-->

---

## What's in the Report

**Cost** | **Carbon** | **Decisions**
---|---|---
Monthly + annual EUR per role | kg CO2 with **A-E rating** | Recommended model stack
Token-by-token transparency | Equivalences: km driven, trees | Confidence score per use case
Literacy-adjusted consumption | Rating thresholds from EU scale | Real benchmarks (Klarna, Siemens...)
Cross-provider comparison | Optimization tips | ROI estimate in months

<!-- speaker notes
The report covers 9 models from 3 providers: Google (flash-lite, flash, pro), Anthropic (Haiku, Sonnet, Opus), and OpenAI (GPT-5 Mini, GPT-5, GPT-5 Pro). Carbon equivalences humanize the numbers: "your usage = X km driven" or "X trees needed to offset." Cost is adjusted for tech literacy — a low-literacy user consumes ~2.5x more tokens than a high-literacy one.
-->

---

## Why It's Defensible

**Reliable output** --- `responseMimeType: application/json` + Zod validation + exponential retry + fallback models
`src/lib/gemini/client.ts` --- `src/lib/types/index.ts`

**Editable economics** --- Pricing, carbon factors, benchmarks are TypeScript constants, not prompts
`src/lib/data/pricing.ts` --- `src/lib/data/carbon.ts` --- `src/lib/data/catalog.ts`

**Real engineering** --- Multi-stage Docker, healthcheck, one-command Vultr deploy, session state in Redis
`docker/Dockerfile` --- `scripts/deploy.sh` --- `scripts/setup-vultr.sh`

<!-- speaker notes
Three things judges can verify in the repo. The Gemini client has responseMimeType enforcement, Zod safeParse, and if parsing fails it injects the error back into the prompt for retry with exponential backoff. Pricing is in catalog.ts with 9 models across 3 providers — change one number, every downstream calculation updates. The Dockerfile is a proper 3-stage build with a non-root user and curl-based healthcheck.
-->

---

## Deployment --- Built to Ship

```
FASE 0  Setup           ......  done
FASE 1  Foundations      ......  done
FASE 2  Agents           ......  done
FASE 3  Orchestrator/API ......  done
FASE 4  Frontend         ......  done
FASE 5  Vultr Deploy     ......  done
```

```
setup-vultr.sh  -->  rsync  -->  docker compose up -d --build  -->  /api/health  -->  live
```

<!-- speaker notes
Six phases executed cleanly. setup-vultr.sh handles Docker install, UFW firewall (ports 22/80/443), deploy user creation, and sshd hardening. deploy.sh does rsync of sources, writes .env remotely, runs docker compose, and polls /api/health up to 30 times before declaring success or failure. No CI/CD needed for a hackathon — one script, one command.
-->

---

## Business Impact and Scale

- **Who pays:** SMBs (10-249 emp) buying advisory; enterprise AI-adoption committees; consultancies white-labelling reports
- **Why now:** EU CSRD/CBAM pressure on AI carbon disclosure makes this a compliance tool, not just advice
- **Scale path:** multi-tenant + auth, persistent storage beyond 1h TTL, vertical sector packs, cost models refined from real usage telemetry

<!-- speaker notes
The cross-provider catalog already covers 3 vendors and 9 models. Adding more is a data file change, not an architecture change. Vertical packs (fintech, healthcare, manufacturing) can ship as premium tiers. The carbon rating aligns with EU energy efficiency labelling — familiar to European procurement teams.
-->

---

## Honest Limits

- Estimates are **indicative**, driven by constants we expose and document --- real billing telemetry will tighten them over time
- No auth, no persistence beyond 1h TTL --- designed for the demo, ready for the upgrade path described on the previous slide

<!-- speaker notes
We chose to be transparent. The pricing constants are sourced from public Google/Anthropic/OpenAI pricing pages and the carbon factors from Tomlinson et al. 2024 + Google sustainability reports. They're good baselines. But real-world token consumption varies wildly — we'd need telemetry from actual deployments to tighten the estimates. The 1h TTL is a deliberate hackathon choice: no persistence = no PII concerns.
-->

---

<!-- _class: lead -->

# Try It / Fork It

**Live demo:** `<DEMO_URL>`

**Repository:** `<GITHUB_URL>`

**Video:** `<VIDEO_URL>`

---

**Themis --- the AI advisor the AI Week audience actually needed.**

<!-- speaker notes
Three artefacts for the lablab.ai submission. The repo is public, the demo is live, the video is under 5 minutes. Thank you.
-->
