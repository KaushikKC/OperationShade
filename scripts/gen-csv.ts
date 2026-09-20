/**
 * npm run csv — hand the committed inbox out as an export file, so the upload
 * button has something real to take. Same shape a DM export tool would give:
 * one row per message, newest first.
 */
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { toCsv } from '../lib/csv'
import type { DM } from '../lib/types'
import { readFileSync } from 'node:fs'

const dms: DM[] = JSON.parse(readFileSync(path.join(process.cwd(), 'data', 'dms.json'), 'utf8'))
const sorted = [...dms].sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts))
const csv = toCsv(sorted)
// One copy to keep, one served so the console can hand out a file to try.
for (const out of [
  path.join(process.cwd(), 'data', 'exports', 'maya-dms-last-30-days.csv'),
  path.join(process.cwd(), 'public', 'maya-dms-last-30-days.csv'),
]) {
  writeFileSync(out, csv, 'utf8')
  process.stdout.write(`${sorted.length} messages -> ${path.relative(process.cwd(), out)}\n`)
}
