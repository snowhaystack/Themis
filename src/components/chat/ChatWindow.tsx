'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageBubble } from './MessageBubble'
import { OptionSelector } from './OptionSelector'
import {
  SECTORS,
  EMPLOYEE_RANGES,
  type ChatResponse,
  type ChatState,
  type ChatTurn,
  type Sector,
  type EmployeeRange,
} from '@/lib/types'

type Phase =
  | 'sector'
  | 'employees'
  | 'chatting'
  | 'naming'
  | 'orchestrating'
  | 'error'
type PipelinePhase = 'analyzing' | 'deciding' | 'formatting'

const SECTOR_LABELS: Record<Sector, string> = {
  manifatturiero: 'Manifatturiero',
  fintech: 'Fintech',
  retail: 'Retail / E-commerce',
  sanitario: 'Sanitario / Healthcare',
  education: 'Education',
  servizi_professionali: 'Servizi professionali',
  logistica: 'Logistica / Supply chain',
  energia_utilities: 'Energia / Utilities',
  agritech: 'Agritech',
  media_entertainment: 'Media / Entertainment',
  pubblica_amministrazione: 'Pubblica amministrazione',
  altro: 'Altro',
}

interface MessageBlock {
  id: string
  role: 'agent' | 'user'
  content: React.ReactNode
}

interface LogEntry {
  ts: number
  level: 'event' | 'work' | 'done'
  text: string
  agent?: 1 | 2 | 3 | 4
}

const PIPELINE_STEPS: Array<{
  key: PipelinePhase
  label: string
  agent: string
  agentNum: 2 | 3 | 4
  etaSeconds: number
  color: 'agent2' | 'agent3' | 'agent4'
}> = [
  {
    key: 'analyzing',
    label: 'Quantitative analysis',
    agent: 'AGENT2',
    agentNum: 2,
    etaSeconds: 18,
    color: 'agent2',
  },
  {
    key: 'deciding',
    label: 'Strategic decisions',
    agent: 'AGENT3',
    agentNum: 3,
    etaSeconds: 18,
    color: 'agent3',
  },
  {
    key: 'formatting',
    label: 'Report generation',
    agent: 'AGENT4',
    agentNum: 4,
    etaSeconds: 12,
    color: 'agent4',
  },
]

const STEP_DOT_BG: Record<'agent2' | 'agent3' | 'agent4', string> = {
  agent2: 'bg-agent2',
  agent3: 'bg-agent3',
  agent4: 'bg-agent4',
}
const STEP_TEXT: Record<'agent2' | 'agent3' | 'agent4', string> = {
  agent2: 'text-agent2',
  agent3: 'text-agent3',
  agent4: 'text-agent4',
}

const PHASE_TICKS: Record<PipelinePhase, string[]> = {
  analyzing: [
    'Estimating token usage per role…',
    'Distributing load across use cases…',
    'Picking primary + alternative providers…',
    'Computing monthly and annual costs…',
    'Computing carbon footprint per model…',
    'Computing EU rating A–E…',
  ],
  deciding: [
    'Evaluating multi-provider stack options…',
    'Balancing cost / reliability / CO₂…',
    'Computing ROI in months…',
    'Identifying implementation risks…',
    'Drafting carbon optimization tips…',
    'Selecting relevant case studies…',
  ],
  formatting: [
    'Composing executive summary…',
    'Generating typed report sections…',
    'Picking market benchmarks…',
    'Formatting KPI metrics…',
    'Finalizing recommendations…',
  ],
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function formatHMS(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

interface Props {
  onSessionCreated?: (sessionId: string) => void
  onAgentChange?: (agent: 1 | 2 | 3 | 4 | null) => void
}

export function ChatWindow({ onSessionCreated, onAgentChange }: Props = {}) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('sector')
  const [sector, setSector] = useState<Sector | null>(null)
  const [employeeRange, setEmployeeRange] = useState<EmployeeRange | null>(null)
  const [history, setHistory] = useState<ChatTurn[]>([])
  const [messages, setMessages] = useState<MessageBlock[]>([
    {
      id: 'm-0',
      role: 'agent',
      content: (
        <div>
          <p className="font-medium text-fg">
            Hi 👋 — I'm <span className="text-gradient font-semibold">Themis</span>.
          </p>
          <p className="mt-1 text-sm text-muted">
            I'll ask you a few multiple-choice questions and prepare a personalized
            AI plan — recommended models across Google, Anthropic and OpenAI,
            monthly &amp; annual costs, and environmental impact.
            Start by telling me your <strong className="text-fg">industry sector</strong>.
          </p>
        </div>
      ),
    },
  ])
  const [pending, setPending] = useState(false)
  const [currentQ, setCurrentQ] = useState<ChatResponse | null>(null)
  const [pipelineStep, setPipelineStep] = useState<number>(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const [chatTickMs, setChatTickMs] = useState(0)
  const [disambiguatorOutput, setDisambiguatorOutput] = useState<
    Extract<ChatResponse, { done: true }>['output'] | null
  >(null)
  const [reportName, setReportName] = useState('')
  const phaseRef = useRef<PipelinePhase | null>(null)
  const tickIndexRef = useRef(0)
  const abortRef = useRef<AbortController>(new AbortController())
  const cancelledRef = useRef(false)

  const getSignal = () => abortRef.current.signal
  const isAbort = (err: unknown): boolean =>
    err instanceof DOMException
      ? err.name === 'AbortError'
      : err instanceof Error && /aborted|signal is aborted/i.test(err.message)

  const initialGreeting: MessageBlock = {
    id: 'm-0',
    role: 'agent',
    content: (
      <div>
        <p className="font-medium text-fg">
          Hi 👋 — I'm <span className="text-gradient font-semibold">Themis</span>.
        </p>
        <p className="mt-1 text-sm text-muted">
          I'll ask you a few multiple-choice questions and prepare a personalized
          AI plan — recommended models across Google, Anthropic and OpenAI,
          monthly &amp; annual costs, and environmental impact.
          Start by telling me your <strong className="text-fg">industry sector</strong>.
        </p>
      </div>
    ),
  }

  const resetSession = () => {
    // Abort any in-flight fetch + polling
    cancelledRef.current = true
    abortRef.current.abort()
    abortRef.current = new AbortController()
    cancelledRef.current = false
    // Reset state
    setPhase('sector')
    setSector(null)
    setEmployeeRange(null)
    setHistory([])
    setMessages([initialGreeting])
    setPending(false)
    setCurrentQ(null)
    setPipelineStep(0)
    setErrorMsg(null)
    setStartedAt(null)
    setElapsedMs(0)
    setLogEntries([])
    setChatTickMs(0)
    setDisambiguatorOutput(null)
    setReportName('')
    phaseRef.current = null
    tickIndexRef.current = 0
    onAgentChange?.(1)
  }

  const scrollRef = useRef<HTMLDivElement>(null)
  const logScrollRef = useRef<HTMLDivElement>(null)

  // Notify parent of agent change so the header dot can light up.
  useEffect(() => {
    if (phase === 'sector' || phase === 'employees' || phase === 'chatting') {
      onAgentChange?.(1)
      return
    }
    if (phase === 'orchestrating') {
      const step = PIPELINE_STEPS[pipelineStep]
      onAgentChange?.(step?.agentNum ?? null)
      return
    }
    onAgentChange?.(null)
  }, [phase, pipelineStep, onAgentChange])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' })
  }, [messages, currentQ, phase])

  useEffect(() => {
    if (phase !== 'orchestrating' || !startedAt) return
    const id = setInterval(() => {
      setElapsedMs(Date.now() - startedAt)
    }, 200)
    return () => clearInterval(id)
  }, [phase, startedAt])

  useEffect(() => {
    if (phase !== 'orchestrating') return
    const id = setInterval(() => {
      const currentPhase = PIPELINE_STEPS[pipelineStep]?.key
      if (!currentPhase) return
      const pool = PHASE_TICKS[currentPhase]
      const text = pool[tickIndexRef.current % pool.length]
      tickIndexRef.current += 1
      const agentNum = PIPELINE_STEPS[pipelineStep]?.agentNum
      setLogEntries((prev) => [
        ...prev,
        { ts: Date.now(), level: 'work', text, agent: agentNum },
      ])
    }, 2400)
    return () => clearInterval(id)
  }, [phase, pipelineStep])

  useEffect(() => {
    logScrollRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' })
  }, [logEntries])

  // Live tick mentre l'API /chat è in corso (per indicator "API in azione")
  useEffect(() => {
    if (!(pending && phase === 'chatting')) {
      setChatTickMs(0)
      return
    }
    const start = Date.now()
    const id = setInterval(() => setChatTickMs(Date.now() - start), 100)
    return () => clearInterval(id)
  }, [pending, phase])

  const appendUser = (text: string) => {
    setMessages((m) => [
      ...m,
      { id: `u-${m.length}`, role: 'user', content: text },
    ])
  }
  const appendAgent = (node: React.ReactNode) => {
    setMessages((m) => [
      ...m,
      { id: `a-${m.length}`, role: 'agent', content: node },
    ])
  }
  const pushLog = (entry: Omit<LogEntry, 'ts'>) => {
    setLogEntries((prev) => [...prev, { ...entry, ts: Date.now() }])
  }

  const startConversation = async (s: Sector, e: EmployeeRange) => {
    setPending(true)
    setPhase('chatting')
    try {
      const state: ChatState = { sector: s, employeeRange: e, history: [] }
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ state }),
        signal: getSignal(),
      })
      if (!res.ok) throw new Error(`Chat API ${res.status}`)
      const data = (await res.json()) as ChatResponse
      setCurrentQ(data)
      if (!data.done) {
        appendAgent(<p className="text-sm text-fg">{data.question}</p>)
      }
    } catch (err) {
      if (isAbort(err)) return
      setPhase('error')
      setErrorMsg(err instanceof Error ? err.message : String(err))
    } finally {
      setPending(false)
    }
  }

  const submitAnswer = async (selected: string[]) => {
    if (!currentQ || currentQ.done || !sector || !employeeRange) return

    const optionLabels = selected
      .map((v) => currentQ.options.find((o) => o.value === v)?.label ?? v)
      .join(', ')
    appendUser(optionLabels)

    const newTurn: ChatTurn = {
      questionKey: currentQ.questionKey,
      question: currentQ.question,
      selectedOptions: selected,
    }
    const newHistory = [...history, newTurn]
    setHistory(newHistory)
    setCurrentQ(null)
    setPending(true)

    try {
      const state: ChatState = { sector, employeeRange, history: newHistory }
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ state }),
        signal: getSignal(),
      })
      if (!res.ok) throw new Error(`Chat API ${res.status}`)
      const data = (await res.json()) as ChatResponse

      if (data.done) {
        setDisambiguatorOutput(data.output)
        const defaultName = `Piano AI · ${
          SECTOR_LABELS[sector] ?? sector
        } · ${new Date().toLocaleDateString('it-IT', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
        })}`
        setReportName(defaultName)
        appendAgent(
          <div>
            <p className="text-sm text-fg">
              Got it — I have enough to build your plan.
            </p>
            <p className="mt-1 text-xs text-muted">
              {data.output.conversationSummary}
            </p>
          </div>
        )
        setPhase('naming')
      } else {
        setCurrentQ(data)
        appendAgent(<p className="text-sm text-fg">{data.question}</p>)
      }
    } catch (err) {
      if (isAbort(err)) return
      setPhase('error')
      setErrorMsg(err instanceof Error ? err.message : String(err))
    } finally {
      setPending(false)
    }
  }

  const launchOrchestration = async (
    disambiguator: Extract<ChatResponse, { done: true }>['output'],
    name: string
  ) => {
    setPhase('orchestrating')
    setPipelineStep(0)
    setStartedAt(Date.now())
    setElapsedMs(0)
    setLogEntries([])
    phaseRef.current = 'analyzing'
    tickIndexRef.current = 0

    pushLog({ level: 'event', text: '🚀 Pipeline started · session created' })
    pushLog({
      level: 'event',
      agent: 2,
      text: '[AGENT2] starting quantitative analysis (gemini-pro-latest)',
    })

    try {
      const res = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ disambiguator, reportName: name }),
        signal: getSignal(),
      })
      if (!res.ok) throw new Error(`Orchestrate API ${res.status}`)
      const data = (await res.json()) as { sessionId: string }
      const sessionId = data.sessionId

      onSessionCreated?.(sessionId)

      pushLog({
        level: 'event',
        text: `🆔 sessionId: ${sessionId.slice(0, 8)}…`,
      })

      let attempts = 0
      const poll = async (): Promise<void> => {
        if (cancelledRef.current) return
        attempts++
        const r = await fetch(`/api/report/${sessionId}`, {
          signal: getSignal(),
        })
        if (!r.ok) throw new Error(`Report API ${r.status}`)
        const session = await r.json()

        const newPhase: PipelinePhase | null =
          session.status === 'analyzing'
            ? 'analyzing'
            : session.status === 'deciding'
              ? 'deciding'
              : session.status === 'formatting'
                ? 'formatting'
                : null

        if (newPhase && newPhase !== phaseRef.current) {
          const prev = phaseRef.current
          if (prev) {
            pushLog({
              level: 'done',
              text: `✅ ${
                PIPELINE_STEPS.find((s) => s.key === prev)?.label ?? prev
              } completed`,
            })
          }
          const stepIdx = PIPELINE_STEPS.findIndex((s) => s.key === newPhase)
          setPipelineStep(stepIdx)
          const step = PIPELINE_STEPS[stepIdx]
          pushLog({
            level: 'event',
            agent: step.agentNum,
            text: `[${step.agent}] starting ${step.label.toLowerCase()}`,
          })
          phaseRef.current = newPhase
          tickIndexRef.current = 0
        }

        if (session.status === 'done') {
          pushLog({
            level: 'done',
            text: '✅ Report ready · redirecting…',
          })
          setTimeout(() => router.push(`/report/${sessionId}`), 600)
          return
        }
        if (session.status === 'error') {
          throw new Error(session.error ?? 'Pipeline error')
        }
        if (attempts > 120) throw new Error('Timeout: pipeline too slow')

        await new Promise((r) => setTimeout(r, 1500))
        if (cancelledRef.current) return
        return poll()
      }
      await poll()
    } catch (err) {
      if (isAbort(err)) return
      setPhase('error')
      setErrorMsg(err instanceof Error ? err.message : String(err))
      pushLog({
        level: 'event',
        text: `❌ Error: ${err instanceof Error ? err.message : String(err)}`,
      })
    }
  }

  const totalEta = PIPELINE_STEPS.reduce((s, x) => s + x.etaSeconds, 0)

  const showRestartButton = phase !== 'sector'
  const restartLabel =
    phase === 'orchestrating' ? 'Stop & start over' : 'New analysis'
  const handleRestart = () => {
    if (phase === 'orchestrating') {
      const ok = window.confirm(
        'A report is being generated. Stop it and start a new analysis?'
      )
      if (!ok) return
    }
    resetSession()
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Toolbar — visible once the user has started */}
      {showRestartButton && (
        <div className="flex shrink-0 items-center justify-between gap-2">
          <span className="chip text-[10px] uppercase tracking-wider">
            {phase === 'orchestrating'
              ? `Generating · ${formatElapsed(elapsedMs)}`
              : phase === 'naming'
                ? 'Naming the report'
                : phase === 'chatting'
                  ? `Q&A · ${history.length} answered`
                  : 'Setup'}
          </span>
          <button
            type="button"
            onClick={handleRestart}
            className={
              phase === 'orchestrating'
                ? 'btn-ghost border-danger/40 text-danger hover:bg-danger/10 text-xs'
                : 'btn-ghost text-xs'
            }
          >
            {phase === 'orchestrating' ? '⛔' : '↻'} {restartLabel}
          </button>
        </div>
      )}

      {/* messages — wrapped in a clipping container so the scroll edges are rounded */}
      <div className="flex-1 min-h-0 overflow-hidden rounded-2xl border border-border bg-bg-elev/40 backdrop-blur-xl">
      <div
        ref={scrollRef}
        className="h-full space-y-4 overflow-y-auto p-4 [mask-image:linear-gradient(to_bottom,transparent_0,black_12px,black_calc(100%-12px),transparent)]"
      >
        {messages.map((m) => (
          <MessageBubble key={m.id} role={m.role}>
            {m.content}
          </MessageBubble>
        ))}

        {/* Step 1: select settore */}
        {phase === 'sector' && (
          <MessageBubble role="agent">
            <p className="mb-3 text-sm text-fg">
              Pick your industry sector:
            </p>
            <OptionSelector
              multiSelect={false}
              options={SECTORS.map((s) => ({
                value: s,
                label: SECTOR_LABELS[s],
              }))}
              onSubmit={(v) => {
                const chosen = v[0] as Sector
                setSector(chosen)
                appendUser(SECTOR_LABELS[chosen])
                setPhase('employees')
                appendAgent(
                  <p className="text-sm text-fg">
                    Great. How many employees does the company have?
                  </p>
                )
              }}
            />
          </MessageBubble>
        )}

        {/* Step 2: select dipendenti */}
        {phase === 'employees' && sector && (
          <MessageBubble role="agent">
            <p className="mb-3 text-sm text-fg">Employee range:</p>
            <OptionSelector
              multiSelect={false}
              options={EMPLOYEE_RANGES.map((r) => ({
                value: r.value,
                label: r.label,
              }))}
              onSubmit={(v) => {
                const e = v[0] as EmployeeRange
                setEmployeeRange(e)
                const label =
                  EMPLOYEE_RANGES.find((r) => r.value === e)?.label ?? e
                appendUser(label)
                void startConversation(sector, e)
              }}
            />
          </MessageBubble>
        )}

        {/* Step 3: domande disambiguatore */}
        {phase === 'chatting' && currentQ && !currentQ.done && (
          <MessageBubble role="agent">
            <OptionSelector
              multiSelect={currentQ.multiSelect}
              options={currentQ.options}
              onSubmit={submitAnswer}
              disabled={pending}
            />
          </MessageBubble>
        )}

        {/* Step 3.5: naming del report */}
        {phase === 'naming' && disambiguatorOutput && (
          <MessageBubble role="agent">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-fg">
                  Name your report
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  Helps you find it later. You can always rename it.
                </p>
              </div>
              <input
                type="text"
                value={reportName}
                onChange={(e) => setReportName(e.target.value.slice(0, 120))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && reportName.trim()) {
                    void launchOrchestration(
                      disambiguatorOutput,
                      reportName.trim()
                    )
                  }
                }}
                placeholder="e.g. AI Plan · Q3 2026"
                maxLength={120}
                autoFocus
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted-2">
                  {reportName.length}/120
                </span>
                <button
                  type="button"
                  disabled={!reportName.trim()}
                  onClick={() =>
                    void launchOrchestration(
                      disambiguatorOutput,
                      reportName.trim()
                    )
                  }
                  className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Generate report →
                </button>
              </div>
            </div>
          </MessageBubble>
        )}

        {/* Step 4: orchestrazione in corso */}
        {phase === 'orchestrating' && (
          <MessageBubble role="agent">
            <div className="space-y-4">
              {/* Header con timer */}
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-fg">
                    Preparing your report
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Typical time: ~{totalEta}s · don't close this page
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-gradient font-mono text-3xl font-semibold tabular-nums">
                    {formatElapsed(elapsedMs)}
                  </div>
                  <p className="text-[10px] uppercase tracking-wider text-muted">
                    elapsed
                  </p>
                </div>
              </div>

              {/* Gradient progress bar */}
              <div className="relative h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-agent-gradient transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      99,
                      ((pipelineStep + 0.5) / PIPELINE_STEPS.length) * 100
                    )}%`,
                    backgroundSize: '200% 100%',
                  }}
                />
                <div className="pointer-events-none absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/15 to-transparent bg-[length:200%_100%]" />
              </div>

              {/* Steps */}
              <ol className="space-y-2">
                {PIPELINE_STEPS.map((s, i) => {
                  const state =
                    i < pipelineStep
                      ? 'done'
                      : i === pipelineStep
                        ? 'active'
                        : 'pending'
                  const dotCls = STEP_DOT_BG[s.color]
                  return (
                    <li
                      key={s.key}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ring-1 transition ${
                          state === 'done'
                            ? `${dotCls} ring-transparent text-white`
                            : state === 'active'
                              ? `${dotCls} ring-transparent text-white shadow-glow-strong`
                              : 'bg-surface-2 ring-border text-muted'
                        }`}
                      >
                        {state === 'done' ? '✓' : i + 1}
                      </span>
                      <span
                        className={`flex-1 ${
                          state === 'pending' ? 'text-muted' : 'text-fg'
                        }`}
                      >
                        {s.label}
                      </span>
                      <span className="font-mono text-[10px] text-muted-2">
                        {s.agent}
                      </span>
                      <span className="text-xs text-muted">~{s.etaSeconds}s</span>
                      {state === 'active' && (
                        <span
                          className={`ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full ${dotCls}`}
                        />
                      )}
                    </li>
                  )
                })}
              </ol>

              {/* Activity feed */}
              <div className="rounded-xl border border-border bg-bg/60 p-3 backdrop-blur-xl">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-2">
                    <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-success" />
                    activity_log
                  </p>
                  <span className="text-[10px] text-muted-2">
                    {logEntries.length} events
                  </span>
                </div>
                <div
                  ref={logScrollRef}
                  className="max-h-44 space-y-1 overflow-y-auto font-mono text-[11px] leading-relaxed"
                >
                  {logEntries.slice(-30).map((e, i) => {
                    const colorCls =
                      e.level === 'done'
                        ? 'text-success'
                        : e.agent === 2
                          ? STEP_TEXT.agent2
                          : e.agent === 3
                            ? STEP_TEXT.agent3
                            : e.agent === 4
                              ? STEP_TEXT.agent4
                              : e.level === 'event'
                                ? 'text-fg'
                                : 'text-muted'
                    return (
                      <div
                        key={`${e.ts}-${i}`}
                        className={`flex items-start gap-2 ${colorCls}`}
                      >
                        <span className="shrink-0 text-muted-2">
                          {formatHMS(e.ts)}
                        </span>
                        <span className="break-words">{e.text}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </MessageBubble>
        )}

        {/* Errore */}
        {phase === 'error' && (
          <MessageBubble role="agent">
            <p className="text-sm font-semibold text-danger">
              Something went wrong
            </p>
            <p className="mt-1 text-xs text-muted">{errorMsg}</p>
            <button
              className="btn-ghost mt-3"
              onClick={() => window.location.reload()}
            >
              Restart
            </button>
          </MessageBubble>
        )}

        {/* Live API indicator (sostituisce il vecchio "Sto pensando…") */}
        {pending && phase === 'chatting' && (
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-agent1/20">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-agent1 shadow-glow-strong" />
            </div>
            <div className="flex-1 rounded-xl border border-border bg-bg-elev/50 p-3 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-agent1">
                    AGENT1
                  </span>
                  <span className="font-mono text-[10px] text-muted-2">
                    gemini-flash-latest
                  </span>
                </div>
                <span className="font-mono text-xs font-semibold tabular-nums text-fg">
                  {(chatTickMs / 1000).toFixed(1)}s
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2 font-mono text-[11px]">
                <span className="rounded bg-success/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-success">
                  POST
                </span>
                <span className="text-fg">/api/chat</span>
                <span className="ml-auto inline-flex items-center gap-1">
                  <span
                    className="h-1 w-1 animate-pulse rounded-full bg-agent1"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="h-1 w-1 animate-pulse rounded-full bg-agent1"
                    style={{ animationDelay: '200ms' }}
                  />
                  <span
                    className="h-1 w-1 animate-pulse rounded-full bg-agent1"
                    style={{ animationDelay: '400ms' }}
                  />
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-muted">
                {chatTickMs < 1500
                  ? '→ connecting to Google AI…'
                  : chatTickMs < 4000
                    ? '→ reading history · generating next question…'
                    : chatTickMs < 8000
                      ? '→ model reasoning · may take up to ~15s'
                      : '→ still working · auto-retry on saturation'}
              </p>
            </div>
          </div>
        )}
      </div>
      </div>

      <div className="text-center text-[11px] text-muted-2">
        Closed-options only — no step requires free-text input.
      </div>
    </div>
  )
}
