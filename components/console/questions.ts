// Static mirror of the classifier's question set, for the rules sidebar.
// Display copy only — the real schema lives in lib/jev.ts, and the thresholds
// quoted here are the ones in lib/lanes.ts. Keep the two in step.

export type QuestionCard = {
  key: string
  label: string
  kind: 'options' | 'scale' | 'yesno'
  prompt: string
  options?: string[]
  threshold?: string
  /** Asked of every message, but never shown in the table. */
  hidden?: boolean
  on: boolean
}

export const QUESTIONS: QuestionCard[] = [
  {
    key: 'intent',
    label: 'What they want',
    kind: 'options',
    prompt: 'What is this person actually asking for?',
    // E-01: the twelve the case file labels, plus the two that are not her audience.
    options: [
      'info', 'recommendation', 'judgement', 'value', 'context', 'diagnosis',
      'trust', 'relationship', 'constraint', 'delayed_intent',
      'transfer_of_trust', 'personalisation', 'brand_pitch', 'spam',
    ],
    on: true,
  },
  {
    key: 'skin_type',
    label: 'Skin type',
    kind: 'options',
    prompt: 'Skin type stated or clearly implied',
    options: ['dry', 'oily_combo', 'sensitive', 'redness', 'unknown'],
    on: true,
  },
  {
    key: 'budget_band',
    label: 'Budget',
    kind: 'options',
    prompt: 'Budget mentioned or implied',
    options: ['none', 'under_30', '30_to_60', 'over_60'],
    on: true,
  },
  {
    key: 'purchase_intent',
    label: 'Buying signal',
    kind: 'scale',
    prompt: 'How close to buying is this person?',
    options: ['browsing', 'curious', 'ready', 'buying now'],
    on: true,
  },
  {
    key: 'needs_maya_personally',
    label: 'Needs you',
    kind: 'yesno',
    prompt: 'Needs you, not your notes — a right answer about a product would still be the wrong reply',
    threshold: 'Kept back at 40% and over',
    on: true,
  },
  {
    key: 'answerable_by_routing',
    label: 'Answerable from your notes',
    kind: 'yesno',
    prompt: 'You answer this one the same way every time',
    threshold: 'Drafted at 50% and over — 25% when the reply is a question back',
    on: true,
  },
  {
    key: 'urgency',
    label: 'Time pressure',
    kind: 'scale',
    prompt: 'How soon do they need an answer?',
    options: ['none', 'sometime', 'a date is coming', 'wrong right now'],
    on: true,
  },
  {
    key: 'names_shelf_product',
    label: 'Names something on your shelf',
    kind: 'yesno',
    prompt: 'Points at one of your ten, by name or by "the good one"',
    threshold: 'Counts at 50% and over',
    on: true,
  },
  {
    key: 'is_reaction',
    label: 'Skin has reacted',
    kind: 'yesno',
    prompt: 'Burning, stinging, rawness, swelling — something is wrong now',
    threshold: 'Straight to you at 50% and over',
    hidden: true,
    on: true,
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
  { when: 'Shade questions', then: 'ask what they wear now — never guess' },
  { when: 'Over £60', then: 'good, not £62 good' },
  { when: 'Always', then: 'SPF 50, non-negotiable · two products, never more' },
  { when: 'Never', then: 'retinol by default' },
]
