# Maya Inbox Triage — 4-hour demo plan (Jev / TypeSafe) — v2

## Verdict

**Feasible in 4 hours** scoped as: *synthetic DM inbox → Jev classifies every DM in one fan-out call → video-style rules/run/results UI, re-skinned for Maya, with drafted replies pulled from her own decision tree.* Not feasible in 4h: live Instagram/TikTok inbox (Meta app review) — import CSV/JSON and say so.

Hard prerequisite: **a TypeSafe API key** (`POST https://api.typesafe.ai/v1/systemone`, `Authorization: Bearer`, model `jev-latest`, Python SDK `typesafe-sdk`). Verify a curl works *before* the clock starts. The video says Jev is also on Vercel AI Gateway / OpenRouter — unverified, plan B only. Plan C: mock classifier so the UI still demos.

---

## What the case file is really looking for (full 17-page pass)

### The brief (p2) — judged on
1. Value to a real audience member  2. Fidelity to Maya's voice  3. Use of the evidence  4. Does it work.
Deliverable: a working demo shown in **under a minute. Not a deck.** Checkpoints: 16:00 intel drop, 17:00 Maya walks in, 20:00 pitch (90s, product first).
**Standing order:** no LLM required, *no extra points for complexity*, winner = best understands Maya + creates real value for her audience.

### Clues to use (evidence → how the demo uses it)
| Page | Clue | Use it |
|---|---|---|
| p3 | Asset is **judgement, not follower count**; she says what is *not* worth buying; voice = dry, funny, decisive; pet peeve = generic automation | Drafts must include a "skip this" line; every draft sounds like her; never call it a bot |
| p4 | 6 personas; **Alex the silent browser "may be the most valuable"** | Personas seed the synthetic inbox; "High-intent" lane + shareable card serve Alex |
| p5 | 12 intercepts; underlying language = **"what would Maya do?"** | These 12 are the label taxonomy *and* the "Sample 12" tab in the UI — judges recognise them instantly |
| p6 | Her intake Qs (skin type / using now / hate about it / budget / finish); routing DRY→Cloud Cream+Barrier Oil, OILY→Daily Gel, SENSITIVE→avoid fragrance, REDNESS→Red Reset, shade→ask current foundation; **"200 questions a day"**; **"DO NOT RECOMMEND RETINOL TO EVERYONE"**; fav moisturiser nicknamed **"the good one"** | Routing table shown in the sidebar; intake Qs become the clarifying reply when skin type = unknown; retinol hard-block; "the good one" appears in a draft |
| p7 | **5-minute morning routine**: lowest views (18K), highest saves (4.6K), **317 affiliate conversions**. "Read behaviour, not vanity metric" | Attach that post to "constraint / busy" drafts; cite the number in the pitch |
| p8 | Shelf with Maya scores + one-line notes; **Glass Drop £62: "Good. Not £62 good."**; "Maya is not a database" | Notes are verbatim reply fragments; Glass Drop is the built-in "skip" line for £60+ budgets |
| p9 | 38,421 comments → 11,804 product Qs → 6,219 "what should I buy" → **1,847 answered personally**; journeys with 4–19 day lags | Pitch stat: she personally reaches ~30% of buy-intent questions; follow-up reminders for delayed intent |
| p10 | Voice note: **"I do not want to stop talking to my audience… just not the same question 400 times… feel like they are still getting my recommendation"** | Product principle: leverage, not less relationship. Quote it in the 30s target |
| p11 | Lip liner = her "5 minutes" look; receipt with an item crossed out twice; mirror: **"You are not the user"**; sticky: **"People do not need more products. They need confidence."** | Fewer recommendations per draft (max 2); recommend against things; design for Emily/Priya/Hannah, not for you |
| p12 | Discounted leads (see don'ts) | Ensure you're not building the thing they've pre-rejected |
| p14–15 | **16:00 drop**: DMers are not her best buyers — 61% of repeat buyers sent no DM; top savers convert 2.4×; 41% arrived via a friend's share; 4.6-day lag. "How do we help someone decide confidently *before* they need to ask Maya?" | Pre-build a **shareable "What would Maya do?" card** — same Jev+routing engine, public-facing, one-link share. Reveal it when the drop opens |
| p16 | Judges ask: would you use / trust with your audience / share / what feels like work / **what feels like you**. Don't ask "do you like our app?" — ask about observed behaviour | Structure the demo around those 5 questions; when Maya walks in at 17:00, watch her use it and ask about behaviour |
| p17 | 90s: target → heist → score. Final line: **"Maya no longer needs to ___ because ___."** | Script below |

### Things it explicitly asks you NOT to do
- **Don't build a literal DM bot** (p12: "handles volume, not judgement"). Position as *triage + her judgement carried*, humans-in-loop, nothing auto-sends below confidence threshold.
- **Don't make her audience feel handed to a machine** (p2) / **no generic automation** (p3). Drafts use her words and shelf notes, not templates that read like a brand.
- **Don't recommend retinol to everyone** (p6) — hard rule in routing code.
- **Don't push the £62 serum** (p8, p12) — she likes it, wouldn't recommend paying for it.
- **Don't chase the 74K-view post** (p12) — reach ≠ commerce; use the 5-min routine instead.
- **Don't over-serve the loud customer** (p12: 14-min voice note ≠ high value) — the "Needs Maya" lane sorts by urgency + intent, not by message length.
- **Don't design for yourself** (p11 "You are not the user").
- **Don't add products** (p11 "they need confidence") — max 2 recs per draft, always with a reason and a skip.
- **No deck, no complexity points** (p2), **don't ask "do you like our app?"** (p16).
- Don't use an LLM where code will do (p2 standing order) — Jev decides, code routes, her words reply.

---

## Product: "Maya · Inbox Triage" (+ shareable card at 16:00)

Mockup: `maya-jev-ui-preview.html` (attached earlier). Layout mirrors the video's playground:

- **Left — Classification rules:** one card per Jev question (type badge choice/score/noul, instructions, criteria chips, confidence threshold, on/off toggle, "+ Add question"). Below it, **Maya's routing** from the notebook, incl. the retinol block.
- **Top — Run bar:** dataset, model `jev-latest`, mode (Redo everything / only unclassified), ▶ Run, live stats: DMs, wall time, cost, decisions made, **hours saved/month**.
- **Centre — Four lanes** (computed in code from answers + confidence):
  1. **Answer in Maya's voice** — routable ≥ 0.70 and needs-Maya < 0.40 → draft attached, one tap to send.
  2. **Needs Maya** — judgement / trust / life event / *any* low-confidence split → sorted by urgency, with a one-line "why".
  3. **High-intent signals** — purchase intent ≥ 2, delayed intent, named product → follow-up reminders, no reply needed now.
  4. **Noise** — brand pitches, spam → collapsed/filed.
- **Table:** From · Message · Jev answers (chips with probability bars) · Lane · Draft or why. Tabs: All / Low confidence / Urgent / **Sample 12 (case file)**.
- **16:00 add-on — "What would Maya do?" card:** public page; a follower types their question; same Jev call + routing returns Maya's pick in her voice, or "this one's for Maya — she'll see it". One-link share (serves the 41% friend-share and the silent savers).

### Jev question schema (one call per DM, all questions parallel)
| key | type | criteria |
|---|---|---|
| `intent` | choice | shade_info · recommendation · pick_one · value_check · routine_context · skin_diagnosis · trust_or_fan · life_event · constraint_routine · delayed_intent · brand_pitch · spam |
| `skin_type` | choice | dry · oily_combo · sensitive · redness · unknown |
| `budget_band` | choice | none · under_30 · 30_to_60 · over_60 |
| `purchase_intent` | score | browsing → curious → ready → buying now / payday |
| `needs_maya_personally` | noul | only Maya's own judgement or voice answers this well |
| `answerable_by_routing` | noul | answerable from skin type + budget via her routing |
| `urgency` | score | none → soon → event within days |
| `names_shelf_product` | noul | mentions one of the 10 shelf products |

Keep questions atomic (docs: decompose, combine in code). Tune criteria wording for 20 min against ~30 hand-labelled DMs.

### Voice rules for drafts (code, not LLM)
- Max 2 products, each with her shelf note ("Cloud Cream — winter skin saviour").
- Always one "skip" or "don't bother" line where budget ≥ £60 (Glass Drop).
- Unknown skin type → ask *one* of her intake questions, her way ("tight after washing or shiny by lunch?").
- Short sentences, no emojis, no "Hey babe!", no exclamation stacks. Decisive: "That's your £60 done."
- SPF 50 is "non-negotiable"; "the good one" = Cloud Cream.

---

## Timeline (4h)

| Time | Work | Done when |
|---|---|---|
| 0:00–0:20 | Scaffold Next.js + Tailwind; curl Jev with one DM; commit question schema | one real Jev response in terminal |
| 0:20–0:55 | Synthetic inbox: 200–300 DMs seeded from 12 intercepts × 6 personas (+ brand pitches/spam); include the 12 verbatim; hand-label 30 | `dms.json` |
| 0:55–1:35 | `/api/classify`: concurrency 10, retry, cache results to disk; tune criteria on the 30 | full run < 10s, labels sane |
| 1:35–2:35 | UI per mockup: rule cards (read-only), run bar + stats, lanes, table, Sample-12 tab | looks like the mockup |
| 2:35–3:05 | Routing → drafts in her voice; "why" lines for Needs Maya; retinol/Glass Drop rules | click a DM → label, confidence, draft |
| 3:05–3:35 | "What would Maya do?" shareable card (same API, one page) — hidden until 16:00 | one follower question → pick or "for Maya" |
| 3:35–4:00 | Buffer: precomputed results fallback, 90s script rehearsal, offline mode | demo survives API outage |

**Cut order if behind:** editable rule cards → shareable card → live re-run (precomputed) → cost display. Never cut: lanes, drafts in her voice, Sample-12 tab.

---

## Two-person split (same GitHub repo)

**Principle:** agree the data contract in the first 15 minutes, then split *backend/data* vs *UI* along the folder boundary so neither blocks the other. The UI is built against a committed fixture file, not the live API, until integration.

### 0:00–0:15 — together (one laptop, one commit to `main`)
1. `npx create-next-app` (TS + Tailwind), push to `main`.
2. Write and commit `lib/types.ts` — **frozen after this**:
   ```ts
   type DM = { id: string; handle: string; platform: 'ig'|'tt'; text: string; persona?: string; ts: string }
   type JevAnswers = { intent: Choice; skin_type: Choice; budget_band: Choice; purchase_intent: ScoreAns;
                       needs_maya_personally: number; answerable_by_routing: number; urgency: ScoreAns; names_shelf_product: number }
   type Choice = { choice: string; confidence: number; probabilities: Record<string, number> }
   type ScoreAns = { score: number; confidence: number }
   type Lane = 'voice'|'maya'|'intent'|'noise'
   type Classified = DM & { answers: JevAnswers; lane: Lane; draft?: string; why?: string }
   type RunResult = { results: Classified[]; stats: { count: number; ms: number; costUsd: number; decisions: number } }
   ```
3. Commit `data/fixtures/results.sample.json` — 15 hand-written `Classified` rows (the 12 intercepts + a brand pitch + a spam + a payday DM). This is what the UI dev builds against.
4. Agree the API shape: `POST /api/classify { mode: 'all'|'unclassified' } → RunResult` and `GET /api/results → RunResult`.

### Person A — data, Jev, routing (`/data`, `/lib`, `/app/api`)
| Time | Task |
|---|---|
| 0:15–0:50 | Generate `data/dms.json` (200–300 DMs, 12 intercepts verbatim, 6 personas, noise). Hand-label 30 in `data/gold.json`. |
| 0:50–1:35 | `lib/jev.ts` (client, question schema, concurrency 10, retry) → `app/api/classify/route.ts` caches to `data/results.json`. Tune criteria against gold. |
| 1:35–2:30 | `lib/lanes.ts` (thresholds → Lane), `lib/routing.ts` (Maya's tree → draft, retinol block, Glass Drop skip, intake question when skin unknown), `why` lines. |
| 2:30–3:05 | Run full inbox, commit `data/results.json`; script `npm run classify` for offline mode. |
| 3:05–3:35 | `app/api/ask/route.ts` for the shareable card (single DM in → Classified out). |

### Person B — UI (`/app/(ui)`, `/components`)
| Time | Task |
|---|---|
| 0:15–1:15 | Layout shell from the mockup: header, rules sidebar (cards from a static `questions.ts` mirror), run bar, lanes, table. Reads `results.sample.json` via a `useResults()` hook with a `MOCK=1` switch. |
| 1:15–2:00 | Table details: chips with probability bars, lane tags, draft/why column, tabs (All / Low confidence / Urgent / Sample 12), search, lane filter. |
| 2:00–2:30 | Run bar wired to `POST /api/classify` with progress + stats; empty/loading/error states; offline fallback to `GET /api/results`. |
| 2:30–3:05 | Polish: Maya branding, voice, "hours saved" calc, DM detail drawer. |
| 3:05–3:35 | `app/ask/page.tsx` — "What would Maya do?" card UI calling `/api/ask`. |

### Integration & git rules
- **Branches:** `a/backend`, `b/ui`; small PRs into `main` every 30–45 min; rebase before opening. No one edits the other's folders; the only shared files (`lib/types.ts`, `data/fixtures/*`) are edited by A and announced.
- **Sync points:** 1:35 (A's API returns real `RunResult` — B swaps `MOCK=0` locally), 2:30 (first end-to-end run on `main`), 3:35 (freeze, both on `main`, rehearse).
- **If A slips:** B keeps shipping against fixtures; demo can run on `results.json` with a fake timer. **If B slips:** A's `npm run classify` prints lane counts in terminal — a worse demo but a working one.
- 3:35–4:00 together: precomputed fallback, 90s script, one dry run each.

## Risks / honest limits
- API access is the only thing that kills this — verify first.
- Jev doesn't write text; drafts are code + her words. That's a feature under this brief — say it out loud.
- Synthetic data: say so; fidelity to her voice outweighs volume.
- Video's "1,000 in 6s" needed parallelism — build concurrency from the start.
- Case file says 4.8K DMs/month (not 800); pick one number and be consistent.

## Demo script (90s, p17 format)
- **Target (30s):** "4,800 DMs a month, 70 hours, one person. Most are the same 12 questions in different words. She said it herself: 'I don't want to stop talking to my audience — I just don't want to answer the same question 400 times.'"
- **Heist (90s):** hit Run on 300 DMs → seconds → lanes fill. Open @gracelee: Jev says dry + redness, £60 → Cloud Cream + Red Reset, "skip the £62 one." Open @kate (first date Friday) → Needs Maya, urgent, why. Flip to the shareable card: a friend types "oily, £25, 5 minutes" → Daily Gel + SPF, done — before she ever DMs.
- **Score (60s):** "62% never needed her keyboard. 9% were buyers she'd have missed. Nothing sends below her confidence bar. **Maya no longer needs to answer the same question 400 times because her judgement now answers it in her voice — and only the judgement calls reach her.**"

## At 17:00 when Maya walks in
Don't demo *at* her. Hand her the inbox, watch: does she edit a draft (voice miss?), does she open Needs Maya first (trust?), does she share the card (share?). Then ask the p16 questions about what you saw.