/**
 * E-04 // THE SHELF, verbatim from the case file. Prices, scores and her notes
 * are hers — nothing here is invented. Her notes are the reply text.
 */
export type ShelfItem = {
  ref: string
  name: string
  price: number
  type: string
  /** Skin types from E-02.2, or 'all'. */
  skin: string[]
  finish: string
  maya: number
  note: string
}

export const SHELF: ShelfItem[] = [
  { ref: 'E-04.1', name: 'Cloud Cream', price: 38, type: 'Moisturiser', skin: ['dry'], finish: 'Rich', maya: 9.2, note: 'My winter skin saviour.' },
  { ref: 'E-04.2', name: 'Daily Gel', price: 24, type: 'Moisturiser', skin: ['oily_combo'], finish: 'Light', maya: 8.1, note: 'Easy. No drama.' },
  { ref: 'E-04.3', name: 'Red Reset', price: 32, type: 'Serum', skin: ['sensitive', 'redness'], finish: 'Calm', maya: 9.5, note: 'For angry skin days.' },
  { ref: 'E-04.4', name: 'Night Serum', price: 42, type: 'Serum', skin: ['all'], finish: 'Glow', maya: 8.8, note: 'Best for texture.' },
  { ref: 'E-04.5', name: 'SPF 50', price: 26, type: 'SPF', skin: ['all'], finish: 'Invisible', maya: 9.6, note: 'Non-negotiable.' },
  { ref: 'E-04.6', name: 'Glass Drop', price: 62, type: 'Serum', skin: ['all'], finish: 'Dewy', maya: 8.1, note: 'Good. Not £62 good.' },
  { ref: 'E-04.7', name: 'Soft Clean', price: 22, type: 'Cleanser', skin: ['all'], finish: 'Cream', maya: 8.6, note: 'Boring in the best way.' },
  { ref: 'E-04.8', name: 'Oil Balm', price: 29, type: 'Balm', skin: ['dry'], finish: 'Glow', maya: 7.7, note: 'Beautiful, but too much for me.' },
  { ref: 'E-04.9', name: 'Clear Wash', price: 20, type: 'Cleanser', skin: ['oily_combo'], finish: 'Foam', maya: 8.0, note: 'Great after gym.' },
  { ref: 'E-04.10', name: 'Tint Veil', price: 34, type: 'Base', skin: ['all'], finish: 'Skin-like', maya: 9.0, note: 'Best on camera.' },
]

/** E-02.5: her favourite moisturiser is saved in her phone as "the good one". */
export const THE_GOOD_ONE = 'Cloud Cream'

/** E-08.3 / E-04.6: the one contradiction. She likes it. She would not pay £62. */
export const WOULD_NOT_PAY_FOR = 'Glass Drop'

export const byName = (name: string) => SHELF.find((p) => p.name.toLowerCase() === name.toLowerCase())

/** Find every shelf product a message names, longest name first so "Cloud Cream" wins over "Cream". */
export function named(text: string): ShelfItem[] {
  const lower = text.toLowerCase()
  return [...SHELF]
    .sort((a, b) => b.name.length - a.name.length)
    .filter((p) => lower.includes(p.name.toLowerCase()))
}

export const price = (name: string) => byName(name)?.price ?? 0
export const gbp = (n: number) => `£${n}`

/**
 * E-02.2 // the routing she does in her head.
 *   DRY -> Cloud Cream + Barrier Oil
 *   OILY -> Daily Gel
 *   SENSITIVE -> avoid fragrance
 *   REDNESS -> Red Reset
 *
 * Note the gap in the evidence: her head says "Barrier Oil" and no Barrier Oil
 * exists on the shelf. The nearest thing is Oil Balm — dry skin, £29 — which
 * she scores 7.7 and describes as "Beautiful, but too much for me". So it is
 * the second product for dry skin, and it carries her caveat rather than a
 * recommendation. Saying that out loud is the brand.
 */
export const ROUTING: Record<string, { first: string; second?: string; rule?: string }> = {
  dry: { first: 'Cloud Cream', second: 'Oil Balm' },
  oily_combo: { first: 'Daily Gel' },
  sensitive: { first: 'Red Reset', rule: 'nothing with fragrance in it' },
  redness: { first: 'Red Reset' },
}

/** E-03 // what she has already filmed, for when the answer is a post. */
export const POSTS = {
  fiveMinute: { title: 'My 5-minute morning routine', saves: 4600, conversions: 317 },
  fifty: { title: '3 things I would repurchase with £50', saves: 1900 },
  notRebuy: { title: 'The product I would NOT rebuy', saves: 3100 },
}

/** E-02.1 // what she actually asks people, in her words. */
export const INTAKE = {
  skin: 'Skin type?',
  using: 'What are you using now?',
  hate: 'What do you hate about it?',
  budget: 'Budget?',
  finish: 'What finish do you like?',
  blunt: 'Do you actually care about skincare or do you just want to look hot tomorrow?',
} as const

/** What a budget band means in pounds. `none` has no ceiling to check against. */
export const CEILING: Record<string, number | null> = { under_30: 30, '30_to_60': 60, over_60: null, none: null }
