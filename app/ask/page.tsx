'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { Classified } from '@/lib/types'
import { intentLabel, skinLabel, budgetLabel, pct } from '@/components/console/format'

const IS_MOCK = process.env.NEXT_PUBLIC_MOCK !== '0'

// Sample-mode stand-ins for the /api/ask route — same answers the routing
// notebook gives, so the card demos before the API exists.
function mockAsk(text: string): Classified {
  const t = text.toLowerCase()
  const skin = t.includes('dry')
    ? 'dry'
    : t.includes('oil') || t.includes('shiny')
      ? 'oily'
      : t.includes('sensitive') || t.includes('react')
        ? 'sensitive'
        : t.includes('red') || t.includes('rosacea')
          ? 'sensitive'
          : 'unknown'
  const gbp = t.match(/£?\s?(\d+)\s?(quid|pounds|gbp|\b)/)
  const spend = gbp ? Number(gbp[1]) : null
  const budget = spend === null ? 'unknown' : spend < 15 ? 'under_15' : spend <= 40 ? '15_40' : '40_plus'

  let draft: string | undefined
  let why: string | undefined
  let lane: Classified['lane'] = 'voice'

  if (skin === 'unknown') {
    lane = 'voice'
    draft =
      'Quick one first: does your face feel tight an hour after washing, or shiny by lunch? Answer that and I’ll point you at the right shelf.'
  } else if (skin === 'dry') {
    draft =
      'Cloud Cream + Barrier Oil at night — that’s the dry-skin pair on my shelf. SPF 50 in the morning, non-negotiable. Skip anything with retinol in it for now.'
  } else if (skin === 'oily') {
    draft =
      'Daily Gel, morning and night — light, no grease. SPF 50 after. That’s the whole routine until the shine settles.'
  } else {
    draft =
      'Sensitive skin gets the boring version: fragrance-free cleanser, Red Reset when it’s angry, SPF 50. Nothing with actives until it calms down.'
  }

  if (budget === 'under_15' && draft) {
    draft += ' Under £15, the CeraVe lotion does the heavy lifting — save the rest.'
  } else if (budget === '40_plus' && draft) {
    draft += ' And no, the £62 one isn’t where I’d put it — good, not £62 good.'
  }

  const lowSignal = t.length < 15
  if (lowSignal) {
    lane = 'maya'
    draft = undefined
    why = 'Not enough here to go on — this one’s for Maya herself.'
  }

  return {
    id: `ask_${Date.now()}`,
    handle: 'you',
    platform: 'ig',
    text,
    ts: new Date().toISOString(),
    lane,
    draft,
    why,
    answers: {
      intent: {
        choice: 'product_rec',
        confidence: skin === 'unknown' ? 0.41 : 0.82,
        probabilities: {},
      },
      skin_type: { choice: skin, confidence: skin === 'unknown' ? 0.5 : 0.84, probabilities: {} },
      budget_band: { choice: budget, confidence: 0.7, probabilities: {} },
      purchase_intent: { score: 0.5, confidence: 0.5 },
      needs_maya_personally: lowSignal ? 0.7 : 0.15,
      answerable_by_routing: lowSignal ? 0.2 : 0.9,
      urgency: { score: 0.1, confidence: 0.6 },
      names_shelf_product: 0.1,
    },
  }
}

export default function AskPage() {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [answer, setAnswer] = useState<Classified | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function ask() {
    const q = text.trim()
    if (!q || busy) return
    setBusy(true)
    setErr(null)
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

  return (
    <main
      className="paper-grid flex min-h-screen items-center justify-center p-6"
      style={{ background: 'var(--nb-bg)' }}
    >
      <div className="w-full max-w-[560px]">
        <div className="mb-4 text-center">
          <span className="nb-tape" style={{ background: 'var(--nb-yellow)' }}>
            from Maya’s inbox
          </span>
        </div>
        <div className="nb-card p-6">
          <h1 className="font-display text-[30px] font-black leading-tight">
            What would Maya do?
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: 'var(--nb-muted)' }}>
            Skin type, budget, what you’re stuck on — her own notes answer it, or she sees it
            herself.
          </p>
          <textarea
            className="nb-input mt-4 w-full"
            rows={3}
            placeholder="e.g. dry skin, £25, what do I actually need?"
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
                {answer.answers?.budget_band?.choice && answer.answers.budget_band.choice !== 'unknown' && (
                  <span className="nb-pill" style={{ fontSize: 11, background: 'var(--nb-mint)' }}>
                    {budgetLabel(answer.answers.budget_band.choice)}
                  </span>
                )}
              </div>
              {answer.draft ? (
                <div
                  className="rounded-r-xl border-l-[6px] px-4 py-3"
                  style={{ background: 'var(--nb-cream-deep)', borderColor: 'var(--nb-coral)' }}
                >
                  <p className="nb-hand text-[22px] leading-snug">{answer.draft}</p>
                  <p className="mt-1 text-right text-[15px]" style={{ color: 'var(--nb-muted)' }}>
                    <span className="nb-hand text-[19px]">— Maya’s notes</span>
                  </p>
                </div>
              ) : (
                <div
                  className="rounded-xl px-4 py-3"
                  style={{ background: 'var(--nb-pink)', border: '2.5px solid var(--nb-ink)' }}
                >
                  <p className="nb-hand text-[22px] leading-snug">
                    {answer.why ?? 'This one goes straight to Maya — she’ll see it herself.'}
                  </p>
                </div>
              )}
              {answer.answers && pct(answer.answers.answerable_by_routing) !== null && (
                <p className="mt-3 text-[11.5px]" style={{ color: 'var(--nb-muted)' }}>
                  {pct(answer.answers.answerable_by_routing)! >= 70
                    ? 'Answered straight from the notebook she writes from.'
                    : 'Below the bar she sets — flagged for her, not guessed.'}
                </p>
              )}
            </div>
          )}
        </div>
        <p className="mt-3 text-center text-[11.5px]" style={{ color: 'var(--nb-muted)' }}>
          Replies come from Maya’s own routing — max two products, always a skip. Nothing is sent
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
