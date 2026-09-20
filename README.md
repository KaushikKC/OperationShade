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

`npm run gold` scores the hand labels — thirty-three messages, the twelve E-01
intercepts carrying the case file's own category as their intent label. The
threshold is swept, not chosen: 32/33 at 0.40, 31/33 from 0.45 to 0.55, 25/33 at
0.70. It sits at 0.50, mid-plateau.

Two questions were rewritten after reading the answers back, and both changes
were product decisions rather than prompt tweaks:

- **`answerable_by_routing`** was described as a product table, so Jev read *"is
  the Cloud Cream worth £38"* as uncovered. Rewritten as what she actually
  answers, it separates.
- **`needs_maya_personally`** was asking whether the message needs Maya's
  judgement. Everything does — *"what would YOU buy"* scored 0.5+ and went to her
  pile. But carrying that judgement is the whole product (E-06). The question now
  asks whether it needs Maya *herself*: a message where a correct product answer
  would still be the wrong reply.

Jev is not deterministic, so rows within about 0.05 of the bar change lane
between runs. Every one of them fails toward Maya rather than into a draft.

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
