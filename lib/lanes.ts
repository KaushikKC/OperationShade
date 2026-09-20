import type { Classified, JevAnswers, Lane } from './types'

/** The value the console's slider starts at, and the threshold the stored lanes are computed at. */
export const DEFAULT_THRESHOLD = 0.7

export const LANE_LABELS: Record<Lane, string> = {
  voice: 'Ready to send',
  maya: 'Needs you',
  intent: 'Worth watching',
  noise: 'Filed',
}

export type LaneCall = { lane: Lane; because: string }

/**
 * Lane from the answers alone. Order is the policy:
 * pitches and spam are filed, a reaction always goes to Maya, a purchase with
 * no question in it is worth watching, and only then does the threshold decide
 * between her routing and her judgement.
 *
 * The fourth quadrant — not answerable from routing, and not obviously hers
 * either — is the one that matters. It goes to her. A message nobody can place
 * is not the same as a message with nothing in it, and filing it would lose it.
 */
export function laneFor(answers: JevAnswers, threshold = DEFAULT_THRESHOLD, signals?: { is_reaction?: number }): LaneCall {
  const { intent, needs_maya_personally: needsMaya, answerable_by_routing: answerable, purchase_intent: purchase } = answers
  const junk = (intent.probabilities.spam ?? 0) + (intent.probabilities.collab_pitch ?? 0)

  if ((intent.choice === 'spam' || intent.choice === 'collab_pitch') && junk >= 0.5) {
    return { lane: 'noise', because: intent.choice === 'spam' ? 'spam' : 'a pitch' }
  }
  if ((signals?.is_reaction ?? 0) >= 0.5 || intent.choice === 'reaction_concern') {
    return { lane: 'maya', because: 'a reaction' }
  }
  if (intent.choice === 'purchase_signal' && purchase.score >= 0.6 && needsMaya < threshold) {
    return { lane: 'intent', because: 'close to buying, nothing asked' }
  }
  if (needsMaya >= threshold) return { lane: 'maya', because: 'yours to answer' }
  if (answerable >= threshold && intent.confidence >= threshold) {
    return { lane: 'voice', because: 'covered by her routing' }
  }
  if (answerable < threshold && needsMaya < threshold) {
    return { lane: 'maya', because: 'nothing to answer it from' }
  }
  return { lane: 'maya', because: 'not sure enough to draft' }
}

/**
 * Re-bucket in the browser when the slider moves. Pure, and deliberately the
 * same rule as above so nothing jumps when the slider passes 0.70. Only the
 * voice/maya boundary moves: a pitch is still a pitch at any threshold, and a
 * message with no draft written for it can never be ready to send.
 */
export function rebucket(row: Classified, threshold: number): Lane {
  if (row.lane === 'noise' || row.lane === 'intent') return row.lane
  const a = row.answers
  if (!a) return row.lane
  if (!row.draft) return 'maya'
  const ready = a.answerable_by_routing >= threshold && a.intent.confidence >= threshold && a.needs_maya_personally < threshold
  return ready ? 'voice' : 'maya'
}

/** maya by how soon it matters, voice by how close they are to spending. */
export function sortLane(rows: Classified[], lane: Lane): Classified[] {
  const by = (f: (r: Classified) => number) => [...rows].sort((x, y) => f(y) - f(x))
  if (lane === 'maya') return by((r) => r.answers?.urgency?.score ?? 0)
  if (lane === 'voice' || lane === 'intent') return by((r) => r.answers?.purchase_intent?.score ?? 0)
  return rows
}
