---
name: revalidate
description: Re-run the checker against an already-built deliverable without rebuilding it — judge an existing artifact, item, or pull request and report the verdict. Use when review feedback needs re-checking, after a hand-edit or a fixup commit, when CI flags a fidelity regression, when a PR's measurements look stale because main moved under it, or whenever someone asks to re-check / re-validate / re-verify a component or a PR rather than build a new one.
---

# revalidate — judge again, without building again

`/lsg:revalidate <item-id | PR number | artifact path>`

Runs **`@lsg:checker`** against an artifact that already exists and reports the
verdict. **It never invokes the maker and never edits source.**

Re-judging and re-building are different questions: a rebuild can change the artifact, so its
verdict cannot tell you whether the judgment or the code moved. This answers the first only.

## When to reach for it

| Situation | Why not a rebuild |
|---|---|
| Review feedback that is a **question**, not a change ("is this contrast really fine?") | nothing needs building |
| A hand-edit or fixup commit on the branch | the build-time verdict no longer describes the code |
| CI flagged a fidelity regression | you want the judgment, not just the arithmetic |
| `main` moved under an open PR | re-measure against what would actually merge |
| A verdict looks wrong | re-judging a rebuilt artifact confounds two variables |

For an actual **change** to the artifact, do not use this — put the feedback on the PR, set the
item back to `queued`, and let the loop rebuild.

**After every delivery (`/lsg:deliver`), on ODC and O11, this runs on each delivered screen.** That
is the delivered mode below; it is not optional.

## Delivered mode: the published screen against its reference

`/lsg:revalidate <item-id | screen-url> --delivered [--reference <url>]`

The target is what the MCP built, at its published URL. The reference is the item's frozen ref,
or the original app's screen when the delivery is a rebuild. The rules are unchanged: never build,
never edit, and a missing reference is BLOCKED.

1. **Prerequisites.** The user has the screen's role, and the minimum test data exists. Without
   either, say what is missing and stop; a page that redirects to InvalidPermissions measures
   nothing.
2. **Same conditions.** Open both in the user's own browser (signed-in OutSystems pages: Claude in
   Chrome; SSO loops in headless browsers), at the same window size, with the same data shape where
   it can be.
3. **Compare region by region.** Use zoomed screenshots of the same region, then, for every
   difference:
   - the **DOM skeleton** of both (a `tag.class` tree with the text nodes)
   - the **CSS rules matching the element** (`document.styleSheets`, filtered with
     `el.matches(rule.selectorText)`)

   That names the cause directly: a specificity loss, an OutSystems UI rule, a widget property, a
   leftover default text.
4. **Run the leftover lint** from `outsystems-mentor-build` → "Lint for Mentor's leftovers".
5. **Not drift** — rule these out before calling FAIL:
   - JPEG tinting of greys (read the computed colour)
   - differences that come from data: empty states, a first free week, a disabled prev arrow
   - quirks the reference has too (check it in the reference before blaming the delivery)
6. **Report** a table per screen: region, reference, delivered, cause, fix. Drift goes back through
   `/lsg:deliver`'s MCP path. Re-run this mode after each fix round, until it passes.

## Procedure

### 1. Resolve the target to an item and a ref

Accept any of: an item id (`cmp-button`), a PR number (`33`), or an artifact path
(`src/blocks/acme-button.css`). Resolve to the item in `loop/state.json` and its frozen ref at
`specs/<kind>/<id>/` (the id prefix picks the kind: `cmp-` components, `pat-` patterns, `tok-` tokens).

For a PR number: `gh pr view <n> --json headRefName,files,body` — the item id is in the title/body
the loop wrote, and `git switch` to its head before judging. **Judge the code that is actually on
the branch**, not whatever is in the working tree.

> **No ref ⇒ BLOCKED. Stop.** Never substitute the artifact's own prose, a screenshot, or live
> Figma. Without the frozen ref the checker grades the maker against the maker's own output, which
> is the one failure the whole ref mechanism exists to prevent. Say which item, say the ref is
> missing, and stop — do not improvise a spec.

Check ref staleness too: if the ref's recorded Figma **file key** differs from
`project.config.json → figma.fileKey`, the ref is stale (`needs-re-ref`), not spec. Libraries get
forked and silently re-versioned. Report it and stop; re-freezing needs Figma, which is the
orchestrator's job, not this skill's.

### 2. Make sure the harness is sound before judging

A gate that cannot measure returns `unverified`, and `unverified` caps at FAIL — so a broken
harness looks exactly like a broken component. Rule it out first:

```bash
npm run build:theme          # checks → assemble → validate:theme → token audit
git submodule status         # a leading `-` means vendor/outsystems-ui is not checked out
```

If `vendor/outsystems-ui/` is missing, `git submodule update --init && npm run build:osui` **before**
judging. Without the compiled base the specimen page has no framework under the theme and the gate
refuses to measure (exit 4) — a run that measured anyway would describe a page nobody will ever see.
With `framework: "none"` (`project.config.json`) there is no base to build: skip the submodule
check, and the specimen page is the theme alone.

### 3. Delegate to the checker

Hand it the item, its ref, and the artifact. It runs its own deterministic gate, authors or reuses
`specs/<kind>/<id>/probes.json`, runs `measure-fidelity.mjs`, applies risk-tiered depth, and
adversarially challenges every finding before confirming it.

It returns VERDICT, RISK-TIER, DET-GATE, VISUAL, MEASUREMENTS, CONFIDENCE, CRITIQUE,
FINDINGS-CONFIRMED, FINDINGS-CHALLENGED-OUT, DECISION-LOG — the same contract as in the loop, so
the output is comparable with the verdict already in the PR.

### 4. Report, and route findings the same way the loop does

- **PASS** — say so, and note anything that changed since the PR's recorded verdict. If the item
  was `needs-human`, it may now move to `ready-for-review`; record `visual` and `det_gate`
  on the item in `loop/state.json`, and post the new decision log as a PR comment.
- **FAIL (drift)** — the build no longer matches the ref. **Drift is never a finding**: it goes
  back to the maker. Report the MEASUREMENTS table and say the item needs a rebuild.
- **FAIL (subjective)** — report the CRITIQUE. Do not fix it here.
- **BLOCKED** — missing or stale ref, per step 1.

**Findings** follow the loop's rules exactly: confirmed ones are deduped by `[node:<id>]` and filed
as Bugs; challenged-out ones go to `findings/findings-register.md` as `not-reproduced` with the
usage evidence, and never become bugs. Never re-file anything in
`knownFalsePositiveClasses`, and never raise a finding about spacing, grid, breakpoints or default
sizes unless the project's specs write them down.

### 5. Optionally post it to the PR

When the target was a PR and the user wants it recorded, add a comment — the fresh verdict, the
MEASUREMENTS table, and **the commit sha it was judged at**, because a verdict with no sha is the
same stale-snapshot problem this skill exists to fix.

Ask before posting. A PR comment is visible to everyone on the repo.

## Rules

1. **Never invoke the maker.** If the artifact needs changing, say so and stop.
2. **Never edit source, tokens, handovers or the register** — the checker's own constraint. Only
   the gate's own artifacts (`probes.json`, `measurements.json` in `specs/<kind>/<id>/`,
   screenshots under `review/<id>/`) may be written.
3. **Never judge without a ref.** BLOCKED is a real, correct outcome.
4. **Never merge, approve, or move an item to a human-owned state.** A re-check is evidence for a
   human, not a substitute for one.
5. **Never report a verdict without saying which commit it was judged at.**
6. **Never relax the gate to get a green.** `unverified` from a broken harness is fixed by fixing
   the harness.
