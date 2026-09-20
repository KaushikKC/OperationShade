// Fills plausible probability distributions so nobody hand-types them.
// node scripts/gen-fixture.mjs > data/fixtures/results.sample.json
import { SPEC } from './fixture-spec.mjs'

const LABELS = {
  intent: ['product_rec', 'routine_help', 'dupe_request', 'reaction_concern', 'where_to_buy', 'purchase_signal', 'collab_pitch', 'spam', 'no_question'],
  skin_type: ['dry', 'oily', 'combination', 'sensitive', 'normal', 'unknown'],
  budget_band: ['under_15', '15_40', '40_plus', 'unknown'],
}

let seed = 20260920
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
const r3 = (n) => Math.round(n * 1000) / 1000

function choice(field, [pick, confidence, runnerUp]) {
  const others = LABELS[field].filter((l) => l !== pick)
  const weights = others.map((l) => (l === runnerUp ? 3 + rnd() : 0.15 + rnd()))
  const total = weights.reduce((a, b) => a + b, 0)
  const rest = 1 - confidence
  const probabilities = { [pick]: r3(confidence) }
  others.forEach((l, i) => { probabilities[l] = r3((rest * weights[i]) / total) })
  const sum = Object.values(probabilities).reduce((a, b) => a + b, 0)
  probabilities[pick] = r3(probabilities[pick] + (1 - sum))
  return { choice: pick, confidence: r3(confidence), probabilities }
}

const score = ([s, c]) => ({ score: r3(s), confidence: r3(c) })
const BASE = Date.parse('2026-09-20T17:00:00.000Z')

const results = SPEC.map((row) => ({
  id: row.id,
  handle: row.handle,
  platform: row.platform,
  text: row.text,
  ...(row.persona ? { persona: row.persona } : {}),
  ts: new Date(BASE - row.hoursAgo * 3600_000).toISOString(),
  answers: {
    intent: choice('intent', row.a.intent),
    skin_type: choice('skin_type', row.a.skin_type),
    budget_band: choice('budget_band', row.a.budget_band),
    purchase_intent: score(row.a.purchase_intent),
    needs_maya_personally: r3(row.a.needs_maya_personally),
    answerable_by_routing: r3(row.a.answerable_by_routing),
    urgency: score(row.a.urgency),
    names_shelf_product: r3(row.a.names_shelf_product),
  },
  lane: row.lane,
  ...(row.draft ? { draft: row.draft } : {}),
  ...(row.why ? { why: row.why } : {}),
}))

const decisions = results.length * 8
process.stdout.write(JSON.stringify({
  results,
  stats: { count: results.length, ms: 4120, costUsd: Number((decisions * 0.000155).toFixed(4)), decisions },
}, null, 2) + '\n')
