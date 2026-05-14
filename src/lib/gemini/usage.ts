/**
 * Per-pipeline token usage collector.
 * The orchestrator creates one collector per run, passes it to every agent,
 * then stores the summary on the SessionRecord so the report can show
 * how many tokens were spent generating it.
 */

export interface UsageEntry {
  agent: string
  model: string
  usage: {
    input: number
    output: number
    total: number
  }
}

export interface UsageSummary {
  entries: UsageEntry[]
  totals: {
    input: number
    output: number
    total: number
  }
}

export interface UsageCollector {
  push(entry: UsageEntry): void
  summary(): UsageSummary
}

export function createUsageCollector(): UsageCollector {
  const entries: UsageEntry[] = []
  return {
    push(entry) {
      entries.push(entry)
    },
    summary() {
      const totals = entries.reduce(
        (a, e) => ({
          input: a.input + e.usage.input,
          output: a.output + e.usage.output,
          total: a.total + e.usage.total,
        }),
        { input: 0, output: 0, total: 0 }
      )
      return { entries: [...entries], totals }
    },
  }
}
