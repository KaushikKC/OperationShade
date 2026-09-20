// FROZEN CONTRACT — agreed 0:15. Import from here, do not edit.
// Both halves of the build (data/classifier/routing and the console UI) depend
// on these shapes being stable.

export type DM = {
  id: string
  handle: string
  platform: 'ig' | 'tt'
  text: string
  /** Case-file persona. Present only on the twelve real intercepts. */
  persona?: string
  ts: string
}

export type Choice = {
  choice: string
  confidence: number
  probabilities: Record<string, number>
}

export type ScoreAns = {
  score: number
  confidence: number
}

export type JevAnswers = {
  intent: Choice
  skin_type: Choice
  budget_band: Choice
  purchase_intent: ScoreAns
  needs_maya_personally: number
  answerable_by_routing: number
  urgency: ScoreAns
  names_shelf_product: number
}

export type Lane = 'voice' | 'maya' | 'intent' | 'noise'

export type Classified = DM & {
  answers: JevAnswers
  lane: Lane
  draft?: string
  why?: string
}

export type RunResult = {
  results: Classified[]
  stats: { count: number; ms: number; costUsd: number; decisions: number }
}

// --- API shape (agreed, not frozen beyond the payloads above) -----------------
// POST /api/classify  { mode: 'all' | 'unclassified' }  -> RunResult
// GET  /api/results                                     -> RunResult (cached, works offline)
// POST /api/ask       { text: string }                  -> Classified
