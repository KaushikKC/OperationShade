// Her wording for the reader's question set, for the rules sidebar.
//
// Only the wording lives here. The option lists and the thresholds are imported
// from lib/jev.ts and lib/lanes.ts — the same values the run used — so the
// sidebar cannot claim something the classifier is not doing. The rung labels on
// the two scales are the exception: Jev's criteria are full sentences, and a
// chip needs two words.
import { BUDGET_BANDS, INTENTS, SKIN_TYPES } from '@/lib/jev'
import { DEFAULT_THRESHOLD, NEEDS_MAYA_CEILING } from '@/lib/lanes'

const pc = (n: number) => `${Math.round(n * 100)}%`

export type QuestionCard = {
  key: string
  label: string
  kind: 'options' | 'scale' | 'yesno'
  prompt: string
  options?: readonly string[]
  threshold?: string
  /** Asked of every message, but never shown in the table. */
  hidden?: boolean
}

export const QUESTIONS: QuestionCard[] = [
  {
    key: 'intent',
    label: 'What they want',
    kind: 'options',
    prompt: 'What is this person actually asking for?',
    // E-01: the twelve the case file labels, plus the two that are not her audience.
    options: INTENTS,
  },
  {
    key: 'skin_type',
    label: 'Skin type',
    kind: 'options',
    prompt: 'Skin type stated or clearly implied',
    options: SKIN_TYPES,
  },
  {
    key: 'budget_band',
    label: 'Budget',
    kind: 'options',
    prompt: 'Budget mentioned or implied',
    options: BUDGET_BANDS,
  },
  {
    key: 'purchase_intent',
    label: 'Buying signal',
    kind: 'scale',
    prompt: 'How close to buying is this person?',
    options: ['browsing', 'curious', 'ready', 'buying now'],
  },
  {
    key: 'needs_maya_personally',
    label: 'Needs you',
    kind: 'yesno',
    prompt: 'Needs you, not your notes. A right answer about a product would still be the wrong reply',
    threshold: `Kept back at ${pc(NEEDS_MAYA_CEILING)} and over`,
  },
  {
    key: 'answerable_by_routing',
    label: 'Answerable from your notes',
    kind: 'yesno',
    prompt: 'You answer this one the same way every time',
    // Phrased against the slider, not against a number: she can move the bar,
    // and lib/lanes.ts drops it by 25 points when the reply is a question back.
    threshold: `Drafted at your review bar. Starts at ${pc(DEFAULT_THRESHOLD)}, and 25 points lower when the reply is a question back`,
  },
  {
    key: 'urgency',
    label: 'Time pressure',
    kind: 'scale',
    prompt: 'How soon do they need an answer?',
    options: ['none', 'sometime', 'a date is coming', 'wrong right now'],
  },
  {
    key: 'names_shelf_product',
    label: 'Names something on your shelf',
    kind: 'yesno',
    prompt: 'Points at one of your ten, by name or by "the good one"',
    threshold: 'Counts at 50% and over',
  },
  {
    key: 'is_reaction',
    label: 'Skin has reacted',
    kind: 'yesno',
    prompt: 'Burning, stinging, rawness, swelling. Something is wrong now',
    threshold: 'Straight to you at 50% and over',
    hidden: true,
  },
]

// E-02.2, the routing she does in her head. Her notes say "Cloud Cream +
// Barrier Oil" and there is no Barrier Oil on the shelf — the nearest thing is
// Oil Balm, which she scores 7.7 and calls "Beautiful, but too much for me".
// So it is offered with her caveat rather than as a recommendation.
export const MAYA_ROUTING: { when: string; then: string }[] = [
  { when: 'Dry skin', then: 'Cloud Cream · Oil Balm only if they like it heavy' },
  { when: 'Oily / combo', then: 'Daily Gel' },
  { when: 'Sensitive', then: 'nothing with fragrance · Red Reset' },
  { when: 'Redness', then: 'Red Reset' },
  { when: 'Shade questions', then: 'ask what they wear now. Never guess' },
  { when: 'Over £60', then: 'good, not £62 good' },
  { when: 'Always', then: 'SPF 50, non-negotiable · two products, never more' },
  { when: 'Never', then: 'retinol by default' },
]
