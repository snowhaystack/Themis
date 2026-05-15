<div align="center">

# ⚖️ Themis

### AI Advisor for Business

**Figure out how much AI you actually need, what it will cost,
and what it will cost the planet — without becoming an AI expert.**

<br/>

![Disambiguator](https://img.shields.io/badge/Disambiguator-0A0A0F?style=for-the-badge&labelColor=22D3EE&color=0A0A0F)
![Analyzer](https://img.shields.io/badge/Analyzer-0A0A0F?style=for-the-badge&labelColor=8B5CF6&color=0A0A0F)
![Decider](https://img.shields.io/badge/Decider-0A0A0F?style=for-the-badge&labelColor=EC4899&color=0A0A0F)
![Formatter](https://img.shields.io/badge/Formatter-0A0A0F?style=for-the-badge&labelColor=F59E0B&color=0A0A0F)

<br/>

![Next.js](https://img.shields.io/badge/Next.js_15-0A0A0F?style=flat-square&labelColor=0A0A0F&color=8B5CF6)
![TypeScript](https://img.shields.io/badge/TypeScript-0A0A0F?style=flat-square&labelColor=0A0A0F&color=22D3EE)
![Gemini](https://img.shields.io/badge/Google_Gemini-0A0A0F?style=flat-square&labelColor=0A0A0F&color=EC4899)
![Docker](https://img.shields.io/badge/Docker-0A0A0F?style=flat-square&labelColor=0A0A0F&color=F59E0B)

</div>

---

## 🎯 Philosophy

Themis — named after the Greek titaness of fair counsel — exists because
adopting AI shouldn't require being an AI expert, and shouldn't be a leap of
faith. Three principles drive every decision in this project:

- **🟣 Vendor-neutral by default.** Recommendations span **Google, Anthropic
  and OpenAI**. No lock-in, no favorites — the right model for the job, even
  if that means mixing providers.
- **🔵 Honest trade-offs, not hype.** Every recommendation comes with its
  cost, its risks, its ROI window — and its **carbon price**. Cost is never
  just money.
- **🩷 No expertise required.** Start to finish, the experience is a
  **closed-options conversation**. No free-text prompts, no jargon, no
  accounts. You answer multiple-choice questions; the agents do the
  reasoning.

> Estimates are **indicative** — built on public pricing tables and published
> emission factors. The goal is honest *relative comparison*, not accounting
> precision.

---

## ⭐ The Three Fundamental Features

> Everything else in the report supports these three pillars.

### 🟣 1 — Multi-Vendor AI Recommendations

Themis matches each of your use cases to a concrete model across
**Google, Anthropic and OpenAI**. You get a per-use-case shortlist instead
of a one-size-fits-all answer — because the cheapest model for summarization
is rarely the best one for code.

### 🔵 2 — Transparent Cost Forecast

A **monthly and annual cost estimate in EUR**, derived from how many people
will use AI, how often, and for what. No surprise bills — you see the number
before you commit, with the assumptions that produced it.

### 🩷 3 — Carbon Footprint with EU Energy Rating

Every plan ships with its environmental cost: an **EU energy-efficiency
rating (A–E)** and human-readable equivalences. AI has a planetary price,
and Themis puts it on the table next to the euros. *(Full detail below.)*

---

## 🌱 Carbon Impact

AI inference consumes real energy. Themis treats that as a **first-class
metric**, not a footnote.

For every recommended plan, the report shows:

| What you see | What it means |
|---|---|
| **🅰️–🅴 EU energy rating** | An A-to-E grade, mirroring the EU appliance-efficiency label everyone already understands. |
| **CO₂ estimate** | Annual emissions for your projected AI usage, in kg of CO₂. |
| **🚗 Real-world equivalences** | The same footprint expressed as **km driven by car**, **trees needed to offset it**, and **phone charges** — numbers a human can feel. |
| **♻️ Carbon-optimization tips** | Concrete ways to cut the footprint: smaller models for simple tasks, batching, lower-carbon regions. |

The carbon number sits **right next to the cost number** in every strategic
decision — so reducing emissions is a choice you can make deliberately, with
the trade-off visible, instead of an afterthought.

> Figures are based on **published carbon-emission factors** for AI inference
> and are indicative — meant for comparing options, not for official
> carbon accounting.

---

## 🚀 How to Use

### From the user's point of view

```
1.  Pick your industry and company size from two dropdowns.
2.  Answer a short multiple-choice conversation that profiles your team:
      use cases, roles involved, headcount, how often AI will be used.
3.  Name your report.
4.  Wait ~45 seconds while the pipeline thinks out loud
      (you watch each phase: analyzing → deciding → formatting).
5.  Read a structured report. Tweak the name. Export to PDF.
```

No accounts. No free-text. A closed-options chat from start to finish.

### Quick start

```bash
cp .env.example .env
# add your GEMINI_API_KEY to .env

docker compose --env-file .env up -d --build
```

Open **http://localhost:3000**.

You'll need a free [Google AI Studio key](https://aistudio.google.com/apikey)
for the AI pipeline. For local dev without Docker, see the scripts in
`package.json`.

---

## 🧠 How It Works (under the hood)

Four agents talk to each other in sequence — each step validated end-to-end
so the output stays structured:

| Stage | Agent | Role |
|---|---|---|
| 🔵 | **Disambiguator** | Runs the closed-options chat and profiles your company. |
| 🟣 | **Analyzer** | Crunches the numbers — usage, tokens, cost, carbon. |
| 🩷 | **Decider** | Produces trade-off-driven recommendations and ROI. |
| 🟠 | **Formatter** | Assembles the final structured report. |

The report also includes **per-role impact analysis** (what each team can
expect, concretely) and **real-world benchmarks** from companies that did
similar things.

Full technical deep-dive: **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

---

## 🛠 Stack

Next.js 15 · TypeScript · Tailwind · Zod · Redis · Google Gemini API · Docker.

Deploy target: a single Vultr VPS via the scripts in `scripts/`.

---

## 📂 Repo Layout

- **`main` branch** — stable, hackathon-ready demo.
- **`dev` branch** — active development (auth, RBAC, multi-tenant).
- **`docs/`** — internal notes and the hackathon presentation.
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — technical deep-dive.
- **[PROJECT_SPEC.md](./PROJECT_SPEC.md)** — original hackathon brief.

---

## 📌 Notes

- All estimates (costs, tokens, CO₂) are **indicative** — based on public
  pricing tables and published carbon-emission factors. The point is
  relative comparison, not accounting accuracy.
- Benchmarks shown in the report are real published case studies presented
  as examples, not promises of identical outcomes.
- This is a hackathon prototype. It works end-to-end and is deployable, but
  it has no auth, no tests on this branch, and assumes a single trusted
  user. The `dev` branch has the production-hardening work in progress.
