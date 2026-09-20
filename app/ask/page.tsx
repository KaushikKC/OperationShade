'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { Classified, JevAnswers } from '@/lib/types'
import { route } from '@/lib/routing'
import { byName, gbp, named, WOULD_NOT_PAY_FOR, type ShelfItem } from '@/lib/shelf'
import { intentLabel, skinLabel, budgetLabel, pct } from '@/components/console/format'

const IS_MOCK = process.env.NEXT_PUBLIC_MOCK !== '0'

/** Skin doing something wrong right now — that never gets a product list. */
const REACTION = /burn|sting|stung|raw|rash|peel|swell|sore|hives|itch|react|allergic|flaring?|flare[- ]?up/i
/** A life thing behind the question — hers to answer, not the routing's. */
const LIFE_EVENT =
  /wedding|marri|bridesmaid|baby|pregnan|breastfeed|funeral|interview|first date|big date|date tonight|graduation|prom\b|holiday|party/i

/**
 * Sample-mode stand-in for /api/ask. It only fills in the answers — the
 * verdict itself comes from the same route() the live route calls, so the
 * demo can never say a product, price or lane the real routing wouldn't.
 */
function mockAsk(text: string): Classified {
  const t = text.toLowerCase()
  const isReaction = REACTION.test(t)
  const isLifeEvent = LIFE_EVENT.test(t)

  const skin = /\bdry\b|flak|tight/.test(t)
    ? 'dry'
    : /oil|shiny|greas|comb/.test(t)
      ? 'oily_combo'
      : /sensitiv|eczema|fragrance/.test(t)
        ? 'sensitive'
        : /rosacea|redness|\bred\b|flush/.test(t)
          ? 'redness'
          : 'unknown'

  const money = t.match(/£\s*(\d+)/) ?? t.match(/\b(\d+)\s*(quid|pounds|gbp)\b/)
  const spend = money ? Number(money[1]) : null
  const budget = spend === null ? 'none' : spend <= 30 ? 'under_30' : spend <= 60 ? '30_to_60' : 'over_60'

  const intent = isLifeEvent
    ? 'relationship'
    : /what.*(skin type|my skin)|don'?t know.*skin/.test(t)
      ? 'diagnosis'
      : /only (two|2|one|1)\b|won'?t do|five minutes|5[ -]minutes|keep it simple|simple routine/.test(t)
        ? 'constraint'
        : /worth|influenced|£62|glass drop/.test(t)
          ? 'value'
          : /which one|keep (one|1)|or the|\bvs\b|versus/.test(t)
            ? 'judgement'
            : /already (have|got|own)/.test(t)
              ? 'context'
              : /what would you|your money|if you were me/.test(t)
                ? 'transfer_of_trust'
                : 'recommendation'

  const thin = t.trim().length < 15
  const answers: JevAnswers = {
    intent: { choice: intent, confidence: 0.82, probabilities: {} },
    skin_type: { choice: skin, confidence: skin === 'unknown' ? 0.45 : 0.84, probabilities: {} },
    budget_band: { choice: budget, confidence: spend === null ? 0.55 : 0.8, probabilities: {} },
    purchase_intent: { score: 0.67, confidence: 0.6 },
    needs_maya_personally: isLifeEvent ? 0.75 : 0.12,
    answerable_by_routing: thin || isReaction || isLifeEvent ? 0.2 : 0.9,
    urgency: { score: isReaction ? 0.9 : 0.2, confidence: 0.6 },
    names_shelf_product: named(text).length ? 0.9 : 0.1,
  }

  const dm = {
    id: `ask_${Date.now().toString(36)}`,
    handle: 'you',
    platform: 'ig' as const,
    text,
    ts: new Date().toISOString(),
  }
  return { ...dm, answers, ...route(dm, answers, { is_reaction: isReaction ? 0.9 : 0.05 }) }
}

/**
 * The basket, read off the reply rather than re-decided: routing writes each
 * product it recommends as "Name (£price)", so those pairs are the picks and
 * nothing else is. At most two, because E-07.4 already caps it there.
 */
function buysIn(draft: string | undefined): ShelfItem[] {
  if (!draft) return []
  const out: ShelfItem[] = []
  const seen = new Set<string>()
  for (const m of draft.matchAll(/([A-Za-z][A-Za-z ]*?) \(£(\d+)\)/g)) {
    // The capture can pick up leading filler — "and Daily Gel", or "Put it
    // towards Cloud Cream". Shelf names match exactly, so drop words from the
    // front until one does; a genuine name is never stripped past itself.
    let name = m[1].trim()
    let p = byName(name)
    while (!p && name.includes(' ')) {
      name = name.replace(/^\S+\s+/, '')
      p = byName(name)
    }
    if (p && p.price === Number(m[2]) && !seen.has(p.name)) {
      seen.add(p.name)
      out.push(p)
    }
  }
  return out.slice(0, 2)
}

/**
 * What the reply itself knocks. Shown only when the routing actually said no
 * to something — never filled in to complete the layout.
 */
function skipIn(draft: string | undefined): string | null {
  if (!draft) return null
  if (/wouldn'?t pay|not £\d+ good/i.test(draft)) {
    const p = byName(WOULD_NOT_PAY_FOR)
    if (p) return `${p.name} (${gbp(p.price)}) — ${p.note}`
  }
  if (/retinol|retinoid|tretinoin/i.test(draft)) return 'Retinol — she doesn’t hand it out over a DM'
  if (/second one sitting on top|don'?t need (a second|another)/i.test(draft))
    return 'A second one on top — you don’t need it'
  if (/fragrance/i.test(draft)) return 'Anything with fragrance in it'
  return null
}

/** One line on why this is the answer — the reading, in her terms. */
function whyLine(a: Classified): string {
  if (!a.draft) return ''
  if (/\?/.test(a.draft)) return 'She asks her standard questions back before naming products — no guessing.'
  const bits = [
    a.answers?.skin_type?.choice && a.answers.skin_type.choice !== 'unknown'
      ? skinLabel(a.answers.skin_type.choice)
      : null,
    a.answers?.budget_band?.choice && !['none', 'unknown'].includes(a.answers.budget_band.choice)
      ? budgetLabel(a.answers.budget_band.choice)
      : null,
  ].filter(Boolean)
  const reading = bits.length ? `${bits.join(', ')} — ` : ''
  const line = `${reading}answered the same way she answers every one of these.`
  return line.charAt(0).toUpperCase() + line.slice(1)
}

/** The handoff line when there is no safe draft — follower-facing, no products. */
function handoffLine(a: Classified): string {
  if (REACTION.test(a.text)) return 'Skin that’s reacting goes to Maya — no product list while it’s angry.'
  if (a.answers?.intent?.choice === 'relationship')
    return 'There’s a life thing behind this one, not a product question — Maya answers these herself.'
  return a.why ?? 'There is not enough here to give a safe answer without guessing.'
}

/** What Copy and Share both put on the clipboard. */
function resultText(a: Classified): string {
  const lines: string[] = [`Maya’s decision: ${a.draft}`]
  const buys = buysIn(a.draft)
  if (buys.length) {
    const total = buys.reduce((s, p) => s + p.price, 0)
    lines.push(`Buy: ${buys.map((p) => `${p.name} (${gbp(p.price)})`).join(' + ')} — ${gbp(total)} together`)
  }
  const skip = skipIn(a.draft)
  if (skip) lines.push(`Skip: ${skip}`)
  lines.push('From Maya’s own routing — nothing was sent anywhere.')
  return lines.join('\n')
}

export default function AskPage() {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [answer, setAnswer] = useState<Classified | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  async function ask() {
    const q = text.trim()
    if (!q || busy) return
    setBusy(true)
    setErr(null)
    setNote(null)
    try {
      if (IS_MOCK) {
        await new Promise((r) => setTimeout(r, 900))
        setAnswer(mockAsk(q))
      } else {
        const res = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text: q }),
        })
        if (!res.ok) throw new Error(`ask ${res.status}`)
        setAnswer((await res.json()) as Classified)
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'something went wrong')
    } finally {
      setBusy(false)
    }
  }

  function flash(msg: string) {
    setNote(msg)
    setTimeout(() => setNote(null), 2000)
  }

  async function copyResult() {
    if (!answer?.draft) return
    try {
      await navigator.clipboard.writeText(resultText(answer))
      flash('Copied ✓')
    } catch {
      flash('Copy didn’t work — select the text instead')
    }
  }

  async function shareResult() {
    if (!answer?.draft) return
    const payload = {
      title: 'What would Maya do?',
      text: resultText(answer),
      url: window.location.href,
    }
    const nav = navigator as Navigator & {
      share?: (d: typeof payload) => Promise<void>
    }
    if (nav.share) {
      try {
        await nav.share(payload)
      } catch {
        // They closed the share sheet — nothing to confirm.
      }
      return
    }
    try {
      await navigator.clipboard.writeText(`${payload.text}\n${payload.url}`)
      flash('Copied — send it to a friend')
    } catch {
      flash('Copy didn’t work — select the text instead')
    }
  }

  const buys = buysIn(answer?.draft)
  const total = buys.reduce((s, p) => s + p.price, 0)
  const skip = skipIn(answer?.draft)

  return (
    <main
      className="paper-grid flex min-h-screen items-center justify-center p-6"
      style={{ background: 'var(--nb-bg)' }}
    >
      <div className="w-full max-w-[560px]">
        <div className="mb-4 text-center">
          <span className="nb-tape" style={{ background: 'var(--nb-yellow)' }}>
            from Maya’s notebook
          </span>
        </div>
        <div className="nb-card p-6">
          <h1 className="font-display text-[30px] font-black leading-tight">
            What would Maya do?
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: 'var(--nb-muted)' }}>
            Skin type, budget, what you’re stuck on — her own notes answer what they can, and tell
            you when it needs her.
          </p>
          <textarea
            className="nb-input mt-4 w-full"
            rows={3}
            placeholder="e.g. oily skin, £25, five minutes in the morning — what do I actually need?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void ask()
              }
            }}
          />
          <div className="mt-3 flex items-center gap-3">
            <button className="nb-btn nb-btn-coral" onClick={() => void ask()} disabled={busy || !text.trim()}>
              {busy ? 'Thinking…' : 'Ask Maya'}
            </button>
            {err && (
              <span className="text-[12.5px] font-semibold" style={{ color: 'var(--nb-coral)' }}>
                {err}
              </span>
            )}
          </div>

          {answer && (
            <div className="mt-5 border-t-[2.5px] border-dashed border-[color:var(--nb-ink)] pt-4">
              <div className="mb-2 flex flex-wrap gap-1.5">
                <span className="nb-pill" style={{ fontSize: 11 }}>
                  {intentLabel(answer.answers?.intent?.choice)}
                </span>
                {answer.answers?.skin_type?.choice && answer.answers.skin_type.choice !== 'unknown' && (
                  <span className="nb-pill" style={{ fontSize: 11, background: 'var(--nb-blue)' }}>
                    {skinLabel(answer.answers.skin_type.choice)}
                  </span>
                )}
                {answer.answers?.budget_band?.choice &&
                  !['unknown', 'none'].includes(answer.answers.budget_band.choice) && (
                    <span className="nb-pill" style={{ fontSize: 11, background: 'var(--nb-mint)' }}>
                      {budgetLabel(answer.answers.budget_band.choice)}
                    </span>
                  )}
              </div>
              {answer.draft ? (
                <>
                  <div className="nb-eyebrow mb-1.5">Maya’s decision</div>
                  <div
                    className="rounded-r-xl border-l-[6px] px-4 py-3"
                    style={{ background: 'var(--nb-cream-deep)', borderColor: 'var(--nb-coral)' }}
                  >
                    <p className="nb-hand text-[22px] leading-snug">{answer.draft}</p>
                    <p className="mt-1 text-right text-[15px]" style={{ color: 'var(--nb-muted)' }}>
                      <span className="nb-hand text-[19px]">— Maya’s notes</span>
                    </p>
                  </div>

                  {buys.length > 0 && (
                    <div className="mt-4">
                      <div className="nb-eyebrow mb-1.5">Buy</div>
                      <ul className="space-y-1">
                        {buys.map((p) => (
                          <li key={p.name} className="flex items-baseline justify-between gap-3 text-[13.5px]">
                            <span>
                              <b>{p.name}</b>{' '}
                              <span style={{ color: 'var(--nb-muted)' }}>· {p.type.toLowerCase()}</span>
                            </span>
                            <b className="tabular-nums">{gbp(p.price)}</b>
                          </li>
                        ))}
                      </ul>
                      {buys.length > 1 && (
                        <div
                          className="mt-1.5 flex items-baseline justify-between border-t-[2px] border-[color:var(--nb-line-soft)] pt-1.5 text-[13.5px]"
                        >
                          <span className="font-bold">Together</span>
                          <b className="tabular-nums">{gbp(total)}</b>
                        </div>
                      )}
                    </div>
                  )}

                  {skip && (
                    <div className="mt-4">
                      <div className="nb-eyebrow mb-1.5">Skip</div>
                      <p className="text-[13.5px] leading-snug">{skip}</p>
                    </div>
                  )}

                  <p className="mt-4 text-[12.5px]" style={{ color: 'var(--nb-muted)' }}>
                    <b style={{ color: 'var(--nb-ink)' }}>Why:</b> {whyLine(answer)}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      className="nb-btn nb-btn-mint"
                      style={{ padding: '7px 14px', fontSize: 13 }}
                      onClick={() => void copyResult()}
                    >
                      Copy result
                    </button>
                    <button
                      className="nb-btn nb-btn-blue"
                      style={{ padding: '7px 14px', fontSize: 13 }}
                      onClick={() => void shareResult()}
                    >
                      Share with a friend
                    </button>
                    {note && (
                      <span className="text-[12px] font-bold" style={{ color: 'var(--nb-muted)' }}>
                        {note}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div
                  className="rounded-xl px-4 py-3"
                  style={{ background: 'var(--nb-pink)', border: '2.5px solid var(--nb-ink)' }}
                >
                  <div className="nb-eyebrow mb-1.5">This one needs Maya</div>
                  <p className="nb-hand text-[22px] leading-snug">{handoffLine(answer)}</p>
                  <p className="mt-2 text-[12.5px]" style={{ color: 'var(--nb-muted)' }}>
                    No products on this one, and nothing has been sent to her — if you want her eyes
                    on it, take it to her DMs yourself.
                  </p>
                </div>
              )}
              {answer.answers && pct(answer.answers.answerable_by_routing) !== null && (
                <p className="mt-3 text-[11.5px]" style={{ color: 'var(--nb-muted)' }}>
                  {pct(answer.answers.answerable_by_routing)! >= 70
                    ? 'Answered straight from the notebook she writes from.'
                    : 'Below the bar she sets — kept for her, not guessed.'}
                </p>
              )}
            </div>
          )}
        </div>
        <p className="mt-3 text-center text-[11.5px]" style={{ color: 'var(--nb-muted)' }}>
          Replies come from Maya’s own routing, with no more than two products. Nothing is sent
          anywhere.
        </p>
        <p className="mt-2 text-center">
          <Link href="/" className="text-[12px] font-bold underline">
            ← back to the console
          </Link>
        </p>
      </div>
    </main>
  )
}
