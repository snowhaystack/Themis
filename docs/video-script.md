# Script video — Themis (≈ 2:50)

**Legenda:** _testo da leggere_ in corsivo · `(azione a schermo)` tra parentesi

---

## [0:00 – 0:20] · Apertura

`(landing page — le concentric rings animate ruotano in alto a destra)`

_Ogni azienda oggi vuole adottare l'intelligenza artificiale, ma poche sanno da dove cominciare. Quali modelli scegliere? Quanto costerà ogni mese? E quanto peserà sull'ambiente? Themis risponde a tutte e tre le domande in poco più di un minuto._

## [0:20 – 0:45] · Il problema e la soluzione

`(si entra come ospite con un clic; si sceglie settore e fascia di dipendenti)`

_Themis è un advisor AI per le imprese: trasforma una breve conversazione guidata in un piano di adozione concreto — modelli consigliati, costi in euro e una classe di impatto ambientale da A a E. Nessun prompt da scrivere, nessun gergo: solo domande a risposta chiusa._

## [0:45 – 1:10] · La chat guidata

`(si risponde alle domande a opzioni; si dà un nome al report e si avvia)`

_Il primo agente, il Disambiguatore, profila l'azienda: settore, dimensione, casi d'uso, ruoli coinvolti e frequenza di utilizzo. Ogni domanda è a opzioni chiuse — l'utente non può sbagliare e il modello riceve sempre input strutturati e validati. In cinque o sei domande il profilo è completo._

## [1:10 – 2:10] · Generazione del report — _narrazione tecnica sul minuto di elaborazione_

`(pannello di orchestrazione a tutta larghezza; activity log che scorre; sidebar con la pipeline)`

_Ora parte la pipeline. Mentre il report si genera, vediamo cosa succede sotto il cofano._

_Themis orchestra quattro agenti in sequenza. L'Analizzatore stima token, costi e anidride carbonica per ogni caso d'uso, scegliendo da un catalogo di nove modelli di Google, Anthropic e OpenAI. Il Decisore costruisce lo stack ottimale, calcola il ritorno sull'investimento in mesi e i fattori di rischio. Il Formattatore compone il report finale._

_Ogni passaggio ha un contratto tipizzato con Zod: se l'output non è valido, viene rigenerato. E un gate di valutazione deterministico controlla i risultati dell'Analizzatore e del Decisore — se un numero non torna, o un modello non esiste nel catalogo, l'agente viene rieseguito una volta, prima che l'errore si propaghi a valle._

_Il pannello laterale mostra lo stato in tempo reale: ogni agente diventa verde quando ha concluso. Lo stato della sessione vive in Redis, e l'intera applicazione gira in Docker dietro un reverse proxy._

## [2:10 – 2:42] · Il report

`(scroll del report: CarbonHero, costi, decisioni)`

_Ed ecco il report. In alto, l'impronta di carbonio annuale con la classe da A a E, resa concreta da equivalenze immediate: chilometri in automobile, giorni di assorbimento di un albero. Sotto, i costi mensili e annuali in euro, ripartiti per ruolo, lo stack di modelli consigliato e le decisioni strategiche, ciascuna con motivazione, compromessi e un benchmark di mercato reale._

## [2:42 – 2:50] · Chiusura

`(logo / landing)`

_Themis: dalla semplice curiosità sull'AI a un piano costato, sostenibile e difendibile — in poco più di un minuto. Grazie._

---

## Note di timing

- La sezione [1:10–2:10] è ~115 parole, ~55–60 s a ritmo tecnico misurato — coincide con il minuto di elaborazione del report.
- Totale parlato ~430 parole ≈ 2:50 con le pause naturali.
- Se il video va lungo, la chiusura e la sezione "chat guidata" sono le più comprimibili.
