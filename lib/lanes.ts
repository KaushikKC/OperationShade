import type { Classified, JevAnswers, Lane } from './types'

/**
 * Where the console's slider starts, and the threshold the stored lanes use.
 * Calibrated, not chosen: swept against the hand labels, lane accuracy is
 * 32/33 at 0.40, 31/33 from 0.45 to 0.55, and falls away above (25/33 at 0.70,
 * 20/33 at 0.80). Jev answers the routing question in a lower band than a plain
 * reading of it suggests, so this sits mid-plateau rather than on an edge.
 */
export const DEFAULT_THRESHOLD = 0.5
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

/**
 * Hers by definition, whatever the numbers say. E-06: she does not want less
 * relationship, she wants leverage — so the human moments are the ones that
 * reach her, not the ones that get filtered.
 */
const ALWAYS_HERS = new Set(['relationship', 'trust'])
const JUNK = new Set(['brand_pitch', 'spam'])
/** Someone asking a question gets an answer, however close to buying they are. */
const ASKING = new Set(['info', 'recommendation', 'judgement', 'value', 'context', 'diagnosis', 'constraint', 'transfer_of_trust', 'personalisation'])

/** Nothing in the message says what their skin is doing. */
export const skinMissing = (a: JevAnswers) => a.skin_type.choice === 'unknown' || a.skin_type.confidence < 0.5

/**
 * The bar a message has to clear before anything is drafted.
 *
 * It drops when the reply is going to be one of her own questions rather than
 * an answer — when we do not know their skin, or they have not named what they
 * mean. E-02.1 is a list of the questions she asks back, so asking one is her
 * routing working, not her routing failing, and a drafted question carries far
 * less risk than a drafted answer. The slider still moves both bars together,
 * so she keeps the last word.
 */
export const askingBack = (a: JevAnswers) => skinMissing(a) || a.names_shelf_product < 0.5

export const routingBar = (a: JevAnswers, threshold: number) =>
  askingBack(a) && ASKING.has(a.intent.choice) ? Math.max(0.25, threshold - 0.25) : threshold

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
    return { lane: 'maya', because: intent.choice === 'relationship' ? 'a life event' : 'meant for her' }
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
