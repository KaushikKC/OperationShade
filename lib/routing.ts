import type { DM, JevAnswers, Lane } from './types'
import { DEFAULT_THRESHOLD, laneFor } from './lanes'

/**
 * Maya's decision tree, as code. Every draft here is a line she already gives;
 * nothing is written on the fly. When the tree has no branch for a message, it
 * goes to her rather than getting a vague answer in her name.
 */

type ShelfItem = { hers: string; price: string; cheap?: string; cheapPrice?: string }

const SHELF: Record<string, ShelfItem> = {
  cleanser: { hers: 'the La Roche-Posay Toleriane cleanser', price: '£13', cheap: "Simple's refreshing face wash", cheapPrice: '£4' },
  moisturiser: { hers: 'the Vanicream moisturiser', price: '£13', cheap: 'the CeraVe lotion', cheapPrice: '£11' },
  serum: { hers: "The Ordinary's niacinamide", price: '£6' },
  spf: { hers: 'Beauty of Joseon Relief Sun', price: '£14' },
  exfoliant: { hers: "Paula's Choice 2% BHA", price: '£33', cheap: "The Ordinary's 2% BHA", cheapPrice: '£8' },
  retinoid: { hers: 'The Ordinary Retinal 0.2%', price: '£16' },
  ointment: { hers: 'the CeraVe healing ointment', price: '£9' },
}

const CATEGORY_WORDS: [string, RegExp][] = [
  ['glass_drop', /glass ?drop/i],
  ['retinoid', /retin(ol|oid|al)|tretinoin/i],
  ['spf', /\bspf\b|sunscreen|sun cream|suncream/i],
  ['exfoliant', /exfoliant|\bbha\b|\baha\b|salicylic|glycolic|acid peel/i],
  ['cleanser', /cleanser|face wash|cleansing/i],
  ['moisturiser', /moisturis|moisturiz|\bcream\b|lotion/i],
  ['serum', /serum|niacinamide|vitamin c/i],
  ['toner', /\btoner\b|\btoning\b/i],
  ['oil', /face oil|\boil\b/i],
  ['ointment', /ointment|balm|slugging/i],
]

const category = (text: string) => CATEGORY_WORDS.find(([, re]) => re.test(text))?.[0]

const RETINOID_RISK = /pregnan|breastfeed|dermatolog|prescri|tretinoin|rosacea|eczema|\bi'?m 1[0-7]\b|too young|my mum|accutane|roaccutane/i

/** The recurring questions, answered the way she answers them. Checked first. */
const TOPICS: [RegExp, string][] = [
  [/niacinamide and vitamin c|vitamin c and niacinamide/i,
    "Old myth, from one lab study run at temperatures your face never gets to. Use them together. If it stings, that's the vitamin C strength, not the pairing."],
  [/flak|tight (after|an hour)|tightness|dry patches|rough patches/i,
    "That's your barrier, not a hydration problem, and a serum won't fix it. Two weeks of the CeraVe ointment (£9) on damp skin at night first. If you still want the serum after that, it'll have something to sit on."],
  [/hyaluronic/i,
    "Hyaluronic acid pulls water from wherever it can get it — in a dry flat that's out of your skin. One layer, on damp skin, moisturiser straight over the top. Doubling up is why it feels worse."],
  [/oil on top|face oil|\boil\b.*moisturis|moisturis.*\boil\b/i,
    "An oil doesn't hydrate, it slows water leaving. So it goes last, over the moisturiser, and only if your skin still feels tight after. It's not a step most people need."],
  [/after a flight|on a plane|long haul/i,
    "Nothing clever: a thicker moisturiser the night before, and the ointment over the top on the flight itself. The cabin is drier than a desert — it's water loss, not damage."],
  [/hard water/i,
    "Hard water makes cleansing feel harsher than it is. Rinse with your hands rather than a hot shower stream, moisturise on damp skin, and don't buy a shower filter on my account."],
  [/what'?s (actually )?still on your shelf|did you ever repurchase|repurchase/i,
    "The ones I've bought again: the Toleriane cleanser (£13), the Vanicream moisturiser (£13) and the Beauty of Joseon SPF (£14). Everything else on that shelf was a one-off."],
  [/purging/i,
    "Purging is spots where you already get spots, and it settles in about four weeks. Anything new, anywhere else, or any stinging is not purging — stop and let it calm down."],
  [/aldi|lidl|supermarket dupe/i,
    "Some of them are genuinely fine — the moisturisers especially. The actives are where the cheap versions get vague about strength, and that's the bit you're paying for."],
]

const GLASS_DROP_SKIP =
  "Skip it. £62 for a nice pipette, glycerin and a good photographer — there's nothing in it you're not getting from The Ordinary's niacinamide at £6. Wait six weeks and watch how quickly nobody mentions it."

const RETINOID_LINE =
  "Not yet. Get boring first: a cleanser you like, a moisturiser you use twice a day, SPF every morning for a month. If your skin is calm after that, start a retinal twice a week — but ask me again then rather than starting on this message."

const INTAKE =
  "Before I answer — is your skin tight after you wash it, or shiny by lunchtime? The answer's completely different for each, and I'd rather send you the right one."

const budgetStarter = (band: string) =>
  band === 'under_15'
    ? "Two things and nothing else: Simple's face wash (£4) and the CeraVe lotion (£11). That's £15 and it's genuinely where I'd start you."
    : "Three things: Simple's face wash (£4), the CeraVe lotion (£11) and the Beauty of Joseon SPF (£14). Under £30 together. Don't add a serum until those three are a habit."

const WHY: Record<string, string> = {
  'a reaction': 'Her skin has reacted. Nothing goes out on that without you.',
  retinoid: "Retinol question with something else going on in it — the sort you've said never to send from the shelf.",
  'yours to answer': 'Reads like a judgement call rather than a routine question.',
  'nothing to answer it from': "Not enough in it to answer — no product, no skin type, no real question.",
  'not sure enough to draft': 'The read came back weak on this one. Worth your eyes.',
  'no branch': "Nothing in your routing covers this one.",
}

export type Routed = { lane: Lane; draft?: string; why?: string }

/** Only the branches that recommend a product need to know the skin type. */
const NEEDS_SKIN = new Set(['routine_help', 'product_rec'])

function draftFor(text: string, answers: JevAnswers): string | undefined {
  const cat = category(text)
  const intent = answers.intent.choice
  const skinUnknown = answers.skin_type.choice === 'unknown' || answers.skin_type.confidence < 0.5

  if (cat === 'glass_drop') return GLASS_DROP_SKIP
  if (cat === 'retinoid') return RETINOID_LINE
  for (const [re, line] of TOPICS) if (re.test(text)) return line

  if (intent === 'where_to_buy') {
    const item = cat && SHELF[cat]
    return item
      ? `Cult Beauty and Boots both have it online — ${item.hers} is ${item.price} there. Don't pay US shipping for it, it's the same formula in the bottle.`
      : 'Cult Beauty and Boots online, and Boots price-match most of it in store. Nothing on my shelf is worth paying US shipping for.'
  }
  if (intent === 'dupe_request') {
    if (cat === 'toner') return "I don't use one, so there's nothing to send you a cheaper version of. Your moisturiser is already doing that job."
    const item = cat ? SHELF[cat] : undefined
    if (item?.cheap) return `There is: ${item.cheap} at ${item.cheapPrice}. I've used both — the difference is how it feels, not what it does. Keep the rest of the money.`
    return "Tell me which one you mean and I'll tell you if there's a cheaper version worth having — for about half of them there isn't, and I'd rather say so."
  }
  if (intent === 'routine_help') {
    if (/where do i start|start with|starter|new to this|^help/i.test(text) && answers.budget_band.choice !== 'unknown') {
      return budgetStarter(answers.budget_band.choice)
    }
    if (skinUnknown) return INTAKE
    return "Keep it to cleanse, moisturise, SPF in the morning, and give it six weeks before you change anything. Most of what goes wrong is people changing three things at once."
  }
  if (intent === 'product_rec') {
    if (skinUnknown && NEEDS_SKIN.has(intent)) return INTAKE
    const item = cat ? SHELF[cat] : undefined
    if (!item && answers.budget_band.choice !== 'unknown') return budgetStarter(answers.budget_band.choice)
    if (item) return `${item.hers}, ${item.price}. It's what I use, and it's the cheapest thing I've found that does the job properly — if you're seeing it for more than that, it's the same bottle with a different sticker.`
    return undefined
  }
  return undefined
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
  // condition or someone under 18 in it never gets a drafted answer.
  if (/retin(ol|oid|al)|tretinoin/i.test(dm.text) && (RETINOID_RISK.test(dm.text) || (signals.is_reaction ?? 0) >= 0.3)) {
    return { lane: 'maya', why: WHY.retinoid }
  }
  if (call.lane === 'maya') return { lane: 'maya', why: WHY[call.because] ?? WHY['not sure enough to draft'] }

  const draft = draftFor(dm.text, answers)
  if (!draft) return { lane: 'maya', why: WHY['no branch'] }
  return { lane: 'voice', draft }
}
