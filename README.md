# Operation Shade — Maya · Inbox Triage

Maya Rao is a London beauty creator with 50K followers and no team. ~4,800 Instagram and
TikTok DMs a month, 70+ hours replying, most of them variations of the same dozen
questions. Her value is her judgement, not her follower count.

This is an inbox triage console. A classification model reads every DM and returns typed
answers with probabilities; code routes each message into one of four lanes and attaches a
draft written from Maya's own decision tree. She reviews. **Nothing sends without her.**

## Getting started

```bash
npm install
npm run dev
```

## The contract

`lib/types.ts` is frozen. Endpoints:

| Method | Route | Body | Returns |
| --- | --- | --- | --- |
| `POST` | `/api/classify` | `{ mode: 'all' \| 'unclassified' }` | `RunResult` |
| `GET` | `/api/results` | — | `RunResult` (cached, works offline) |
| `POST` | `/api/ask` | `{ text: string }` | `Classified` |

The UI builds against `data/fixtures/results.sample.json` until the API is live.

## Running the inbox

Put your TypeSafe key in `.env.local` (gitignored):

```
TYPESAFE_API_KEY=sk-...
```

```bash
npm run classify            # whole inbox through Jev -> data/results.json
npm run classify -- --limit 20   # cheap smoke test
npm run gold                # the 30 hand-labelled messages, lane/intent/skin accuracy
npm run dms                 # regenerate the message corpus
```

`data/results.json` is committed, so `GET /api/results` and the console work with
the network off and with no key present.

### How a message is judged

One Jev request per message, nine questions evaluated in parallel against the same
state (`lib/jev.ts`). Eight of the answers are the frozen `JevAnswers`; the ninth,
`is_reaction`, is a safety net the routing reads and the console never shows.
Domain rules live in each question's `criteria`, not in a prompt.

`lib/lanes.ts` turns answers into a lane at a threshold (0.70 by default) and
exports `rebucket()` — the same rule, pure, for the console's confidence slider,
so nothing jumps when the slider passes 0.70. `lib/routing.ts` is Maya's decision
tree: recurring questions first, then her shelf by category. It holds the retinol
block (a retinoid question with a reaction, a prescription, a condition or someone
under 18 in it never gets a drafted answer), the Glass Drop skip line, and the
intake question when the skin type is unknown. No draft is ever generated — if the
tree has no branch, the message goes to her with a `why`.

## Fixture

Generated, not hand-typed — edit the spec, regenerate the JSON:

```bash
node scripts/gen-fixture.mjs > data/fixtures/results.sample.json
```

15 rows: the twelve case-file intercepts (each has a `persona` — that field is what the
"Sample 12" tab filters on) plus a brand pitch, a spam and a payday DM. Covers a
dry-skin recommendation with a draft, a life event with a `why`, a skin reaction, and one
message where both signals come back weak.

See `AGENTS.md` for ownership boundaries, lane rules and house language.
