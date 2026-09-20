import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Classified, DM, RunResult } from './types'

const file = (...p: string[]) => path.join(process.cwd(), 'data', ...p)

export const readDms = async (): Promise<DM[]> => JSON.parse(await readFile(file('dms.json'), 'utf8'))

/** The committed run. Written by `npm run classify` and by POST /api/classify. */
export async function readResults(): Promise<RunResult | null> {
  for (const p of [file('results.json'), file('fixtures', 'results.sample.json')]) {
    try {
      return JSON.parse(await readFile(p, 'utf8')) as RunResult
    } catch {
      continue
    }
  }
  return null
}

export async function writeResults(run: RunResult): Promise<void> {
  try {
    await writeFile(file('results.json'), JSON.stringify(run, null, 2) + '\n', 'utf8')
  } catch {
    // Read-only filesystem in a deployed environment: the run still returns.
  }
}

export const byId = (rows: Classified[]) => new Map(rows.map((r) => [r.id, r]))
