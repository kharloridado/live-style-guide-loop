---
description: Build, fix or extend one design-system item end to end — freeze the Figma or written ref, run the maker and checker, and open one PR with its review Artifact — or work through the signed queue in loop/goal.md. Use whenever the user asks to build, restyle, fix or add a state to a component, pattern or token set in an live-style-guide-harness project.
---
Run the design loop, governed by this project's CLAUDE.md and the outsystems-* skills.

**The queue is the signed inventory in `loop/goal.md`, and item status in `loop/state.json`.**
Both are files in the clone, so the loop runs the same at a keyboard and from a cloud routine.

**Output: one branch and one PR per item.** Each item is cut fresh from `origin/main`, built,
checked, and landed as an **open PR** carrying the plan, the measurements, and both decision logs
(`references/pr-body.md`). The loop never merges and never approves: a human merging the PR is the
approval.

## Item status — the only values `items[].status` may take

| Status | Meaning | Set by |
|---|---|---|
| `queued` | In the signed inventory, ready to build | setup, or a scope owner's row in `goal.md` |
| `built` | Checker PASS and committed, but the PR did not open (`pr_error` says why) | per-item build |
| `ready-for-review` | PR open, review Artifact linked | per-item build |
| `merged` | PR merged — the human's approval | `/lsg:deliver`, from `gh pr list --state merged` |
| `handover` | Delivered: built through the MCP or handed over, and its handover issue open | `/lsg:deliver` |
| `needs-human` | Blocked: FAIL-CAPPED, DET-GATE-FAIL, no ref, or out of inventory | per-item build |
| `needs-re-ref` | Its frozen ref came from an old Figma file key | pre-flight |
| `deferred` | Deliberately out of this run's scope | a human |
| `closed` | PR closed unmerged, or the item was dropped | a human |

Never write any other value, and never decorate one ("built (round 3)"): rounds, verdicts and PR
links have their own fields. `npm run check:state` warns on anything else.

## Two ways in

**A request in a session — the common case.** "Add the error state to the input", "the form list
borders don't match the look and feel". The request plus a frozen ref is the scope; `loop/goal.md`
is not needed. Pick or mint the item id (`cmp-` / `pat-` / `tok-`), add it to `loop/state.json`
as `queued` if it is new, run pre-flight steps 1, 3 and 4, then build it once with
`references/per-item-build.md` and stop at the PR. A ref can be a Figma node or, on a project
restyling a live app, a written spec plus before screenshots of the live screen.

**A new screen or mockup** starts with **`/lsg:assess`**, not here: it says which parts the Live
Style Guide already has and plans the rest, and its signed rows are the items this loop builds.

**A queue run** — a library, a batch, or an optional nightly routine. The queue is the signed inventory in
`loop/goal.md`; its Run settings (mode, tiers, pauses, max rounds, items per run) govern the run.
All pre-flight steps apply, then the token pass and the per-item loop below.

Either way, read `project.config.json` first (`classPrefix`, `jsNamespace`, `figma.fileKey`,
`knownFalsePositiveClasses`). Spacing scale, grid, breakpoints and default sizes are enforced only
when written in `specs/foundations/` or `specs/decisions.md` — never assumed or guessed.

## Pre-flight (every run — cheap, and it has caught real drift)
1. **Reconcile state against git.** `state.json` can go stale while commits have already shipped later tiers. Compare the queue's `status` values against what is actually committed on the loop branch before advancing; fix state first, and say so in the run's summary.
2. **Confirm the inventory of record** (queue runs). No item enters the queue without a row in the signed inventory table in `loop/goal.md`. A component that is in Figma but not in that table is `needs-human`, not `queued`; to add scope, a scope owner adds a row (and `git log loop/goal.md` records who and when). Building speculatively is how fully-finished components get thrown away.
3. **Check the library file key.** If `figma.fileKey` in `project.config.json` differs from the key recorded in an item's frozen ref, that ref is stale → mark the item `needs-re-ref` and re-snapshot before building on it. Design libraries get forked ("Main Library (2)") and silently re-version values.
4. **Deliver anything that merged since the last run.** Nothing watches the merge, so the loop collects it here: run **`/lsg:deliver`**. It builds each merged deliverable into OutSystems through the MCP when one is connected and verifies it in a browser, otherwise hands it over for a developer, and opens the handover issue either way. Never deliver an unmerged branch. Say what was delivered, and through which channel.

## Token pass (library mode, runs once)
If `state.json.items` is empty and `goal.md` sets mode `library`:
1. Pull the full Figma library via Figma MCP. Extract the ENTIRE token set (color, spacing, type, radius, shadow, motion).
2. Reconcile against tokens/*.css: classify each as new / changed / off-scale / removed. File token-drift findings (design-token bugs) for anything off-scale or ambiguous.
3. Run `npm run build:theme` to produce dist/theme.css.
4. Seed `state.json.items[]` from the audit, each tagged with its `tier` (foundations|primitives|composites|patterns), `level` (L1-L5), `node` (Figma node id), no status yet.
5. Set each seeded item's status to `queued` in inventory order. Then honor the pause after foundations in `goal.md`: if it is set, write loop/REPORT.md (token summary + findings) and STOP for sign-off. Branches are cut per item, not here.

For single mode: seed the queue from a component audit; skip tiers and pauses.

## Per-item loop (repeat until done-criteria or a cap/checkpoint)
1. Pick the next `queued` item in dependency order: never start a tier until every item in the previous tier has a PR or is `needs-human`; within a tier, build primitives a composite depends on first.
2. **Cut its branch fresh from `origin/main`** — `git fetch origin && git switch -c loop/item/<slug> origin/main`. One item, one branch: a shared loop branch makes every PR contain every earlier item's diff, so the reviewer approves all or none, and a single rejected item blocks the rest.
3. Build it by following **`references/per-item-build.md`** — freeze the ref, @maker, @checker, verdict routing, findings, commit, **open the PR**, persist. Pass the item as the `ITEM` contract with `branch` set to the branch you just cut and `base` to `main`.
4. Route the outcome it returns:
   - `PASS` -> the PR is open and the item is `ready-for-review`. **Stop there.** Do not merge, do not approve, and do not deliver — nothing reaches OutSystems off an unmerged branch.
   - `FAIL-CAPPED` -> status `needs-human` with the critique attached; move on.
   - `BLOCKED-NO-REF` / `BLOCKED-STALE-REF` -> status "needs-human" / "needs-re-ref" with the reason. Do NOT count a round — the checker never got to judge.
   - `DET-GATE-FAIL` -> status "needs-human"; a build that will not go green is a stop, not a round.

## Tier boundaries
When a tier completes: run a CONSISTENCY PASS (do all components in the tier use tokens uniformly? naming consistent? no divergent one-offs? record the result in the run's REPORT). Then honor that tier's pause in `goal.md` (pause -> REPORT + STOP for sign-off; otherwise the next tier).

## Stop
Stop when no item is `queued`, or the run reached `goal.md`'s items per run, or a pause applies, or a blocking finding needs a human.

## Report (queue runs)
End a queue run by writing loop/REPORT.md: tier progress, items built, **the PR URL and the review Artifact URL for each**, bugs filed (links), needs-human items, consistency-pass results. Also write a `## Review metrics` section so review coverage is visible run-over-run:
- items auto-passed vs needs-human (review coverage)
- findings filed vs challenged-out (false-positive rate)
- checker rounds distribution (round-1-pass rate)
- risk-tier coverage (how many `core` items got full-stack depth)
- deterministic-gate pass rate
- **rendered-fidelity coverage** — items with `visual: pass` vs `drift` vs `unverified`, and the number of properties actually measured. This is the only metric that reflects whether the build LOOKS like the design; the others all measure process throughput, and a pipeline that ships drifted components scores 100% on every one of them.

Then run `npm run review` and republish the library page with the Artifact tool to `library_review_url` in `loop/state.json` (publish it once and record the URL if there is none). Skip it in a run with no Artifact tool, and say so in the report.

Never touch OutSystems before the merge. After it, `/lsg:deliver` builds the work in through the
MCP, or hands it over.

$ARGUMENTS
