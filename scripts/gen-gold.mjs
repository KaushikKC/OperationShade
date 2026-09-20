// Hand labels. Thirty messages read and judged by a person, used to tune the
// question criteria — not generated. Lane is the call Maya would make.
// node scripts/gen-gold.mjs > data/gold.json
import { readFileSync } from 'node:fs'
const dms = JSON.parse(readFileSync(new URL('../data/dms.json', import.meta.url), 'utf8'))

// [id, lane, intent, skin_type (only where the message states it), note]
const LABELS = [
  ['dm_001', 'voice', 'product_rec', 'dry', 'Flaking under foundation is a barrier answer she gives constantly.'],
  ['dm_002', 'maya', 'routine_help', null, 'Bereavement and a wedding. Nothing on the shelf answers this.'],
  ['dm_003', 'maya', 'reaction_concern', 'sensitive', 'Raw, hot, stinging. Reaction beats every other signal.'],
  ['dm_004', 'voice', 'dupe_request', null, 'Straight dupe, she has the £13 answer ready.'],
  ['dm_005', 'voice', 'where_to_buy', null, 'UK stockist. Pure lookup.'],
  ['dm_006', 'maya', null, null, 'No product, no skin type, no question. Nothing to answer from — she decides.'],
  ['dm_007', 'voice', 'routine_help', 'combination', 'Fifteen, £20. Her standard two-product answer.'],
  ['dm_008', 'maya', 'routine_help', 'sensitive', 'On prescription rosacea treatment. Not a recommendation.'],
  ['dm_009', 'voice', 'product_rec', 'oily', 'Gift, oily skin, £40. Answerable.'],
  ['dm_010', 'voice', 'routine_help', null, 'Niacinamide + vitamin C myth. She has said this a hundred times.'],
  ['dm_011', 'voice', 'product_rec', null, 'The £62 cream. Her "this month\'s thing" answer.'],
  ['dm_012', 'intent', 'purchase_signal', null, 'Rebuilding next month. Nothing to reply to today.'],
  ['dm_153', 'maya', 'reaction_concern', null, 'Red and hot after retinal. Reaction.'],
  ['dm_175', 'maya', 'reaction_concern', 'sensitive', 'Sore flaking eyelids, cause unknown.'],
  ['dm_180', 'maya', 'reaction_concern', 'sensitive', 'Peeling on retinol with rosacea-ish redness. Retinol block applies.'],
  ['dm_173', 'maya', 'reaction_concern', null, 'Purging or reaction is exactly the call she should make herself.'],
  ['dm_250', 'noise', 'spam', null, 'Phishing.'],
  ['dm_225', 'noise', 'spam', null, 'Crypto.'],
  ['dm_227', 'noise', 'collab_pitch', null, 'Rate card pitch.'],
  ['dm_253', 'noise', 'spam', null, 'Bot follow-back.'],
  ['dm_210', 'voice', 'where_to_buy', null, 'Stockist question with a student-budget aside.'],
  ['dm_094', 'voice', 'dupe_request', null, 'Cheaper toner.'],
  ['dm_089', 'voice', 'dupe_request', null, 'Glass Drop named — the skip line, not a dupe.'],
  ['dm_061', 'voice', 'routine_help', null, 'Seventeen, £35.'],
  ['dm_067', 'voice', 'routine_help', null, 'Too young for retinol. Retinol block: the answer is wait.'],
  ['dm_027', 'voice', 'routine_help', null, 'Oil on top of moisturiser. Standard answer.'],
  ['dm_039', 'voice', 'routine_help', null, 'Doubling up on hyaluronic acid.'],
  ['dm_212', 'voice', 'product_rec', null, 'Did she repurchase. Shelf question.'],
  ['dm_130', 'intent', 'purchase_signal', 'combination', 'Buying the routine bit by bit. No question in it.'],
  ['dm_138', 'intent', 'purchase_signal', null, 'Basket full, paying Thursday. Watch, do not reply.'],
]

const byId = new Map(dms.map((d) => [d.id, d]))
const gold = LABELS.map(([id, lane, intent, skin_type, note]) => {
  const dm = byId.get(id)
  if (!dm) throw new Error(`gold references a message that is not in the corpus: ${id}`)
  return { id, text: dm.text, lane, ...(intent ? { intent } : {}), ...(skin_type ? { skin_type } : {}), note }
})
process.stdout.write(JSON.stringify(gold, null, 2) + '\n')
