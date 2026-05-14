# Themis — AI Advisor for Business

> A multi-agent AI app that helps companies figure out **how much AI they
> actually need**, **how much it will cost**, and **what it will cost the
> planet** — without becoming AI experts themselves.

---

## What it does

You answer a handful of multiple-choice questions about your company. A
pipeline of AI agents profiles you and produces a personalized plan with:

- **Recommended models** for each use case — across **Google, Anthropic and
  OpenAI**, not a single vendor.
- **Monthly and annual cost estimate** in EUR.
- **Carbon footprint** with an **EU energy-efficiency rating (A–E)** and
  human-readable equivalences (km by car, trees, phone charges).
- **Strategic decisions** with trade-offs, ROI in months, risk factors,
  carbon-optimization tips.
- **Per-role impact analysis** — what each team in your company can expect
  in concrete terms.
- **Real-world benchmarks** from companies that did similar things.

No accounts. No free-text. Closed-options chat from start to finish.

---

## How it works (from the user's point of view)

```
1.  Pick your industry and company size from two dropdowns.
2.  A short multiple-choice conversation profiles your team:
      use cases, roles involved, how many people, how often they'll use AI.
3.  Name your report.
4.  Wait ~45 seconds while the pipeline thinks out loud
      (you see each phase: analyzing → deciding → formatting).
5.  Read a structured report. Tweak the name. Export to PDF.
```

Under the hood, four agents talk to each other in sequence — a Disambiguator
runs the chat, then an Analyzer crunches numbers, a Decider produces
trade-off-driven recommendations, and a Formatter assembles the final report.
Each step is validated end-to-end so the output stays structured.

The full architecture lives in **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

---

## Quick start

```bash
cp .env.example .env
# add your GEMINI_API_KEY to .env

docker compose --env-file .env up -d --build
```

Open **http://localhost:3000**.

You'll need a free [Google AI Studio key](https://aistudio.google.com/apikey)
for the AI pipeline.

For local dev without Docker, see the commands in `package.json`.

---

## Stack

Next.js 15 · TypeScript · Tailwind · Zod · Redis · Google Gemini API · Docker.

Deploy target: a single Vultr VPS via the scripts in `scripts/`.

---

## Repo layout (TL;DR)

- **`main` branch** — stable, hackathon-ready demo (this).
- **`dev` branch** — active development (auth, RBAC, multi-tenant).
- **`docs/`** — internal notes and the hackathon presentation.
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — technical deep-dive.
- **[PROJECT_SPEC.md](./PROJECT_SPEC.md)** — original hackathon brief.

---

## Notes

- All estimates (costs, tokens, CO₂) are **indicative** — based on public
  pricing tables and published carbon-emission factors. The point is
  relative comparison, not accounting accuracy.
- Benchmarks shown in the report are real published case studies presented
  as examples, not promises of identical outcomes.
- This is a hackathon prototype. It works end-to-end and is deployable, but
  it has no auth, no tests on this branch, and assumes a single trusted
  user. The `dev` branch has the production-hardening work in progress.
