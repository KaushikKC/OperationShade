# Operation Shade: Page 14 Agent Handoff

## Read this first

This document is an amendment to `TWO_HOUR_IMPLEMENTATION_BRIEF.md`.

Read the original handoff for the console learning-loop requirements, then apply the changes below. Where the two documents conflict, **this document wins**.

The original plan over-prioritises inbox efficiency. Pages 14 and 15 of the case file reveal that Maya's highest-value customers often never enter the inbox. The demo must therefore lead with an audience-facing decision experience and use the console as the control room behind it.

## Product question

> How do we help someone make a confident decision before they ever need to ask Maya?

## Evidence that must shape the build

- 61% of repeat buyers sent no DM before purchase.
- Top-decile savers converted 2.4 times more than average.
- 41% of high-value buyers first encountered Maya through a private share.
- Median purchase lag after first content exposure was 4.6 days.

The demo should visibly respond to this evidence rather than merely quoting it in the pitch.

---

## Revised demo outcome

The completed demo must show this journey:

1. A follower opens **What would Maya do?** without entering Maya's inbox.
2. They describe their skin, budget and constraint.
3. A safe, covered question receives Maya's specific decision.
4. The follower can copy or share that result.
5. A reaction, life event or unsupported question receives no guessed recommendation.
6. Maya can still improve repeated inbox replies by approving her wording for similar safe messages.
7. Nothing sends itself.

The audience experience is the hero. The console proves control, safety and continued learning.

---

# Changes from the original handoff

## Change 1: Do not rebuild the review bar

The latest `main` already has a working confidence slider using `rebucket()`.

Replace the original slider implementation task with verification:

- Raising it moves messages toward **Needs you**.
- Counts and filtered rows remain consistent.
- A message without a draft never becomes **Ready to send**.
- `intent` and `noise` lanes remain unchanged.

Only fix the slider if a demonstrable defect is found.

## Change 2: Make `/ask` the first implementation priority

Use the existing:

- `app/ask/page.tsx`
- `app/api/ask/route.ts`
- `lib/routing.ts`
- `lib/shelf.ts`

Do not create another public page or a second recommendation engine.

The `/ask` result should become a useful decision card rather than a single block of answer text.

## Change 3: Add a follower action

Every safe decision should offer:

- **Copy result**
- **Share with a friend**

Use `navigator.share` when available. Fall back to copying useful result text or the current page URL.

A persistent unique result URL is not required for this demo.

## Change 4: Make the unsafe path visible

A reaction, life event or unsupported question must not look like a failed version of the normal result.

Give it a deliberate handoff state that:

- Says this one needs Maya.
- Explains why.
- Makes no product recommendation.
- Does not imply that anything has been sent automatically.

## Change 5: Keep the console learning loop, but make it second

Retain these requirements from the original handoff:

- Editable prepared replies
- **Use as written**
- **Save my version**
- **Approve for similar**
- Reuse on another safe inbox message
- Browser persistence
- Disable/reset controls
- Existing safety boundaries

Cut detailed Playbook management before cutting any audience-facing requirement.

## Change 6: Do not claim browser-local learning is global

The original learning loop stores approved responses in Maya's browser.

That is sufficient for a console demo, but a follower on another device cannot access Maya's browser storage. Do not claim that a locally approved reply has been published globally or instantly changed `/ask` for every follower.

For this demo:

- `/ask` uses the existing shared server routing and shelf.
- Approved reply examples improve similar messages in Maya's console.
- Shared Playbook persistence is a later production step.

Implement shared server persistence only if all required work, safety checks, lint and build are already complete.

---

# Existing `/ask` problems to fix first

The current sample-mode implementation has drifted from the real product. Correct these before polishing the card.

## 1. Remove invented products

The sample path currently mentions CeraVe, which is not in Maya's case-file shelf.

Only use products from `lib/shelf.ts`.

## 2. Align labels with the real contract

The sample path currently uses values that do not match the live classifier, including examples such as:

- `oily` instead of `oily_combo`
- `product_rec` instead of the current intent vocabulary
- `under_15`, `15_40` and `40_plus` instead of the current budget bands

Use the same values expected by the existing formatting, routing and result types.

## 3. Make reactions safe in sample mode

The current sample path can treat words such as “react” as sensitive skin and still return a product answer.

A current reaction must produce:

- `lane: 'maya'`
- no `draft`
- a clear `why`

The sample demonstration must fail toward Maya in the same direction as the live route.

## 4. Remove claims the routing does not guarantee

The existing page says every reply always includes a skip. That is not true for every routing branch.

Use accurate copy such as:

> Replies come from Maya's own routing, with no more than two products. Nothing is sent anywhere.

---

# Required audience experience

## Input

Keep the existing free-text question box.

Use a demo prompt such as:

> Oily skin, £25, five minutes in the morning. What do I actually need?

Do not add a long questionnaire within this timebox.

## Safe result

Present the returned `draft` as **Maya's decision**.

Also show the existing plain-language reading where available:

- What they want
- Skin type
- Budget

The card may display products and prices only when they can be derived reliably from the existing shelf and routing. Do not parse ambiguous prose into a fake shopping basket.

Do not duplicate recommendation logic inside the page component. `route()` remains the authority on what Maya says.

## Copy result

Copy useful text containing:

- “Maya's decision”
- The returned decision text
- A short “Nothing was sent” footer if space allows

Show brief confirmation after copying.

## Share with a friend

When `navigator.share` is available, share:

- Title: `What would Maya do?`
- The decision text
- The current page URL

Otherwise copy the same content and show a fallback confirmation.

## Needs-Maya result

When the result has no safe `draft`, show the existing `why` in a visually distinct handoff card.

Fallback copy:

> This one needs Maya. There is not enough here to give you a safe answer without guessing.

For a reaction, the copy should make clear that no product is being recommended while their skin is reacting.

Do not promise that Maya has received the question unless the product actually records it.

---

# Required Maya experience

Follow the original handoff for the implementation details below.

## Editable response

In the console drawer:

- Make the prepared reply editable.
- Preserve the original.
- Add **Use as written** and **Save my version**.
- Require non-empty edited text.
- Do not send anything.

## Approve for similar

After saving an edit, ask:

> Use this wording for similar messages?

Actions:

- **Approve for similar**
- **Only this one**

Use a transparent signature based on:

- intent
- skin type
- budget band only if necessary to avoid grouping unrelated replies

Before finalising it, confirm that two existing safe drafted messages share the selected signature.

## Safe reuse

An approved response may replace an inbox draft only when:

- The target message already has an original draft.
- It is eligible for the Ready/Needs-you boundary.
- It is not `noise` or `intent`.
- It is not a reaction, life event or another protected message.
- Approved-response reuse is enabled.

Display:

> From a reply you approved

Allow the original prepared reply to be restored.

## Compact Playbook controls

Add only:

- **Use my approved replies** toggle
- Number of approved patterns
- **Reset approved replies** with confirmation

A detailed rule editor is outside this timebox.

---

# Safety constraints

These are non-negotiable:

- Nothing sends automatically.
- Never invent a product, price or opinion.
- Never create a reply where the existing routing produced none.
- Never override a reaction, life event or protected personal message.
- Never turn a message with no draft into **Ready to send**.
- Preserve existing retinol and reaction handling.
- Maya must explicitly approve reused wording.
- Maya can disable or reset approved examples.
- The original prepared reply remains recoverable.
- Do not claim browser-local examples are globally published.
- Follow all interface-language restrictions in `AGENTS.md`.

Do not edit `lib/types.ts`.

---

# Suggested file scope

Primary files:

- `app/ask/page.tsx`
- `components/console/Console.tsx`
- A small hook such as `components/console/use-playbook.ts`

Reuse without duplicating:

- `app/api/ask/route.ts`
- `lib/routing.ts`
- `lib/shelf.ts`
- `lib/lanes.ts`

Avoid changing classifier questions, API contracts, generated fixture JSON or core safety routing unless a verified defect requires it.

No new dependency should be needed.

---

# Revised two-hour schedule

## 0:00–0:10 — Baseline

- Read `AGENTS.md` and relevant Next.js docs.
- Start from the latest `origin/main`.
- Run the existing lint and build.
- Verify the console, review bar and `/ask`.
- Choose one safe audience question, one reaction question and two similar safe inbox messages.

## 0:10–0:30 — Fix `/ask` parity and safety

- Remove invented products from sample mode.
- Align sample labels with the live contract.
- Make reaction handling fail toward Maya.
- Remove inaccurate interface claims.

Checkpoint: sample mode and live mode point in the same safe direction.

## 0:30–0:55 — Audience decision and sharing

- Present the answer as **Maya's decision**.
- Add **Copy result**.
- Add **Share with a friend** with a copy fallback.
- Add the deliberate Needs-Maya handoff state.

Checkpoint: a follower receives a useful decision without sending a DM.

## 0:55–1:25 — Editable inbox reply

- Add the editable textarea.
- Preserve the original draft.
- Add **Use as written** and **Save my version**.
- Add the approval prompt.

Checkpoint: Maya can improve and approve one safe response.

## 1:25–1:43 — Approved-response reuse

- Add browser-local approved-response storage.
- Reuse only on matching messages with existing safe drafts.
- Add the approved-response label.
- Confirm refresh persistence.

Checkpoint: inbox message B uses wording Maya approved on message A.

## 1:43–1:50 — Compact Playbook controls

- Add the global reuse toggle.
- Show the approved-pattern count.
- Add reset with confirmation.

Cut the pattern list if necessary.

## 1:50–2:00 — Verification and rehearsal

Run:

```bash
npm run lint
npm run build
```

Test the exact demo path. Do not add more features.

---

# Cut order

If behind, cut in this order:

1. Per-pattern enable and disable controls
2. Detailed feedback history
3. **Only this one** persistence
4. Approved-pattern list
5. Product-price presentation on `/ask`
6. Visual polish

Never cut:

1. Safe `/ask` result
2. Reaction handoff
3. Copy or share action
4. Editable inbox draft
5. **Approve for similar**
6. Reuse on a second safe inbox message
7. Safety checks
8. Lint and build verification

---

# Acceptance criteria

## Audience

- `/ask` accepts a follower question.
- A safe covered question produces Maya's decision.
- The answer comes from existing routing rather than page-specific recommendation logic.
- The result can be copied.
- The result can be shared or copied as a fallback.
- A reaction produces no product recommendation.
- An unsupported or personal question produces a clear handoff.
- Sample mode uses only the real shelf and current label vocabulary.
- The page does not claim a question was delivered when it was not.

## Maya

- A prepared inbox reply is editable.
- Maya can accept it unchanged or save her version.
- Maya can approve her wording for similar messages.
- A second matching safe inbox message can reuse it.
- Reused wording is visibly identified.
- Approved examples persist across refreshes.
- Reuse can be disabled.
- Approved examples can be reset.
- Messages without drafts never receive approved wording.

## Verification

- The existing review bar still behaves correctly.
- Nothing sends automatically.
- `npm run lint` passes.
- `npm run build` passes.

---

# Demo script

## 1. Start with the hidden audience

Say:

> Sixty-one percent of Maya's repeat buyers never sent her a DM. They save, share with a friend and come back days later. So we stopped asking only how Maya could answer more messages.

## 2. Show a decision before a DM

Open **What would Maya do?** and ask:

> Oily skin, £25, five minutes in the morning. What do I actually need?

Say:

> This person gets Maya's decision without entering her inbox. They can copy it or share it with a friend.

## 3. Show the boundary

Ask:

> My skin is burning after using retinol. What should I buy?

Say:

> This is not a routine question, so the product does not guess. This one stays with Maya.

## 4. Show Maya improving repeated work

Open a safe prepared reply in the console. Edit one sentence, save it and approve it for similar messages. Open the second matching inbox message.

Say:

> When Maya improves a repeated answer, the next similar inbox message starts with wording she approved. She can disable it or take it back.

## 5. End on the product principle

Say:

> Nothing sends itself. Reactions, life events and uncertain questions remain Maya's.

Final line:

> Maya no longer needs to answer every repeated question, because her judgement helps people decide before they need to ask.

---

# Definition of done

The agent is done when the complete demo path works, safety behaviour is visible, and lint and build pass. Do not expand the scope after that point.
