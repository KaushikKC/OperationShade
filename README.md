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
