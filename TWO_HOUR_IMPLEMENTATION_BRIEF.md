# Operation Shade: Two-Hour Closed-Loop Demo

## Goal

Build one convincing closed-loop demo showing that:

1. Maya controls how cautious the inbox is.
2. Maya can edit a prepared reply.
3. She can approve her edit for similar messages.
4. Similar future messages use her approved wording.
5. Nothing is sent automatically.

This delivers a narrow but real version of the self-service Playbook and learning-loop ideas without attempting the complete product vision.

## Product story

> The inbox begins with Maya’s existing rules. When she changes a reply, she can approve that wording for similar messages. The next matching message uses what she approved—while reactions, personal messages and uncertain cases still stay with her.

---

# Agent implementation brief

## Time constraint

You have two hours. Prioritise a complete demo path over architecture or additional features.

Work from the latest `origin/main`, not the currently checked-out stale `b/ui` branch.

Before editing:

1. Read `AGENTS.md`.
2. Read the relevant Next.js client-component documentation under `node_modules/next/dist/docs/`.
3. Fetch the remote and create a non-destructive working branch from `origin/main`.
4. Run the existing build once to establish the baseline.

Do not edit `lib/types.ts`; it is frozen.

## Outcome

Implement a small, working **Maya’s Playbook** and feedback loop inside the existing console.

The demo must support:

1. Changing the confidence/review threshold.
2. Editing a prepared response.
3. Approving the edited response for similar messages.
4. Reusing the approved response on matching messages.
5. Turning approved-response reuse on or off.
6. Resetting the locally learned examples.
7. Persisting approved examples across refreshes.
8. Never applying an approved response to a message without an existing safe draft.
9. Never sending anything automatically.

Do not build the full rule editor, authentication, social integrations, a database or model retraining.

---

## Scope

### 1. Add a real confidence control

In the left sidebar, add a section titled:

**Your review bar**

Use a slider from `0.50` to `0.95`.

Default to the project-defined threshold. Import and use `rebucket(row, threshold)` from `lib/lanes`; do not recreate the routing comparison.

When the slider moves:

- Recompute displayed `voice` and `maya` lanes.
- Update lane counts.
- Update filters and table rows.
- Higher values must move messages toward **Needs you**.
- A message with no draft must never become **Ready to send**.
- `intent` and `noise` lanes must not change.

Use non-technical labels:

- `0.50–0.59`: **More coverage**
- `0.60–0.74`: **Balanced**
- `0.75–0.95`: **Safer**

Add explanatory copy:

> Raise this to review more messages yourself.

Do not display model jargon.

### 2. Make the draft editable

In the existing message drawer:

- Replace the read-only draft display with an editable textarea.
- Preserve the original prepared draft.
- Add two actions:
  - **Use as written**
  - **Save my version**

When **Use as written** is selected:

- Record that the draft was accepted unchanged.
- Show brief confirmation.
- Do not send anything.

When **Save my version** is selected:

- Require non-empty text.
- Store:
  - message ID
  - original draft
  - Maya’s final text
  - intent
  - skin type
  - budget band
  - timestamp
  - whether it was unchanged or edited
- Then ask:

> Use this wording for similar messages?

Buttons:

- **Approve for similar**
- **Only this one**

### 3. Add approved-response memory

Persist approved responses in browser `localStorage`.

Create a small client-side Playbook hook or utility. Keep it separate from `lib/types.ts`.

An approved response should be keyed by a transparent similarity signature, initially:

- intent
- skin type

If the existing data shows that this groups unrelated messages too broadly, add budget band. Keep the rule deterministic and explainable.

Before finalising the key:

- Inspect the current sample/full results.
- Verify at least one signature matches two or more safe drafted messages.
- Use that signature in the demo.

An approved response may replace a displayed draft only when:

- The target row already has a draft.
- The target row is eligible for the Ready/Needs-you boundary.
- It is not `noise` or `intent`.
- It is not a reaction, life event or other message already protected by existing routing.
- Approved-response reuse is enabled.

Do not create a response where the existing routing produced none.

Display a small label when reused:

> From a reply you approved

Allow Maya to restore the original prepared draft for that message.

### 4. Add “Maya’s Playbook” to the sidebar

Do not attempt the complete rule builder.

Add one compact section containing:

- Current review-bar setting
- **Use my approved replies** toggle
- Number of approved reply patterns
- A list of approved patterns, for example:
  - “Dry skin · recommendation”
- Enable/disable control for each pattern
- **Reset approved replies** action

Reset must require an in-app confirmation before clearing browser-local data.

Avoid the words prohibited by `AGENTS.md` in the interface.

### 5. Optional only if core work is complete

Add a **This needs me** action in the drawer:

- Moves that message into **Needs you** locally.
- Records the correction.
- Does not generalise from one correction.
- Copy: “Saved for review.”

Cut this before compromising the required flow.

---

## Suggested implementation locations

Primary:

- `components/console/Console.tsx`
- A small new UI-local hook such as:
  - `components/console/use-playbook.ts`

Only modify other files if necessary.

Do not change:

- `lib/types.ts`
- Existing classifier question definitions
- Server routing rules
- API contracts
- Data fixture JSON by hand
- Safety boundaries

No new dependency should be needed.

---

## Data shape

Use a UI-local type similar to:

```ts
type ApprovedReply = {
  id: string
  signature: string
  intent: string
  skinType: string
  budgetBand?: string
  originalDraft: string
  approvedText: string
  sourceMessageId: string
  createdAt: string
  enabled: boolean
}

type ReplyFeedback = {
  messageId: string
  originalDraft: string
  finalText: string
  signature: string
  outcome: 'accepted' | 'edited'
  createdAt: string
}
```

This is not part of the frozen API contract.

Handle malformed or missing `localStorage` data defensively.

---

## Safety requirements

These are non-negotiable:

- Nothing sends automatically.
- Never produce a ready reply for a row with no original draft.
- Never override reactions or personal/life-event messages.
- Increasing the review bar must only move work toward Maya.
- Existing retinol and reaction handling must remain unchanged.
- Approved examples require Maya’s explicit approval.
- Maya can disable or reset everything she taught it.
- The original prepared draft remains recoverable.
- Do not claim the underlying reader was retrained.

Use language such as:

- “Approved reply”
- “Your wording”
- “Similar messages”
- “From your Playbook”

Do not say:

- “The model trained itself”
- “It now knows”
- “Automatic reply”
- “Auto-send”

---

## Cut order

If behind, cut in this order:

1. Per-pattern enable/disable controls
2. Feedback-history display
3. **Only this one** persistence
4. **This needs me** correction action
5. Visual polish

Never cut:

1. Real threshold slider using `rebucket`
2. Editable draft
3. **Approve for similar** action
4. Reuse on a matching safe message
5. Persistence across refresh
6. Reset control
7. Safety checks
8. Build verification

---

## Two-hour execution schedule

### 0:00–0:10 — Baseline

- Read project instructions and relevant Next.js docs.
- Start from `origin/main`.
- Run the existing lint/build.
- Inspect `Console.tsx`, `lib/lanes.ts` and current result data.
- Identify two safe drafted messages with the same intended signature.

### 0:10–0:30 — Review bar

- Add threshold state.
- Derive effective lanes with `rebucket`.
- Update counts, filters, sorting and table display.
- Add sidebar slider and plain-language state.

Checkpoint: dragging upward visibly increases **Needs you**.

### 0:30–1:00 — Editable response

- Add editable textarea to the drawer.
- Track original and edited text.
- Add **Use as written** and **Save my version**.
- Add the approval prompt.

Checkpoint: Maya can edit and approve one response.

### 1:00–1:25 — Approved-response reuse

- Add browser-local storage utility/hook.
- Save approved response by signature.
- Apply it only to matching rows that already have safe drafts.
- Add “From a reply you approved.”
- Confirm refresh persistence.

Checkpoint: edit message A, then open similar message B and see Maya’s approved wording.

### 1:25–1:40 — Playbook sidebar

- Show approved-pattern count.
- Add global reuse toggle.
- List approved patterns.
- Add reset with confirmation.

### 1:40–1:50 — Safety and edge cases

Verify:

- No draft never becomes Ready.
- Needs-you messages are not overridden.
- Disabled reuse restores original drafts.
- Malformed local data does not crash.
- Slider affects every relevant count and filter consistently.

### 1:50–2:00 — Verification and rehearsal

Run:

```bash
npm run lint
npm run build
```

Fix failures.

Rehearse the demo below.

Do not spend the final ten minutes adding features.

---

## Acceptance criteria

The implementation is complete only when all of these work:

1. The page loads with existing results.
2. The review-bar slider changes lane counts immediately.
3. Raising the slider moves messages toward **Needs you**.
4. Opening a drafted message shows an editable textarea.
5. Maya can save edited wording.
6. Maya can approve it for similar messages.
7. A second matching safe message uses that wording.
8. The replacement is visibly identified as Maya-approved.
9. Refreshing preserves the approved wording.
10. Disabling approved replies restores the original draft.
11. Reset clears local examples.
12. Messages without drafts never receive learned replies.
13. Nothing is sent anywhere.
14. Lint and build pass.

---

## 45-second demo script

1. “The inbox has already separated repetitive questions from messages that need Maya.”

2. Drag the review bar upward:

   “Maya controls the risk. Raising this sends more messages back to her for review.”

3. Open a **Ready to send** dry-skin message:

   “This response came from her existing Playbook.”

4. Edit one sentence and select **Save my version**.

5. Select **Approve for similar**:

   “When Maya changes how she answers a repeated question, she can approve that wording.”

6. Open the second matching message:

   “The next similar question starts with the wording Maya approved.”

7. Point to the label and sidebar:

   “It is visible, reversible and can be switched off. Reactions and judgement calls still go to Maya, and nothing sends itself.”

Final line:

> Maya’s inbox gets lighter because every reply she approves makes the next repeated question easier—without teaching the product to speak for her behind her back.

---

## Why this is the right two-hour scope

This avoids trying to build an entire configuration platform. Instead, it demonstrates the most important product loop end to end:

> Maya corrects something once → approves the correction → sees it reused safely → remains in control.

That is more compelling in a short demo than a large static rule editor, and it creates a credible bridge to the complete self-service Playbook later.
