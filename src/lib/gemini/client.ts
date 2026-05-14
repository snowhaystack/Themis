import {
  GoogleGenerativeAI,
  type GenerationConfig,
  type Schema,
} from '@google/generative-ai'
import { z } from 'zod'
import type { UsageCollector } from './usage'

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey && process.env.NODE_ENV !== 'test') {
  console.warn('[GEMINI] GEMINI_API_KEY not set — API calls will fail')
}

const client = new GoogleGenerativeAI(apiKey ?? '')

export type GeminiModelName =
  | 'gemini-2.5-flash'
  | 'gemini-2.5-flash-lite'
  | 'gemini-2.5-pro'
  // Alias "latest" — Google routes to the current best model in family.
  // Più stabili sul long-tail (meno saturazione, meno regressioni sui prompt).
  | 'gemini-flash-latest'
  | 'gemini-pro-latest'

export interface GenerateJsonArgs<T> {
  model: GeminiModelName
  systemInstruction: string
  prompt: string
  schema: z.ZodType<T>
  /** JSON-Schema (subset Gemini) per forzare la struttura dell'output */
  responseSchema?: Schema
  temperature?: number
  maxOutputTokens?: number
  maxRetries?: number
  /** Modello di fallback usato dopo l'ultimo tentativo se ancora transient-error */
  fallbackModel?: GeminiModelName
  label?: string
  /** Optional usage tracker (used by the pipeline orchestrator). */
  collector?: UsageCollector
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  }
  return trimmed
}

/**
 * Errori "transient" lato Google (saturation, rate limit, server errors).
 * Per questi conviene aspettare di più e NON cambiare il prompt.
 */
function isTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /\b(429|500|502|503|504|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|rate limit|overloaded|temporarily|quota)\b/i.test(
    msg
  )
}

interface CallResult<T> {
  data: T
  rawLen: number
  elapsedMs: number
  raw: string
  usage: { input: number; output: number; total: number } | null
}

async function callGemini<T>(args: {
  model: GeminiModelName
  systemInstruction: string
  generationConfig: GenerationConfig
  prompt: string
  schema: z.ZodType<T>
  label: string
  attempt: number
}): Promise<CallResult<T>> {
  const { model, systemInstruction, generationConfig, prompt, schema, label, attempt } =
    args
  const genModel = client.getGenerativeModel({
    model,
    systemInstruction,
    generationConfig,
  })
  const started = Date.now()
  const result = await genModel.generateContent(prompt)
  const raw = result.response.text()
  const elapsedMs = Date.now() - started

  const cleaned = stripCodeFence(raw)
  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch (e) {
    const err = new Error(
      `Risposta non è JSON valido. Errore parser: ${(e as Error).message}`
    )
    ;(err as { raw?: string }).raw = raw
    throw err
  }

  const validated = schema.safeParse(parsed)
  if (!validated.success) {
    const err = new Error(
      `JSON non conforme allo schema Zod. Errori: ${JSON.stringify(
        validated.error.flatten()
      )}`
    )
    ;(err as { raw?: string }).raw = raw
    throw err
  }

  const meta = result.response.usageMetadata
  const usage = meta
    ? {
        input: meta.promptTokenCount ?? 0,
        output: meta.candidatesTokenCount ?? 0,
        total:
          meta.totalTokenCount ??
          (meta.promptTokenCount ?? 0) + (meta.candidatesTokenCount ?? 0),
      }
    : null

  console.log(
    `[${label}] ok (${model}, attempt ${attempt + 1}, ${elapsedMs}ms, ${raw.length}B${
      usage ? `, ${usage.total} tok)` : ')'
    }`
  )
  return { data: validated.data, rawLen: raw.length, elapsedMs, raw, usage }
}

export async function generateJson<T>({
  model,
  systemInstruction,
  prompt,
  schema,
  responseSchema,
  temperature = 0.3,
  maxOutputTokens = 4096,
  maxRetries = 3,
  fallbackModel,
  label = 'GEMINI',
  collector,
}: GenerateJsonArgs<T>): Promise<T> {
  const generationConfig: GenerationConfig = {
    temperature,
    maxOutputTokens,
    responseMimeType: 'application/json',
    ...(responseSchema ? { responseSchema } : {}),
  }

  let lastError: unknown
  let lastRaw = ''
  let currentPrompt = prompt
  let currentModel = model

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const out = await callGemini({
        model: currentModel,
        systemInstruction,
        generationConfig,
        prompt: currentPrompt,
        schema,
        label,
        attempt,
      })
      if (collector && out.usage) {
        collector.push({ agent: label, model: currentModel, usage: out.usage })
      }
      return out.data
    } catch (err) {
      lastError = err
      const msg = err instanceof Error ? err.message : String(err)
      const transient = isTransientError(err)
      const raw = (err as { raw?: string }).raw
      if (raw) lastRaw = raw

      console.warn(
        `[${label}] tentativo ${attempt + 1}/${maxRetries + 1} fallito (${
          transient ? 'transient' : 'parse/schema'
        }): ${msg}`
      )
      if (lastRaw && !transient) {
        console.warn(
          `[${label}] raw response (primi 2000 char):\n${lastRaw.slice(0, 2000)}`
        )
      }

      if (attempt >= maxRetries) {
        // Ultimo tentativo: prova il modello di fallback
        if (fallbackModel && fallbackModel !== currentModel) {
          console.warn(
            `[${label}] passo al fallback model: ${fallbackModel}`
          )
          try {
            const out = await callGemini({
              model: fallbackModel,
              systemInstruction,
              generationConfig,
              prompt: currentPrompt,
              schema,
              label: `${label}/fallback`,
              attempt: attempt + 1,
            })
            if (collector && out.usage) {
              collector.push({
                agent: `${label}/fallback`,
                model: fallbackModel,
                usage: out.usage,
              })
            }
            return out.data
          } catch (fbErr) {
            lastError = fbErr
            console.warn(
              `[${label}] anche il fallback ${fallbackModel} ha fallito: ${
                fbErr instanceof Error ? fbErr.message : String(fbErr)
              }`
            )
          }
        }
        break
      }

      // Backoff
      const backoffMs = transient
        ? 3000 * Math.pow(2, attempt) // 3s, 6s, 12s, 24s
        : 600 * Math.pow(2, attempt) // 0.6s, 1.2s, 2.4s, 4.8s
      console.log(`[${label}] attesa ${backoffMs}ms prima del retry`)
      await sleep(backoffMs)

      // Se è un errore di parse/schema, includiamo l'errore + raw response nel prompt
      // per aiutare il modello al prossimo tentativo. Se è transient, non tocchiamo
      // il prompt (non è colpa del modello).
      if (!transient && lastRaw) {
        currentPrompt = `${prompt}\n\n---\nIl tentativo precedente ha prodotto un output non valido.\nERRORE: ${msg}\nOUTPUT PRECEDENTE (primi 1200 char):\n${lastRaw.slice(0, 1200)}\n\nRiprova restituendo SOLO JSON valido, con TUTTI i campi richiesti popolati. Niente markdown, niente backtick, niente testo extra.`
      }
    }
  }

  throw new Error(
    `[${label}] generazione fallita dopo ${maxRetries + 1} tentativi: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  )
}
