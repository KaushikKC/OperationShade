// Hand labels. Thirty messages read and judged by a person, used to tune the
// question criteria — not generated. Lane is the call Maya would make.
// node scripts/gen-gold.mjs > data/gold.json
import { readFileSync } from 'node:fs'
const dms = JSON.parse(readFileSync(new URL('../data/dms.json', import.meta.url), 'utf8'))

// [id, lane, intent, skin_type (only where the message states it), note]
const LABELS = [
  // E-01. The lane is our call; the intent is the case file's own label.
  ['dm_001', 'voice', 'info', null, 'E-01.1 INFO. Shade question — E-02.2 says answer it with a question.'],
  ['dm_002', 'voice', 'recommendation', 'dry', 'E-01.2 RECOMMENDATION. Dry + redness + £60, and the two products come to £70.'],
  ['dm_003', 'voice', 'judgement', null, 'E-01.3 JUDGEMENT. Nothing named, so the reply asks which two.'],
  ['dm_004', 'voice', 'value', null, 'E-01.4 VALUE. Cloud Cream at £38, scored 9.2. Settled answer.'],
  ['dm_005', 'voice', 'context', null, 'E-01.5 CONTEXT. Owns the Night Serum, asking if a second is needed.'],
  ['dm_006', 'voice', 'diagnosis', null, 'E-01.6 DIAGNOSIS. She answers this one, she does not escalate it.'],
  ['dm_007', 'maya', 'trust', null, 'E-01.7 TRUST. E-06: this is the part she said she wants to keep.'],
  ['dm_008', 'maya', 'relationship', null, 'E-01.8 RELATIONSHIP. First date Friday. Hers.'],
  ['dm_009', 'voice', 'constraint', null, 'E-01.9 CONSTRAINT. Two products, and she has already filmed it.'],
  ['dm_010', 'intent', 'delayed_intent', null, 'E-01.10 DELAYED INTENT. Nothing to reply to today.'],
  ['dm_011', 'maya', 'transfer_of_trust', null, 'E-01.11 TRANSFER OF TRUST. Explicitly not a beauty question.'],
  ['dm_012', 'voice', 'personalisation', null, 'E-01.12 PERSONALISATION. Skin unknown, so the reply is her intake.'],
  // From the six associates.
  ['dm_020', 'voice', 'value', 'dry', 'Emily. Night Serum at its real price, with a skin signal in front of it.'],
  ['dm_052', 'voice', 'value', null, 'Emily. Red Reset at £32.'],
  ['dm_025', 'voice', 'value', null, 'Emily. "Why is everything £60" — a value question wearing a complaint.'],
  ['dm_096', 'voice', 'judgement', null, 'Sophie. The E-01.3 line again, from someone else.'],
  ['dm_099', 'voice', 'judgement', null, 'Sophie. Glass Drop against Night Serum — she has scores for both.'],
  ['dm_101', 'voice', 'transfer_of_trust', null, 'Sophie asking for her pick, with beauty context in it — unlike E-01.11, which says outright it is not a beauty question.'],
  ['dm_117', 'voice', 'transfer_of_trust', null, 'Sophie. "Forget the brand, what would YOU buy" — this is the product.'],
  ['dm_162', 'voice', 'personalisation', null, 'Hannah. The E-01.12 line.'],
  ['dm_135', 'voice', 'personalisation', 'oily_combo', 'Hannah. 500 versions, and she has stated her skin.'],
  ['dm_194', 'voice', 'constraint', null, 'Grace. Two products, will not do eight steps.'],
  ['dm_192', 'voice', 'constraint', 'oily_combo', 'Grace. No time, no money, oily.'],
  ['dm_186', 'maya', 'relationship', null, 'Grace with a wedding in it. The event outranks the routine.'],
  ['dm_071', 'voice', 'context', null, 'Priya. Owns the Night Serum, asking about a cleanser.'],
  ['dm_073', 'voice', 'info', null, 'Priya. A fact about a product she owns — E-01.1 shape, not a routine question.'],
  ['dm_087', 'voice', 'diagnosis', 'sensitive', 'Priya. Her face freaks out at everything; she needs a starting point.'],
  ['dm_155', 'voice', 'diagnosis', null, 'Hannah. Does not know her skin type.'],
  ['dm_205', 'intent', 'delayed_intent', null, 'Alex. Saved it, buying on payday.'],
  ['dm_211', 'intent', 'delayed_intent', null, 'Alex. Two years silent, rebuilding next month. The most valuable one.'],
  ['dm_229', 'noise', 'spam', null, 'Phishing.'],
  ['dm_250', 'noise', 'brand_pitch', null, 'Gifting pitch.'],
  ['dm_246', 'noise', 'spam', null, 'Bot.'],
]

const byId = new Map(dms.map((d) => [d.id, d]))
const gold = LABELS.map(([id, lane, intent, skin_type, note]) => {
  const dm = byId.get(id)
  if (!dm) throw new Error(`gold references a message that is not in the corpus: ${id}`)
  return { id, text: dm.text, lane, ...(intent ? { intent } : {}), ...(skin_type ? { skin_type } : {}), note }
})
process.stdout.write(JSON.stringify(gold, null, 2) + '\n')
