import { readResults } from '@/lib/store'

export const runtime = 'nodejs'

/** GET -> the last run, from disk. No key needed, works with the network off. */
export async function GET() {
  const run = await readResults()
  if (!run) return Response.json({ error: 'No run on disk yet. Run npm run classify.' }, { status: 404 })
  return Response.json(run, { headers: { 'cache-control': 'no-store' } })
}
