import { readFileSync } from 'node:fs'
import path from 'node:path'

/** Next loads .env.local on its own; a plain script has to be told. */
export function loadEnv(): void {
  for (const name of ['.env.local', '.env']) {
    let raw: string
    try {
      raw = readFileSync(path.join(process.cwd(), name), 'utf8')
    } catch {
      continue
    }
    for (const line of raw.split('\n')) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
      if (!m) continue
      const value = m[2].replace(/^['"]|['"]$/g, '')
      if (!process.env[m[1]]) process.env[m[1]] = value
    }
  }
}
