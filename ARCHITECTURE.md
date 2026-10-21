# Architecture — where knowledge lives

## The rule

> **This plugin holds no OutSystems platform knowledge, the same way it holds no project values.**

Platform facts are read at runtime from a pinned copy of OutSystems' own frontend-skills pack.
Project values are read at runtime from the consuming repo's `project.config.json`. What is left
in here — process, policy, judgement, and the things upstream has no reason to cover — is the
plugin.

Three packages, one direction of dependency, and nothing owns anything above or below it:

```
vendor/outsystems-frontend-skills/     OutSystems, upstream       pinned · never edited
              ▲  read by path at runtime
lsg (live-style-guide-loop)            this repo                  /plugin install --scope project
              ▲  read at runtime
project.config.json                    the consuming project      per-customer values
```

## The test

For any sentence you are about to write in this repo:

| The sentence answers | It belongs |
| --- | --- |
| *What does OutSystems have, and how does it work?* | upstream — cite it |
| *What do we do about it?* | here |

"OutSystems UI ships a `Pagination` block with `OnNavigate`" is upstream. "Reaching for a
hand-rolled arrow button instead is a FAIL" is ours. The first is a fact with an owner; the second
is a judgement, and judgements are what this plugin is for.

When something is genuinely absent upstream — BEM naming, custom Block and Script internals, the criteria
WCAG 2.2 adds over 2.1 — that is **not overlap**, and it stays here. Absence is the test, not
topic. Accessibility is not "upstream's topic"; WCAG 2.1 mapped onto OutSystems widgets is
upstream's *content*, and 2.2's additions are ours because nobody else carries them.

## What upstream owns

Read these; never restate them.

| Need | Path under `vendor/outsystems-frontend-skills/` |
| --- | --- |
| Every block: arguments, placeholders, events | `ui-frameworks/outsystems-ui/blocks-index.md` |
| Right component for the content | `.claude/skills/references/component-selection.md` |
| Widget conventions, the silent-failure rules | `ui-frameworks/outsystems-ui/widget-conventions.md` |
| Extending a pattern beyond its inputs (L4.5) | `ui-frameworks/outsystems-ui/extensibility.md` |
| CSS variables, utility classes, palette, scales | `ui-frameworks/outsystems-ui/styles-and-utilities.md` |
| Where CSS belongs and what to override | `common/css-customization.md` |
| WCAG 2.1 AA on OutSystems widgets | `common/accessibility.md` |
| Breakpoints, responsive vs adaptive | `common/responsive-design.md` |
| Screen templates and end-to-end recipes | `ui-frameworks/outsystems-ui/screen-templates.md`, `recipes/` |
| Mobile UI Template (Ionic) and its `--token-*` system | `ui-frameworks/mobile-ui/`, `foundations/outsystems-design-tokens/` |
| Charts, Maps | `ui-components/` |
| Implementation-quality rubric (16 criteria) | `.claude/skills/review-ui-implementation/rubric.md` |
| Perceived-quality rubric (16 criteria) | `.claude/skills/runtime-ui-audit/rubric.md` |

## What this plugin owns

Figma ingestion · token translation · BEM naming · custom Blocks, their Scripts and Web Components · the
flag-don't-fix findings pipeline · Style Guide pages · git artifacts · project setup · the
maker/checker loop, the rendered-fidelity gate, risk tiers, adversarial refutation ·
one PR per deliverable · the WCAG 2.2 delta · **driving Mentor over the MCP and verifying what
it actually did**.

That last one passes the test in both directions. *"`LayoutTopMenu` exposes six placeholders"*
is upstream, and `outsystems-mentor-build` cites it. *"Read the module's theme for its default
layout before prompting, publish between turns, and never trust `change_applied: true` without
loading the page"* is judgement about a tool upstream does not know exists — so it is ours. The
Expression-escaping trap sits there too, by the absence test: upstream documents the widget
hierarchy, but nothing upstream covers what happens when an agent instructs a Traditional Web
property on an ODC reactive widget and is told it worked.

## The one accepted cost

**Upstream is written to WCAG 2.1 AA. This loop commits to 2.2 AA.** The gap is not overlap, so it
lives here, in exactly one file: `outsystems-design-findings/references/wcag-2.2-delta.md`. It
contains the seven criteria 2.2 adds and nothing else.

If upstream moves to 2.2, **delete that file** rather than reconciling it. A delta that outlives its
gap becomes a second source of truth, which is the failure this whole document exists to prevent.

## Two ways upstream can be present

The path is `vendor/outsystems-frontend-skills/` in both cases, so no skill, citation or review
question changes between them.

| Mode | What it is | Cost |
| --- | --- | --- |
| `submodule` | A pinned checkout of the upstream repo. The target state. | none |
| `vendored-copy` | The pack committed into the consuming repo, for when upstream access does not exist yet. | **No commit, so it cannot be diffed or dated against upstream.** You cannot tell a stale copy from a current one. |

A `vendored-copy` is a stopgap with a real cost, not a second valid design. It survives only while
the boundary rule does: read it, never edit it. The first edit makes it a fork, and a fork cannot be
swapped for a submodule — it has to be merged, by someone who no longer remembers what they changed.
`project.config.json` records which mode a project is in, and `project-setup` reports it every run
so it stays visible.

## Updating upstream

A submodule bump, nothing more:

```bash
git -C vendor/outsystems-frontend-skills fetch --tags
git -C vendor/outsystems-frontend-skills checkout <newer-tag>
git add vendor/outsystems-frontend-skills
```

Then re-check the mapping tables that name upstream identifiers — chiefly
`outsystems-token-extractor`'s Figma→variable map, whose right-hand column belongs to the framework.
Names we assert that upstream does not declare are drift, and drift is resolved in upstream's
favour.

Never edit inside `vendor/`. If upstream is wrong, that is an issue against upstream, and the
workaround lives on our side of the line.

## Enforcing this in review

Three questions on any PR to this repo:

1. **Does this state a platform fact?** Then it is either a citation or it is in the wrong repo.
   Restating an upstream fact "for convenience" is how the two copies start disagreeing — and the
   copy people trust is the nearer one, which is the stale one.
2. **Does a skill answer a catalog question with no path to read?** Then it is answering from
   memory. Say so and stop, rather than shipping a confident guess.
3. **Is anything under `vendor/` modified?** Then the boundary is already broken.
