import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Classified, DM, RunResult } from './types'

const file = (...p: string[]) => path.join(process.cwd(), 'data', ...p)

/**
 * The working inbox. An uploaded export wins over the committed corpus, so
 * once Maya drops her own file in, every later run reads hers. Her file is
 * gitignored — it is her mail, not ours.
 */
export async function readDms(): Promise<DM[]> {
  for (const p of [file('inbox.json'), file('dms.json')]) {
    try {
      const rows = JSON.parse(await readFile(p, 'utf8'))
      if (Array.isArray(rows) && rows.length) return rows as DM[]
    } catch {
      continue
    }
  }
  return []
}

/** Where an upload lands. Returns false when the filesystem is read-only. */
export async function writeInbox(dms: DM[]): Promise<boolean> {
  try {
    await writeFile(file('inbox.json'), JSON.stringify(dms, null, 2) + '\n', 'utf8')
    return true
  } catch {
    return false
  }
}

/** True when the console is reading an uploaded file rather than the committed one. */
export async function inboxIsUploaded(): Promise<boolean> {
  try {
    await readFile(file('inbox.json'), 'utf8')
    return true
  } catch {
    return false
  }
}

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
