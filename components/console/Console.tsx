'use client'

import Link from 'next/link'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { DEFAULT_THRESHOLD, rebucket } from '@/lib/lanes'
import type { Classified, Lane } from '@/lib/types'
import { MAYA_ROUTING, QUESTIONS } from './questions'
import {
  LANE_META,
  LANE_ORDER,
  budgetLabel,
  intentLabel,
  optionLabel,
  pct,
  skinLabel,
  timeAgo,
} from './format'
import { useResults, type RunMode } from './use-results'
import { signatureOf, usePlaybook, type ApprovedReply } from './use-playbook'

/** A row as the console shows it: her approved wording may stand in for the draft. */
type Row = Classified & { fromPlaybook?: ApprovedReply; preparedDraft?: string }

/** What the review bar is set to, in her words rather than a number. */
function barMood(t: number): string {
  if (t < 0.6) return 'More coverage'
  if (t < 0.75) return 'Balanced'
  return 'Safer'
}

type Tab = 'all' | 'low' | 'urgent' | 'sample'

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function conf(c: { confidence?: number } | undefined): number {
  return num(c?.confidence)
}

function isLowConfidence(dm: Classified): boolean {
  const a = dm.answers
  if (!a) return true
  const confs = [conf(a.intent), conf(a.skin_type), conf(a.budget_band)]
  return confs.some((c) => c > 0 && c < 0.55)
}

function isUrgent(dm: Classified): boolean {
  return num(dm.answers?.urgency?.score) >= 0.7
}

/** One answer chosen out of a question card, filtering the table to it. */
type Pick = { key: string; value: string; label: string; rungs?: number }

/**
 * Does this message carry that answer? A choice question matches the option
 * the reader landed on. The two scales match the rung nearest the score —
 * a message scoring 0.7 on buying is "ready", which is the word on the chip
 * and the only form of it she ever sees.
 */
function matchesPick(dm: Classified, pick: Pick): boolean {
  const ans = (dm.answers as Record<string, unknown> | undefined)?.[pick.key] as
    | { choice?: string; score?: number }
    | undefined
  if (!ans) return false
  if (typeof ans.choice === 'string') return ans.choice === pick.value
  if (typeof ans.score === 'number' && pick.rungs && pick.rungs > 1) {
    return String(Math.round(ans.score * (pick.rungs - 1))) === pick.value
  }
  return false
}

function ConfBar({ value }: { value: number | null }) {
  if (value === null) return null
  return (
    <span className="conf-bar" aria-hidden>
      <i style={{ width: `${value}%` }} />
    </span>
  )
}

function Chip({
  label,
  value,
  tone,
}: {
  label: string
  value?: number | null
  tone?: 'default' | 'hot' | 'calm'
}) {
  const bg =
    tone === 'hot' ? 'var(--nb-pink)' : tone === 'calm' ? 'var(--nb-mint)' : 'var(--nb-paper)'
  return (
    <span className="nb-pill" style={{ background: bg, fontWeight: 600, fontSize: 11 }}>
      {label}
      {value != null && (
        <>
          <ConfBar value={value} />
          <span style={{ fontWeight: 800 }}>{value}%</span>
        </>
      )}
    </span>
  )
}

function AnswerChips({ dm }: { dm: Classified }) {
  const a = dm.answers
  if (!a) return <span className="nb-pill">not read yet</span>
  const needsYou = pct(a.needs_maya_personally)
  const routable = pct(a.answerable_by_routing)
  const buying = pct(a.purchase_intent?.score)
  return (
    <span className="inline-flex flex-wrap gap-1">
      <Chip label={intentLabel(a.intent?.choice)} value={pct(a.intent?.confidence)} />
      {a.skin_type?.choice && a.skin_type.choice !== 'unknown' && (
        <Chip label={skinLabel(a.skin_type.choice)} value={pct(a.skin_type.confidence)} />
      )}
      {a.budget_band?.choice && a.budget_band.choice !== 'unknown' && (
        <Chip label={budgetLabel(a.budget_band.choice)} value={pct(a.budget_band.confidence)} />
      )}
      {buying != null && buying >= 50 && <Chip label={`buying ${buying}%`} />}
      {routable != null && routable >= 60 && (
        <Chip label={`from notes ${routable}%`} tone="calm" />
      )}
      {needsYou != null && needsYou >= 60 && (
        <Chip label={`needs you ${needsYou}%`} tone="hot" />
      )}
    </span>
  )
}

function LaneTag({ lane, urgent }: { lane: Lane | undefined; urgent?: boolean }) {
  const meta = lane ? LANE_META[lane] : null
  return (
    <span className="inline-flex flex-col gap-1">
      <span
        className="nb-pill"
        style={{ background: meta?.color ?? 'var(--nb-cream-deep)', fontWeight: 800 }}
      >
        {meta?.short ?? 'unsorted'}
      </span>
      {urgent && (
        <span className="nb-tape" style={{ background: 'var(--nb-coral)' }}>
          urgent
        </span>
      )}
    </span>
  )
}

/**
 * One of the reader's questions. It opens to show what it can answer, where the
 * line is drawn, and how the inbox actually answered — tapping one of those
 * answers shows just those messages.
 *
 * It is not a switch. All nine are asked of every message in one pass, so
 * turning one off would mean reading the whole inbox again.
 */
function QuestionCardView({
  q,
  rows,
  pick,
  onPick,
}: {
  q: (typeof QUESTIONS)[number]
  rows: Classified[]
  pick: Pick | null
  onPick: (p: Pick | null) => void
}) {
  const [open, setOpen] = useState(false)
  const kindLabel = { options: 'pick one', scale: 'how much', yesno: 'yes / no' }[q.kind]
  const mine = pick?.key === q.key ? pick : null
  const rungs = q.options?.length ?? 0
  /** The value a chip filters on: the option itself, or its rung on a scale. */
  const valueAt = (o: string, i: number) => (q.kind === 'scale' ? String(i) : o)
  // Counted only while the card is open, so a closed sidebar costs nothing.
  const counts = useMemo(() => {
    if (!open || !q.options) return null
    const out: Record<string, number> = {}
    for (const [i, o] of q.options.entries()) {
      const value = valueAt(o, i)
      out[value] = rows.reduce((n, r) => n + (matchesPick(r, { key: q.key, value, label: '', rungs }) ? 1 : 0), 0)
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, q, rows, rungs])
  return (
    <div className="nb-card-flat" style={{ boxShadow: 'none' }}>
      <button
        className="flex w-full items-center gap-2 p-3 text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="font-display text-[14px] font-bold flex-1">{q.label}</span>
        {q.hidden && (
          <span className="nb-tape" style={{ background: 'var(--nb-cream-deep)' }}>
            not shown
          </span>
        )}
        <span className="nb-tape" style={{ background: 'var(--nb-blue)' }}>
          {kindLabel}
        </span>
        <span aria-hidden className="text-[13px] font-bold" style={{ color: 'var(--nb-muted)' }}>
          {open ? '−' : '+'}
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3">
          <p className="text-[12.5px]" style={{ color: 'var(--nb-muted)' }}>
            {q.prompt}
          </p>
          {q.options && (
            <>
              <p className="mt-1.5 text-[11px] font-semibold" style={{ color: 'var(--nb-muted)' }}>
                Tap an answer to see just those messages.
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {q.options.map((o, i) => {
                  const value = valueAt(o, i)
                  const n = counts?.[value] ?? 0
                  const active = mine?.value === value
                  // Nothing in this run answered that way, so there is nothing
                  // to show — it stays readable, but it does not pretend.
                  const empty = n === 0 && !active
                  return (
                    <button
                      key={o}
                      disabled={empty}
                      aria-pressed={active}
                      title={empty ? 'None in this run' : `Show the ${n} like this`}
                      onClick={() =>
                        onPick(active ? null : { key: q.key, value, label: optionLabel(q.key, o), rungs })
                      }
                      className="rounded-md border border-[color:var(--nb-ink)] px-1.5 py-0.5 text-[11px] font-semibold"
                      style={{
                        background: active ? 'var(--nb-ink)' : 'var(--nb-bg)',
                        color: active ? 'var(--nb-paper)' : 'var(--nb-ink)',
                        opacity: empty ? 0.4 : 1,
                        cursor: empty ? 'default' : 'pointer',
                      }}
                    >
                      {optionLabel(q.key, o)}
                      {n > 0 && <span style={{ opacity: 0.65 }}> {n}</span>}
                    </button>
                  )
                })}
              </div>
            </>
          )}
          {q.threshold && (
            <p className="mt-2 text-[11px] font-semibold" style={{ color: 'var(--nb-muted)' }}>
              {q.threshold}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Where sending will happen, once her account is connected.
 *
 * It is drawn disabled and says why, rather than being left out — both
 * platforms do allow a reply to someone who messaged her first (Instagram
 * inside 24 hours, TikTok inside 48), so this is a real next step and not a
 * decoration. What is missing is the conversation itself: a reply needs the
 * id the platform hands over when the message arrives, and these rows came
 * from a file. It stays disabled until there is a live inbox behind it.
 */
function SendButton({ ready }: { ready: boolean }) {
  return (
    <button
      className="nb-btn"
      disabled
      title="Not connected yet — copy it across for now"
      style={{ background: 'var(--nb-mint)', padding: '6px 14px', fontSize: 13, opacity: ready ? 0.6 : 0.4 }}
    >
      Send
    </button>
  )
}

function Drawer({
  dm,
  playbook,
  onClose,
}: {
  dm: Row
  playbook: ReturnType<typeof usePlaybook>
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  // The prepared reply is what the routing wrote, even when her approved
  // wording is standing in for it — so "put it back" always has something to
  // put back, and an approval is always keyed to the reply it replaced.
  const prepared = dm.preparedDraft ?? dm.draft ?? ''
  // Keyed on the message and its current reply at the call site, so a new
  // message or a changed reply remounts this and the box starts clean.
  const [text, setText] = useState(dm.draft ?? '')
  /** Hers, typed from scratch on a message the routing left alone. */
  const [mine, setMine] = useState('')
  const [asking, setAsking] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const a = dm.answers
  const fields: { key: string; label: string; node: ReactNode }[] = []
  if (a) {
    const choice = (key: string, label: string, ans?: { choice?: string; confidence?: number; probabilities?: Record<string, number> }) => {
      if (!ans?.choice) return
      fields.push({
        key,
        label,
        node: (
          <span className="inline-flex items-center gap-2">
            <b>{optionLabel(key, ans.choice)}</b>
            <ConfBar value={pct(ans.confidence)} />
            <span className="text-[12px] font-bold">{pct(ans.confidence)}%</span>
          </span>
        ),
      })
    }
    choice('intent', 'What they want', a.intent)
    choice('skin_type', 'Skin type', a.skin_type)
    choice('budget_band', 'Budget', a.budget_band)
    const scale = (key: string, label: string, v?: { score?: number; confidence?: number }) => {
      const s = pct(v?.score)
      if (s === null) return
      fields.push({
        key,
        label,
        node: (
          <span className="inline-flex items-center gap-2">
            <ConfBar value={s} />
            <span className="text-[12px] font-bold">{s}%</span>
          </span>
        ),
      })
    }
    scale('buying', 'Buying signal', a.purchase_intent)
    scale('urgent', 'Time pressure', a.urgency)
    const yesno = (key: string, label: string, v?: number) => {
      const s = pct(v)
      if (s === null) return
      fields.push({
        key,
        label,
        node: (
          <span className="inline-flex items-center gap-2">
            <ConfBar value={s} />
            <span className="text-[12px] font-bold">{s}%</span>
          </span>
        ),
      })
    }
    yesno('needs', 'Needs you', a.needs_maya_personally)
    yesno('routable', 'Answerable from notes', a.answerable_by_routing)
    yesno('shelf', 'Names a shelf product', a.names_shelf_product)
  }
  return (
    <div
      className="fixed inset-0 z-40"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{ background: 'rgba(10,10,10,.25)' }}
    >
      <aside
        className="absolute right-0 top-0 h-full w-[min(480px,94vw)] overflow-y-auto border-l-[3px] border-[color:var(--nb-ink)] p-5"
        style={{ background: 'var(--nb-bg)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="nb-hand text-[26px] leading-none">@{dm.handle || 'unknown'}</div>
            <div className="mt-1 text-[12px] font-semibold" style={{ color: 'var(--nb-muted)' }}>
              {dm.platform === 'tt' ? 'TikTok' : 'Instagram'} · {timeAgo(dm.ts)} ago
              {dm.persona ? ` · case file: ${dm.persona}` : ''}
            </div>
          </div>
          <button className="nb-btn" style={{ padding: '6px 12px' }} onClick={onClose}>
            Close
          </button>
        </div>

        <div className="nb-card-flat mt-4 p-4">
          <div className="nb-eyebrow mb-2">Message</div>
          <p className="text-[15px] leading-relaxed">{dm.text || '—'}</p>
        </div>

        {dm.lane && (
          <div className="mt-4 flex items-center gap-3">
            <LaneTag lane={dm.lane} urgent={isUrgent(dm)} />
            <span className="text-[13px]" style={{ color: 'var(--nb-muted)' }}>
              {LANE_META[dm.lane].desc}
            </span>
          </div>
        )}

        <div className="nb-card-flat mt-4 p-4">
          <div className="nb-eyebrow mb-2">What it read</div>
          <dl className="space-y-2">
            {fields.map((f) => (
              <div key={f.key} className="flex items-center justify-between gap-3 text-[13px]">
                <dt style={{ color: 'var(--nb-muted)' }}>{f.label}</dt>
                <dd>{f.node}</dd>
              </div>
            ))}
            {fields.length === 0 && (
              <p className="text-[13px]" style={{ color: 'var(--nb-muted)' }}>
                No readings on this one yet.
              </p>
            )}
          </dl>
        </div>

        {dm.draft && (
          <div
            className="nb-card-flat mt-4 border-l-[6px] p-4"
            style={{ background: 'var(--nb-cream-deep)', borderLeftColor: 'var(--nb-coral)' }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="nb-eyebrow">Draft in your words</div>
              {dm.fromPlaybook && (
                <button
                  className="text-[11px] underline"
                  style={{ color: 'var(--nb-muted)' }}
                  onClick={() => playbook.restoreOriginal(dm.id)}
                >
                  put the prepared reply back
                </button>
              )}
              {!dm.fromPlaybook && playbook.restored.includes(dm.id) && (
                <button
                  className="text-[11px] underline"
                  style={{ color: 'var(--nb-muted)' }}
                  onClick={() => playbook.useApprovedAgain(dm.id)}
                >
                  use my approved wording here
                </button>
              )}
            </div>
            {dm.fromPlaybook && (
              <div className="mb-2 mt-1 text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--nb-muted)' }}>
                From a reply you approved
              </div>
            )}

            <textarea
              className="nb-hand mt-2 w-full resize-y rounded-md border-[2.5px] border-[color:var(--nb-ink)] p-2.5 text-[20px] leading-snug"
              style={{ background: 'var(--nb-paper)', minHeight: 132 }}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setSaved(null)
                setAsking(false)
              }}
              aria-label="Your reply"
            />

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                className="nb-btn nb-btn-mint"
                style={{ padding: '6px 14px', fontSize: 13 }}
                onClick={() => {
                  playbook.record({
                    messageId: dm.id,
                    originalDraft: prepared,
                    finalText: prepared,
                    signature: signatureOf({ answers: dm.answers, draft: prepared }) ?? '',
                    outcome: 'accepted',
                    createdAt: new Date().toISOString(),
                  })
                  setText(prepared)
                  setAsking(false)
                  setSaved('Kept as written. Nothing has been sent.')
                }}
              >
                Use as written
              </button>
              <button
                className="nb-btn nb-btn-coral"
                style={{ padding: '6px 14px', fontSize: 13 }}
                disabled={!text.trim() || text.trim() === prepared.trim()}
                onClick={() => {
                  playbook.record({
                    messageId: dm.id,
                    originalDraft: prepared,
                    finalText: text.trim(),
                    signature: signatureOf({ answers: dm.answers, draft: prepared }) ?? '',
                    outcome: 'edited',
                    createdAt: new Date().toISOString(),
                  })
                  setSaved(null)
                  setAsking(true)
                }}
              >
                Save my version
              </button>
              <button
                className="nb-btn"
                style={{ background: 'var(--nb-cream-deep)', padding: '6px 14px', fontSize: 13 }}
                onClick={() => {
                  void navigator.clipboard?.writeText(text).then(() => {
                    setCopied(true)
                    setTimeout(() => setCopied(false), 1500)
                  })
                }}
              >
                {copied ? 'Copied ✓' : 'Copy to reply'}
              </button>
              <SendButton ready={!!text.trim()} />
            </div>

            {asking && (
              <div className="nb-card-flat mt-3 p-3" style={{ background: 'var(--nb-yellow)' }}>
                <p className="text-[13.5px] font-bold">Use this wording for similar messages?</p>
                <p className="mt-1 text-[11.5px]" style={{ color: 'var(--nb-muted)' }}>
                  Only where this same reply was going out anyway. Reactions and anything already kept for you
                  are untouched.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    className="nb-btn nb-btn-mint"
                    style={{ padding: '6px 14px', fontSize: 13 }}
                    onClick={() => {
                      playbook.approve(dm, text, prepared)
                      setAsking(false)
                      setSaved('Approved. Similar messages will start with your wording.')
                    }}
                  >
                    Approve for similar
                  </button>
                  <button
                    className="nb-btn"
                    style={{ background: 'var(--nb-paper)', padding: '6px 14px', fontSize: 13 }}
                    onClick={() => {
                      setAsking(false)
                      setSaved('Not approved for similar messages.')
                    }}
                  >
                    Don’t reuse this
                  </button>
                </div>
              </div>
            )}

            {saved && (
              <p className="mt-2 text-[12px] font-bold" style={{ color: 'var(--nb-muted)' }}>
                {saved}
              </p>
            )}
            <p className="mt-2 text-[11.5px]" style={{ color: 'var(--nb-muted)' }}>
              Sending turns on once your account is connected, and it will always be this button —
              never on its own.
            </p>
          </div>
        )}
        {dm.why && (
          <div className="nb-card-flat mt-4 p-4" style={{ background: 'var(--nb-pink)' }}>
            <div className="nb-eyebrow mb-1">Why it’s yours</div>
            <p className="nb-hand text-[21px] leading-snug">{dm.why}</p>
          </div>
        )}

        {/*
         * Somewhere to write one of hers. Only on the ones kept for her, and
         * only when the routing wrote nothing — a blank box, never a prefill,
         * because the whole reason this message is here is that no wording of
         * her routing's would be the right one.
         *
         * It does not reach the Playbook. An approval replaces a prepared
         * reply that was going out anyway, and there is none here.
         */}
        {dm.lane === 'maya' && !dm.draft && (
          <div
            className="nb-card-flat mt-4 border-l-[6px] p-4"
            style={{ background: 'var(--nb-cream-deep)', borderLeftColor: 'var(--nb-pink)' }}
          >
            <div className="nb-eyebrow mb-2">Your reply</div>
            <textarea
              className="nb-hand w-full resize-y rounded-md border-[2.5px] border-[color:var(--nb-ink)] p-2.5 text-[20px] leading-snug"
              style={{ background: 'var(--nb-paper)', minHeight: 132 }}
              placeholder="In your words…"
              value={mine}
              onChange={(e) => setMine(e.target.value)}
              aria-label="Your reply to this message"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                className="nb-btn nb-btn-coral"
                style={{ padding: '6px 14px', fontSize: 13 }}
                disabled={!mine.trim()}
                onClick={() => {
                  void navigator.clipboard?.writeText(mine).then(() => {
                    setCopied(true)
                    setTimeout(() => setCopied(false), 1500)
                  })
                }}
              >
                {copied ? 'Copied ✓' : 'Copy to reply'}
              </button>
              <SendButton ready={!!mine.trim()} />
              {mine.trim() && (
                <button
                  className="nb-btn"
                  style={{ background: 'var(--nb-paper)', padding: '6px 14px', fontSize: 13 }}
                  onClick={() => setMine('')}
                >
                  Clear
                </button>
              )}
            </div>
            <p className="mt-2 text-[11.5px]" style={{ color: 'var(--nb-muted)' }}>
              Sending turns on once your account is connected. Until then you copy it across yourself,
              and nothing leaves this screen. Your wording here stays on this one message and is never
              reused.
            </p>
          </div>
        )}
      </aside>
    </div>
  )
}

function PlaybookPanel({
  playbook,
  threshold,
}: {
  playbook: ReturnType<typeof usePlaybook>
  threshold: number
}) {
  const [confirming, setConfirming] = useState(false)
  const { approved, reuseOn } = playbook

  return (
    <div className="nb-card p-4" style={{ background: 'var(--nb-yellow)' }}>
      <div className="flex items-center justify-between text-[13px]">
        <span style={{ color: 'var(--nb-muted)' }}>Review bar</span>
        <b>
          {barMood(threshold)} · {Math.round(threshold * 100)}%
        </b>
      </div>

      <label className="mt-2 flex cursor-pointer items-center justify-between gap-2 text-[13px]">
        <span>Use my approved replies</span>
        <input
          type="checkbox"
          checked={reuseOn}
          onChange={(e) => playbook.setReuseOn(e.target.checked)}
          style={{ accentColor: 'var(--nb-ink)', width: 16, height: 16 }}
        />
      </label>

      <div className="mt-3 border-t-[2px] border-[color:var(--nb-line-soft)] pt-2 text-[12px]" style={{ color: 'var(--nb-muted)' }}>
        {approved.length === 0
          ? 'Nothing approved yet. Edit a reply and approve your wording to start one.'
          : `${approved.length} approved ${approved.length === 1 ? 'reply' : 'replies'}`}
      </div>

      {approved.length > 0 && (
        <ul className="mt-2 space-y-2">
          {approved.map((a) => (
            <li key={a.id} className="nb-card-flat p-2" style={{ background: 'var(--nb-paper)' }}>
              <label className="flex cursor-pointer items-start justify-between gap-2">
                <span className="text-[12.5px] leading-snug">
                  <b>
                    {skinLabel(a.skinType)} · {intentLabel(a.intent)}
                  </b>
                  <span className="mt-0.5 block nb-hand text-[15px]" style={{ color: 'var(--nb-muted)' }}>
                    “{a.approvedText.slice(0, 64)}
                    {a.approvedText.length > 64 ? '…' : ''}”
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={a.enabled}
                  onChange={(e) => playbook.setEnabled(a.id, e.target.checked)}
                  style={{ accentColor: 'var(--nb-ink)', width: 15, height: 15, marginTop: 2 }}
                />
              </label>
            </li>
          ))}
        </ul>
      )}

      {approved.length > 0 &&
        (confirming ? (
          <div className="mt-3 text-[12px]">
            <p className="font-bold">Clear everything you have approved?</p>
            <p className="mt-0.5" style={{ color: 'var(--nb-muted)' }}>
              Kept in this browser only. The prepared replies stay exactly as they were.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                className="nb-btn nb-btn-coral"
                style={{ padding: '5px 12px', fontSize: 12 }}
                onClick={() => {
                  playbook.reset()
                  setConfirming(false)
                }}
              >
                Yes, clear them
              </button>
              <button
                className="nb-btn"
                style={{ background: 'var(--nb-paper)', padding: '5px 12px', fontSize: 12 }}
                onClick={() => setConfirming(false)}
              >
                Keep them
              </button>
            </div>
          </div>
        ) : (
          <button className="mt-3 text-[11.5px] underline" style={{ color: 'var(--nb-muted)' }} onClick={() => setConfirming(true)}>
            Reset approved replies
          </button>
        ))}
    </div>
  )
}

export default function Console() {
  const { data, source, isMock, loading, running, progress, error, inboxName, run, resetInbox } = useResults()
  const fileInput = useRef<HTMLInputElement | null>(null)
  const [uploadNote, setUploadNote] = useState<string | null>(null)

  // No Instagram API in this build, so her export is the inbox.
  async function onFile(file: File | undefined) {
    if (!file || running) return
    setUploadNote(null)
    try {
      const csv = await file.text()
      if (!csv.trim()) {
        setUploadNote('That file is empty.')
        return
      }
      setUploadNote(`Reading ${file.name}…`)
      await run('all', { name: file.name, csv })
      setUploadNote(null)
    } catch {
      setUploadNote("Couldn't open that file.")
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }
  const [mode, setMode] = useState<RunMode>('all')
  const [tab, setTab] = useState<Tab>('all')
  const [laneFilter, setLaneFilter] = useState<Lane | null>(null)
  const [pick, setPick] = useState<Pick | null>(null)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Row | null>(null)

  /**
   * The slider. Nothing is re-read and nothing is sent — the same answers are
   * bucketed again in the browser, through the same rule the server used, so a
   * message moving lane here means exactly what it would mean on a real run.
   */
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD)
  const playbook = usePlaybook()
  const stored = useMemo(() => data?.results ?? [], [data])
  const results = useMemo<Row[]>(
    () =>
      stored.map((r) => {
        const row: Row = r?.answers ? { ...r, lane: rebucket(r, threshold) } : { ...r }
        const approved = playbook.approvedFor(row)
        if (!approved) return row
        return { ...row, draft: approved.approvedText, preparedDraft: r.draft, fromPlaybook: approved }
      }),
    [stored, threshold, playbook],
  )
  const moved = useMemo(
    () => results.reduce((n, r, i) => (r?.lane !== stored[i]?.lane ? n + 1 : n), 0),
    [results, stored],
  )
  const laneCounts = useMemo(() => {
    const c: Record<Lane, number> = { voice: 0, maya: 0, intent: 0, noise: 0 }
    for (const r of results) if (r?.lane && r.lane in c) c[r.lane]++
    return c
  }, [results])

  const filtered = useMemo(() => {
    let rows = results.slice()
    if (tab === 'low') rows = rows.filter(isLowConfidence)
    if (tab === 'urgent') rows = rows.filter(isUrgent)
    if (tab === 'sample') rows = rows.filter((r) => !!r?.persona)
    if (laneFilter) rows = rows.filter((r) => r?.lane === laneFilter)
    if (pick) rows = rows.filter((r) => matchesPick(r, pick))
    const q = query.trim().toLowerCase()
    if (q) rows = rows.filter((r) => `${r?.handle} ${r?.text}`.toLowerCase().includes(q))
    const lanePos = (r: Classified) => LANE_ORDER.indexOf(r?.lane ?? 'noise')
    rows.sort((a, b) => {
      const la = a?.lane ?? 'noise'
      const lb = b?.lane ?? 'noise'
      if (la !== lb) return lanePos(a) - lanePos(b)
      if (la === 'maya') return num(b.answers?.urgency?.score) - num(a.answers?.urgency?.score)
      if (la === 'voice' || la === 'intent')
        return num(b.answers?.purchase_intent?.score) - num(a.answers?.purchase_intent?.score)
      return 0
    })
    return rows
  }, [results, tab, laneFilter, query, pick])

  const stats = data?.stats
  const voiceShare = results.length ? laneCounts.voice / results.length : 0
  // E-02, sheet 02: 70+ hrs of reply time a month. The only figure we supply
  // is the share drafted here, and it moves with the slider — so the sum is
  // printed next to the answer rather than asserted.
  const REPLY_HOURS_A_MONTH = 70
  const hoursSaved = Math.round(voiceShare * REPLY_HOURS_A_MONTH)
  const urgentCount = results.filter(isUrgent).length
  const lowCount = results.filter(isLowConfidence).length
  const sampleCount = results.filter((r) => !!r?.persona).length

  // A count of nought while the inbox is still being read looks like a run
  // that found nothing. Until there is something to count, show no number.
  const n = (v: number) => (loading ? '' : ` ${v}`)
  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: `All${n(results.length)}` },
    { key: 'low', label: loading ? 'Unsure' : `Unsure (${lowCount})` },
    { key: 'urgent', label: loading ? 'Urgent' : `Urgent (${urgentCount})` },
    { key: 'sample', label: loading ? 'Case-file 12' : `Case-file 12 (${sampleCount})` },
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--nb-bg)' }}>
      {/* top bar */}
      <header
        className="flex items-center gap-4 border-b-[3px] border-[color:var(--nb-ink)] px-5 py-3"
        style={{ background: 'var(--nb-paper)' }}
      >
        <div className="flex items-center gap-3">
          <span
            className="grid h-9 w-9 place-items-center rounded-full border-[3px] border-[color:var(--nb-ink)] font-display text-[18px] font-black"
            style={{ background: 'var(--nb-coral)' }}
          >
            M
          </span>
          <div>
            <div className="font-display text-[17px] font-extrabold leading-tight">
              Maya · Inbox Triage
            </div>
            <div className="text-[11.5px] font-semibold" style={{ color: 'var(--nb-muted)' }}>
              Instagram 50K · skincare · replies in your words
            </div>
          </div>
        </div>
        <span className="nb-pill" style={{ background: 'var(--nb-cream-deep)' }}>
          inbox <b>{inboxName ?? 'dms_sept.json'}</b>
        </span>
        <span className="nb-pill" style={{ background: 'var(--nb-cream-deep)' }}>
          reader <b>jev-latest</b>
        </span>
        <div className="flex-1" />
        <Link href="/ask" className="nb-btn nb-btn-yellow" style={{ padding: '7px 14px' }}>
          “What would Maya do?” card
        </Link>
        <span
          className="nb-tape"
          style={{ background: source === 'live' ? 'var(--nb-mint)' : 'var(--nb-yellow)' }}
          title={isMock ? 'NEXT_PUBLIC_MOCK — flip to 0 to go live' : 'live /api/results'}
        >
          {source === 'live' ? 'live results' : 'sample data'}
        </span>
      </header>

      <div className="grid" style={{ gridTemplateColumns: '300px 1fr', minHeight: 'calc(100vh - 64px)' }}>
        {/* rules sidebar */}
        <aside
          className="border-r-[3px] border-[color:var(--nb-ink)] p-4"
          style={{ background: 'var(--nb-cream-deep)' }}
        >
          {/* Hers first: the things she decides and can change right now. */}
          <div className="nb-eyebrow mb-1">Your Playbook</div>
          <p className="mb-3 text-[11.5px]" style={{ color: 'var(--nb-muted)' }}>
            Your review bar and approved replies. Change them and the inbox follows.
          </p>

          <PlaybookPanel playbook={playbook} threshold={threshold} />

          <div className="nb-card mt-3 p-4" style={{ background: 'var(--nb-blue)' }}>
            <div className="nb-eyebrow mb-2">Your routing (the notebook)</div>
            <ul className="space-y-1 text-[13px] leading-snug">
              {MAYA_ROUTING.map((r) => (
                <li key={r.when}>
                  <b>{r.when}</b> → {r.then}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px]" style={{ color: 'var(--nb-muted)' }}>
              Straight from your notes. Editing these means reading the inbox again.
            </p>
          </div>

          {/* The instrument, second: what it asks, not what she decides. */}
          <div className="nb-eyebrow mb-1 mt-6">What the reader asks</div>
          <p className="mb-3 text-[11.5px]" style={{ color: 'var(--nb-muted)' }}>
            {QUESTIONS.length} questions, all asked in one pass. Open one to see what it can answer.
          </p>
          <div className="space-y-2.5">
            {QUESTIONS.map((q) => (
              <QuestionCardView key={q.key} q={q} rows={results} pick={pick} onPick={setPick} />
            ))}
          </div>
        </aside>

        {/* main */}
        <main className="paper-grid p-5">
          {/* run bar */}
          <div className="nb-card flex flex-wrap items-center gap-3 p-4">
            <select
              className="nb-select"
              value={mode}
              onChange={(e) => setMode(e.target.value as RunMode)}
              disabled={running}
            >
              <option value="all">Redo everything</option>
              <option value="unclassified">Only unread ones</option>
            </select>
            <button className="nb-btn nb-btn-coral" onClick={() => void run(mode)} disabled={running || loading}>
              {running ? 'Reading…' : '▶ Run the inbox'}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
            <button
              className="nb-btn"
              style={{ background: 'var(--nb-cream-deep)' }}
              onClick={() => fileInput.current?.click()}
              disabled={running}
              title="Upload a DM export and read that instead"
            >
              ⬆ Upload your DMs
            </button>
            <a
              href="/maya-dms-last-30-days.csv"
              download
              className="text-[11.5px] underline"
              style={{ color: 'var(--nb-muted)' }}
              title="A file in the right shape, to try it with"
            >
              sample export
            </a>
            <div className="flex-1" />
            {(
              [
                [loading ? '—' : `${stats?.count ?? results.length}`, 'DMs read', 'in this sample'],
                [stats ? `${(stats.ms / 1000).toFixed(1)}s` : '—', 'wall time'],
                [stats ? `$${stats.costUsd.toFixed(3)}` : '—', 'reader cost'],
                [`${stats?.decisions ?? '—'}`, 'decisions made'],
                [
                  loading ? '—' : `~${hoursSaved}h`,
                  'back to you / month',
                  loading ? `${REPLY_HOURS_A_MONTH} hrs a month` : `${REPLY_HOURS_A_MONTH} hrs × ${Math.round(voiceShare * 100)}% drafted`,
                ],
              ] as [string, string, string?][]
            ).map(([v, l, note]) => (
              <div
                key={l}
                className="border-l-[2.5px] border-[color:var(--nb-line-soft)] pl-3"
              >
                <div className="font-display text-[19px] font-extrabold leading-none">{v}</div>
                <div className="mt-1 text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--nb-muted)' }}>
                  {l}
                </div>
                {note && (
                  <div className="mt-0.5 text-[10px] tabular-nums" style={{ color: 'var(--nb-muted)' }}>
                    {note}
                  </div>
                )}
              </div>
            ))}
          </div>
          {progress !== null && (
            <div
              className="mt-[-8px] mb-3 h-[10px] overflow-hidden rounded-full border-[2.5px] border-[color:var(--nb-ink)]"
              style={{ background: 'var(--nb-paper)' }}
            >
              <div
                className="h-full transition-[width] duration-150"
                style={{ width: `${Math.round(progress * 100)}%`, background: 'var(--nb-coral)' }}
              />
            </div>
          )}
          {error && (
            <p className="mt-2 text-[12.5px] font-semibold" style={{ color: 'var(--nb-coral)' }}>
              Last run hit a snag ({error}) — showing {source === 'sample' ? 'the sample inbox' : 'the last good results'}.
            </p>
          )}

          <div className="nb-card mt-3 p-4">
            <div className="flex flex-wrap items-center gap-4">
              <label htmlFor="sure" className="text-[13.5px] font-bold">
                How sure should I be before drafting a reply?
              </label>
              <input
                id="sure"
                type="range"
                min={DEFAULT_THRESHOLD}
                max={0.95}
                step={0.01}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="h-2 min-w-[240px] flex-1 cursor-pointer"
                style={{ accentColor: 'var(--nb-coral)' }}
              />
              <span className="nb-pill" style={{ background: 'var(--nb-cream-deep)' }}>
                {barMood(threshold)}
              </span>
              <span className="font-display text-[20px] font-extrabold leading-none tabular-nums">
                {Math.round(threshold * 100)}%
              </span>
              {threshold !== DEFAULT_THRESHOLD && (
                <button
                  className="text-[11.5px] underline"
                  style={{ color: 'var(--nb-muted)' }}
                  onClick={() => setThreshold(DEFAULT_THRESHOLD)}
                >
                  back to {Math.round(DEFAULT_THRESHOLD * 100)}%
                </button>
              )}
            </div>
            <p className="mt-2 text-[12px]" style={{ color: 'var(--nb-muted)' }}>
              {moved > 0 ? (
                <>
                  <b>
                    {moved} {moved === 1 ? 'message has' : 'messages have'} moved
                  </b>{' '}
                  moved out of Ready to send and onto your desk. Raise this to review more messages yourself —
                  nothing is re-read and nothing is sent.
                </>
              ) : (
                'Raise this to review more messages yourself. Nothing is re-read and nothing is sent.'
              )}
            </p>
          </div>

          {(uploadNote || inboxName) && (
            <p className="mt-2 text-[12px]" style={{ color: 'var(--nb-muted)' }}>
              {uploadNote ?? (
                <>
                  Reading <b>{inboxName}</b> — your own export, not the sample. Drop in a new file any time; a CSV
                  with the message text in it is enough.{' '}
                  <button
                    className="underline"
                    style={{ color: 'var(--nb-muted)' }}
                    onClick={() => void resetInbox()}
                    disabled={running}
                  >
                    back to the sample inbox
                  </button>
                </>
              )}
            </p>
          )}

          {/* lanes */}
          <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {LANE_ORDER.map((lane) => {
              const meta = LANE_META[lane]
              const count = laneCounts[lane]
              const share = results.length ? Math.round((count / results.length) * 100) : 0
              const shown = loading ? '—' : String(count)
              const active = laneFilter === lane
              return (
                <button
                  key={lane}
                  onClick={() => setLaneFilter(active ? null : lane)}
                  className="nb-card p-4 text-left transition-transform"
                  style={{
                    borderTop: `10px solid ${meta.color}`,
                    transform: active ? 'translate(3px,3px)' : undefined,
                    boxShadow: active ? '2px 2px 0 0 var(--nb-ink)' : undefined,
                  }}
                >
                  <div className="font-display text-[30px] font-black leading-none">
                    {shown}
                    {!loading && (
                      <span className="ml-2 text-[13px] font-bold" style={{ color: 'var(--nb-muted)' }}>
                        {share}%
                      </span>
                    )}
                  </div>
                  <div className="mt-1 font-display text-[15px] font-extrabold">{meta.label}</div>
                  <div className="mt-1 text-[12px] leading-snug" style={{ color: 'var(--nb-muted)' }}>
                    {meta.desc}
                  </div>
                </button>
              )
            })}
          </div>

          {/* tabs + search */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="nb-btn"
                style={{
                  padding: '6px 13px',
                  fontSize: 13,
                  background: tab === t.key ? 'var(--nb-ink)' : 'var(--nb-paper)',
                  color: tab === t.key ? 'var(--nb-paper)' : 'var(--nb-ink)',
                }}
              >
                {t.label}
              </button>
            ))}
            {laneFilter && (
              <button
                className="nb-btn nb-btn-blue"
                style={{ padding: '6px 13px', fontSize: 13 }}
                onClick={() => setLaneFilter(null)}
              >
                {LANE_META[laneFilter].short} ✕
              </button>
            )}
            {/* The sidebar can be scrolled away, so the chosen answer says so here too. */}
            {pick && (
              <button
                className="nb-btn nb-btn-yellow"
                style={{ padding: '6px 13px', fontSize: 13 }}
                title="Show everything again"
                onClick={() => setPick(null)}
              >
                {pick.label} ✕
              </button>
            )}
            <input
              className="nb-input ml-auto"
              style={{ width: 240 }}
              placeholder="Search DMs…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* table */}
          <div className="nb-card mt-3 overflow-hidden">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr style={{ background: 'var(--nb-cream-deep)' }}>
                  {['From', 'Message', 'What it read', 'Lane', 'Draft / why'].map((h) => (
                    <th
                      key={h}
                      className="border-b-[3px] border-[color:var(--nb-ink)] px-3 py-2.5 text-left text-[11px] font-extrabold uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((dm) => (
                  <tr
                    key={dm.id ?? `${dm.handle}-${dm.ts}`}
                    className="cursor-pointer border-b border-[color:var(--nb-line-soft)] transition-colors hover:bg-[color:var(--nb-cream-deep)]"
                    onClick={() => setSelected(dm)}
                  >
                    <td className="px-3 py-3 align-top whitespace-nowrap">
                      <div className="font-bold">{dm.handle ? `@${dm.handle}` : '—'}</div>
                      <div className="text-[11.5px]" style={{ color: 'var(--nb-muted)' }}>
                        {dm.platform === 'tt' ? 'TT' : 'IG'} · {timeAgo(dm.ts)}
                      </div>
                    </td>
                    <td className="max-w-[330px] px-3 py-3 align-top leading-snug">{dm.text || '—'}</td>
                    <td className="px-3 py-3 align-top">
                      <AnswerChips dm={dm} />
                    </td>
                    <td className="px-3 py-3 align-top">
                      <LaneTag lane={dm.lane} urgent={isUrgent(dm)} />
                    </td>
                    <td className="max-w-[300px] px-3 py-3 align-top">
                      {dm.draft ? (
                        <div
                          className="rounded-r-lg border-l-[4px] px-2.5 py-1.5"
                          style={{ borderColor: 'var(--nb-mint)', background: 'var(--nb-bg)' }}
                        >
                          <span className="nb-hand text-[18px] leading-snug">{dm.draft}</span>
                          {dm.fromPlaybook && (
                            <div className="mt-1 text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--nb-muted)' }}>
                              From a reply you approved
                            </div>
                          )}
                        </div>
                      ) : dm.why ? (
                        <div className="text-[12.5px] italic leading-snug" style={{ color: 'var(--nb-muted)' }}>
                          {dm.why}
                        </div>
                      ) : (
                        <span className="text-[12px]" style={{ color: 'var(--nb-muted)' }}>
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center">
                      <div className="nb-hand text-[24px]">{loading ? 'reading the inbox…' : 'nothing here'}</div>
                      <p className="text-[13px]" style={{ color: 'var(--nb-muted)' }}>
                        {loading ? 'One pass over every message. A moment.' : 'No messages match this view.'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-[12px]" style={{ color: 'var(--nb-muted)' }}>
            Sorted for you: “Needs you” by urgency, “Ready to send” by buying signal. Drafts come
            from your notebook routing — nothing sends itself.
          </p>
        </main>
      </div>

      {selected && (
        <Drawer
          key={`${selected.id}:${(results.find((r) => r.id === selected.id) ?? selected).draft ?? ''}`}
          dm={results.find((r) => r.id === selected.id) ?? selected}
          playbook={playbook}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
