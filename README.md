# Operation Shade — Maya · Inbox Triage

**Live:** https://operation-shade-jano.vercel.app/
**Console:** [`/`](https://operation-shade-jano.vercel.app/) · **Public card:** [`/ask`](https://operation-shade-jano.vercel.app/ask)

---

## The problem

Maya Rao is a London beauty creator. 50K followers, no team, **~4,800 Instagram and TikTok
DMs a month and 70+ hours replying to them**. Most are variations of the same dozen
questions.

Her asset is not her follower count. It is her judgement — she is trusted because she is
specific, honest and willing to say what is not worth buying. Her recorded note is the
brief for this whole build:

> "I genuinely do not want to stop talking to my audience. That is the best part. I just do
> not want to answer the same question 400 times. People follow me because they trust my
> taste. I want them to feel like they are still getting my recommendation, even when I am
> not personally typing the answer."

She is not asking for less relationship. She is asking for leverage. So the product has to
carry her judgement without ever speaking *for* her.

## What this is

A triage console. Every DM is read once, sorted into one of four lanes, and the ones she
answers the same way every time arrive with a reply already written **in her own words,
from her own notebook**. She reads, edits, sends. Nothing sends itself.

| Lane | What lands there |
| --- | --- |
| **Ready to send** | Covered by her routing. A draft is attached. |
| **Needs you** | Judgement calls, life events, reactions, anything the reader was unsure about. Sorted by urgency, never by message length. |
| **Worth watching** | Someone close to buying who asked nothing. No reply needed today. |
| **Filed** | Brand pitches and spam. |

On the last full run of the sample inbox: **188 ready, 32 for her, 10 watching, 38 filed**
out of 268 messages.

### The console

- **Upload your DMs** — there is no Instagram API here, so her export is the inbox. Drop a
  CSV in and it is read and classified on the spot.
- **Review bar** — one slider, `50%` to `95%`. Raising it moves messages out of Ready to
  send and onto her desk. Nothing is re-read and nothing is re-sent; the same answers are
  bucketed again in the browser through the same rule the server used.
- **Your Playbook** — edit a prepared reply, approve your wording, and every message that
  would have had *that same reply* uses yours instead. Reversible, switchable, resettable.
- **Detail drawer** — every answer the reader gave, with its probability distribution.

### The public card (`/ask`)

The 16:00 intelligence drop says the DMers are **not** her best buyers: 61% of repeat
buyers sent no DM at all, top-decile savers convert 2.4×, and **41% of high-value buyers
first met Maya through a share from a friend**, with a median 4.6-day gap before
purchase.

So `/ask` answers the question *before* anyone needs to DM it. The question travels in the
URL, which means a shared link opens the answer rather than a blank box, and it is looked
up fresh on arrival — a link sent today shows what Maya thinks when it is opened four days
later.

---

## Why Jev

**The reply path contains no generated text.** That is the whole architectural decision,
and it follows directly from the brief: her pet peeve is generic automation, and the
failure mode that kills this product is a machine writing in her voice.

An LLM would write the replies. We did not want replies written — we wanted **decisions
made**, so that code could assemble the answer out of words Maya has already said.

[Jev](https://docs.typesafe.ai) is TypeSafe's System One model. It does not generate prose.
It takes a **state** and a set of **typed questions**, and returns typed answers with
calibrated probability distributions that code can branch on, sort by and threshold
against. That is exactly the shape this problem needs:

| What the product needs | What Jev gives |
| --- | --- |
| Decide *what is being asked* out of twelve categories the case file itself defines | `Choice` with a full probability distribution |
| Decide *how close to buying* and *how urgent* on an ordered scale | `Score`, probability-weighted across levels |
| Decide *is this hers*, *is this covered*, *has her skin reacted* | `Noul`, a calibrated yes/no |
| Say when it is **not sure**, so the message escalates instead of guessing | `confidence`, derived from the distribution |

Every word in every draft comes from `lib/shelf.ts` and `lib/routing.ts` — her ten
products at her prices with her verbatim notes, and her decision tree. Jev decides which
branch. Code writes nothing it was not given.

### The nine questions

One request per message to `POST https://api.typesafe.ai/v1/systemone`, model
`jev-latest` (currently `jev-1.13.0`). All nine are evaluated **in parallel against the
same state in a single pass**, so adding a question costs tokens, not a round trip.

| Question | Type | Answers |
| --- | --- | --- |
| `intent` | Choice | 14 — the twelve E-01 categories plus `brand_pitch`, `spam` |
| `skin_type` | Choice | 5 — `dry`, `oily_combo`, `sensitive`, `redness`, `unknown` |
| `budget_band` | Choice | 4 — `none`, `under_30`, `30_to_60`, `over_60` |
| `purchase_intent` | Score | browsing → curious → ready → buying now |
| `urgency` | Score | none → sometime → a date is coming → wrong right now |
| `needs_maya_personally` | Noul | Would a correct product answer still be the wrong reply? |
| `answerable_by_routing` | Noul | Does she answer this one the same way every time? |
| `names_shelf_product` | Noul | Does it point at one of her ten? |
| `is_reaction` | Noul | Is skin doing something wrong *now*? |

The intent options are the case file's own labels from E-01, not ours — `info`,
`recommendation`, `judgement`, `value`, `context`, `diagnosis`, `trust`, `relationship`,
`constraint`, `delayed_intent`, `transfer_of_trust`, `personalisation`. The classifier
speaks the evidence's language.

**Domain rules live in `criteria`, not in a prompt.** `answerable_by_routing` is handed a
structured description of what her routing actually covers; `needs_maya_personally` is
handed the distinction between *asking for Maya's judgement* (which the routing carries)
and *needing Maya* (which it never will).

### Cost and latency

| Measure | Value |
| --- | --- |
| Per message | ~2,250 input tokens · **~850ms** · **$0.000094** |
| Full 268-message inbox | 2,412 decisions · **$0.025** · seconds, at concurrency 10 |
| Output tokens | Free — Jev is billed on input only |

Ten requests in flight, exponential backoff on `429`/`529` honouring `retry-after`.
Malformed answers are coerced rather than thrown, and a coerced answer arrives with
confidence `0`, which puts it below every threshold and sends the message to Maya.

---

## How a message becomes a lane, then words

```
DM ──▶ lib/jev.ts ──▶ 9 typed answers ──▶ lib/lanes.ts ──▶ lane
                                              │
                                              ▼
                                        lib/routing.ts ──▶ draft (her words) or why
```

**`lib/lanes.ts`** turns answers into a lane, and the order *is* the policy: pitches and
spam are filed, a reaction always goes to her, a purchase with no question in it is worth
watching, and only then does the threshold decide between her routing and her judgement.

A draft goes out only when her routing covers it **and** it is not the kind of thing she
answers herself. Two sides, because a message can be both routable and hers — a bride with
dry skin — and when it is, she gets it. The fourth quadrant, not routable and not obviously
hers, goes to her too: a message nobody can place is not the same as a message with
nothing in it.

One exported rule, `readyToSend()`, is used by the server lanes, the routing and the
browser slider via `rebucket()`, so the two can never drift.

**`lib/routing.ts`** is her notebook as code — `DRY → Cloud Cream`, `OILY/COMBO → Daily
Gel`, `SENSITIVE → nothing with fragrance`, `REDNESS → Red Reset`, shade questions
answered with a question, SPF 50 on every routine, **two products maximum**, and anyone
over £60 told that the £62 serum is *good, not £62 good*. Retinol is blocked outright.

It does arithmetic she would do: dry skin plus redness at £60 routes to two products
totalling £70, so the reply says *"Stretch £10 if you can. It's the right pair. If you
can't, start with Red Reset, £32."*

When the tree has no branch, nothing is invented — the message goes to her with a `why`.

### One contradiction we kept

E-02.2 routes dry skin to "Cloud Cream + Barrier Oil". **There is no Barrier Oil on the
shelf.** The nearest thing is Oil Balm, which she scores 7.7 and annotates *"Beautiful,
but too much for me."* So it is offered with her caveat rather than as a recommendation,
and it is never what someone on a tight budget is told to start with. Saying that out loud
is the brand.

---

## Calibration

`npm run gold` scores **33 hand-labelled messages**, including the twelve E-01 intercepts
carrying the case file's own category as their expected intent.

| | Current |
| --- | --- |
| Lane | **30–31 / 33** |
| Intent | **28 / 33** |
| Skin type | **5 / 5** |

**The threshold was swept, not chosen.** Accuracy is flat at 32/33 from 0.40 to 0.55 and
falls away above it (25/33 at 0.70), so the default sits at **0.50**, mid-plateau. Jev
answers the routing question in a lower band than a plain reading of it suggests.

Two questions were rewritten after reading answers back, and both were product decisions:

- **`answerable_by_routing`** was described as a product table, so *"is the Cloud Cream
  worth £38"* read as uncovered and the signal collapsed to near zero on textbook rows.
  Rewritten as what she actually answers, it separates cleanly.
- **`needs_maya_personally`** asked whether the message needed Maya's *judgement*.
  Everything does — *"what would YOU buy"* scored 0.5+ and went to her pile. Carrying that
  judgement is the entire product, so the question now asks whether it needs Maya
  **herself**. That single change fixed five of seven lane failures.

Jev is not deterministic. Rows within ~0.05 of the bar change lane between runs, and
**every one of them fails toward Maya rather than into a draft.**

---

## Safety

These hold structurally, and are re-checked against all 268 rows:

- **Nothing sends.** There is no send path in the codebase.
- **A message with no draft can never become "Ready to send"** — at any slider position.
- **Reactions, life events and judgement calls are never drafted into**, because the
  routing never wrote them a draft, so they have no reuse signature.
- **Raising the review bar only ever moves work toward Maya.**
- **Approved wordings need her explicit approval**, apply only where that same prepared
  reply was already going out, and can be disabled, restored or reset.
- **Retinol is never recommended by default**, and a retinoid question with a reaction, a
  prescription, a condition or someone under 18 in it is never drafted at all.
- **No invented prices or products.** Every figure comes from E-04.

---

## Running it locally

```bash
npm install
npm run dev
```

Put a TypeSafe key in `.env.local` (gitignored):

```
TYPESAFE_API_KEY=...
NEXT_PUBLIC_MOCK=0     # 0 = live reader, 1/unset = committed sample
```

`data/results.json` is committed, so the console and `GET /api/results` work with **no key
and no network**.

| Command | What it does |
| --- | --- |
| `npm run classify` | Whole inbox through Jev → `data/results.json` |
| `npm run classify -- --limit 20` | Cheap smoke test |
| `npm run gold` | Score the 33 hand labels: lane, intent, skin |
| `npm run dms` | Regenerate the message corpus |
| `npm run fixture` | Regenerate the UI fixture through the real routing |
| `npm run csv` | Export the inbox as a CSV, to test uploads |
| `npm run reset` | Drop an uploaded inbox, go back to the committed one |
| `npm run lint` / `npm run build` | Must both be clean |

## API

`lib/types.ts` is the frozen contract.

| Method | Route | Body | Returns |
| --- | --- | --- | --- |
| `POST` | `/api/classify` | `{ mode: 'all' \| 'unclassified', csv?: string, reset?: boolean }` | `RunResult` |
| `GET` | `/api/results` | — | `RunResult` — cached, works offline |
| `POST` | `/api/ask` | `{ text: string }` | `Classified` — one message, for the public card |

## Project layout

| Path | Owns |
| --- | --- |
| `lib/jev.ts` | Question schema and the Jev client (concurrency, retry, coercion) |
| `lib/lanes.ts` | Answers → lane, thresholds, the shared `readyToSend` / `rebucket` rule |
| `lib/routing.ts` | Her decision tree: drafts, blocks, budget arithmetic, `why` lines |
| `lib/shelf.ts` | E-04 verbatim — ten products, her prices, scores and notes |
| `lib/csv.ts` | Defensive parser for real DM exports |
| `components/console/` | The console, the Playbook hook, formatting |
| `app/ask/` | The public "What would Maya do?" card |
| `data/` | Corpus, gold labels, committed run, fixture, exports |

## Data

The corpus is generated, never hand-typed — edit the spec and regenerate:

```bash
npm run dms        # 268 messages
npm run fixture    # 15-row UI fixture, routed through the real code
```

268 messages: the **twelve E-01 intercepts verbatim** (with their real handles, and the
case file's category in `persona` — that field is what the "Sample 12" tab filters on),
plus messages written from the **six known associates** in E-03 — Emily, Priya, Sophie,
Hannah, Grace and Alex, with Alex a deliberate sliver because she barely sends anything —
plus a tail of pitches, spam, thank-yous and life events.

`data/gold.json` is hand-labelled and is the only file here that is not generated.

## Known limits

- **The corpus is synthetic** apart from the twelve intercepts. Fidelity to her voice was
  the priority over volume.
- **Her stockists are not in the evidence**, so "where do I buy it" escalates to her
  rather than get an invented answer.
- **Uploads are capped at 1,500 rows** so a stray export cannot run up a bill. A real
  4,800-message month is ~$0.45 and a couple of minutes.
- **The Playbook lives in one browser.** It is per-device by design, not a backend.

See `AGENTS.md` for ownership boundaries, lane rules and house language.
