// Static mirror of the classifier's question set, for the rules sidebar.
// Display copy only — the real question schema lives with the classifier.

export type QuestionCard = {
  key: string
  label: string
  kind: 'options' | 'scale' | 'yesno'
  prompt: string
  options?: string[]
  threshold?: string
  on: boolean
}

export const QUESTIONS: QuestionCard[] = [
  {
    key: 'intent',
    label: 'What they want',
    kind: 'options',
    prompt: 'What is this person actually asking for?',
    options: [
      'shade_info', 'recommendation', 'pick_one', 'value_check', 'routine_context',
      'skin_diagnosis', 'trust_or_fan', 'life_event', 'constraint_routine',
      'delayed_intent', 'brand_pitch', 'spam',
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
    prompt: "Only your judgement or voice answers this well",
    threshold: 'Yes when ≥ 60% sure',
    on: true,
  },
  {
    key: 'answerable_by_routing',
    label: 'Answerable from your notes',
    kind: 'yesno',
    prompt: 'Covered by your skin type + budget routing',
    threshold: 'Yes when ≥ 70% sure',
    on: true,
  },
  {
    key: 'urgency',
    label: 'Time pressure',
    kind: 'scale',
    prompt: 'Is there a deadline in the message?',
    options: ['none', 'soon', 'event within days'],
    on: true,
  },
  {
    key: 'names_shelf_product',
    label: 'Names a shelf product',
    kind: 'yesno',
    prompt: 'Mentions one of the 10 products on your shelf',
    threshold: 'Yes when ≥ 50% sure',
    on: false,
  },
]

export const MAYA_ROUTING: { when: string; then: string }[] = [
  { when: 'Dry skin', then: 'Cloud Cream + Barrier Oil' },
  { when: 'Oily / combo', then: 'Daily Gel' },
  { when: 'Sensitive', then: 'no fragrance · Red Reset' },
  { when: 'Redness', then: 'Red Reset' },
  { when: 'Shade questions', then: 'ask what foundation they wear now' },
  { when: 'Always', then: 'SPF 50 — non-negotiable' },
  { when: 'Never', then: 'retinol for everyone' },
]
