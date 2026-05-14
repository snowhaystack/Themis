# Themis — AI Advisor for Business

Web app sviluppata per un hackathon. Tramite un flusso a **4 agenti AI** (Google Gemini) genera un report personalizzato per aziende che vogliono adottare l'AI:

- modelli AI consigliati per ogni use case
- stima consumi e costi mensili/annuali (EUR)
- impatto ambientale con rating europeo A–E
- raccomandazioni con benchmark di casi reali

Stack: **Next.js 15** (App Router, TS) · **Gemini API** · **Redis** · **TailwindCSS** · **Docker** · deploy su **Vultr**.

---

## 🧠 Architettura agentica

```
Input chatbot (sector + employee range)
        │
        ▼
   AGENTE 1 — Disambiguatore        (gemini-2.5-flash)
   conversazione a opzioni chiuse,
   produce DisambiguatorOutput
        │
        ▼
   AGENTE 2 — Analizzatore          (gemini-2.5-pro)
   sceglie modelli, stima token,
   costi, carbon footprint
        │
        ▼
   AGENTE 3 — Decisionale           (gemini-2.5-pro)
   bilancia costo/affidabilità/CO2,
   sceglie lo stack, calcola ROI
        │
        ▼
   AGENTE 4 — Formattatore          (gemini-2.5-flash)
   genera FinalReport tipizzato
        │
        ▼
   Pagina report /report/[sessionId]
```

Ogni agente ha un contratto **Zod** verificato. Su errore di parsing si riprova fino a 2 volte passando l'errore al modello (`responseMimeType: application/json`).

Lo stato della sessione è in Redis con TTL 1h.

---

## 📁 Struttura del progetto

```
src/
  app/
    page.tsx                          # Landing + chatbot
    report/[sessionId]/page.tsx       # Pagina report finale
    api/
      chat/route.ts                   # POST: gestisce conversazione Agente 1
      orchestrate/route.ts            # POST: avvia pipeline 2→3→4
      report/[sessionId]/route.ts     # GET: stato/report da Redis
      health/route.ts                 # GET: healthcheck per Docker
  lib/
    types/index.ts                    # Tutti gli schema Zod
    gemini/client.ts                  # Wrapper Gemini (JSON mode + retry)
    redis/client.ts                   # Client Redis singleton
    agents/
      disambiguator.ts                # Agente 1
      analyzer.ts                     # Agente 2
      decider.ts                      # Agente 3
      formatter.ts                    # Agente 4
      orchestrator.ts                 # Pipeline runner + Redis state
    data/
      pricing.ts                      # Pricing Gemini (modificabile)
      carbon.ts                       # Fattori CO2 (modificabile)
      benchmarks.ts                   # Casi reali per il report
  components/
    chat/                             # ChatWindow, MessageBubble, OptionSelector
    report/                           # ReportView, StatsCard, CarbonBadge, ...
docker/
  Dockerfile                          # Multi-stage Next.js standalone
docker-compose.yml                    # app + redis
scripts/
  setup-vultr.sh                      # Setup VPS Ubuntu (Docker, UFW, utente deploy)
  deploy.sh                           # rsync + build + restart su VPS
```

---

## 🚀 Setup locale

### Requisiti
- Node.js 20+
- Docker + Docker Compose
- Una chiave API Gemini ([Google AI Studio](https://aistudio.google.com/apikey))

### Sviluppo

```bash
cp .env.example .env
# modifica .env con la tua GEMINI_API_KEY

# Avvia Redis in Docker
docker run -d --name themis-redis -p 6379:6379 redis:7-alpine

# Installa deps e avvia dev server
npm install
npm run dev
```

App su [http://localhost:3000](http://localhost:3000).

### Full stack via Docker Compose

```bash
cp .env.example .env
# modifica .env con GEMINI_API_KEY

docker compose --env-file .env up -d --build
```

App su [http://localhost:3000](http://localhost:3000). Logs:

```bash
docker compose logs -f app
```

---

## 🌍 Variabili d'ambiente

| Variabile | Obbligatoria | Default | Descrizione |
|---|---|---|---|
| `GEMINI_API_KEY` | ✅ | — | Chiave Google AI Studio |
| `REDIS_URL` | ✅ | `redis://localhost:6379` | URL Redis (in Docker: `redis://redis:6379`) |
| `NODE_ENV` |  | `development` | `production` per build prod |

---

## 🧪 Test rapido del flusso

1. Apri la home, scegli **settore** e **range dipendenti**.
2. Rispondi alle domande a opzioni chiuse (max 10).
3. Quando l'Agente 1 ha abbastanza dati, parte la pipeline 2→3→4 con indicatore di stato.
4. A fine pipeline vieni reindirizzato a `/report/[sessionId]`.

Log dei singoli agenti nel server con prefisso `[AGENT1]`, `[AGENT2]`, ecc.

---

## 🛠️ Modificare costi e fattori carbon

I valori sono in **costanti TypeScript**, non nei prompt:

- `src/lib/data/pricing.ts` — pricing Gemini (USD/1M token), tasso EUR/USD, token/giorno per frequenza, moltiplicatori per tech literacy
- `src/lib/data/carbon.ts` — kg CO₂ per 1k token per modello, soglie rating A–E, equivalenze (km auto, alberi, ecc.)

Modifica il file, ricarica: tutti i calcoli si aggiornano.

---

## 🚢 Deploy su Vultr

### 1. Crea un VPS Vultr (Ubuntu 22.04 o 24.04)

Almeno 1 GB RAM, IPv4 pubblico.

### 2. Setup iniziale del server

Dalla tua macchina locale:

```bash
ssh root@<vps-ip> 'bash -s' < scripts/setup-vultr.sh
```

Lo script:
- aggiorna pacchetti
- installa Docker + Docker Compose plugin
- crea utente `deploy` con accesso `sudo`/`docker`
- abilita UFW (22, 80, 443)
- hardening sshd (disabilita password login)

### 3. Deploy

Dalla tua macchina locale, con la repo clonata e la chiave SSH già configurata sul VPS:

```bash
export DEPLOY_HOST=<vps-ip>
export DEPLOY_USER=deploy
export GEMINI_API_KEY=sk-...

./scripts/deploy.sh
```

Lo script:
- `rsync` dei sorgenti su `/opt/themis`
- scrive `.env` con le chiavi
- `docker compose up -d --build`
- attende healthcheck su `/api/health`

App raggiungibile su `http://<vps-ip>:3000`. Per HTTPS aggiungi un reverse proxy (Caddy / Nginx + Certbot) davanti al container.

### Update rapido

Ogni volta che vuoi rideployare:

```bash
DEPLOY_HOST=<vps-ip> GEMINI_API_KEY=sk-... ./scripts/deploy.sh
```

---

## 🧰 Comandi utili

```bash
npm run dev          # dev server
npm run build        # build produzione (output: .next/standalone)
npm run start        # avvio produzione locale (richiede npm run build)
npm run lint         # lint
npm run typecheck    # tsc --noEmit

docker compose up -d --build              # full stack
docker compose logs -f app                # logs app
docker compose exec redis redis-cli       # shell Redis
```

---

## ⚠️ Note

- Nessuna autenticazione: la sessione è un UUID gestito in Redis (TTL 1h).
- Il chatbot è **a opzioni chiuse**: l'utente non può scrivere testo libero in alcuno step.
- I benchmark nel report sono esempi reali noti (Klarna, Morgan Stanley, ecc.); altri casi possono essere indicati come "esempi indicativi".
- Le stime di costo e CO₂ sono **indicative**, basate su costanti modificabili in `lib/data/`.
