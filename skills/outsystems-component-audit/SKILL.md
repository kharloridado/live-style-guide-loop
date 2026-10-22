---
name: outsystems-component-audit
description: Analyze a Figma design and produce a structured component audit that classifies every UI element as (1) exists in OutSystems UI as-is, (2) exists but needs customization, or (3) needs to be built as a custom Block with a required Script (L5). Also flags brand inconsistencies and identifies design token deltas. Use this skill whenever the user shares a Figma frame/screenshot/handoff, asks "what's in this design", asks "do we have this in OutSystems UI", or wants a triage of a design before coding.
---

# OutSystems Component Audit

Structured triage of a design before any code is written.

## Pre-flight

1. Read `project.config.json` for `classPrefix`, `jsNamespace` and `environment`. If the file is missing or still holds `<<PLACEHOLDER>>` values, stop and run `/lsg:project-setup` — never guess a value. Spacing scale, grid, breakpoints and default sizes are enforced only when written in the project's `specs/foundations/` or `specs/decisions.md` — never assumed or guessed; with nothing written, raise no finding about them.

## When to use

- User shares a Figma screenshot, exported frame, or design link
- User says "new design", "new handoff", "review this mockup"
- User asks which OutSystems UI patterns to use
- User asks for a customization estimate

## Classification is a lookup, not a guess

The buckets below are only as good as the catalog you check them against, and this skill does not
carry one. Before assigning a bucket to any element, read the upstream pack:

| Question | Read |
| --- | --- |
| Does a block exist for this, and what are its arguments / placeholders / events? | `vendor/outsystems-frontend-skills/ui-frameworks/outsystems-ui/blocks-index.md` |
| Is this the *right* component for the content, or merely an available one? | `vendor/outsystems-frontend-skills/.claude/skills/references/component-selection.md` |
| Can the existing pattern be extended instead of replaced? | `vendor/outsystems-frontend-skills/ui-frameworks/outsystems-ui/extensibility.md` |
| Is there already a whole screen for this shape? | `vendor/outsystems-frontend-skills/ui-frameworks/outsystems-ui/screen-templates.md` and `recipes/` |
| Mobile UI Template app rather than Reactive Web? | `vendor/outsystems-frontend-skills/ui-frameworks/mobile-ui/README.md` |

An audit that classifies from memory inflates L4 and L5 — every block it fails to recall becomes
something to build. **If the submodule is absent, say so and stop.** An audit with a guessed catalog
is worse than no audit: it produces a costed plan for work that did not need doing.

## The three outcomes

| Class | Outcome |
|---|---|
| **Exists as-is** | Use the OutSystems UI widget. Verify it matches within tolerance; if not, it is the row below. |
| **Exists, not exact** | **Dual track.** Alignment: L1–L3 overrides (token / utility class / `ExtendedClass` + BEM) so the stock widget lands near the design for any developer who reaches for it. Canonical: the custom Block (L4–L5) the team ships. |
| **Doesn't exist** | Build it: a custom Block with a required Script (L5) — only after the L4.5 gate. |

"Customize OutSystems UI" never means editing or forking the module — only layers on top of it.
Tier (build order) and level (L1–L5, effort) are independent: a pattern can be a pure L1 change.

## Inputs

1. **Visual** (screenshot, Figma frame export, or detailed description)
2. **Current Theme tokens** (`tokens/*.css` and `specs/tokens/token-reference.md`; otherwise OutSystems UI defaults)
3. **Screen context** (mobile / desktop / both? page purpose?)

## Output: structured audit (5 sections, in order)

### 1. Component Inventory

Table of every distinct UI element identified. Three buckets:

| Element | Bucket | OutSystems UI Pattern / Approach | Escalation Level | Notes |
|---|---|---|---|---|
| Top navigation | ✅ As-is | `Layout Top` + `Menu` | L1-L2 | Standard usage |
| Hero card | 🎨 Customize | `Card Background` + ExtendedClass | L3 | Custom gradient overlay |
| Pricing tier toggle | 🆕 Custom Block | Build Block `PricingToggle` + `acme-pricing-toggle.js` | L5 | No OS UI match |
| Featured product card | 🎨 Customize | `Card` + wrap in custom Block | L4 | Reused 12+ places |

**Buckets:**
- **✅ As-is** — OS UI pattern matches; just use it
- **🎨 Customize** — Existing pattern with customization (**L3a = restyle the framework's own
  class**, the default; L3b = ExtendedClass + BEM, only where the framework ships no class;
  L4 = wrap in custom Block)
- **🆕 Custom Block** — No matching pattern → an OutSystems Block of widgets, placeholders and typed inputs, with one required vanilla-JS Script for behaviour (L5)

**Used more than once means a Block.** An element the design shows in two or more places — on
one frame or across frames — is a reusable Block, whatever its bucket: an as-is or customised
pattern used the same way each time becomes L4 (the pattern inside a Block that sets its wrapper,
classes and arguments), a group of widgets becomes a Block of them, and an L5 is a Block already.
Count the places in the Notes column. Rows of one list are one place; a pattern used as it ships,
with its own defaults, is just the pattern.

**L3a before L3b, always.** If OutSystems UI already names the thing — `.btn`, `.btn-primary`,
`.card`, `.tag`, `.osui-tabs__header-item` — the audit routes it to restyling **that bare
name**, not to a new `<prefix>-` class beside it. Classifying a native widget as "customize via
a prefixed class" is how a theme ends up branding nothing until a developer types
`ExtendedClass` on every instance. Check the widget SCSS **and** the pattern enums under
`src/scripts/OSFramework/OSUI/Pattern/*/Enum.ts` before you claim the framework lacks a name.

**Before any L5, clear the extensibility gate.** "The pattern exists but can't do X" is not an L5.
Provider-based patterns expose typed `Set*Configs` / `Set*Event` client actions and a direct
JavaScript API (`OutSystems.OSUI.Patterns.<X>API`), and a custom block wrapper can add persistent
state around any of them — all documented upstream in `extensibility.md`. That is **L4.5**, and it
sits between wrapping a pattern and building one. An L5 is only honest once you can name what you
checked there and why it doesn't reach.

**Important:** L5 means a custom Block with a required Script (`outsystems-custom-block`): real widgets the developer can select and edit, behaviour in a Script the Block's OnReady / OnParametersChanged / OnDestroy drive. A Web Component only where the project already ships them or the user asks for one.

Name patterns using the upstream `blocks-index.md` spelling exactly. If unsure between two, propose both with trade-offs and cite the arguments that differ.

### 2. Brand Consistency Flags → findings

List values in the design that deviate from defined brand tokens. **Each becomes a structured finding** (`brand-color` or `design-token`) — the design is implemented as-is and the deviation is tracked, never silently "snapped".

```
Brand / token findings (design built as-is, flagged for design decision):
- FND-101 [brand-color/near-palette, medium] Heading #1A1A2E ≈ --color-neutral-9 #1E293B but not exact
- FND-102 [design-token/near-token, low] Card padding 18px (off scale — nearest --space-m 16px / --space-l 24px)
- FND-103 [design-token/no-token, medium] Custom hero shadow (not in --shadow-* scale)
- FND-104 [design-token/near-token, low] Body font weight 450 (not in standard --font-weight-* values)
```

Each finding carries a **recommendation** (advice for the designer/brand owner), which is one of:
- **Accept and add to system** — introduce a new token if it'll be reused (`new-token-needed`)
- **Snap to existing token** — designer should adjust the design
- **One-off exception** — only if truly unique

The recommendation is advice; the build stays faithful until design responds. Hand these to `outsystems-design-findings` for the register + routing.

### 3. Token Delta

New or updated tokens needed. Feeds directly into `outsystems-token-extractor`.

```
+ Add: --color-accent: #FF6B35 (new accent for badges)
+ Add: --shadow-2xl: 0 24px 48px rgba(0,0,0,0.18) (new elevation for hero)
~ Modify: --color-primary from #1A73E8 → #2563EB
```

### 4. Implementation Plan

Recommended sequence with escalation levels and skill routing:

```
Recommended order:
1. Update :root tokens                  → outsystems-token-extractor
2. Hero card customization              → L3, outsystems-bem-css
3. Featured product card (custom Block) → L4, outsystems-bem-css
4. Pricing tier toggle                  → L5, outsystems-custom-block
5. Document new components              → outsystems-style-guide-doc
6. Validate in browser                  → the fidelity gate
```

### 5. Findings Register

Consolidate every conflict from this audit — the brand/token findings from section 2 **plus** any accessibility findings (contrast failures on brand colors, fixed-size targets under 24px, flow-level consistency issues) — measured against `vendor/outsystems-frontend-skills/common/accessibility.md` and, for the criteria 2.2 adds over 2.1, `outsystems-design-findings` → `references/wcag-2.2-delta.md`. Present them as a single register table (columns per `outsystems-design-findings` → `references/finding-schema.md`), then hand off to `outsystems-design-findings` to write the register file and route per project config (Notion/Jira ticket + Slack for `high+`).

Key principle restated: the audit recommends and tracks; it does **not** rewrite the design. Every implementation that follows will be faithful to the mockup, with these findings carrying the open questions back to design.

## Style of analysis

- Be specific. "Looks like a card" is not useful. "Card Background pattern with custom gradient overlay, padding adjusted to `--space-l`, ExtendedClass = `acme-hero acme-hero--feature`" is useful.
- Use OutSystems UI pattern names exactly: `Carousel`, `Date Picker`, `Bottom Sheet`, `Sidebar`, `Stacked Cards`, `Tabs`, `Wizard`, etc.
- For L5 components, immediately propose the Block name and its Script (e.g., `PricingToggle` + `acme-pricing-toggle.js`, `StepIndicator` + `acme-step-indicator.js`).
- Don't waste lines on obvious classifications. Most components are quick wins.

## After audit completes

Offer next actions explicitly:

> "Next steps available:
> - Generate the :root update for the token deltas
> - Generate BEM CSS for the hero card customization (L3)
> - Generate the pricing tier custom Block + its Script (L5)
> Which would you like first?"

If the user just says "all of it" or "do everything," proceed in order without asking again.

## Reference

- `references/customization-decision-tree.md` — L1–L5 decision tree with L5 routing
- Reading the design source: the `outsystems-figma-integration` skill
- The OutSystems UI pattern catalog is **not** duplicated here. Read `blocks-index.md` upstream.
- `outsystems-design-findings` skill — schema for the Findings Register (section 5) and ticket/Slack routing
