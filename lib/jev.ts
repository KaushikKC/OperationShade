import type { Choice, DM, JevAnswers, ScoreAns } from './types'

// Jev — TypeSafe System One. One request per message, nine questions evaluated
// in parallel against the same state. https://docs.typesafe.ai/api
const ENDPOINT = 'https://api.typesafe.ai/v1/systemone'
const MODEL = 'jev-latest'
/** Jev 1.13 is $42 per billion input tokens. Output tokens are free. */
const USD_PER_INPUT_TOKEN = 42 / 1e9

/** E-01 // the case file labels its own twelve intercepts. These are its words. */
export const INTENTS = ['info', 'recommendation', 'judgement', 'value', 'context', 'diagnosis', 'trust', 'relationship', 'constraint', 'delayed_intent', 'transfer_of_trust', 'personalisation', 'brand_pitch', 'spam'] as const
export const SKIN_TYPES = ['dry', 'oily_combo', 'sensitive', 'redness', 'unknown'] as const
export const BUDGET_BANDS = ['none', 'under_30', '30_to_60', 'over_60'] as const

/**
 * The question schema. Nine questions; eight of them land in JevAnswers and the
 * ninth (`is_reaction`) is a safety net the routing reads and the inbox never
 * shows. Criteria carry Maya's domain rules — edit them here, not in a prompt.
 */
export const QUESTIONS = {
  intent: {
    type: 'choice',
    instructions: 'What is this person actually asking Maya for? Judge the request underneath the message, not the politeness around it.',
    criteria: {
      info: 'A fact about something Maya has used or worn — which shade, which one was that, where is it from.',
      recommendation: 'Tell me what to buy. Usually comes with a skin type, a budget, or both.',
      judgement: 'Asks Maya to choose between things: which one, if you could only keep one, this or that.',
      value: 'Is this worth the money. Includes wondering aloud whether they are being influenced into it.',
      context: 'They already own something and want to know what fits with it, or whether they need another thing at all.',
      diagnosis: 'They do not know what their own skin is or what it is doing, and want help working it out.',
      trust: 'Tells Maya they trust her, or thanks her. Nothing is being asked and nothing is being bought.',
      relationship: 'Something in their life is the reason they are writing — a date, a wedding, a funeral, a baby, an interview.',
      constraint: 'A hard limit on the answer: only two products, five minutes, no money, will not do eight steps.',
      delayed_intent: 'Going to buy, but not now. Saving up, waiting for payday, bookmarking, working through a list. Telling Maya rather than asking her.',
      transfer_of_trust: 'Asks Maya to decide as though it were her own money or her own face, sometimes on something outside beauty.',
      personalisation: 'Asks for the one Maya would pick for them specifically — "the one you would buy if you were me".',
      brand_pitch: 'A brand, agency or PR asking for posts, gifting or a partnership.',
      spam: 'Follower growth, crypto, phishing, adult content, mass-sent nonsense.',
    },
  },
  skin_type: {
    type: 'choice',
    instructions: 'What skin type does this person have, going only on what the message says or clearly implies? Do not infer it from the product they mention.',
    criteria: {
      dry: 'Tightness, flaking, rough patches. Never oily.',
      oily_combo: 'Shine, greasiness through the day, large pores, or oily in the t-zone and not elsewhere.',
      sensitive: 'Stings, reacts or flares easily. Fragrance is a problem, or eczema, or a dermatologist is involved.',
      redness: 'Persistent redness, flushing or rosacea as the main complaint.',
      unknown: 'The message gives nothing to go on. Choose this rather than guessing.',
    },
  },
  budget_band: {
    type: 'choice',
    instructions: 'What is this person willing to spend, in pounds, on the thing they are asking about? Go on stated amounts and clear signals like being a student or saving up.',
    criteria: {
      none: 'No amount and no signal, or they have said they cannot spend anything.',
      under_30: 'Under £30, or clear signals of having very little.',
      '30_to_60': 'Roughly £30 to £60.',
      over_60: 'Over £60, or comfortable with premium prices.',
    },
  },
  purchase_intent: {
    type: 'score',
    instructions: 'How close is this person to spending money?',
    criteria: [
      'Browsing. No sign of buying anything, or not asking at all.',
      'Curious. Thinking about it in general terms, no product and no timeframe.',
      'Ready. Researching a specific purchase, comparing options, asking if something is worth it.',
      'Buying now. About to pay, saving for a named thing, waiting on payday, or has just bought.',
    ],
  },
  needs_maya_personally: {
    type: 'noul',
    instructions: {
      question: 'This message needs Maya herself to type the answer, because `her_routing` cannot carry it.',
      her_routing: 'Her taste and her judgement, already written down: what she rates, what she would not pay for, what she would buy for a given skin and budget, and the questions she asks back when she needs more.',
      the_distinction: 'Asking for Maya\'s judgement is not the same as needing Maya. Her judgement is in the routing. She is needed when a correct product answer would still be the wrong reply.',
    },
    criteria: {
      true: 'Something happening in their life, a person upset or in distress, a message written to her rather than about a product, a health situation, or a decision outside beauty. A right answer about a product would still be the wrong reply.',
      false: 'Asking for her pick, her opinion, her judgement or what she would buy — however personally it is phrased, including "what would you buy if you were me" and "forget the brand, what would YOU use". Her routing already carries that. Also false for anything about a product, a routine, a price, a shade or a skin type.',
    },
  },
  answerable_by_routing: {
    type: 'noul',
    instructions: {
      question: 'Maya answers this kind of message the same way every time, straight from `mayas_routing`, without having to think about this person in particular.',
      mayas_routing: {
        what_to_buy: 'Dry skin gets Cloud Cream and the Barrier Oil. Oily or combination gets the Daily Gel. Sensitive gets nothing with fragrance in it. Redness gets Red Reset.',
        is_it_worth_it: 'She has a settled view on everything she has talked about, including the things she thinks are not worth the money.',
        how_to_use_it: 'The order and frequency of anything on her shelf.',
        no_time_or_money: 'The five-minute routine she has already filmed.',
        shade: 'Always ask what they wear now — never answer blind.',
        always: 'SPF 50 every morning.',
      },
    },
    criteria: {
      true: 'One of those covers it. Whether something on her shelf is worth the money is always covered, however little else the message says. It still counts when the only thing missing is the one standard question she always asks back — their skin type, or what shade they wear now.',
      false: 'Answering would need her own judgement about this person, or something her routing does not contain: their medical situation, their life, their relationships, or a product she has never talked about. Also false when you cannot tell which product or whose skin they mean.',
    },
  },
  urgency: {
    type: 'score',
    instructions: 'How soon does this person need an answer? Judge the situation, not how long the message is.',
    criteria: [
      'No time pressure at all.',
      'Would like an answer sometime. Nothing turns on it.',
      'There is a date coming — an event, a holiday, a payday.',
      'Something is wrong now. Skin is reacting, they are distressed, or the date is within days.',
    ],
  },
  names_shelf_product: {
    type: 'noul',
    instructions: {
      question: 'The message points at one of the products in `mayas_shelf`, by name or by a description only one of them could mean, such as "the good one" or "the £62 one".',
      mayas_shelf: ['Cloud Cream', 'Barrier Oil', 'Daily Gel', 'Red Reset', 'Glass Drop', 'her SPF 50'],
    },
    criteria: {
      true: 'A named product, or a description only one product could mean.',
      false: 'Only a category — cleanser, serum, moisturiser — or nothing at all.',
    },
  },
  is_reaction: {
    type: 'noul',
    instructions: 'This person is describing skin that has reacted badly — burning, stinging, rawness, spreading redness, peeling, swelling, sore eyes or lips, or a rash.',
    criteria: {
      true: 'Their skin is doing something wrong right now and they are worried about it.',
      false: 'No reaction described, or they are asking about reactions in the abstract.',
    },
  },
} as const

type RawChoice = { type: 'choice'; choice: string; confidence: number; probabilities: Record<string, number> }
type RawScore = { type: 'score'; score: number; confidence: number; legend: Record<string, string>; probabilities: Record<string, number> }
type RawNoul = { type: 'noul'; noul: number }
type RawAnswers = Record<string, RawChoice | RawScore | RawNoul>
type Envelope = { model: string; answers: RawAnswers; usage: { input_tokens: number; output_tokens: number } }

export type JevResult = {
  answers: JevAnswers
  /** Asked, routed on, never rendered: the contract in types.ts carries eight answers. */
  signals: { is_reaction: number }
  model: string
  inputTokens: number
}

const r3 = (n: number) => Math.round(n * 1000) / 1000
const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0)

/**
 * An option Jev did not return, or an answer that came back malformed, falls
 * back to the strongest known option and then to `fallback`. Confidence comes
 * through as 0 in that case, which keeps the row below every threshold and
 * sends it to Maya rather than into a draft.
 */
function asChoice(raw: unknown, options: readonly string[], fallback: string): Choice {
  const a = raw as RawChoice | undefined
  const probabilities: Record<string, number> = {}
  for (const o of options) probabilities[o] = r3(clamp01(a?.probabilities?.[o] ?? 0))
  let choice = a?.choice && options.includes(a.choice) ? a.choice : ''
  if (!choice) {
    const best = options.reduce((x, o) => (probabilities[o] > probabilities[x] ? o : x), options[0])
    choice = probabilities[best] > 0 ? best : fallback
  }
  return { choice, confidence: r3(clamp01(a?.confidence ?? 0)), probabilities }
}

/** Score comes back on the level index (0..levels-1). Everything downstream wants 0..1. */
function asScore(raw: unknown, levels: number): ScoreAns {
  const a = raw as RawScore | undefined
  return { score: r3(clamp01((a?.score ?? 0) / (levels - 1))), confidence: r3(clamp01(a?.confidence ?? 0)) }
}

const asNoul = (raw: unknown) => r3(clamp01((raw as RawNoul | undefined)?.noul ?? 0))

/** What Jev is shown. Handle and platform are context; the message is the state. */
export const stateFor = (dm: Pick<DM, 'handle' | 'platform' | 'text'>) => ({
  channel: dm.platform === 'ig' ? 'Instagram DM' : 'TikTok DM',
  from: `@${dm.handle}`,
  recipient: 'Maya Rao, a London beauty creator known for saying plainly when something is not worth buying',
  message: dm.text,
})

export class JevError extends Error {
  constructor(message: string, readonly status?: number) { super(message) }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const RETRYABLE = new Set([408, 409, 425, 429, 500, 502, 503, 504, 529])

async function post(body: unknown, apiKey: string, attempts = 4, signal?: AbortSignal): Promise<Envelope> {
  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) await sleep(Math.min(8000, 400 * 2 ** (attempt - 1)) + Math.random() * 250)
    let res: Response
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      })
    } catch (err) {
      lastError = err
      continue
    }
    if (res.ok) return (await res.json()) as Envelope
    const detail = await res.text().catch(() => '')
    if (!RETRYABLE.has(res.status)) throw new JevError(`Jev returned ${res.status}: ${detail.slice(0, 300)}`, res.status)
    const retryAfter = Number(res.headers.get('retry-after'))
    if (Number.isFinite(retryAfter) && retryAfter > 0) await sleep(Math.min(10_000, retryAfter * 1000))
    lastError = new JevError(`Jev returned ${res.status}: ${detail.slice(0, 300)}`, res.status)
  }
  throw lastError instanceof Error ? lastError : new JevError('Jev could not be reached')
}

export async function askJev(dm: Pick<DM, 'handle' | 'platform' | 'text'>, apiKey: string, signal?: AbortSignal): Promise<JevResult> {
  const envelope = await post({ state: stateFor(dm), model: MODEL, questions: QUESTIONS }, apiKey, 4, signal)
  const a = envelope.answers ?? {}
  return {
    answers: {
      intent: asChoice(a.intent, INTENTS, 'recommendation'),
      skin_type: asChoice(a.skin_type, SKIN_TYPES, 'unknown'),
      budget_band: asChoice(a.budget_band, BUDGET_BANDS, 'none'),
      purchase_intent: asScore(a.purchase_intent, QUESTIONS.purchase_intent.criteria.length),
      needs_maya_personally: asNoul(a.needs_maya_personally),
      answerable_by_routing: asNoul(a.answerable_by_routing),
      urgency: asScore(a.urgency, QUESTIONS.urgency.criteria.length),
      names_shelf_product: asNoul(a.names_shelf_product),
    },
    signals: { is_reaction: asNoul(a.is_reaction) },
    model: envelope.model,
    inputTokens: envelope.usage?.input_tokens ?? 0,
  }
}

export const costOf = (inputTokens: number) => Number((inputTokens * USD_PER_INPUT_TOKEN).toFixed(6))

/** Ten in flight. Jev allows 1,200 requests a minute; this keeps well inside it. */
export async function askJevAll<T extends Pick<DM, 'id' | 'handle' | 'platform' | 'text'>>(
  dms: T[],
  apiKey: string,
  opts: { concurrency?: number; onDone?: (done: number, total: number) => void; signal?: AbortSignal } = {},
): Promise<{ results: Map<string, JevResult>; failures: Map<string, string>; inputTokens: number }> {
  const concurrency = opts.concurrency ?? 10
  const results = new Map<string, JevResult>()
  const failures = new Map<string, string>()
  let inputTokens = 0
  let next = 0
  let done = 0
  const worker = async () => {
    while (next < dms.length) {
      const dm = dms[next++]
      try {
        const result = await askJev(dm, apiKey, opts.signal)
        results.set(dm.id, result)
        inputTokens += result.inputTokens
      } catch (err) {
        failures.set(dm.id, err instanceof Error ? err.message : String(err))
      }
      opts.onDone?.(++done, dms.length)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, dms.length) }, worker))
  return { results, failures, inputTokens }
}
