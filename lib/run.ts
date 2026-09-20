import { askJevAll, costOf, QUESTIONS } from './jev'
import { route } from './routing'
import type { Classified, DM, RunResult } from './types'

export const QUESTION_COUNT = Object.keys(QUESTIONS).length

export function apiKey(): string {
  const key = process.env.TYPESAFE_API_KEY
  if (!key) throw new Error('TYPESAFE_API_KEY is not set. Put it in .env.local and restart.')
  return key
}

/** Classify a batch and route each answer into a lane with a draft or a why. */
export async function runInbox(
  dms: DM[],
  key: string,
  opts: { onDone?: (done: number, total: number) => void; signal?: AbortSignal } = {},
): Promise<{ rows: Classified[]; failures: Map<string, string>; stats: RunResult['stats'] }> {
  const started = Date.now()
  const { results, failures, inputTokens } = await askJevAll(dms, key, { concurrency: 10, ...opts })
  const rows: Classified[] = []
  for (const dm of dms) {
    const result = results.get(dm.id)
    if (!result) continue
    const routed = route(dm, result.answers, result.signals)
    rows.push({ ...dm, answers: result.answers, ...routed })
  }
  return {
    rows,
    failures,
    stats: {
      count: rows.length,
      ms: Date.now() - started,
      costUsd: costOf(inputTokens),
      decisions: rows.length * QUESTION_COUNT,
    },
  }
}
