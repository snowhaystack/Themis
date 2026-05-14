# AI Advisor — Specifiche Progetto Hackathon

> Documento di riferimento per lo sviluppo del flusso agentico.
> Da usare come contesto iniziale per Claude Code.
> **La repo è vuota: parti da zero, hai piena libertà sulle scelte implementative purché rispettino lo stack e l'architettura descritti qui sotto.**

---

## 1. Contesto Progetto

Web app sviluppata per un hackathon che, tramite un flusso di **4 agenti AI**, genera un report dinamico personalizzato per aziende che vogliono adottare l'AI.

Il report finale deve includere:
- Modelli AI consigliati per ogni use case identificato
- Stima consumi e costi (mensili e annuali)
- Impatto ambientale (carbon footprint secondo parametri europei)
- Raccomandazioni con benchmark di casi reali e motivazioni delle scelte

---

## 2. Stack Tecnologico (vincolante)

| Componente | Tecnologia |
|------------|------------|
| Framework full-stack | **Next.js 15** (App Router, TypeScript) — sia FE che BE |
| LLM | **Google Gemini API** (`@google/generative-ai`) |
| Database / Cache | **Redis** (`ioredis`) |
| Styling | **TailwindCSS** + componenti custom minimal |
| Validazione | **Zod** per output strutturati agenti |
| Containerizzazione | **Docker + docker-compose** |
| Deploy target | **Vultr** (VPS Ubuntu) |

### Modelli Gemini da usare
- `gemini-2.0-flash` → **Agente 1** (Disambiguatore) e **Agente 4** (Formattatore) — task veloci
- `gemini-2.5-pro` → **Agente 2** (Analizzatore) e **Agente 3** (Decisionale) — ragionamento complesso

---

## 3. Architettura Agentica

Flusso sequenziale orchestrato:

```
Input utente → Agente 1 → Agente 2 → Agente 3 → Agente 4 → Report finale
```

Ogni agente ha un **contratto di input/output tipizzato con Zod**. L'orchestratore valida ogni passaggio. Se la validazione fallisce, viene effettuato un retry con il messaggio di errore passato al modello.

---

### Agente 1 — DISAMBIGUATORE
**Modello:** `gemini-2.0-flash`

**Input fisso obbligatorio** dal chatbot (due domande iniziali bloccanti, select/dropdown da cui l'utente non può uscire):
1. Settore aziendale (es. manifatturiero, fintech, retail, sanitario, education, servizi…)
2. Numero di dipendenti totali

**Compiti:**
- Classifica l'azienda in:
  - `artigiano` (1-9 dipendenti)
  - `piccola_azienda` (10-49)
  - `media_azienda` (50-249)
  - `enterprise` (250+)
- Pone domande **a risposta chiusa** (massimo 10, anche meno se ha già informazioni sufficienti) per coprire i 3 quesiti chiave:
  - Per cosa vuoi usare l'AI? (multi-select: flussi aziendali, sviluppo software, decisioni, helper dipendenti, customer support, analisi documenti, audio, immagini…)
  - Quante persone la useranno attivamente?
  - Quali figure professionali (sviluppatore, manager, venditore, operativo, designer, HR…) e con quale frequenza (giornaliera / settimanale / rara)?
- Inferisce per ogni figura un livello di alfabetizzazione tecnica (`low` / `medium` / `high`)
- **Output:** oggetto strutturato `DisambiguatorOutput`

**Comportamento conversazionale:** una domanda alla volta, sempre con opzioni chiuse, mai testo libero. Si ferma appena ha dati sufficienti.

---

### Agente 2 — ANALIZZATORE
**Modello:** `gemini-2.5-pro`

**Input:** `DisambiguatorOutput`

**Compiti:**
- Per ogni use case identificato, suggerisce il modello Gemini più adatto (flash / flash-lite / pro) con punteggio di affidabilità 0-10 e motivazione
- Stima consumo token mensile per ruolo, modulando per:
  - **Frequenza d'uso**: daily ~5000 token/giorno, weekly ~1500, rarely ~300 (valori modulabili)
  - **Efficienza** in base alla tech literacy: high=0.9, medium=0.65, low=0.4 (chi sa meno spreca più token)
- Calcola costi mensili e annuali in EUR, usando pricing Gemini definiti come costanti in `lib/data/pricing.ts` (facilmente modificabili)
- Calcola **carbon footprint** in kg CO₂ con fattore di emissione per 1M token (definito in `lib/data/carbon.ts`, baseline ~0.0002 kg CO₂/1k token modificabile) e classifica con **rating europeo A-E**
- **Output:** `AnalyzerOutput` con tutte le statistiche

---

### Agente 3 — DECISIONALE
**Modello:** `gemini-2.5-pro`

**Input:** `DisambiguatorOutput` + `AnalyzerOutput`

**Compiti:**
- Sceglie lo stack finale di modelli ottimale bilanciando costo / affidabilità / carbon footprint
- Produce un set di `Decision` (categoria, scelta, motivazione, tradeoff, esempio reale)
- Stima ROI in mesi, fattori di rischio, tips di ottimizzazione carbon
- **Output:** `DeciderOutput`

---

### Agente 4 — FORMATTATORE
**Modello:** `gemini-2.0-flash`

**Input:** tutti gli output precedenti

**Compiti:**
- Genera un report strutturato in sezioni tipizzate (`text`, `stats`, `chart`, `list`, `comparison`)
- Aggiunge executive summary, benchmark di casi reali (anche fittizi ma plausibili e citati come "esempi indicativi"), raccomandazioni finali con le motivazioni delle scelte
- **Output:** `FinalReport` pronto per il rendering del frontend

---

## 4. Struttura del Progetto (proposta — sentiti libero di migliorarla)

```
src/
  app/
    page.tsx                      # Landing + chatbot
    report/[sessionId]/page.tsx   # Pagina report finale
    api/
      chat/route.ts               # POST: gestisce conversazione Agente 1
      orchestrate/route.ts        # POST: lancia Agenti 2→3→4 in pipeline
      report/[sessionId]/route.ts # GET: recupera report da Redis
  lib/
    types/index.ts                # Tutti gli schema Zod e tipi TS
    gemini/client.ts              # Wrapper Gemini con retry + JSON mode
    redis/client.ts               # Client Redis singleton
    agents/
      disambiguator.ts            # Agente 1
      analyzer.ts                 # Agente 2
      decider.ts                  # Agente 3
      formatter.ts                # Agente 4
      orchestrator.ts             # Coordina la pipeline
    data/
      pricing.ts                  # Pricing Gemini (modificabile)
      carbon.ts                   # Fattori emissione (modificabile)
      benchmarks.ts               # Casi d'uso reali per il report
  components/
    chat/
      ChatWindow.tsx
      MessageBubble.tsx
      OptionSelector.tsx          # Per risposte a opzioni chiuse
    report/
      ReportView.tsx
      StatsCard.tsx
      CarbonBadge.tsx             # Badge A-E
      CostBreakdown.tsx
      DecisionCard.tsx
docker/
  Dockerfile
  docker-compose.yml
scripts/
  deploy.sh                       # Deploy su Vultr via SSH
  setup-vultr.sh                  # Setup iniziale VPS (Docker, firewall, ecc.)
.env.example
README.md
```

---

## 5. Fasi di Lavoro

Procedi **in quest'ordine**, fermandoti dopo ogni fase per mostrare cosa è stato fatto e attendere conferma prima di proseguire.

### FASE 0 — Setup iniziale
- La repo è vuota: inizializza il progetto Next.js 15 con TypeScript, App Router, TailwindCSS
- Imposta `package.json` con tutte le dipendenze necessarie
- Crea la struttura di cartelle proposta (o una migliore, se motivata)
- Crea `.env.example` con tutte le variabili necessarie
- Mostra il piano completo delle fasi successive prima di scrivere altro codice

### FASE 1 — Fondamenta
- Schemi Zod completi in `lib/types/index.ts` (contratti tra agenti)
- Client Gemini con supporto JSON mode + retry esponenziale
- Client Redis singleton
- File dati (`pricing.ts`, `carbon.ts`, `benchmarks.ts`) con valori di default sensati e fonti commentate

### FASE 2 — Agenti
Un agente alla volta, con:
- System prompt curato in italiano
- Output JSON validato con Zod
- Retry su errore di parsing (max 2 tentativi)
- Log prefissati (`[AGENT1]`, `[AGENT2]`…)

### FASE 3 — Orchestratore e API routes
- Pipeline che esegue gli agenti in sequenza
- Stato intermedio salvato in Redis con TTL 1h
- `sessionId` generato come UUID
- Gestione errori con risposte HTTP chiare

### FASE 4 — Frontend
- Chatbot con due domande iniziali bloccanti (select)
- Conversazione guidata con opzioni chiuse (bottoni / checkbox, mai input libero)
- Loading state durante orchestrazione con step visibili: "Analisi…", "Calcolo costi…", "Decisioni…", "Generazione report…"
- Pagina report con sezioni renderizzate per tipo
- UI pulita, professionale, dark mode di default

### FASE 5 — Deploy Vultr
- `Dockerfile` multi-stage Next.js standalone
- `docker-compose.yml` con app + Redis (+ Nginx reverse proxy opzionale)
- `scripts/setup-vultr.sh`: installa Docker, configura UFW, crea utente deploy
- `scripts/deploy.sh`: build locale, push immagine o rsync sorgenti, SSH + restart container, healthcheck
- README con istruzioni step-by-step per deploy su VPS Vultr fresca

---

## 6. Regole di Sviluppo

1. **TypeScript strict ovunque**, niente `any` se non assolutamente necessario
2. Gemini va chiamato in **JSON mode** (`responseMimeType: "application/json"` + `responseSchema`) per garantire output strutturato — riduce drasticamente i fallimenti di parsing
3. Ogni system prompt agente in italiano, conciso, con esempi di output ed elenco esplicito dei campi richiesti
4. Logga ogni step della pipeline con `console.log` prefissato (`[AGENT1]`, `[AGENT2]`…) — utile per la demo dal vivo
5. Gestisci errori Gemini (rate limit, timeout) con retry esponenziale, massimo 2 tentativi
6. Costi e fattori carbon sono **costanti modificabili**, non hardcoded nei prompt
7. UI pulita, professionale, dark mode di default, niente fronzoli — è una demo da hackathon, deve sembrare seria
8. Nessuna autenticazione: sessione = UUID in cookie / localStorage
9. README finale con: setup locale, variabili env, comandi Docker, deploy Vultr

---

## 7. Criteri di Accettazione Finali

- [ ] `npm run dev` parte pulito senza errori
- [ ] `docker compose up` parte pulito con Redis funzionante
- [ ] Flusso end-to-end funziona: input chatbot → 4 agenti → report visualizzato
- [ ] Tutti gli output agenti validati con Zod
- [ ] Report contiene:
  - Scelte dell'Agente 3 (Decisionale)
  - Statistiche dell'Agente 2 (Analizzatore)
  - Executive summary
  - Benchmark di casi reali
  - Sezione carbon footprint con rating A-E
- [ ] `scripts/deploy.sh` documentato e testabile su VPS Vultr
- [ ] README chiaro e completo

---

## 8. Prompt iniziale da dare a Claude Code

> Stiamo sviluppando un'app per un hackathon. La repo è vuota: parti da zero seguendo le specifiche descritte in questo documento (`PROJECT_SPEC.md`).
>
> Hai piena libertà sulle scelte implementative purché rispetti lo stack vincolante (Next.js 15, Gemini API, Redis, Docker, deploy Vultr) e l'architettura a 4 agenti descritta.
>
> Procedi per fasi sequenziali (FASE 0 → FASE 5). Dopo ogni fase, fermati, mostra cosa hai fatto e attendi la mia conferma prima di proseguire.
>
> Inizia ora dalla **FASE 0**: inizializza il progetto Next.js, crea la struttura di base e proponi il piano dettagliato delle fasi successive. Non procedere oltre la FASE 0 finché non confermo.
