import type { Lane } from '@/lib/types'

export const LANE_META: Record<
  Lane,
  { label: string; color: string; desc: string; short: string }
> = {
  voice: {
    label: 'Ready to send',
    color: 'var(--nb-mint)',
    desc: 'Answered from your notes. A draft in your words, waiting for a check.',
    short: 'Ready to send',
  },
  maya: {
    label: 'Needs you',
    color: 'var(--nb-pink)',
    desc: 'Judgement calls, life events, anything it wasn’t sure about. Sorted by urgency.',
    short: 'Needs you',
  },
  intent: {
    label: 'Worth watching',
    color: 'var(--nb-yellow)',
    desc: 'Close to buying. No reply needed right now.',
    short: 'Worth watching',
  },
  noise: {
    label: 'Filed',
    color: 'var(--nb-cream-deep)',
    desc: 'Brand pitches and spam, tucked away.',
    short: 'Filed',
  },
}

export const LANE_ORDER: Lane[] = ['voice', 'maya', 'intent', 'noise']

/**
 * The twelve categories the case file puts on its own intercepts (E-01), said
 * the way Maya or the person writing to her would say them. Nothing on screen
 * needs to know what the classifier calls them.
 */
const INTENT_LABELS: Record<string, string> = {
  info: 'what is that one?',
  recommendation: 'what should i buy?',
  judgement: 'which one?',
  value: 'is it worth it?',
  context: 'i already have one',
  diagnosis: 'what is my skin?',
  trust: 'thank you',
  relationship: 'life event',
  constraint: 'keep it simple',
  delayed_intent: 'buying later',
  transfer_of_trust: 'what would you do?',
  personalisation: 'pick for me',
  brand_pitch: 'brand pitch',
  spam: 'spam',
}

const SKIN_LABELS: Record<string, string> = {
  dry: 'dry skin',
  oily: 'oily skin',
  oily_combo: 'oily / combo',
  combination: 'combination',
  sensitive: 'sensitive',
  redness: 'redness',
  normal: 'normal skin',
  unknown: 'skin ?',
}

const BUDGET_LABELS: Record<string, string> = {
  none: 'no budget',
  under_15: 'under £15',
  '15_40': '£15–40',
  '40_plus': '£40+',
  under_30: 'under £30',
  '30_to_60': '£30–60',
  over_60: '£60+',
  unknown: 'budget ?',
}

export function intentLabel(key: string | undefined): string {
  return (key && INTENT_LABELS[key]) ?? key ?? 'unread'
}

export function skinLabel(key: string | undefined): string {
  return (key && SKIN_LABELS[key]) ?? key ?? 'skin ?'
}

export function budgetLabel(key: string | undefined): string {
  return (key && BUDGET_LABELS[key]) ?? key ?? 'budget ?'
}

export function optionLabel(field: string, value: string): string {
  if (field === 'intent') return intentLabel(value)
  if (field === 'skin_type') return skinLabel(value)
  if (field === 'budget_band') return budgetLabel(value)
  return value.replaceAll('_', ' ')
}

export function pct(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return null
  return Math.round(Math.max(0, Math.min(1, n)) * 100)
}

export function timeAgo(ts: string | undefined): string {
  if (!ts) return ''
  const t = Date.parse(ts)
  if (Number.isNaN(t)) return ''
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000))
  if (mins < 60) return `${mins}m`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.round(hrs / 24)}d`
}
