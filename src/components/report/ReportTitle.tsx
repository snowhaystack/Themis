'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  sessionId: string
  initialName: string
  createdAt: string
}

export function ReportTitle({ sessionId, initialName, createdAt }: Props) {
  const [name, setName] = useState(initialName)
  const [draft, setDraft] = useState(initialName)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const commit = async () => {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === name) {
      setEditing(false)
      setDraft(name)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const r = await fetch(`/api/report/${sessionId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reportName: trimmed }),
      })
      if (!r.ok) throw new Error(`PATCH ${r.status}`)
      setName(trimmed)
      setEditing(false)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const cancel = () => {
    setDraft(name)
    setEditing(false)
    setError(null)
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        {editing ? (
          <>
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 120))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void commit()
                if (e.key === 'Escape') cancel()
              }}
              maxLength={120}
              className="min-w-0 flex-1 rounded-lg border border-accent bg-surface px-3 py-1.5 font-display text-2xl font-semibold text-fg outline-none ring-2 ring-accent/30 sm:text-3xl"
            />
            <button
              type="button"
              onClick={() => void commit()}
              disabled={saving || !draft.trim()}
              className="btn-primary text-xs disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={cancel}
              className="btn-ghost text-xs"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <h1
              className="font-display text-2xl font-semibold leading-tight text-fg sm:text-3xl"
              title={name}
            >
              {name}
            </h1>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="group inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-muted transition hover:border-accent hover:text-fg"
              aria-label="Rename report"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-3 w-3"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.5 3.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 8.5-8.5z"
                />
              </svg>
              Rename
            </button>
            {savedFlash && (
              <span className="font-mono text-[10px] uppercase tracking-wider text-success">
                ✓ saved
              </span>
            )}
          </>
        )}
      </div>
      <div className="flex items-center gap-3 font-mono text-[11px] text-muted-2">
        <span>session {sessionId.slice(0, 8)}</span>
        <span>·</span>
        <span>
          {new Date(createdAt).toLocaleString('it-IT', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </span>
        {error && (
          <span className="text-danger">· error: {error}</span>
        )}
      </div>
    </div>
  )
}
