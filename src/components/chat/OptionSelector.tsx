'use client'

import { useState } from 'react'
import type { ChatOption } from '@/lib/types'

interface Props {
  options: ChatOption[]
  multiSelect: boolean
  onSubmit: (values: string[]) => void
  disabled?: boolean
}

export function OptionSelector({
  options,
  multiSelect,
  onSubmit,
  disabled,
}: Props) {
  const [selected, setSelected] = useState<string[]>([])

  const toggle = (v: string) => {
    if (disabled) return
    if (multiSelect) {
      setSelected((prev) =>
        prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
      )
    } else {
      onSubmit([v])
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => {
          const isSel = selected.includes(o.value)
          return (
            <button
              key={o.value}
              type="button"
              disabled={disabled}
              onClick={() => toggle(o.value)}
              className={`option-button ${isSel ? 'selected' : ''} ${
                disabled ? 'opacity-50' : ''
              }`}
            >
              <span className="inline-flex items-center gap-2.5">
                {multiSelect && (
                  <span
                    className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition ${
                      isSel
                        ? 'border-transparent bg-agent-gradient text-white'
                        : 'border-border bg-transparent'
                    }`}
                    aria-hidden="true"
                  >
                    {isSel && (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </span>
                )}
                <span className="leading-snug">{o.label}</span>
              </span>
            </button>
          )
        })}
      </div>
      {multiSelect && (
        <button
          type="button"
          disabled={disabled || selected.length === 0}
          onClick={() => onSubmit(selected)}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Conferma ({selected.length})
        </button>
      )}
    </div>
  )
}
