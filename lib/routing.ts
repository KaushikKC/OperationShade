import type { DM, JevAnswers, Lane } from './types'
import { DEFAULT_THRESHOLD, laneFor } from './lanes'
import { CEILING, INTAKE, POSTS, ROUTING, SHELF, byName, gbp, named, THE_GOOD_ONE, WOULD_NOT_PAY_FOR } from './shelf'

/**
 * Maya's decision tree, as code. Every product, price and opinion comes from
 * E-04; every route comes from E-02.2; the questions come from E-02.1. Nothing
 * is written on the fly and nothing is invented. When the tree has no branch,
 * the message goes to her rather than getting a vague answer in her name.
 *
 * Her rules, in the order they beat everything else:
 *   E-02.4  Never recommend retinol by default.
 *   E-07.4  Two products, maximum. People need confidence, not more products.
 *   E-08.3  Anyone about to spend £62 hears that it is good, but not £62 good.
 *   E-02.2  Shade questions are answered with a question.
 *   E-04.5  SPF 50 is non-negotiable — but it is a recommendation, not a footer.
 */

const RETINOID = /retin(ol|oid|al)|tretinoin/i
const RETINOID_RISK = /pregnan|breastfeed|dermatolog|prescri|rosacea|eczema|\bi'?m 1[0-7]\b|too young|accutane|roaccutane/i
const WHERE_TO_BUY = /where (do|can) (you|i) (buy|get)|stockist|ships? to the uk|us only/i
const SHADE = /\bshade\b|\bundertone\b|foundation|colour match|color match|\btint\b/i
const REDNESS = /redness|\bred\b|rosacea|flush|angry skin/i
const DRYNESS = /\bdry\b|flak|tight|peel/i
/**
 * "I bought it and it is wrong for me." Not a reaction — a reaction is caught
 * upstream and never reaches a draft. This is someone who took her advice and
 * it did not suit them, which is the moment her own hedge is worth more than
 * any recommendation.
 */
const MISFIT = /too (heavy|rich|greasy|much|thick|strong|oily)|doesn'?t (work|suit)|does not (work|suit)|not working|hate it|wrong for me|did i do something wrong|pilling|sits weird|regret|waste of money/i

const RETINOL_BLOCK =
  "I don't hand retinol out, and I'm not going to start with you on a DM. It's the fastest way I know to wreck a face that was fine last week. Get boring right for a month — cleanser, moisturiser, SPF — then ask me again and I'll tell you honestly whether you need it."

/** E-02.2: shade questions are answered with a question, never a guess. */
const SHADE_REPLY =
  "What are you wearing at the moment? Shade is the one thing I won't guess at over a DM — tell me the one you've got on and whether you like how it sits, and I'll tell you where you'd land in this."

const sentence = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const skinOf = (a: JevAnswers) => a.skin_type.choice
const skinKnown = (a: JevAnswers) => skinOf(a) !== 'unknown' && a.skin_type.confidence >= 0.5

/** Name, price and her note, as one clause she would actually say. */
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
const withNote = (n: string) => {
  const p = byName(n)
  return p ? `${p.name} (${gbp(p.price)}) — ${lower(p.note.replace(/\.$/, ''))}` : n
}
const withPrice = (n: string) => {
  const p = byName(n)
  return p ? `${p.name} (${gbp(p.price)})` : n
}

/**
 * Her routing, plus the second skin signal the Choice cannot carry. E-01.2 is
 * "dry skin + redness and £60" — two routes at once, and £70 of product.
 */
function pickFor(text: string, a: JevAnswers): { names: string[]; total: number; rule?: string } {
  const primary = ROUTING[skinOf(a)]
  if (!primary) return { names: [], total: 0 }
  const names = [primary.first]

  // A second condition named in the message gets its own product before the
  // optional one does. Redness beats a nice-to-have every time.
  if (skinOf(a) !== 'redness' && skinOf(a) !== 'sensitive' && REDNESS.test(text)) names.push('Red Reset')
  else if (primary.second) names.push(primary.second)

  const capped = names.slice(0, 2) // E-07.4
  return { names: capped, total: capped.reduce((sum, n) => sum + (byName(n)?.price ?? 0), 0), rule: primary.rule }
}

/**
 * The exact amount, when the message really is stating a budget.
 *
 * The first figure in a message is very often not one: "why is everything £60
 * now", "£20 for a cleanser? really?", "not spending £80 on a serum" are a
 * complaint, a scoff and a refusal. Jev has already judged whether there is a
 * budget in the message at all, so the figure is only trusted when it agrees
 * with that band — which on this corpus rejects all thirteen misreads and
 * keeps all forty-two real ones.
 */
const inBand = (n: number, band: string): boolean => {
  if (band === 'under_30') return n < 30
  if (band === '30_to_60') return n >= 30 && n <= 60
  if (band === 'over_60') return n > 60
  return false // 'none' — Jev found no budget here, so no figure is one.
}

const statedBudget = (text: string, band: string): number | null => {
  const match = text.match(/£\s*(\d+)/i) ?? text.match(/\b(\d+)\s*(?:quid|pounds?|gbp)\b/i)
  if (!match) return null
  const n = Number(match[1])
  return inBand(n, band) ? n : null
}

/** The money line. Her whole brand is being straight about what it costs. */
function budgetLine(total: number, band: string, names: string[], text: string): string | null {
  const ceiling = statedBudget(text, band) ?? CEILING[band]
  if (ceiling === null || ceiling === undefined || total <= ceiling) return null
  const affordable = names
    .filter((name) => (byName(name)?.price ?? Infinity) <= ceiling)
    .sort((x, y) => (byName(y)?.maya ?? 0) - (byName(x)?.maya ?? 0))[0]
  if (!affordable) return `That's ${gbp(total)}, not ${gbp(ceiling)}. Nothing here fits that without pretending — keep the money for now.`
  const later = names.find((name) => name !== affordable)
  const over = total - ceiling
  // A tenner over is worth saying out loud; forty is not. Telling someone to
  // stretch is a judgement, and it stops being a kind one past a point.
  const worthStretching = over <= 15 && over <= ceiling * 0.25
  const fallback = `start with ${withPrice(affordable)}${later ? ` and add the ${byName(later)?.name ?? later} next month — it works in that order` : ''}`
  return worthStretching
    ? `That's ${gbp(total)}, not ${gbp(ceiling)}. If you can stretch ${gbp(over)}, do it — it's the right pair. If you can't, ${fallback}.`
    : `That's ${gbp(total)}, not ${gbp(ceiling)}. ${fallback.charAt(0).toUpperCase()}${fallback.slice(1)}.`
}

/** E-08.3: said when they are actually about to spend that kind of money. */
const skipLine = () => {
  const p = byName(WOULD_NOT_PAY_FOR)!
  return `And if the ${gbp(p.price)} one is on your list — ${p.note} I like it. I wouldn't pay ${gbp(p.price)} for it.`
}

const WHY: Record<string, string> = {
  'a reaction': 'Her skin has reacted. Nothing goes out on that without you.',
  'a life event': "There's something going on in her life behind this, not a product question.",
  'meant for her': 'She wrote to you, not about a product. This is the part you said you wanted to keep.',
  retinoid: "Retinol, and something else going on in the message. Your rule: never by default, and never from a draft.",
  'yours to answer': 'Reads like a judgement call rather than a routine question.',
  'nothing to answer it from': 'Not enough in it to answer — no skin type, no product, no real question.',
  'not sure enough to draft': 'The read came back weak on this one. Worth your eyes.',
  'no branch': 'Nothing in your routing covers this one.',
}

export type Routed = { lane: Lane; draft?: string; why?: string }

function draftFor(text: string, a: JevAnswers): string | undefined {
  const intent = a.intent.choice
  const owned = named(text)
  const lines: string[] = []
  let saidSkip = false

  if (RETINOID.test(text)) return RETINOL_BLOCK
  if (WHERE_TO_BUY.test(text)) return undefined // her stockists are not in the evidence

  // Took her advice, and it did not suit them. Answer before the intent branch
  // does, because Jev reads these as a diagnosis or a value question and both
  // would miss the point: the person wants to know they did nothing wrong.
  if (owned.length && MISFIT.test(text)) {
    const p = owned[0]
    const swap = ROUTING[skinOf(a)]?.first
    // Her own top pick failing someone it should suit is a judgement call, not
    // a swap. Those go to her rather than getting a second guess in her name.
    if (skinKnown(a) && swap === p.name) return undefined

    const out = [
      p.hedged
        ? `You did nothing wrong — ${lower(p.note)} It's the one thing on that shelf I don't reach for myself, and I should say that louder.`
        : `Nothing wrong with you. It's ${/^8/.test(String(p.maya)) ? 'an' : 'a'} ${p.maya} from me and it still won't suit every face — that happens, and it isn't something you did.`,
    ]
    if (skinKnown(a) && swap) out.push(`For your skin it's ${withNote(swap)}.`)
    else out.push(`${INTAKE.skin} Tell me that and I'll swap you onto the right one.`)
    return out.map(sentence).join(' ')
  }
  if (intent === 'info' || SHADE.test(text)) {
    if (SHADE.test(text)) return SHADE_REPLY
    if (owned.length) return `${withNote(owned[0].name)}. ${owned[0].maya} out of ten from me, and that's after using it rather than being sent it.`
    return undefined
  }

  switch (intent) {
    case 'diagnosis': {
      // E-01.6: "i dont even know what my skin type is lol" — she answers this.
      return `Easy to sort out. Tight after you wash it, dry. Shiny by lunch, oily. Both at once, combination. Red and cross most of the time, that's its own thing. Tell me which and I'll give you two products, not ten. ${INTAKE.using}`
    }
    case 'constraint': {
      // E-01.9: "only 2 products bc i will not do 8 steps".
      const pick = pickFor(text, a)
      if (!skinKnown(a)) return `Two products is the right instinct — most people are doing eight and getting less. ${INTAKE.skin} ${INTAKE.blunt}`
      const first = byName(pick.names[0])
      const cleanser = byName('Soft Clean')
      if (!first || !cleanser) return undefined
      const total = first.price + cleanser.price
      const ceiling = statedBudget(text, a.budget_band.choice) ?? CEILING[a.budget_band.choice]
      if (ceiling !== null && ceiling !== undefined && total > ceiling) {
        if (first.price <= ceiling) {
          lines.push(`At ${gbp(ceiling)}, one product now: ${withNote(first.name)}. Keep your current cleanser and add ${cleanser.name} when the budget allows.`)
        } else {
          lines.push(`At ${gbp(ceiling)}, I can't get this right from my shelf without pretending. ${first.name} is ${gbp(first.price)}, so keep the money for now.`)
        }
      } else {
        lines.push(`Two, then: ${withPrice(cleanser.name)} and ${withNote(first.name)}.`)
      }
      lines.push(`That's the ${POSTS.fiveMinute.title.replace(/^My /, '').toLowerCase()} I filmed — the least-watched thing I've made and the one people actually stick to.`)
      break
    }
    case 'value': {
      if (!owned.length) return `Which one? Half of them I'd tell you to skip, so it matters which we're talking about.`
      const p = owned[0]
      if (p.name === WOULD_NOT_PAY_FOR) {
        lines.push(`${p.note} I like it — I wouldn't pay ${gbp(p.price)} for it.`)
        const alt = byName(THE_GOOD_ONE)!
        lines.push(`Put it towards ${withPrice(alt.name)} instead and you'll notice more.`)
        saidSkip = true
        break
      }
      lines.push(`Yes, and you're not being influenced — it's ${p.maya} out of ten from me, which is the highest I've given anything in that category. ${p.note}`)
      if (!p.skin.includes('all') && skinKnown(a) && !p.skin.includes(skinOf(a))) {
        const better = ROUTING[skinOf(a)]?.first
        if (better) lines.push(`It's built for ${p.skin[0].replace('_', '/')} skin though, and yours isn't. ${withPrice(better)} is the one I'd put your money on.`)
      }
      break
    }
    case 'context': {
      // E-01.5: "i already have the night serum. do i need the barrier cream too???"
      if (!owned.length) return `What have you got already? I'd rather tell you to use what's in the cupboard than sell you a third serum.`
      const have = owned[0]
      if (DRYNESS.test(text) || skinOf(a) === 'dry') {
        lines.push(`You've got ${have.name}, so texture's covered. A richer cream on top only earns its place if you're tight or flaking — if you are, ${withNote('Cloud Cream')}.`)
      } else {
        lines.push(`You've got ${have.name} — ${lower(have.note)} That's the job done, and you don't need a second one sitting on top of it.`)
      }
      break
    }
    case 'judgement': {
      // E-01.3: "if u could only keep ONE of these which one".
      if (owned.length >= 2) {
        const best = [...owned].sort((x, y) => y.maya - x.maya)[0]
        const rest = owned.filter((p) => p.name !== best.name)
        lines.push(`${best.name}, every time. ${best.note} ${best.maya} against ${rest.map((p) => `${p.maya} for the ${p.name}`).join(' and ')} — not close.`)
        break
      }
      if (!skinKnown(a)) return `Which ones are we choosing between? Give me the two and I'll tell you which one I'd keep.`
      const pick = pickFor(text, a)
      lines.push(`${withNote(pick.names[0])}. If you keep one thing, keep that one.`)
      break
    }
    case 'transfer_of_trust':
    case 'personalisation':
    case 'recommendation': {
      if (!skinKnown(a)) {
        return `${INTAKE.skin} ${INTAKE.using} Two answers and I'll give you two products — I'm not sending you a list.`
      }
      const pick = pickFor(text, a)
      if (!pick.names.length) return undefined
      // If her ceiling rules out everything, say that instead of listing two
      // products she cannot buy and taking them away in the next sentence.
      const ceiling = statedBudget(text, a.budget_band.choice) ?? CEILING[a.budget_band.choice]
      if (ceiling !== null && ceiling !== undefined && !pick.names.some((n) => (byName(n)?.price ?? Infinity) <= ceiling)) {
        // Cheapest of the ones she'd actually put her name to. The balm is on
        // the shelf for dry skin and she says it is too much for her, so it is
        // not the thing to send someone who is counting every pound.
        const byPrice = (x: string, y: string) => (byName(x)?.price ?? 0) - (byName(y)?.price ?? 0)
        const hers = pick.names.filter((n) => !byName(n)?.hedged)
        const cheapest = (hers.length ? hers : pick.names).sort(byPrice)[0]
        return `Not at ${gbp(ceiling)}, not honestly. The cheapest thing I'd put on your skin is ${withPrice(cheapest)}, so keep the money until you've got that — buying something worse in the meantime is how people end up with a shelf of things they don't use.`
      }
      const opener =
        intent === 'transfer_of_trust'
          ? `If it were my money: `
          : intent === 'personalisation'
            ? `If I had your skin: `
            : ''
      lines.push(`${opener}${withNote(pick.names[0])}${pick.names[1] ? `, and ${withNote(pick.names[1])}` : ''}.`)
      if (intent === 'transfer_of_trust') lines.push(`That's where mine would go, and I'd leave the rest of it in your account.`)
      if (pick.rule) lines.push(`And ${pick.rule} — that rule matters more than the product does.`)
      // Oil Balm is on the shelf for dry skin and she does not use it. Say so.
      if (pick.names.includes('Oil Balm')) lines.push(`Only take the balm if you actually like a heavy finish.`)
      const money = budgetLine(pick.total, a.budget_band.choice, pick.names, text)
      if (money) lines.push(money)
      break
    }
    default:
      return undefined
  }

  if (!saidSkip && (a.budget_band.choice === 'over_60' || new RegExp(WOULD_NOT_PAY_FOR, 'i').test(text))) {
    lines.push(skipLine())
  }
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

  // E-02.4, the hard block: a retinoid question with a reaction, a
  // prescription, a condition or someone under 18 in it never gets a draft.
  if (RETINOID.test(dm.text) && (RETINOID_RISK.test(dm.text) || (signals.is_reaction ?? 0) >= 0.3)) {
    return { lane: 'maya', why: WHY.retinoid }
  }
  if (call.lane === 'maya') return { lane: 'maya', why: WHY[call.because] ?? WHY['not sure enough to draft'] }

  const draft = draftFor(dm.text, answers)
  if (!draft) return { lane: 'maya', why: WHY['no branch'] }
  return { lane: 'voice', draft }
}

/** Exported for the fixture generator and for tests. */
export { SHELF }
