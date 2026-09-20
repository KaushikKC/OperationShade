/**
 * Fills plausible probability distributions so nobody hand-types them, then
 * runs lib/routing.ts over the result — the fixture's lanes and drafts come
 * from the same code a real run uses.
 *   npm run fixture
 */
import { SPEC } from './fixture-spec.mjs'
import { INTENTS, SKIN_TYPES, BUDGET_BANDS, QUESTIONS } from '../lib/jev'
import { route } from '../lib/routing'
import type { Choice, Classified, JevAnswers, RunResult, ScoreAns } from '../lib/types'

const LABELS: Record<string, readonly string[]> = { intent: INTENTS, skin_type: SKIN_TYPES, budget_band: BUDGET_BANDS }

let seed = 20260920
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
const r3 = (n: number) => Math.round(n * 1000) / 1000

function choice(field: string, [pick, confidence, runnerUp]: [string, number, string]): Choice {
  const others = LABELS[field].filter((l) => l !== pick)
  const weights = others.map((l) => (l === runnerUp ? 3 + rnd() : 0.15 + rnd()))
  const total = weights.reduce((a, b) => a + b, 0)
  const rest = 1 - confidence
  const probabilities: Record<string, number> = { [pick]: r3(confidence) }
  others.forEach((l, i) => { probabilities[l] = r3((rest * weights[i]) / total) })
  const sum = Object.values(probabilities).reduce((a, b) => a + b, 0)
  probabilities[pick] = r3(probabilities[pick] + (1 - sum))
  return { choice: pick, confidence: r3(confidence), probabilities }
}

const score = ([s, c]: [number, number]): ScoreAns => ({ score: r3(s), confidence: r3(c) })
const BASE = Date.parse('2026-09-20T17:00:00.000Z')

const results: Classified[] = SPEC.map((row) => {
  const answers: JevAnswers = {
    intent: choice('intent', row.a.intent as [string, number, string]),
    skin_type: choice('skin_type', row.a.skin_type as [string, number, string]),
    budget_band: choice('budget_band', row.a.budget_band as [string, number, string]),
    purchase_intent: score(row.a.purchase_intent as [number, number]),
    needs_maya_personally: r3(row.a.needs_maya_personally),
    answerable_by_routing: r3(row.a.answerable_by_routing),
    urgency: score(row.a.urgency as [number, number]),
    names_shelf_product: r3(row.a.names_shelf_product),
  }
  const routed = route(row, answers, { is_reaction: row.is_reaction })
  return {
    id: row.id,
    handle: row.handle,
    platform: row.platform as 'ig' | 'tt',
    text: row.text,
    ...('persona' in row && row.persona ? { persona: row.persona as string } : {}),
    ts: new Date(BASE - row.hoursAgo * 3600_000).toISOString(),
    answers,
    ...routed,
  }
})

const decisions = results.length * Object.keys(QUESTIONS).length
const run: RunResult = { results, stats: { count: results.length, ms: 4120, costUsd: 0.0186, decisions } }
process.stdout.write(JSON.stringify(run, null, 2) + '\n')
