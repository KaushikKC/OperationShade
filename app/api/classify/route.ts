import { apiKey, QUESTION_COUNT, runInbox } from '@/lib/run'
import { byId, readDms, readResults, writeResults } from '@/lib/store'
import type { Classified, RunResult } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 300

/** POST { mode: 'all' | 'unclassified' } -> RunResult. Caches to data/results.json. */
export async function POST(req: Request) {
  let mode: 'all' | 'unclassified' = 'all'
  try {
    const body = await req.json()
    if (body?.mode === 'unclassified') mode = 'unclassified'
  } catch {
    // No body is the same as { mode: 'all' }.
  }

  let key: string
  try {
    key = apiKey()
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 503 })
  }

  const dms = await readDms()
  const cached = mode === 'unclassified' ? await readResults() : null
  const done = cached ? byId(cached.results) : new Map<string, Classified>()
  const todo = dms.filter((dm) => !done.has(dm.id))

  try {
    const { rows, failures, stats } = await runInbox(todo, key, { signal: req.signal })
    const merged = [...done.values(), ...rows]
    const run: RunResult = {
      results: merged,
      stats: {
        count: merged.length,
        ms: stats.ms,
        costUsd: Number(((cached?.stats.costUsd ?? 0) + stats.costUsd).toFixed(6)),
        decisions: merged.length * QUESTION_COUNT,
      },
    }
    await writeResults(run)
    if (failures.size) console.warn(`[classify] ${failures.size} message(s) failed`, [...failures.entries()].slice(0, 3))
    return Response.json(run)
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 })
  }
}
