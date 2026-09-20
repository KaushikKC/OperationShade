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

`lib/lanes.ts` turns answers into a lane and exports one shared rule,
`readyToSend()`, used by the lanes, the routing and the console's slider through
`rebucket()`. A draft goes out only when her routing covers it *and* it is not
the kind of thing she answers herself — two sides, because a message can be both
routable and hers, and when it is, she gets it.

`lib/routing.ts` is Maya's decision tree, keyed on skin type the way her notebook
is: dry gets Cloud Cream and the Barrier Oil, oily or combination gets the Daily
Gel, sensitive gets nothing with fragrance, redness gets Red Reset. Two products
per reply maximum. Anyone over £60 hears the Glass Drop line — good, not £62
good. Shade questions are never answered blind. SPF 50 goes on every routine.
Retinol is blocked: no draft recommends it, and a retinoid question with a
reaction, a prescription, a condition or someone under 18 in it goes to her
untouched. Nothing is generated — if the tree has no branch, she gets it with a
`why`.

### Calibration

`npm run gold` scores the thirty hand labels. Current: **lane 29/30, intent 27/29,
skin 9/9.** The threshold is swept, not chosen — accuracy is flat at 29/30 from
0.40 to 0.65 and falls off above, so the default sits at 0.60 in the middle of
that plateau. Jev answers the routing question in a lower band than a plain
reading of it suggests.

Two things worth knowing. Jev is not deterministic, so rows sitting within about
0.05 of the bar change lane between runs; every one of them fails toward Maya
rather than into a draft. And the corpus is synthetic: reactions are about 13% of
it, which is higher than a real inbox and pushes Needs you up accordingly.

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
