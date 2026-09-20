import { askJev } from '@/lib/jev'
import { route } from '@/lib/routing'
import { apiKey } from '@/lib/run'
import type { Classified } from '@/lib/types'

export const runtime = 'nodejs'

/** POST { text } -> Classified. One message, for the page a follower sees. */
export async function POST(req: Request) {
  let text = ''
  try {
    text = String((await req.json())?.text ?? '').trim()
  } catch {
    // Falls through to the empty check.
  }
  if (!text) return Response.json({ error: 'Nothing to answer.' }, { status: 400 })
  if (text.length > 2000) text = text.slice(0, 2000)

  let key: string
  try {
    key = apiKey()
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 503 })
  }

  const dm = { id: `ask_${Date.now().toString(36)}`, handle: 'you', platform: 'ig' as const, text, ts: new Date().toISOString() }
  try {
    const { answers, signals } = await askJev(dm, key, req.signal)
    const routed = route(dm, answers, signals)
    const classified: Classified = { ...dm, answers, ...routed }
    return Response.json(classified)
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 })
  }
}
