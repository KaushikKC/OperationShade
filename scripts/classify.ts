/**
 * npm run classify  — run the whole inbox through Jev and commit the answers to
 * data/results.json, so the console works with the network off.
 *   --limit 20   only the first 20 messages (a cheap smoke test)
 */
import { loadEnv } from './_env'
loadEnv()
import { apiKey, QUESTION_COUNT, runInbox } from '../lib/run'
import { readDms, writeResults } from '../lib/store'
import { LANE_LABELS } from '../lib/lanes'
import type { Lane, RunResult } from '../lib/types'

const arg = (flag: string) => {
  const i = process.argv.indexOf(flag)
  return i === -1 ? undefined : process.argv[i + 1]
}

async function main() {
  const key = apiKey()
  const all = await readDms()
  const limit = Number(arg('--limit') ?? all.length)
  const dms = all.slice(0, Number.isFinite(limit) ? limit : all.length)
  process.stdout.write(`Reading ${dms.length} messages\n`)

  let last = 0
  const { rows, failures, stats } = await runInbox(dms, key, {
    onDone: (done, total) => {
      if (done - last < 10 && done !== total) return
      last = done
      process.stdout.write(`  ${done}/${total}\n`)
    },
  })

  const run: RunResult = { results: rows, stats: { ...stats, count: rows.length, decisions: rows.length * QUESTION_COUNT } }
  await writeResults(run)

  const counts = rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.lane]: (acc[r.lane] ?? 0) + 1 }), {})
  process.stdout.write(`\n${rows.length} read in ${(stats.ms / 1000).toFixed(1)}s · ${stats.decisions} decisions · $${stats.costUsd.toFixed(4)}\n`)
  for (const lane of Object.keys(LANE_LABELS) as Lane[]) {
    process.stdout.write(`  ${LANE_LABELS[lane].padEnd(14)} ${counts[lane] ?? 0}\n`)
  }
  process.stdout.write(`  drafted        ${rows.filter((r) => r.draft).length}\n`)
  if (failures.size) process.stdout.write(`\n${failures.size} failed: ${[...failures.keys()].slice(0, 5).join(', ')}\n`)
  process.stdout.write('\nWritten to data/results.json\n')
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
})
