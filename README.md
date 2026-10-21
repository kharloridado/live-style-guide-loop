# OutSystems Design Loop — Claude Code plugin

The **behaviour** half of the Figma → OutSystems design-system workflow: 13 skills, the
`maker` / `checker` agent pair, and two hooks.

It holds **no OutSystems platform knowledge**. Block names, arguments, CSS variables, utility
classes, widget conventions and the WCAG-to-widget mapping all live in OutSystems' own
frontend-skills pack, vendored as a pinned submodule and read at runtime. This repo holds the
process, the policy and the judgement. See [ARCHITECTURE.md](ARCHITECTURE.md) — that separation is
load-bearing, not tidiness.

The **project-shaped** half (`specs/`, tokens, build pipeline, fidelity gate and review pages, findings register, handover
bodies, GitHub scaffolding) lives in the companion scaffold,
[`outsystems-project-template`](https://github.com/kharloridado/outsystems-project-template).

## Why this is a plugin and not a folder you copy

It used to be a folder you copied. That is exactly why it broke.

Each new project got its own copy of the skills and agents. Improvements made while working on a
real engagement — a deterministic build gate, risk-tiered review, adversarial finding refutation,
frozen Figma refs — stayed in that project and never flowed back. The template went stale, and the
next project started from the *older, worse* loop without anyone noticing.

A versioned plugin makes that impossible: bump the version, and `/plugin update` reaches every
project at once.

## Install

```bash
/plugin marketplace add kharloridado/outsystems-loop
/plugin install outsystems-loop@outsystems-loop --scope project
```

`--scope project` checks the dependency into the repo so the whole team (and unattended loop runs)
get the same version.

### 4.0 — no board, interactive first, gates as hooks

- **Board mode is gone** (`board-ship`, `board-sync` and their references). No project ran it; a
  human merging the item's PR is the approval. Pair 4.x with template 0.3+.
- **`design-loop` leads with the common case** — one request in a session → one PR with its review
  Artifact. Queue runs read `loop/goal.md`'s Run settings; `loop/state.json` is an index with a
  fixed status list (`check:state` warns on anything else).
- **Hooks**: a `PreToolUse` gate runs `npm run build:theme` before any `git commit` that touches
  `tokens/`, `src/`, `specs/` or `build/`, and blocks it with the build's errors when it fails; a
  `SessionStart` check names missing setup (deps, submodule, OutSystems UI base, unfilled config).
- **Retired**: `figma-to-outsystems` (a second orchestrator beside `design-loop` and the router),
  and `outsystems-onboarding` / `outsystems-project-context`, which kept project values in
  claude.ai memory — they come from `project.config.json`, and only from there.

### 3.0 — the specs layout and review Artifacts

3.0 expects the project layout from
[Expose your design system to LLMs](https://hvpandya.com/llm-design-systems), as shipped in
`outsystems-project-template`:

- Items live under `specs/<kind>/<id>/` (frozen `ref.md`, `variables.json`, `figma.png`,
  `specimen.html`, `probes.json`, `measurements.json`), with an 8-section usage spec at
  `specs/<kind>/<id>.md`. The id prefix picks the kind: `cmp-` components, `pat-` patterns, `tok-` tokens.
- There is no preview page. The maker writes a specimen, the gate builds and measures the page
  around it, and every build ends in a review Artifact (`npm run review -- <id>`) whose link goes in
  the PR and the handover.
- `npm run build:theme` includes the token audit; the checker's deterministic gate requires zero
  errors.
- Widget structure comes from `vendor/outsystems-frontend-skills`; rulings and signed-off
  exceptions from `specs/decisions.md`.

A project still on `loop/refs/` and `preview/index.html` should stay on 2.6.0 until it adopts the
template's layout.

## What's in it

**Agents**
| Agent | Role |
| --- | --- |
| `@outsystems-loop:maker` | Builds ONE work item faithfully against the frozen Figma ref. Raises findings; never fixes them. Declares a risk tier and a decision log. |
| `@outsystems-loop:checker` | Judges it. Deterministic build gate → **rendered-fidelity gate** → risk-tiered depth → five domains → adversarial finding refutation → structured verdict. Never modifies files. |

**Skills**
| Skill | Role |
| --- | --- |
| `/outsystems-loop:project-setup` | **Start here on a fresh clone.** One pass: interview → config → deps + submodule → labels → deliverables into the signed inventory → routines → verify it all builds. |
| `/outsystems-loop:design-loop` | The orchestrator: freeze ref → maker → checker → commit → **one PR per deliverable** → findings. One request, or the signed queue in `loop/goal.md`. |
| `/outsystems-loop:revalidate` | Re-run the checker against an **already-built** artifact, item or PR — no maker, no rebuild. For review questions, hand-edits, or a verdict you distrust. |
| `outsystems-frontend-router` | First stop for OutSystems UI questions and builds: routes into the vendored frontend-skills pack by path, checks it against the live app, and splits the work by ODC module (theme first, then each consumer app). |
| `outsystems-component-audit` | Triage a design: exists as-is / customize (dual track) / build custom (L1–L5). |
| `outsystems-token-extractor` | Figma variables → `:root` custom properties. |
| `outsystems-figma-integration` | Read Figma directly via MCP. |
| `outsystems-bem-css` | BEM CSS that overrides native widgets, token-only. |
| `outsystems-web-component` | Vanilla-JS Web Components + Block wrapper (L5 only). |
| `outsystems-mentor-build` | Driving a build into a live ODC module through Mentor/MCP — or writing the Mentor prompts a developer pastes — and verifying it landed. |
| `outsystems-design-findings` | The flag-don't-fix pipeline: classify, refute, route. |
| `outsystems-style-guide-doc` | Live Style Guide pages. |
| `outsystems-git-helpers` | Conventional commits, branches, PRs, changelog. |

**Hooks** (`hooks/hooks.json`, active in any project with a `build:theme` script and a
`project.config.json`)
| Hook | Does |
| --- | --- |
| `PreToolUse` → `pre-commit-gate.mjs` | Before `git commit` touching `tokens/ src/ specs/ build/`: runs `npm run build:theme`; exit 2 with its errors if red. Skipped in the unfilled template. |
| `SessionStart` → `session-check.mjs` | Adds one line per missing setup step to the session's context. Silent when set up. |

## Two contracts, same shape

The plugin sits between two things it does not own, and reads both at runtime.

**Upstream — platform knowledge.** `vendor/outsystems-frontend-skills/`, a pinned submodule of
OutSystems' own pack. Never edited, never copied from. A skill that needs to know whether a block
exists reads `blocks-index.md`; it does not carry a list of its own. When the submodule is missing,
skills say so and stop rather than answering from memory — a guessed catalog inflates L4/L5 and
produces a costed plan for work that did not need doing.

Bump it with a submodule checkout, then re-check any mapping table that names upstream identifiers.
Full rules in [ARCHITECTURE.md](ARCHITECTURE.md).

**Downstream — project values.** The agents hold **no project values**. They read them at runtime from `project.config.json` in the
consuming repo — `classPrefix`, `jsNamespace`, `conventions`, `knownFalsePositiveClasses`. That is
what makes one plugin serve every customer.

The most important field is the shape of `conventions`. Each one carries a status:

```jsonc
"spacingBase": { "value": null, "status": "TBD" }   // confirmed | assumed | TBD
```

and the checker enforces one rule about it:

> **A finding may never be raised against a convention that is not `confirmed`.**

This exists because a previous template shipped `Spacing base: 4pt` as a plausible-looking default
that nobody had actually verified. The loop then dutifully flagged every value that wasn't a
multiple of 4, manufacturing a batch of false-positive findings and a bug that had to be closed as
not-planned. **A credible-looking default is worse than a blank.**

## The output: one PR per deliverable

The loop's unit of work is one item, and its unit of *review* is one PR. Each item is cut fresh
from `origin/main`, built, checked, and landed as an **open PR** whose body carries the plan, the
spec of record, the gate results including the MEASUREMENTS table, both decision logs verbatim, and
the findings — filed and challenged-out. The template is
`skills/design-loop/references/pr-body.md`.

This is where the loop's reasoning goes. It used to live in `state.json` and a run report, which
meant a reviewer opened a diff and re-derived intent from the code — the expensive half of review,
repeated per component. The build already produces all of it; the PR is simply where a human is
actually looking.

**And it goes there instead of into the code.** The artifact says WHAT; the PR says WHY. The
maker once wrote its decision log, its deferral rationale and its framework-selector survey into
the CSS file header — prose the reviewer already had in the PR, the developer scrolled past while
pasting into ODC, and `build:theme:ship` stripped from the customer's copy. The test is simple: delete the
declaration and read the comment — if it still makes sense on its own, it is PR prose in the wrong
file. The checker fails an artifact that carries rationale, and
`skills/design-loop/references/comment-budget.md` says where each kind of prose goes instead.

The loop **never merges and never approves**. It stops at an open PR, and the handover Task is
opened on the *next run* after that PR has merged — self-healing, so a crashed run loses nothing.

## Where it runs

Everything the loop reads is a file in the clone — the signed inventory in `loop/goal.md`, item
status in `loop/state.json`, values in `project.config.json` — so it runs the same at a keyboard,
on a local schedule, and as a cloud routine. Two rules hold everywhere: **no agent merges** (the
human merging the PR is the approval), and **the handover Task is opened after the PR merges**,
never at checker-PASS. The routine prompts are in `skills/project-setup/references/routines.md`.

## The rendered-fidelity gate

The checker does not review fidelity by reading CSS. It builds the item's specimen page from
`specs/<kind>/<id>/specimen.html`, measures the **computed** style of every value the frozen ref states,
and returns a MEASUREMENTS table plus `VISUAL: pass | drift | unverified`. Drift or unverified
forbids a PASS.

> A correct declaration in our source proves nothing. Framework and provider CSS out-specify it and
> win silently — so the review must cite `getComputedStyle`, not a line number.

This exists because the previous "compare it to the screenshot after a PASS" instruction was handed
to an agent whose tools were `Read, Grep, Glob, Bash`: it could not render anything, so the check
never actually happened. A component shipped with an icon at 1.06:1 contrast and 20% undersized —
**our source was right; only the computed style was wrong**, and nothing in the loop was looking at
the computed style.

**It runs headless, from Node** — `build/gate/measure-fidelity.mjs`, driving Playwright. That is what
makes an unattended run able to return a real verdict. The gate used to go through an editor-only
Chrome extension, so every scheduled run reported `unverified`, `unverified` caps at FAIL, and the
nightly loop could never hand over finished work. The identical command now runs at a keyboard, in
a routine, and in CI.

The script measures; it does not judge. It never reads the ref, so it cannot call drift — it
reports numbers and an exit code (`0` measured · `3` something unmeasurable · `4` no browser or no
page), and the checker compares them to the ref. Keeping mechanism and judgment apart is what stops
the gate from grading itself.

### Judged once, verified forever

The checker's verdict is written into the PR at build time and never re-computed — so a fixup
commit, or a token changed on `main` after the branch was cut, would leave the PR carrying a
measurement that no longer describes what would merge.

`build/gate/compare-measurements.mjs` closes that. The `measurements.json` the checker commits with
each item becomes a **baseline**; re-running the same probes later and diffing against it answers a
strictly narrower question that needs no judgment at all:

| | The question | Who answers | Cadence |
|---|---|---|---|
| Build time | *Is this right?* — the render vs the frozen Figma ref | the checker (an agent) | once per item |
| Every push | *Did this change?* — vs the committed baseline | `compare-measurements.mjs` | free, forever |
| On demand | *Is this still right?* — re-judge, no rebuild | `revalidate` | when asked |

That makes a CI gate possible with **no API key and no tokens spent**, and it turns every committed
`probes.json` into a permanent visual regression test — the suite grows with each deliverable, so a
token change that breaks component #3 is caught while building component #9.

> ### Why both scripts live in the TEMPLATE, not in this plugin
>
> They were here first, and CI proved that wrong. This plugin repo is **private**; a consuming
> project may be **public**. A workflow in the project cannot clone a private plugin without a PAT,
> and putting a token for a private repo into a public repo's CI is the wrong trade — so the gate
> failed on its very first run with `could not read Username for 'https://github.com'`.
>
> The deeper point is that these two files are not *behaviour*. They are deterministic Node tooling
> that measures and diffs, exactly like `build-theme.mjs` and `validate-theme.mjs`, and they sit in
> `build/gate/` beside them. The plugin holds the **instructions** for using them — when to probe,
> what a drift means, what may never be relaxed — which is the part that actually goes stale when
> copied. One copy of the script, in the repo that runs it; one copy of the judgment, here.
>
> Consequence: `build/gate/` ships with the template, so an existing project picks up an
> improvement by pulling the scaffold, not by `/plugin update`. That is the same trade every other
> `build/` script already makes.

The comparison is **typed by stability**, and that detail is load-bearing: computed strings
(colour, `font-family`, `font-size`, radius, weight) are environment-stable and diff exactly, while
`rect`/`ink` geometry depends on font rasterisation and is compared with a tolerance and reported as
*informational*. A naive deep-equal would fail every pull request on sub-pixel noise, and a gate
that cries wolf every time teaches people to click through it — at which point it misses the real
regression too. The highest-value catch, a webfont silently falling back to a system stack, is a
`font-family` string diff, and that is perfectly stable.

Three consequences for the consuming project:

- It keeps each item under `specs/<kind>/<id>/` (frozen `ref.md`, `specimen.html`, `probes.json`,
  `measurements.json`) with a usage spec beside it, lists every block file in `src/blocks/index.css`,
  and exposes `npm run gate:measure`, `gate:regression` and `review`. The specimen page loads the
  framework base, `dist/theme.css` and every block file from that manifest, so nothing is hand-linked.
- It needs a browser: `playwright-core` plus an installed Chrome or Edge (no download), or the full
  `playwright` package with bundled Chromium.
- **A failed stylesheet or font request invalidates the whole viewport.** A missing CSS file does
  not throw — the cascade falls back and every computed value still reads as a plausible number
  describing a page nobody will ever see. The commonest cause is the framework base
  (`review/vendor/outsystems-ui/`) never being built, and it is why `git submodule update --init` is not optional.

## Local development

```bash
claude plugin validate . --strict
/plugin marketplace add ./          # test from a working copy before publishing
```

Bump `version` in **both** `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` to
ship an update — pushing commits without a version bump does not update installs.
