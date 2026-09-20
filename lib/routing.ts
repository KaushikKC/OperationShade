import type { DM, JevAnswers, Lane } from './types'
import { DEFAULT_THRESHOLD, laneFor } from './lanes'

/**
 * Maya's decision tree, as code. Every line here is one she already gives.
 * Nothing is written on the fly, and when the tree has no branch for a message
 * it goes to her rather than getting a vague answer in her name.
 *
 * Her rules, in the order they override everything else:
 *   - Never recommend retinol. Not to everyone, not as a default.
 *   - Two products per reply, maximum. People do not need more products.
 *   - Anyone spending over £60 hears what is not worth buying, every time.
 *   - Shade questions are never answered blind.
 *   - SPF 50 every morning is non-negotiable.
 */

/** Her shelf. Prices and scores for the rest of it come from the case file, p8. */
const SHELF = {
  cloud_cream: { name: 'Cloud Cream', note: 'winter skin saviour, and the one I actually use' },
  barrier_oil: { name: 'the Barrier Oil', note: 'over the top, last, only if it still feels tight' },
  daily_gel: { name: 'the Daily Gel', note: 'morning and night, nothing else for a month' },
  red_reset: { name: 'Red Reset', note: 'give it three weeks before you judge it' },
  glass_drop: { name: 'Glass Drop', price: '£62', note: 'Good. Not £62 good.' },
  spf: { name: 'SPF 50', note: 'every morning, non-negotiable' },
} as const

const GLASS_DROP = /glass ?drop|£ ?6[0-9]|the ?£62/i
const RETINOID = /retin(ol|oid|al)|tretinoin/i
const WHERE_TO_BUY = /where (do|can) (you|i) (buy|get)|stockist|ships? to the uk|us only/i
const RETINOID_RISK = /pregnan|breastfeed|dermatolog|prescri|rosacea|eczema|\bi'?m 1[0-7]\b|too young|accutane|roaccutane/i

/** Her intake questions, in her words. One at a time — she never sends a form. */
const INTAKE = {
  skin: 'Quick one before I answer: is your skin tight after you wash it, or shiny by lunchtime? The answer is completely different for each.',
  shade: "I can't pick a shade blind — what are you wearing now, and do you like how it sits on you? Tell me that and I'll tell you where you land.",
  budget: "What are you working with, roughly? I'd rather send you two things you'll finish than five you won't.",
  which: "Which one do you mean? Half of them I'd tell you to skip, so it matters which we're talking about.",
} as const

/** The skip line. Anyone spending over £60 gets it, whether they asked or not. */
const SKIP = `And skip the ${SHELF.glass_drop.name}. ${SHELF.glass_drop.note}`
const SPF_LINE = `${SHELF.spf.name} every morning. That one's not negotiable.`
const RETINOL_BLOCK =
  "Not from me. I don't hand retinol out — it's the fastest way I know to wreck a barrier that was fine yesterday. Get the boring part right for a month first, then ask me again and I'll tell you honestly whether you need it."

/** Skin type in, at most two products out. */
function pickFor(skin: string): string | null {
  switch (skin) {
    case 'dry':
      return `${SHELF.cloud_cream.name} — ${SHELF.cloud_cream.note} — and ${SHELF.barrier_oil.name} ${SHELF.barrier_oil.note}.`
    case 'oily_combo':
      return `${SHELF.daily_gel.name}, ${SHELF.daily_gel.note}.`
    case 'sensitive':
      return `Nothing with fragrance in it — that's the rule, and it matters more than the product. ${SHELF.cloud_cream.name} is where I'd start you.`
    case 'redness':
      return `${SHELF.red_reset.name}, and ${SHELF.red_reset.note}.`
    default:
      return null
  }
}

const FIVE_MINUTES = `Five minutes is plenty. Cleanse, ${SHELF.cloud_cream.name}, ${SHELF.spf.name}. That's the five-minute one I filmed — least watched thing I've made and the one people actually keep doing.`

const WHY: Record<string, string> = {
  'a reaction': 'Her skin has reacted. Nothing goes out on that without you.',
  'a life event': "There's a life event behind this, not a product question.",
  'meant for her': 'She wrote to you, not about a product.',
  'her skin, not a product': "She's describing what her skin is doing. That's a judgement call.",
  retinoid: "Retinol, with something else going on in the message. Your rule: never from the shelf.",
  'yours to answer': 'Reads like a judgement call rather than a routine question.',
  'nothing to answer it from': 'Not enough in it to answer — no skin type, no budget, no real question.',
  'not sure enough to draft': 'The read came back weak on this one. Worth your eyes.',
  'no branch': 'Nothing in your routing covers this one.',
}

export type Routed = { lane: Lane; draft?: string; why?: string }

const sentence = (line: string) => (line ? line.charAt(0).toUpperCase() + line.slice(1) : line)

function draftFor(text: string, answers: JevAnswers): string | undefined {
  const intent = answers.intent.choice
  const skin = answers.skin_type.choice
  const budget = answers.budget_band.choice
  const skinUnknown = skin === 'unknown' || answers.skin_type.confidence < 0.5
  const pick = pickFor(skin)
  const lines: string[] = []
  let skipSaid = false

  if (intent === 'shade_info') return INTAKE.shade
  if (RETINOID.test(text)) return RETINOL_BLOCK
  // Where to buy it: her stockists are in the case file, not in this code yet.
  if (WHERE_TO_BUY.test(text)) return undefined

  switch (intent) {
    case 'recommendation':
    case 'pick_one':
      if (skinUnknown) return INTAKE.skin
      if (!pick) return undefined
      lines.push(pick)
      if (budget === 'none') lines.push(INTAKE.budget)
      break
    case 'value_check':
      // "Is it worth it?" with no product in it. She asks which one, every time.
      if (!GLASS_DROP.test(text) && answers.names_shelf_product < 0.5) return INTAKE.which
      if (GLASS_DROP.test(text)) {
        lines.push(`${SHELF.glass_drop.note} It's a lovely texture and a very good photographer. Put the ${SHELF.glass_drop.price} towards ${SHELF.cloud_cream.name} and keep the change.`)
        skipSaid = true
        break
      }
      if (skinUnknown) return INTAKE.skin
      if (!pick) return undefined
      lines.push(`For your skin, yes — but only this much of it: ${pick}`)
      break
    case 'routine_context':
      if (skinUnknown) return INTAKE.skin
      if (!pick) return undefined
      lines.push(pick)
      lines.push(SPF_LINE)
      lines.push('Give it six weeks before you change anything else. Most of what goes wrong is three things changing at once.')
      break
    case 'constraint_routine':
      lines.push(FIVE_MINUTES)
      break
    default:
      return undefined
  }

  // Anyone spending over £60 hears what is not worth buying, once.
  if (!skipSaid && (budget === 'over_60' || GLASS_DROP.test(text))) lines.push(SKIP)
  // SPF goes on the replies that are a routine. It is not a footer.
  if ((intent === 'recommendation' || intent === 'pick_one') && lines.length) lines.push(SPF_LINE)

  const draft = lines.filter(Boolean).map(sentence).join(' ')
  return draft.trim() ? draft : undefined
}

export function route(
  dm: Pick<DM, 'text'>,
  answers: JevAnswers,
  signals: { is_reaction?: number } = {},
  threshold = DEFAULT_THRESHOLD,
): Routed {
  const call = laneFor(answers, threshold, signals)
  if (call.lane === 'noise' || call.lane === 'intent') return { lane: call.lane }

  // The retinol block: a retinoid question with a reaction, a prescription, a
  // condition or someone under 18 in it never gets a drafted answer at all.
  if (RETINOID.test(dm.text) && (RETINOID_RISK.test(dm.text) || (signals.is_reaction ?? 0) >= 0.3)) {
    return { lane: 'maya', why: WHY.retinoid }
  }
  if (call.lane === 'maya') return { lane: 'maya', why: WHY[call.because] ?? WHY['not sure enough to draft'] }

  const draft = draftFor(dm.text, answers)
  if (!draft) return { lane: 'maya', why: WHY['no branch'] }
  return { lane: 'voice', draft }
}
