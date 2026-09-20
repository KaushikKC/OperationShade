import type { Choice, DM, JevAnswers, ScoreAns } from './types'

// Jev — TypeSafe System One. One request per message, nine questions evaluated
// in parallel against the same state. https://docs.typesafe.ai/api
const ENDPOINT = 'https://api.typesafe.ai/v1/systemone'
const MODEL = 'jev-latest'
/** Jev 1.13 is $42 per billion input tokens. Output tokens are free. */
const USD_PER_INPUT_TOKEN = 42 / 1e9

export const INTENTS = ['product_rec', 'routine_help', 'dupe_request', 'reaction_concern', 'where_to_buy', 'purchase_signal', 'collab_pitch', 'spam', 'no_question'] as const
export const SKIN_TYPES = ['dry', 'oily', 'combination', 'sensitive', 'normal', 'unknown'] as const
export const BUDGET_BANDS = ['under_15', '15_40', '40_plus', 'unknown'] as const

/**
 * The question schema. Nine questions; eight of them land in JevAnswers and the
 * ninth (`is_reaction`) is a safety net the routing reads and the inbox never
 * shows. Criteria carry Maya's domain rules — edit them here, not in a prompt.
 */
export const QUESTIONS = {
  intent: {
    type: 'choice',
    instructions: 'What is this person actually asking Maya for? Judge the request, not the politeness around it.',
    criteria: {
      product_rec: 'Wants to know whether a specific product is worth buying, or which product to buy.',
      routine_help: 'Wants help with how to use things — order, frequency, combinations, whether they are doing it wrong.',
      dupe_request: 'Wants a cheaper equivalent of something specific.',
      reaction_concern: 'Their skin has reacted badly — redness, burning, stinging, peeling, bumps — and they want to know what to do.',
      where_to_buy: 'Knows what they want and is asking where or how to get it.',
      purchase_signal: 'Is about to buy, is saving up, or has just bought. Tells Maya rather than asking her.',
      collab_pitch: 'A brand, agency or PR asking for posts, gifting or a partnership.',
      spam: 'Follower growth, crypto, phishing, adult content, mass-sent nonsense.',
      no_question: 'A compliment, a hello, or too little to work out what is being asked.',
    },
  },
  skin_type: {
    type: 'choice',
    instructions: 'What skin type does this person have, going only on what the message says or clearly implies? Do not guess from the product they mention.',
    criteria: {
      dry: 'Tightness, flaking, rough patches, never oily.',
      oily: 'Shine, greasiness through the day, large pores.',
      combination: 'Oily in the t-zone and dry or normal elsewhere.',
      sensitive: 'Stings, reddens or reacts easily; eczema, rosacea or a dermatologist is mentioned.',
      normal: 'Says their skin is fine or generally behaves.',
      unknown: 'The message gives nothing to go on. Choose this rather than guessing.',
    },
  },
  budget_band: {
    type: 'choice',
    instructions: 'What can this person spend, in pounds, on the thing they are asking about? Go on stated amounts and clear signals like being a student or saving up.',
    criteria: {
      under_15: 'Under £15, or signals of having very little to spend.',
      '15_40': 'Roughly £15 to £40.',
      '40_plus': 'Over £40, or comfortable with premium prices.',
      unknown: 'No amount and no signal. Choose this rather than guessing.',
    },
  },
  purchase_intent: {
    type: 'score',
    instructions: 'How close is this person to spending money?',
    criteria: [
      'No sign of buying anything. Asking out of interest, or not asking at all.',
      'Thinking about it in general terms. No product, no timeframe.',
      'Researching a specific purchase — comparing options, asking if something is worth it.',
      'About to buy, saving for a named thing, waiting on payday, or has just bought.',
    ],
  },
  needs_maya_personally: {
    type: 'noul',
    instructions: 'This message needs Maya herself to answer it, rather than her usual advice.',
    criteria: {
      true: 'A judgement call, a life event, grief, a wedding or a health situation, a skin reaction, a message from someone in distress, or anything where the standard answer could be wrong or unkind.',
      false: 'A question she answers the same way every time — a product, a dupe, a stockist, a routine order, a budget starter set.',
    },
  },
  answerable_by_routing: {
    type: 'noul',
    instructions: {
      question: 'Everything needed to answer this message is in the message itself and in `mayas_routing`. No extra information is needed from the person and no judgement call is involved.',
      mayas_routing: [
        'Which products on her shelf she rates, at which price, and which she thinks are not worth the money.',
        'Cheaper equivalents for expensive products.',
        'Where to buy things in the UK.',
        'The order and frequency to use things in, and which combinations are fine.',
        'A starter set for a stated budget and skin type.',
      ],
    },
    criteria: {
      true: 'One of the routing answers above fits, and the message contains whatever it needs — a product, a skin type, or an amount.',
      false: 'Answering would need more from the person, or a judgement Maya has not already made.',
    },
  },
  urgency: {
    type: 'score',
    instructions: 'How soon does this person need an answer?',
    criteria: [
      'No time pressure at all.',
      'Would like an answer sometime. Nothing turns on it.',
      'There is a date coming — an event, a payday, a trip.',
      'Something is wrong now. Skin is reacting, they are in pain or distress, or the date is within days.',
    ],
  },
  names_shelf_product: {
    type: 'noul',
    instructions: 'The message points at a specific product Maya has talked about, by name or by unmistakable description such as "the blue jar" or "the one from the boots video".',
    criteria: {
      true: 'A named product, brand, or a description only one product could mean.',
      false: 'Only a category — cleanser, serum, spf — or nothing at all.',
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

function asChoice(raw: unknown, options: readonly string[]): Choice {
  const a = raw as RawChoice | undefined
  const probabilities: Record<string, number> = {}
  for (const o of options) probabilities[o] = r3(clamp01(a?.probabilities?.[o] ?? 0))
  const choice = a?.choice && options.includes(a.choice) ? a.choice : options[options.length - 1]
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
      intent: asChoice(a.intent, INTENTS),
      skin_type: asChoice(a.skin_type, SKIN_TYPES),
      budget_band: asChoice(a.budget_band, BUDGET_BANDS),
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
