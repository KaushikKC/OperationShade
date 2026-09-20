import type { DM } from './types'

/**
 * Maya exports her DMs and drops the file in. There is no Instagram API here,
 * so the CSV is the inbox. Real exports are messy — quoted commas, line breaks
 * inside a message, a BOM from Excel, columns in any order, headers named
 * whatever the tool felt like. Parse defensively and never throw on a bad row.
 */

/** One row at a time, honouring quotes and newlines inside a field. */
function rows(csv: string): string[][] {
  const out: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  const text = csv.replace(/^﻿/, '').replace(/\r\n?/g, '\n')

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else quoted = false
      } else field += c
      continue
    }
    if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); out.push(row); row = []; field = '' }
    else field += c
  }
  row.push(field)
  if (row.some((f) => f.trim() !== '')) out.push(row)
  return out
}

const ALIASES: Record<keyof ParsedFields, string[]> = {
  text: ['text', 'message', 'body', 'content', 'dm', 'caption', 'comment'],
  handle: ['handle', 'username', 'user', 'from', 'sender', 'account', 'name'],
  platform: ['platform', 'source', 'channel', 'network', 'app'],
  ts: ['ts', 'timestamp', 'date', 'time', 'sent_at', 'created_at', 'received'],
  persona: ['persona', 'category', 'label', 'segment', 'type', 'tag'],
  id: ['id', 'message_id', 'dm_id', 'ref'],
}
type ParsedFields = { text: number; handle: number; platform: number; ts: number; persona: number; id: number }

const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

function mapHeader(header: string[]): ParsedFields | null {
  const cells = header.map(norm)
  const find = (names: string[]) => cells.findIndex((c) => names.includes(c))
  const fields = {
    text: find(ALIASES.text),
    handle: find(ALIASES.handle),
    platform: find(ALIASES.platform),
    ts: find(ALIASES.ts),
    persona: find(ALIASES.persona),
    id: find(ALIASES.id),
  }
  return fields.text === -1 ? null : fields
}

const PLATFORMS: Record<string, 'ig' | 'tt'> = {
  ig: 'ig', instagram: 'ig', insta: 'ig', gram: 'ig',
  tt: 'tt', tiktok: 'tt', tik_tok: 'tt',
}

/** Anything that is not clearly a date becomes "now", so a row is never lost to it. */
function when(raw: string | undefined, fallbackIndex: number): string {
  const t = raw ? Date.parse(raw) : NaN
  if (Number.isFinite(t)) return new Date(t).toISOString()
  return new Date(Date.now() - fallbackIndex * 60_000).toISOString()
}

export type ParseReport = {
  dms: DM[]
  /** Rows that had no message text in them. */
  skipped: number
  /** True when the file had no usable header and each line was read as a message. */
  headerless: boolean
  truncated: number
}

/** A run of this size is about a minute and a few pence. Guards against a stray 50k-row export. */
export const MAX_ROWS = 1500

export function parseDms(csv: string): ParseReport {
  const grid = rows(csv)
  if (!grid.length) return { dms: [], skipped: 0, headerless: false, truncated: 0 }

  const fields = mapHeader(grid[0])
  const body = fields ? grid.slice(1) : grid
  const headerless = !fields
  const dms: DM[] = []
  let skipped = 0

  body.forEach((cells, i) => {
    // No header we recognise: take the longest cell in the row as the message.
    const text = (fields ? cells[fields.text] : [...cells].sort((a, b) => b.length - a.length)[0] ?? '').trim()
    if (!text) { skipped += 1; return }

    const at = (idx: number) => (idx >= 0 ? (cells[idx] ?? '').trim() : '')
    const rawHandle = fields ? at(fields.handle) : ''
    const rawPlatform = norm(fields ? at(fields.platform) : '')
    const rawId = fields ? at(fields.id) : ''
    const persona = fields ? at(fields.persona) : ''

    dms.push({
      id: rawId || `up_${String(dms.length + 1).padStart(4, '0')}`,
      handle: (rawHandle || 'unknown').replace(/^@/, ''),
      platform: PLATFORMS[rawPlatform] ?? 'ig',
      text,
      ...(persona ? { persona } : {}),
      ts: when(fields ? at(fields.ts) : '', i),
    })
  })

  const truncated = Math.max(0, dms.length - MAX_ROWS)
  return { dms: dms.slice(0, MAX_ROWS), skipped, headerless, truncated }
}

/** The other direction, so the committed inbox can be handed out as a sample export. */
export function toCsv(dms: DM[]): string {
  const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  const head = 'handle,platform,text,persona,received'
  const lines = dms.map((d) => [d.handle, d.platform === 'ig' ? 'instagram' : 'tiktok', d.text, d.persona ?? '', d.ts].map(cell).join(','))
  return [head, ...lines].join('\n') + '\n'
}
