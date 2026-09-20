import type { Classified, JevAnswers, Lane } from './types'

/**
 * Where the console's slider starts, and the threshold the stored lanes use.
 * Calibrated, not chosen: swept against the thirty hand labels, lane accuracy
 * sits at 29/30 anywhere from 0.40 to 0.65 and falls off above it (27/30 at
 * 0.70, 23/30 at 0.80). Jev answers the routing question in a lower band than
 * a plain reading of it suggests, so this is where the boundary actually is.
 * 0.60 sits in the middle of the plateau rather than on its edge.
 */
export const DEFAULT_THRESHOLD = 0.6
/** Above this, it is hers however routable the rest of the message looks. */
export const NEEDS_MAYA_CEILING = 0.4
/** "Ready" on the 0-3 purchase scale, normalised. */
export const WATCHING_FLOOR = 2 / 3

export const LANE_LABELS: Record<Lane, string> = {
  voice: 'Ready to send',
  maya: 'Needs you',
  intent: 'Worth watching',
  noise: 'Filed',
}

/** Intents that are hers by definition, whatever the numbers say. */
const ALWAYS_HERS = new Set(['skin_diagnosis', 'life_event', 'trust_or_fan'])
const JUNK = new Set(['brand_pitch', 'spam'])
/** Someone asking a question gets an answer, however close to buying they are. */
const ASKING = new Set(['shade_info', 'recommendation', 'pick_one', 'value_check', 'routine_context', 'skin_diagnosis', 'constraint_routine'])

/** Nothing in the message says what their skin is doing. */
export const skinMissing = (a: JevAnswers) => a.skin_type.choice === 'unknown' || a.skin_type.confidence < 0.5

/**
 * The bar a message has to clear before anything is drafted. It drops when the
 * only thing missing is their skin type, because asking that is her routing —
 * she answers those with one question back, every time. The slider still moves
 * it, so she keeps the last word.
 */
export const routingBar = (a: JevAnswers, threshold: number) =>
  skinMissing(a) && ASKING.has(a.intent.choice) ? Math.max(0.3, threshold - 0.2) : threshold

/** One rule, used by the lanes here, by the routing, and by the slider. */
export const readyToSend = (a: JevAnswers, threshold: number) =>
  a.needs_maya_personally < NEEDS_MAYA_CEILING && a.answerable_by_routing >= routingBar(a, threshold)

export type LaneCall = { lane: Lane; because: string }

/**
 * Lane from the answers alone. The order is the policy.
 *
 * A draft goes out only when her routing covers it (>= threshold, the slider)
 * *and* it is not the kind of thing she answers herself (needs-Maya < 0.40).
 * Two sides, because a message can be both routable and hers — a bride with dry
 * skin — and when it is, she gets it.
 *
 * The fourth quadrant — not routable, and not obviously hers either — goes to
 * her too. A message nobody can place is not the same as a message with nothing
 * in it, and filing it would lose it.
 */
export function laneFor(answers: JevAnswers, threshold = DEFAULT_THRESHOLD, signals?: { is_reaction?: number }): LaneCall {
  const { intent, needs_maya_personally: needsMaya, answerable_by_routing: answerable, purchase_intent: purchase, names_shelf_product: namesShelf } = answers
  const junk = (intent.probabilities.spam ?? 0) + (intent.probabilities.brand_pitch ?? 0)

  if (JUNK.has(intent.choice) && junk >= 0.5) return { lane: 'noise', because: intent.choice === 'spam' ? 'spam' : 'a pitch' }
  if ((signals?.is_reaction ?? 0) >= 0.5) return { lane: 'maya', because: 'a reaction' }
  if (ALWAYS_HERS.has(intent.choice) && intent.confidence >= 0.5) {
    return { lane: 'maya', because: intent.choice === 'life_event' ? 'a life event' : intent.choice === 'trust_or_fan' ? 'meant for her' : 'her skin, not a product' }
  }
  // Going to buy, not today. Nothing is being asked, so nothing is drafted.
  if (intent.choice === 'delayed_intent' && intent.confidence >= 0.5) {
    return { lane: 'intent', because: namesShelf >= 0.5 ? 'named something, buying later' : 'buying later, nothing asked' }
  }

  if (needsMaya >= NEEDS_MAYA_CEILING) return { lane: 'maya', because: 'yours to answer' }
  if (purchase.score >= WATCHING_FLOOR && answerable < threshold && !ASKING.has(intent.choice)) {
    return { lane: 'intent', because: 'close to buying, nothing to answer' }
  }

  if (readyToSend(answers, threshold)) {
    return { lane: 'voice', because: skinMissing(answers) ? 'her question back' : 'covered by her routing' }
  }
  return { lane: 'maya', because: 'nothing to answer it from' }
}

/**
 * Re-bucket in the browser when the slider moves. Pure, and the same rule as
 * above so nothing jumps as the slider passes 0.70. Only the voice/maya
 * boundary moves: a pitch is a pitch at any threshold, and a message with no
 * draft written for it can never be ready to send.
 */
export function rebucket(row: Classified, threshold: number): Lane {
  if (row.lane === 'noise' || row.lane === 'intent') return row.lane
  const a = row.answers
  if (!a) return row.lane
  if (!row.draft) return 'maya'
  return readyToSend(a, threshold) ? 'voice' : 'maya'
}

/** maya by how soon it matters, never by how long the message is. */
export function sortLane(rows: Classified[], lane: Lane): Classified[] {
  const by = (f: (r: Classified) => number) => [...rows].sort((x, y) => f(y) - f(x))
  if (lane === 'maya') return by((r) => (r.answers?.urgency?.score ?? 0) * 2 + (r.answers?.purchase_intent?.score ?? 0))
  if (lane === 'voice' || lane === 'intent') return by((r) => r.answers?.purchase_intent?.score ?? 0)
  return rows
}
