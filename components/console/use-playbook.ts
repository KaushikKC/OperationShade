'use client'

import { useCallback, useMemo, useSyncExternalStore } from 'react'
import type { Classified } from '@/lib/types'

/**
 * Maya's Playbook: wordings she has approved, kept in this browser.
 *
 * Nothing here is sent, and nothing here changes the reader. An approved
 * wording only ever replaces a prepared reply that was already going to go
 * out — so a message she has never seen a draft for cannot acquire one, and
 * reactions, life events and judgement calls are untouched because the routing
 * never wrote them a draft in the first place.
 */

const STORAGE_KEY = 'maya.playbook.v1'

export type ApprovedReply = {
  id: string
  signature: string
  intent: string
  skinType: string
  budgetBand?: string
  originalDraft: string
  approvedText: string
  sourceMessageId: string
  createdAt: string
  enabled: boolean
}

export type ReplyFeedback = {
  messageId: string
  originalDraft: string
  finalText: string
  signature: string
  outcome: 'accepted' | 'edited'
  createdAt: string
}

type Stored = {
  approved: ApprovedReply[]
  feedback: ReplyFeedback[]
  reuseOn: boolean
  /** Messages where she has put the prepared reply back, by id. */
  restored: string[]
}

const EMPTY: Stored = { approved: [], feedback: [], reuseOn: true, restored: [] }

/** Short, stable and readable in storage. Not security, just identity. */
function fingerprint(text: string): string {
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

/**
 * What counts as "a similar message". Intent and skin type on their own group
 * too broadly on this data — 27 messages share "value · unknown" but carry ten
 * different prepared replies, so one approval would rewrite nine answers she
 * never looked at. Including the prepared reply keeps the promise exact: her
 * wording is used wherever that same reply would have gone out.
 */
export function signatureOf(row: Pick<Classified, 'answers' | 'draft'>): string | null {
  const a = row.answers
  if (!a?.intent?.choice || !row.draft) return null
  return `${a.intent.choice}|${a.skin_type?.choice ?? 'unknown'}|${fingerprint(row.draft)}`
}

/** A prepared reply is the only thing an approved wording may replace. */
export function canReuse(row: Classified): boolean {
  if (!row?.draft) return false
  return row.lane !== 'noise' && row.lane !== 'intent'
}

function parse(raw: string | null): Stored {
  if (!raw) return EMPTY
  try {
    const v = JSON.parse(raw) as Partial<Stored>
    const approved = Array.isArray(v.approved)
      ? v.approved.filter(
          (a): a is ApprovedReply =>
            !!a && typeof a.id === 'string' && typeof a.signature === 'string' && typeof a.approvedText === 'string' && a.approvedText.trim().length > 0,
        )
      : []
    return {
      approved,
      feedback: Array.isArray(v.feedback) ? v.feedback.filter((f): f is ReplyFeedback => !!f && typeof f.messageId === 'string') : [],
      reuseOn: v.reuseOn !== false,
      restored: Array.isArray(v.restored) ? v.restored.filter((r): r is string => typeof r === 'string') : [],
    }
  } catch {
    // Someone else's key, a half-written value, a browser that blocks it.
    return EMPTY
  }
}

/**
 * localStorage is an external store, so React reads it through
 * useSyncExternalStore rather than an effect that sets state on mount. The
 * snapshot is cached against the raw string: returning a fresh object on every
 * read would spin the renderer. Writes go straight through and notify, which
 * also keeps a second tab in step.
 */
let cachedRaw: string | null = null
let cachedSnapshot: Stored = EMPTY
const listeners = new Set<() => void>()

function readSnapshot(): Stored {
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return cachedSnapshot
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cachedSnapshot = parse(raw)
  }
  return cachedSnapshot
}

const serverSnapshot = (): Stored => EMPTY

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange)
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === STORAGE_KEY) onChange()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onStorage)
  }
}

function write(next: Stored): void {
  cachedSnapshot = next
  try {
    cachedRaw = JSON.stringify(next)
    window.localStorage.setItem(STORAGE_KEY, cachedRaw)
  } catch {
    // Private window, blocked storage, full quota. The session still works,
    // it just will not survive a refresh.
    cachedRaw = null
  }
  for (const l of listeners) l()
}

export function usePlaybook() {
  const state = useSyncExternalStore(subscribe, readSnapshot, serverSnapshot)
  const update = useCallback((fn: (s: Stored) => Stored) => write(fn(cachedSnapshot)), [])

  const bySignature = useMemo(() => {
    const m = new Map<string, ApprovedReply>()
    for (const a of state.approved) if (a.enabled) m.set(a.signature, a)
    return m
  }, [state.approved])

  /** The wording to show for this message, or null to keep the prepared one. */
  const approvedFor = useCallback(
    (row: Classified): ApprovedReply | null => {
      if (!state.reuseOn || !canReuse(row)) return null
      if (state.restored.includes(row.id)) return null
      const sig = signatureOf(row)
      if (!sig) return null
      const hit = bySignature.get(sig)
      // Never hand back the same text it would have shown anyway.
      return hit && hit.approvedText !== row.draft ? hit : null
    },
    [bySignature, state.reuseOn, state.restored],
  )

  const record = useCallback(
    (f: ReplyFeedback) => update((s) => ({ ...s, feedback: [f, ...s.feedback].slice(0, 200) })),
    [update],
  )

  /** Approve a wording for every message that would have had this same reply. */
  const approve = useCallback((row: Classified, approvedText: string, originalDraft: string) => {
    const sig = signatureOf({ answers: row.answers, draft: originalDraft })
    if (!sig || !approvedText.trim()) return
    const entry: ApprovedReply = {
      id: `${sig}-${Date.now().toString(36)}`,
      signature: sig,
      intent: row.answers?.intent?.choice ?? 'unknown',
      skinType: row.answers?.skin_type?.choice ?? 'unknown',
      budgetBand: row.answers?.budget_band?.choice,
      originalDraft,
      approvedText: approvedText.trim(),
      sourceMessageId: row.id,
      createdAt: new Date().toISOString(),
      enabled: true,
    }
    update((s) => ({
      ...s,
      approved: [entry, ...s.approved.filter((a) => a.signature !== sig)],
      restored: s.restored.filter((id) => id !== row.id),
    }))
  }, [update])

  const setEnabled = useCallback(
    (id: string, enabled: boolean) =>
      update((s) => ({ ...s, approved: s.approved.map((a) => (a.id === id ? { ...a, enabled } : a)) })),
    [update],
  )

  const setReuseOn = useCallback((reuseOn: boolean) => update((s) => ({ ...s, reuseOn })), [update])

  /** Put the prepared reply back for one message, and take it away again. */
  const restoreOriginal = useCallback(
    (messageId: string) =>
      update((s) => (s.restored.includes(messageId) ? s : { ...s, restored: [...s.restored, messageId] })),
    [update],
  )
  const useApprovedAgain = useCallback(
    (messageId: string) => update((s) => ({ ...s, restored: s.restored.filter((id) => id !== messageId) })),
    [update],
  )

  const reset = useCallback(() => write(EMPTY), [])

  return {
    approved: state.approved,
    feedback: state.feedback,
    reuseOn: state.reuseOn,
    restored: state.restored,
    approvedFor,
    approve,
    record,
    setEnabled,
    setReuseOn,
    restoreOriginal,
    useApprovedAgain,
    reset,
  }
}
