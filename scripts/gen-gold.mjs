// Hand labels. Thirty messages read and judged by a person, used to tune the
// question criteria — not generated. Lane is the call Maya would make.
// node scripts/gen-gold.mjs > data/gold.json
import { readFileSync } from 'node:fs'
const dms = JSON.parse(readFileSync(new URL('../data/dms.json', import.meta.url), 'utf8'))

// [id, lane, intent, skin_type (only where the message states it), note]
const LABELS = [
  ['dm_001', 'voice', 'value_check', 'dry', 'Flaking under foundation, names the Cloud Cream. Straight routing answer.'],
  ['dm_002', 'maya', 'life_event', null, 'Bereavement and a wedding. Nothing on the shelf answers this.'],
  ['dm_003', 'maya', 'skin_diagnosis', 'sensitive', 'Raw, hot, stinging, on retinol. Two of her hard rules at once.'],
  ['dm_004', 'voice', 'value_check', null, 'Glass Drop dupe hunt. Her routing has a settled answer: not £62 good.'],
  ['dm_005', 'voice', 'shade_info', null, 'Shade question. Her answer is always the same question back.'],
  ['dm_006', 'maya', null, null, 'No product, no skin type, no question. Nothing to answer from.'],
  ['dm_007', 'voice', 'recommendation', 'oily_combo', 'Fifteen, £20, oily t-zone. Daily Gel and stop there.'],
  ['dm_008', 'maya', 'recommendation', 'redness', 'Asks what is still safe to buy, but she is on prescription treatment — the lane is what matters here.'],
  ['dm_009', 'voice', 'recommendation', 'oily_combo', 'Gift, oily skin, £40. Routing covers it.'],
  ['dm_010', 'voice', 'routine_context', 'dry', 'Owns both, wants the order. Pure routing.'],
  ['dm_011', 'voice', 'value_check', null, 'The Glass Drop at £62. Good. Not £62 good.'],
  ['dm_012', 'intent', 'delayed_intent', null, 'Rebuilding next month. Nothing to reply to today.'],
  ['dm_183', 'voice', 'shade_info', null, 'Shade from another brand. Ask what she wears now.'],
  ['dm_069', 'voice', 'constraint_routine', null, 'Five minutes. The routine she already filmed.'],
  ['dm_202', 'voice', 'constraint_routine', null, 'Night shifts, no time, no money. Same answer.'],
  ['dm_035', 'maya', 'life_event', null, 'Wedding in six weeks and panicking.'],
  ['dm_173', 'maya', 'life_event', 'oily_combo', 'Ten weeks post-partum. Hers, not the shelf.'],
  ['dm_157', 'maya', 'skin_diagnosis', null, 'Burning on application. Something is wrong now.'],
  ['dm_152', 'maya', 'skin_diagnosis', null, 'Red and hot after Red Reset — a reaction to her own shelf.'],
  ['dm_172', 'maya', 'skin_diagnosis', null, 'Retinal reaction. Retinol block and a reaction together.'],
  ['dm_154', 'maya', 'skin_diagnosis', null, 'Sore flaking eyelids with a wedding coming.'],
  ['dm_082', 'voice', 'value_check', null, 'Glass Drop, £62, asked plainly. The skip line.'],
  ['dm_179', 'maya', 'pick_one', null, 'A real choice, but she led with trust. Trust goes to Maya.'],
  ['dm_042', 'voice', 'routine_context', 'redness', 'Owns both, wants the order.'],
  ['dm_189', 'maya', 'trust_or_fan', null, 'Thank you for telling her not to buy something. She should see it.'],
  ['dm_129', 'intent', 'delayed_intent', null, 'Buying the routine bit by bit. No question in it.'],
  ['dm_136', 'intent', 'delayed_intent', 'oily_combo', 'Saved up, waiting for payday.'],
  ['dm_247', 'noise', 'brand_pitch', null, 'Gifting-only cooperation pitch.'],
  ['dm_223', 'noise', 'spam', null, 'Phishing.'],
  ['dm_230', 'noise', 'brand_pitch', null, 'Rate card pitch.'],
]

const byId = new Map(dms.map((d) => [d.id, d]))
const gold = LABELS.map(([id, lane, intent, skin_type, note]) => {
  const dm = byId.get(id)
  if (!dm) throw new Error(`gold references a message that is not in the corpus: ${id}`)
  return { id, text: dm.text, lane, ...(intent ? { intent } : {}), ...(skin_type ? { skin_type } : {}), note }
})
process.stdout.write(JSON.stringify(gold, null, 2) + '\n')
