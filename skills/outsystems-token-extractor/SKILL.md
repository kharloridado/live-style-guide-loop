---
name: outsystems-token-extractor
description: Translate Figma design tokens into OutSystems UI CSS custom properties declared in :root — or, for a project built without OutSystems UI (framework none, only when the owner said so), into the source system's own tokens with the project prefix. Use this skill whenever the user shares Figma token specs, design system values, brand colors, or asks how to set up :root CSS variables. Pull tokens directly from Figma via get_variable_defs MCP tool when a URL is provided.
---

# OutSystems Token Extractor (Figma-aware)

## Pre-flight
1. Read `project.config.json` for `classPrefix`, `jsNamespace`, `environment` and `framework`. If the file is missing or still holds `<<PLACEHOLDER>>` values, stop and run `/lsg:project-setup` — never guess a value. Spacing scale, grid, breakpoints and default sizes are enforced only when written in the project's `specs/foundations/` or `specs/decisions.md` — never assumed or guessed; with nothing written, raise no finding about them.

## Which variable system — check this first

Two OutSystems frameworks, two disjoint variable namespaces, and targeting the wrong one is a
silent no-op that looks like a working theme:

| App type | Namespace | Catalog |
| --- | --- | --- |
| Reactive Web / Phone App Template (OutSystems UI) | `--color-*`, `--space-*`, `--font-size-*`, `--shadow-*` | `vendor/outsystems-frontend-skills/ui-frameworks/outsystems-ui/styles-and-utilities.md` |
| ODC Mobile UI Template (Ionic-based) | `--token-*` | `vendor/outsystems-frontend-skills/foundations/outsystems-design-tokens/design-tokens.md` |

This skill defaults to OutSystems UI. Confirm the stack before generating, and never mix the two in
one `:root`.

## `framework: "none"` — the source system's own tokens

A design system built without OutSystems UI (`framework: "none"`, set only when the owner
explicitly said not to use it) maps onto nothing. There is no framework underneath, so no variable to redefine and nothing to fall
back on: `tokens/*.css` declares every token. Take each name and value from the source system's
published tokens (USWDS's on designsystem.digital.gov), keep its own type and token names, and put
the project prefix in front — `--uswds-color-primary`, `--uswds-units-2`. Never round a value onto
another system's scale. The sections below about OutSystems UI names, collisions and the mapping
table do not apply; the output format, comment budget and a11y verification do.

## Every name in the right-hand column must be verified upstream

The mapping table below is a **mapping**, not a catalog — the left column is ours, the right column
belongs to the framework, and this repo does not get to assert what the framework declares. Before
emitting a variable, confirm the name exists in the upstream catalog for the stack above.

Names in the table below that upstream does not list are drift and must be resolved, not shipped.
Known suspects to check on the next upstream bump: `--border-radius-pill`, `--font-size-2xl`,
`--space-2xl`, `--space-3xl` — upstream documents `--border-radius-{none|soft|rounded|circle}` and
`--space-{none|xs|s|base|m|l|xl|xxl}`. If the framework has no such name, the token is
component-scoped and takes the project prefix instead; it does not get to squat a
framework-shaped name the framework never declared.

## When to use
- User shares Figma token specs / Variables / brand guidelines
- User asks "generate :root", "update brand colors", "set up theme"
- User says "translate these tokens for me"

## Figma MCP integration
If user provides a Figma URL:
1. Call `get_variable_defs(url)` → pull all Figma Variables
2. Map each to OutSystems UI naming convention (with `framework: "none"`, to the source system's
   own names with the project prefix)
3. Generate :root block
4. List which tokens are new vs. modifications

## The names below collide with OutSystems UI on purpose

Every variable in the right-hand column is one **OutSystems UI already declares**. Redefining it
is the point: the theme loads after the framework, so its `:root` wins, and every OSUI widget in
the app — including the ones this project will never open — renders in the customer's brand.

So: **never namespace a token away from a framework name to dodge a collision**
(`--acme-space-m` beside `--space-m`), and **never file a collision as a finding.** A theme that shares no names with the
framework themes nothing.

What a collision *does* deserve is a recorded decision, because you are re-pointing a value the
framework's own widgets consume. `--space-m` is read by ~146 rules in compiled OutSystems UI —
if the design's `m` step is 16px where the framework's was 24px, every one of those rules moves.
That is a real question for a designer — *which step of our scale is `--space-m`?* — and it
belongs in the register with the consumer count, addressed as a mapping question. It is not a
defect in the theme, and the answer is never "add a prefix".

State in the handover which framework properties the theme re-points, and what moves as a result.

A **component-scoped** token (`--acme-button-height`) is a different thing and stays prefixed:
the framework has no name for it, so there is nothing to override.

## Token mapping (Figma category → framework variable; verify every right-hand name upstream)

| Figma Category | OutSystems UI Variable |
|---|---|
| Color / Brand / Primary | `--color-primary` |
| Color / Brand / Primary Hover | `--color-primary-hover` |
| Color / Brand / Secondary | `--color-secondary` |
| Color / Neutral / 0-10 | `--color-neutral-0` … `--color-neutral-10` |
| Color / Semantic | `--color-success/error/warning/info` |
| Typography / Family / Body | `--font-family-body` |
| Typography / Family / Heading | `--font-family-heading` |
| Typography / Size / Display | `--font-size-display` |
| Typography / Size / H1-H6 | `--font-size-h1` … `--font-size-h6` |
| Typography / Size / Base | `--font-size-base` |
| Typography / Size / xs-2xl | `--font-size-xs` … `--font-size-2xl` |
| Typography / Weight | `--font-weight-regular/medium/semi-bold/bold` |
| Spacing / Base | `--space-base` |
| Spacing / 0-96px | `--space-none/xs/s/m/l/xl/2xl/3xl` |
| Radius | `--border-radius-none/soft/rounded/circle/pill` |
| Shadow | `--shadow-xs/s/m/l/xl` |
| Breakpoint | `--breakpoint-small/medium/large` |

## Output format

```css
/* @section Foundations / Colors */
/* Colors for [Customer / Project]. Source: [Figma file key + node, pulled <date>]. */

:root {
  /* Brand */
  --color-primary: #1A73E8;
  --color-primary-hover: #1557B0;

  /* Neutral */
  --color-neutral-0:  #FFFFFF;
  /* ... etc ... */

  /* Semantic */
  --color-success: #16A34A;
  --color-error:   #DC2626;
  --color-warning: #F59E0B;
  --color-info:    #0EA5E9;   /* #31 filed: 2.9:1 on white, built as drawn */
}
```

**One comment per group, and a ratio only where a pairing FAILS and the finding is filed.**
Passing ratios are computed and reported — in the PR's Gates section and the a11y verification
below — not annotated beside every token. A `/* 5.3:1 ✓ */` on a line nobody reads is a measurement
in the wrong place, and it silently goes stale the day the value changes. The one ratio worth
keeping in the file is a failing one with its issue number, because it is what stops the next
maker from "fixing" a value the brand owner already ruled on. Full rule:
`skills/design-loop/references/comment-budget.md`.

After block, provide:
1. **Where to paste:** Theme module (O11) / Theme Library (ODC)
2. **Token delta summary**
3. **A11y verification:** All text/bg combinations meet WCAG 2.2 AA contrast (4.5:1 normal, 3:1 large/UI)
4. **Live Style Guide:** which Styles page shows the change. When the project's Styles pages
   render from the theme (the `TokenReference` Block), nothing to edit — the new tokens appear at the
   next theme publish; say so. Otherwise name the page and the rows to add
   (`outsystems-style-guide-doc`). A new colour family also needs the Colors narrative checked.

## A11y verification (always do this)

For every color paired with a text or border context, calculate contrast and **report the table**
— in your reply, and in the PR's Gates section when the loop is driving. In the CSS itself, only a
failing pair leaves a mark, and only once its finding exists:
`/* #31 filed: 2.1:1 on white, built as drawn */`.

If a token fails contrast for its expected use case, **emit the token as designed** and raise an
`accessibility/contrast` finding through `outsystems-design-findings`. The darker alternative goes
in the finding as advice for the designer — never into the `:root` block. Formula and thresholds:
`outsystems-design-findings` → `references/contrast-calculator.md`; the criteria WCAG 2.2 adds over
upstream's 2.1 baseline: `references/wcag-2.2-delta.md` in the same skill.

## Reference

This skill carries no variable inventory. Read the catalog for the stack from the table in
**Which variable system** above.
