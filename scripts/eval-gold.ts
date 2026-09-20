/**
 * npm run gold — run the thirty hand-labelled messages and show where the
 * questions disagree with the labels. Tune criteria in lib/jev.ts, run again.
 */
import { loadEnv } from './_env'
loadEnv()
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { askJevAll } from '../lib/jev'
import { route } from '../lib/routing'
import { apiKey } from '../lib/run'
import { readCorpus } from '../lib/store'
import type { DM, Lane } from '../lib/types'

type Gold = { id: string; text: string; lane: Lane; intent?: string; skin_type?: string; note: string }

async function main() {
  const key = apiKey()
  const gold: Gold[] = JSON.parse(readFileSync(path.join(process.cwd(), 'data', 'gold.json'), 'utf8'))
  const dms = new Map((await readCorpus()).map((d: DM) => [d.id, d]))
  const subjects = gold.map((g) => dms.get(g.id)).filter((d): d is DM => Boolean(d))
  if (subjects.length < gold.length) {
    const missing = gold.filter((g) => !dms.has(g.id)).map((g) => g.id)
    throw new Error(
      `${missing.length} of ${gold.length} labelled messages are not in data/dms.json (${missing.slice(0, 3).join(', ')}…). ` +
        'Regenerate the corpus with npm run dms, or re-label with scripts/gen-gold.mjs.',
    )
  }

  const { results, failures } = await askJevAll(subjects, key, { concurrency: 10 })
  let laneHits = 0
  let intentHits = 0
  let intentTotal = 0
  let skinHits = 0
  let skinTotal = 0
  const misses: string[] = []

  for (const g of gold) {
    const dm = dms.get(g.id)
    const result = dm && results.get(g.id)
    if (!dm || !result) continue
    const { lane } = route(dm, result.answers, result.signals)
    if (lane === g.lane) laneHits += 1
    else misses.push(`  lane   ${g.id}  expected ${g.lane.padEnd(6)} got ${lane.padEnd(6)}  ${g.text.slice(0, 64)}`)
    if (g.intent) {
      intentTotal += 1
      if (result.answers.intent.choice === g.intent) intentHits += 1
      else misses.push(`  intent ${g.id}  expected ${g.intent.padEnd(16)} got ${result.answers.intent.choice.padEnd(16)} (${result.answers.intent.confidence})`)
    }
    if (g.skin_type) {
      skinTotal += 1
      if (result.answers.skin_type.choice === g.skin_type) skinHits += 1
      else misses.push(`  skin   ${g.id}  expected ${g.skin_type.padEnd(12)} got ${result.answers.skin_type.choice}`)
    }
  }

  const pct = (hit: number, total: number) => `${hit}/${total} (${total ? Math.round((hit / total) * 100) : 0}%)`
  process.stdout.write(`\nlane   ${pct(laneHits, gold.length)}\nintent ${pct(intentHits, intentTotal)}\nskin   ${pct(skinHits, skinTotal)}\n`)
  if (failures.size) process.stdout.write(`failed ${failures.size}\n`)
  if (misses.length) process.stdout.write(`\n${misses.join('\n')}\n`)
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
})
