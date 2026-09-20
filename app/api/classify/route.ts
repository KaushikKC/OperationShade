import { MAX_ROWS, parseDms } from '@/lib/csv'
import { apiKey, QUESTION_COUNT, runInbox } from '@/lib/run'
import { byId, readDms, readResults, writeInbox, writeResults } from '@/lib/store'
import type { Classified, RunResult } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * POST { mode: 'all' | 'unclassified', csv?: string } -> RunResult.
 * Caches to data/results.json. When a csv is sent it becomes the inbox first,
 * and the run starts from a clean slate rather than merging into the last one.
 */
export async function POST(req: Request) {
  let mode: 'all' | 'unclassified' = 'all'
  let csv = ''
  try {
    const body = await req.json()
    if (body?.mode === 'unclassified') mode = 'unclassified'
    if (typeof body?.csv === 'string') csv = body.csv
  } catch {
    // No body is the same as { mode: 'all' }.
  }

  if (csv) {
    const parsed = parseDms(csv)
    if (!parsed.dms.length) {
      return Response.json(
        { error: "Couldn't find any messages in that file. It needs a column of message text — a header called text, message or body helps." },
        { status: 422 },
      )
    }
    await writeInbox(parsed.dms)
    mode = 'all'
    console.info(
      `[classify] read ${parsed.dms.length} messages from an upload` +
        (parsed.skipped ? `, skipped ${parsed.skipped} empty` : '') +
        (parsed.truncated ? `, ignored ${parsed.truncated} past the ${MAX_ROWS} cap` : '') +
        (parsed.headerless ? ' (no header row recognised)' : ''),
    )
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
