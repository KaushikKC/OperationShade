<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Operation Shade — house rules

**Wall clock: the console must be usable by 17:00 today and is frozen at 17:35.** When
behind, ship the lanes, the table and the confidence slider first; the drawer, /ask and
the visual pass come after.

## Ownership (two people working in parallel — do not cross)

| Owner | Paths |
| --- | --- |
| Data / classifier / routing | `lib/`, `data/`, `app/api/` |
| Console UI | `app/` (pages + layout), `components/`, `styles/` |

`lib/types.ts` is **frozen**. Import from it, never edit it.

## Contract

- `POST /api/classify` `{ mode: 'all' \| 'unclassified' }` → `RunResult`
- `GET /api/results` → `RunResult` (cached, works offline)
- `POST /api/ask` `{ text: string }` → `Classified`

Build the UI against `data/fixtures/results.sample.json` through a `useResults()` hook with
a MOCK env switch, so going live is a one-line change. Render defensively — the fixture may
be thin or partially malformed. Never crash on a missing field.

## Lanes (computed server-side, rendered client-side)

| Lane | Label in UI | Contains |
| --- | --- | --- |
| `voice` | Ready to send | Answerable from her routing, high confidence. Has a `draft`. |
| `maya` | Needs you | Judgement calls, life events, reactions, anything low-confidence. Has a `why`, never a `draft`. |
| `intent` | Worth watching | Close to buying. No reply needed now. |
| `noise` | Filed | Brand pitches, spam. Collapsed by default. |

`maya` sorts by `urgency.score` descending, never by message length. `voice` sorts by
`purchase_intent.score` descending.

### For the console (Person B)

- **Import `rebucket(row, threshold)` from `lib/lanes`** for the confidence slider. It is
  pure, it is the same rule the server used, and it already knows that the bar drops when
  the only thing missing is her intake question. Do not reimplement the comparison.
- **Default the slider to 0.60, not 0.70.** The threshold was swept against the thirty
  hand labels: lane accuracy is 29/30 anywhere from 0.40 to 0.65 and drops to 27/30 at
  0.70. Range 0.5–0.95 is unchanged, and dragging it up moves messages into Needs you —
  the safe direction, and visible.
- **A row with no `draft` can never be Ready to send**, whatever the slider says.
  `rebucket()` enforces it; lane counts should go through it.
- `LANE_LABELS` exports the four labels. Use them rather than retyping the strings.
- **Frame the run stats as this sample.** `stats.count` is the 248 messages in
  `data/dms.json`, not her month. "248 read in this sample", then the monthly figure
  separately with its arithmetic visible.

## Language

Maya is the user and she is not a developer. Never use the words **bot**, **AI**,
**automated** or **assistant** anywhere in the interface, and no `choice` / `score` /
`noul` / "criteria" / "run inference" jargon on screen. Nothing ever auto-sends.

## Fixture

`data/fixtures/results.sample.json` is generated, not hand-typed:

```
node scripts/gen-fixture.mjs > data/fixtures/results.sample.json
```

15 rows — the twelve case-file intercepts (the ones with a `persona`, which is what the
**Sample 12** tab filters on) plus a brand pitch, a spam and a payday DM. Edit
`scripts/fixture-spec.mjs`, never the JSON. Its lanes and drafts come from `lib/routing.ts`,
so the fixture behaves exactly like a real run.

`data/results.json` is the committed full run: 248 messages, real Jev answers. `GET
/api/results` serves it with no key and no network.
