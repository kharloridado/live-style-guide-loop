# Routines — the scheduled runs, created for the user

Exact prompts for the scheduled runs `project-setup` offers to create. **Ask first** — a
scheduled run is persistent configuration that runs unattended and spends the user's budget, so
it is theirs to authorise.

Everything a routine reads is a file in the clone, so each one runs the same as a **cloud**
routine (Claude Code on the web — fires whether or not the laptop is on) or a **local** schedule
(the session's cron tooling or `/loop` — lives only while that session is open, and a recurring
session job expires after 7 days). Cloud is the default.

| # | Routine | Cadence |
|---|---|---|
| 1 | Loop advance | nightly |
| 2 | Token-drift reconcile | weekly |
| 3 | Findings digest | daily or weekly |

## What any routine can and cannot do

**Can:** read the repo, read Figma (with the connector attached), run the build, run the
**rendered-fidelity gate** — a headless browser driven from Node, so it runs in a routine exactly
as it does at a keyboard — commit, push, open issues, open PRs. All REST, all fine.

**Must not:** merge, approve, open a handover Task for unmerged work, or push past a `pause`
checkpoint. Merging a PR is the human's signature, and being unattended does not loosen it.

**Needs the Figma connector attached at creation time** (routines 1 and 2). Without it no ref can
be frozen, and an item with no ref goes `needs-human` rather than being built from a guess — a
whole night producing nothing. Tell the user this while they are creating the routine, not after.

---

## 1. Loop advance — the main event

**Cadence:** nightly (a weekday-evening slot works well: the PRs are
waiting in the morning).

```
Follow the /lsg:design-loop skill procedure for this repo.

The queue is the signed inventory in loop/goal.md; build every item whose status in
loop/state.json is `queued`, in inventory order, up to <N> items this run.

One branch per item, cut fresh from origin/main. One PR per item, opened with the full
body from the skill's pr-body.md reference: the plan, the spec of record, the gate
results including the MEASUREMENTS table, and BOTH decision logs verbatim.

Never merge, never approve, never open a handover Task — a handover must never point at
an unmerged branch. RESPECT every checkpoint in loop/goal.md: on reaching one marked
`pause`, STOP immediately, write loop/REPORT.md, and do not proceed past it.

File findings as bugs only after they survive the adversarial challenge. Persist
loop/state.json after every item. Do NOT touch OutSystems.

End by writing loop/REPORT.md with the PR URL for each item and the Review metrics
block, then give a five-line summary naming anything left needs-human and why.
```

Pick `<N>` with the user. Small (3–5) is usually right: it is the number of PRs they are willing
to review in one morning, not the number the machine can produce.

## 2. Token-drift reconcile — recurring forever

**Cadence:** weekly. Optionally also a webhook on the
Figma library publishing.

A design system's tokens move after handover, and drift is invisible until something looks wrong
in production. This is the highest-value recurring routine for a long engagement.

```
Re-pull the Figma library named in project.config.json via the Figma MCP. Extract the
full token set and reconcile it against tokens/*.css: classify every token as new,
changed, off-scale, or removed.

For anything off-scale or ambiguous, file a design-token issue (labels finding,bug,token;
no --type flag), deduplicated by a [token:<name>] marker in the body — check for an
existing issue before opening one.

Run `npm run build:theme`. If tokens changed, open a PR "chore(tokens): reconcile design
tokens" on a fresh branch from origin/main and summarise the drift in the PR body as a
table: token, old value, new value, classification. Do NOT merge it, and do NOT rebuild
any component.

Never enforce a convention whose status in project.config.json is not `confirmed`.
End with a five-line summary.
```

## 3. Findings digest — optional, read-only

**Cadence:** daily, or weekly on a slower engagement.

```
List open issues labeled "finding" in this repo, grouped by severity. Write a short
digest: counts per severity, then the blocker and high titles with links, and how long
each has been open. Post it to the team channel if one is configured; otherwise append
it to loop/REPORT.md. Make NO changes to any issue and open no PRs.
```

---

## Reviewing a routine's output

The PRs are the output. `loop/REPORT.md` is the run's own account of itself, and its
`## Review metrics` block is where a degrading pipeline shows up first:

- **rendered-fidelity coverage** — `visual: pass` vs `drift` vs `unverified`, and how many
  properties were actually measured. Watch this one. Every other metric measures throughput, and a
  pipeline shipping drifted components scores perfectly on all of them.
- findings filed vs challenged out — the false-positive rate.
- round-1 pass rate, deterministic-gate pass rate, risk-tier coverage.

A run of `unverified` items is a **harness fault**, not a design problem: no browser, or a failed
stylesheet request because `vendor/outsystems-ui/` was never built. Fix the harness, re-run; never
relax the gate to make the number go green.
