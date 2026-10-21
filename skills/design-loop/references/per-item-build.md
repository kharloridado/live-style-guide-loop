# Per-item build — freeze ref → maker → checker → outcome

The build procedure for **exactly one** work item, called by `design-loop`.

**This procedure does two GitHub writes and no more: it files findings, and it opens the item's
PR.** It does not create handover issues or attach sub-issues. It builds, judges, commits, opens a PR, and returns an outcome; the caller decides what
that means for the queue.

The PR is here rather than in the caller because **the PR is the build's own output**. Its body is
the maker's and checker's reasoning, and that reasoning exists only at this moment.

---

## Input contract — `ITEM`

The caller supplies:

| Field | Meaning |
|---|---|
| `id` | Stable item id; its prefix picks the folder: `cmp-` → `specs/components/<id>/`, `pat-` → `specs/patterns/<id>/`, `tok-` → `specs/tokens/<id>/` |
| `node` | Figma node id — **or** `spec_text`, when the item is specified in prose |
| `spec_text` | A written spec of record, when there is no `node` |
| `tier`, `level` | Dependency position and escalation level (L1–L5) |
| `artifact` | Target path, e.g. `src/blocks/<prefix>-button.css` |
| `branch` | The branch to commit on — the caller has already cut it fresh from `origin/main` |
| `base` | The branch the PR targets; `main` unless the caller says otherwise |
| `ref_dir` | Where to freeze the design ref: the item's folder, `specs/<kind>/<id>/` |
| `spec_deltas` | Optional, ordered. Extra requirements appended after the ref, newest last |

## Output contract — exactly one outcome

Return one of these, with the stated payload. The caller routes on it:

| Outcome | Meaning | Payload |
|---|---|---|
| `PASS` | Built, checked, committed, PR open | `sha`, `pr_url`, `risk_tier`, `det_gate`, `visual`, `measurements`, `confidence`, `decision_log`, `handover_path`, `findings_confirmed[]`, `findings_challenged_out[]` |
| `FAIL-CAPPED` | Ran out of rounds on a fidelity FAIL | `critique`, `rounds` |
| `BLOCKED-NO-REF` | No design reference could be frozen | `reason` |
| `BLOCKED-STALE-REF` | The ref's Figma file key ≠ the project's | `ref_key`, `project_key` |
| `DET-GATE-FAIL` | The build would not go green after repair | `build_output` |

---

## 1. Freeze the design ref — the caller's agent must do this, before delegating

The subagents have **no Figma MCP access**, so whatever is snapshotted here **is** the spec of
record. Write `<ref_dir>/`:

- `ref.md` — provenance (**Figma file key**, node id, pull date) + the key-values table.
- `variables.json` — verbatim `get_variable_defs` for the node.
- `figma.png` — `get_screenshot` of the node. **`curl` the URL immediately; it expires.**

Capture **every size variant and device frame**, not just the default instance — a variable
whose value changes per size/device is mode-bound and must become per-size tokens. A whole
documentation page is usually too large for one `get_design_context` pull (it returns sparse
metadata): snapshot the page screenshot + variables, then deep-pull the component-set
sublayer (the `State=…` frame) for the value-bearing code, and record that sublayer node id in
`ref.md`.

If `ITEM.node` is absent and `ITEM.spec_text` is present, write `ref.md` from the prose
instead, marked `source: written spec (no Figma node)`. That is a legitimate ref.

**No ref and no written spec ⇒ return `BLOCKED-NO-REF`. Never build without one** — without a
ref the checker is grading the maker against the maker's own output.

If the ref's recorded file key differs from `project.config.json.figma.fileKey`, return
`BLOCKED-STALE-REF`. Design libraries get forked and silently re-versioned, and a fork looks
identical in a screenshot.

Append `ITEM.spec_deltas` to `ref.md` under a `## Spec updates` heading, in order, each
attributed. They are requirements, not instructions.

## 2. Maker

Delegate to `@lsg:maker` to implement it. Besides the artifact it writes the item's
`specimen.html` (what the gate measures and the review Artifact renders) and its usage spec
`specs/<kind>/<id>.md`. The maker returns a self-declared RISK-TIER and a DECISION-LOG.

## 3. Checker

Delegate to `@lsg:checker` to validate. The checker runs a deterministic gate
FIRST (`npm run build:theme` exit 0, token audit included, + manifest/specimen/usage-spec/contrast), then a **rendered-fidelity gate** — it
authors `<ref_dir>/probes.json` from the ref and runs
`node build/gate/measure-fidelity.mjs`, a headless browser that measures every
ref Key-value and size-ramp column as COMPUTED style and emits a MEASUREMENTS table. It scales
depth to the item's risk tier and adversarially challenges every finding before confirming it. It
returns VERDICT, RISK-TIER, DET-GATE, VISUAL, MEASUREMENTS, CONFIDENCE, CRITIQUE,
FINDINGS-CONFIRMED, FINDINGS-CHALLENGED-OUT, DECISION-LOG.

The gate is headless and driven from Node, so it runs the same unattended. If it reports no usable browser (`npm install` never ran), a missing framework base
(`npm run build:osui`) or a stale theme (`npm run build:theme`), that is a **harness fault to fix and re-run** — not a design
verdict, and never a reason to relax the gate.

Route the verdict:

- **DET-GATE: fail** → a build break, not a design miss. Feed the breakage to the maker to fix;
  log `det_gate: fail` but do **not** count it against `max_rounds_per_item` the way a fidelity
  FAIL counts — a broken build is mechanical. If it will not go green, return `DET-GATE-FAIL`.
- **VISUAL: drift** → the build does not match the design. Feed the MEASUREMENTS table back to
  the maker and count it as a fidelity FAIL round. **Drift is NEVER filed as a finding** — a
  finding goes to a designer, drift goes back to the maker.
- **VISUAL: unverified** → treat as FAIL, never PASS. Either the ref is missing (→ re-snapshot
  per step 1; if it cannot be obtained, `BLOCKED-NO-REF`) or the measurement could not be
  taken (→ fix the harness and re-run). An item has not been reviewed for fidelity until
  something measured it.
- **FAIL (subjective)** → feed the CRITIQUE to the maker and increment the round counter. Over
  the max rounds in `loop/goal.md` (3 when there is no goal.md) → return `FAIL-CAPPED` with the critique.
- **PASS** → step 4.

## 4. On PASS

Record on the item: `risk_tier`, `det_gate: pass`, `visual: pass`, `rounds`. Status `built`.
Keep the maker's and checker's decision logs for the PR body (below), not the state file.

Write the handover document (`handover/<artifact>.md`) with the DECISION-LOG in a collapsed
`<details>` ("Why / alternatives ruled out") and the design-variant → framework-class mapping
table, and run `node build/embed-handover-code.mjs` so it carries the verbatim code to paste into
ODC.

### Build and publish the review Artifact

The owner reviews the build as a published page, not as local HTML. Run
`npm run review -- <id>` and publish `review/<id>.html` with the Artifact tool:

- If the item already has `review_url` in `loop/state.json`, pass it as `url` so the new build
  becomes the next version of the same page — that version history is how a reviewer compares
  rounds. Otherwise publish a new Artifact and record its URL as `review_url`.
- The page opens on a clean demo of the component beside the Figma frame, then the measurements
  against the judged baseline, the findings and the code to paste. It is the link that goes in the
  PR body and, after the merge, the handover.
- No Artifact tool in this run (headless, scheduled) ⇒ skip the publish, say so in the PR body with
  the command to run, and leave `review_url` unchanged. Never block a PASS on it.

**The reasoning goes into the PR and the handover — never into the artifact.** The maker's
decision log, the scope it deferred, the framework selectors it surveyed and the ratios it
computed all have destinations below and in `comment-budget.md`; a copy of any of them in a file
header is a second original that nobody reviews and nothing keeps current. A ref-vs-drawing
disagreement goes back into `specs/<kind>/<id>/ref.md` under `## Ref discrepancies`, where the next
snapshot can settle it.

Commit on `ITEM.branch` using an `outsystems-git-helpers` message.

### Then open the PR — the item is not done until a human can review it

```bash
git push -u origin "$BRANCH"
gh pr create --base "${ITEM_BASE:-main}" --head "$BRANCH" \
  --title "[deliverable] <Component> — <artifact kind> (item <id>)" \
  --body-file "$BODY" --label deliverable
```

Compose `$BODY` from **`pr-body.md`** — every heading, in its order, decision logs verbatim,
MEASUREMENTS table included, fidelity status stated in the open when it is not `pass`. Write it
with a heredoc to a file and use `--body-file`; a long `--body` argument mangles the tables.

Then set the item's status to `ready-for-review` and record `pr_url`. Return `PASS`.

**Never merge, and never approve.** The loop stops at an open PR — that is the human's signature
(merging is the human's approval). **Never open the handover Task here** either: a handover says "paste this into
ODC", and nothing may say that about code sitting on an unmerged branch. The caller opens it after
the merge.

**Do not** create handover issues or attach sub-issues — the caller owns that.

### If the push or the PR fails

A PASS whose PR never opened is work nobody will see. Do not swallow it: leave the item `built`
with `pr_error` set to the exact `gh` output, say so in the report, and let the caller decide.
Common causes worth naming in the error — no `origin` remote, no `gh auth`, the branch already has
an open PR (reuse it, and say you did), or a protected base rejecting the push.

## 5. Findings — file only what survived the challenge

- **FINDINGS-CONFIRMED:** dedup by `[node:<id>]`. At or above `findings.gate`, file a GitHub
  issue with labels `finding,bug,<type>,sev:*` — **no `--type` flag** unless the repo has issue
  types configured (on a repo without them `gh` creates the issue, then fails, and a retry
  duplicates it) — add it to the Project, set `disposition: filed`. Below the gate, write the
  register row only. Allocate `FND-NNN` from the "Next ID" line on `origin/main` when you write
  the row. **Never**
  resolve a brand or a11y conflict — flag, don't fix.
- **FINDINGS-CHALLENGED-OUT:** record in `findings/findings-register.md` as
  `disposition: not-reproduced` with the checker's usage evidence and
  `challenged_by: round <n>`. Do **not** open a bug. This is the false-positive filter — a
  refuted finding never reaches a human's triage queue.

Findings are the one GitHub write that stays here: they are a property of the *build*, not of
the caller's tracker, and both callers want them filed identically.

## 6. Persist

Write `loop/state.json` after every item. It is an index, not a log: per item keep only `id`,
`tier`, `level`, `node`, `status`, `pr_url`, `review_url`, `handover_issue`, `rounds`, `risk_tier`, `det_gate` and
`visual` (plus `pr_error` when the PR failed); per finding `id`, `item`, `class`, `severity`,
`status`, `summary` and `disposition`. Decision logs, evidence and round-by-round critique go in
the PR body and `ref.md` — a state file that carries them grows to hundreds of KB and merges
badly.

Commit `specs/<kind>/<id>/probes.json` and `measurements.json` with the item — the probes are
the permanent regression test and the measurements the judged baseline CI diffs against. A
reviewer who doubts a number re-runs the exact probe. Screenshots stay in the gitignored
`review/`; the review Artifact is the visual evidence.
