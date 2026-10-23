---
name: outsystems-bem-css
description: Write BEM-compliant CSS for OutSystems Reactive Web and ODC components that consumes design tokens from :root, uses the project's class prefix, and is upgrade-safe against OutSystems UI updates. Use this skill whenever the user needs to write CSS for an OutSystems component, customize an OutSystems UI pattern, add a CSS class to a Block or Theme, override styles via ExtendedClass, or asks for BEM in any OutSystems context.
---

# OutSystems BEM CSS Generator

Generate production-grade BEM CSS for OutSystems Reactive Web and ODC.

## Pre-flight

1. Read `project.config.json` for `classPrefix`, `jsNamespace`, `environment` and `framework`. If the file is missing or still holds `<<PLACEHOLDER>>` values, stop and run `/lsg:project-setup` — never guess a value. Spacing scale, grid, breakpoints and default sizes are enforced only when written in the project's `specs/foundations/` or `specs/decisions.md` — never assumed or guessed; with nothing written, raise no finding about them.
2. Use `classPrefix` throughout. Never ask for the prefix.
3. **Read upstream before writing a selector.** This skill owns BEM naming and nothing else. Where
   the CSS belongs, which variables exist, and which utility classes already cover the property are
   all platform knowledge, read from the pinned upstream pack:

   | Need | Read |
   | --- | --- |
   | Where this CSS belongs (Theme / Screen / Block, and why Theme is the default) | `vendor/outsystems-frontend-skills/common/css-customization.md` |
   | The `:root` variables, utility classes, colour palette, spacing scale | `vendor/outsystems-frontend-skills/ui-frameworks/outsystems-ui/styles-and-utilities.md` |
   | Breakpoints and responsive behaviour | `vendor/outsystems-frontend-skills/common/responsive-design.md` |
   | Whether the framework already ships this widget | `vendor/outsystems-frontend-skills/ui-frameworks/outsystems-ui/blocks-index.md` |

   Do not restate their contents here or infer them from memory. If the submodule is missing, stop
   and say so — guessing a variable name produces a rule that silently never applies.
4. **With `framework: "none"`** (a migrated design system, no OutSystems UI underneath), its
   utilities, variables and patterns are not loaded. Skip rule minus-one, and read rule zero's
   "framework" as the platform's native widget classes (Button, Input, Checkbox, Dropdown…, styled
   only by the theme), read from the pack's `outsystems-ui/` pages for markup only — not from
   `vendor/outsystems-ui/`. Tokens are the theme's own `--<classPrefix>*`; there is none to redefine.
   A widget only an OutSystems UI pattern would supply (Accordion, Tabs, Tooltip…) is L5.

## When to use

- User shares a component spec or screenshot and asks for CSS
- User asks to customize an OutSystems UI pattern (Card, Button, Tabs, Accordion, etc.)
- User asks to write styles for a custom Block
- User mentions `ExtendedClass`, Theme CSS, Block CSS, or Screen CSS
- User shares Figma component details and wants the OutSystems implementation
- User asks "how do I override [pattern name]?"

## When NOT to use

- Component doesn't exist in OutSystems UI → use `outsystems-custom-block` instead (L5); its CSS is still written here
- User wants just a token update → use `outsystems-token-extractor` skill

## Rule minus-one: a utility class beats a rule you wrote

Before rule zero, before BEM, before any selector at all: check whether OutSystems UI already ships
a utility class for the property. The catalog is upstream in `styles-and-utilities.md` — spacing,
colour, typography, layout, flex, position, display, border-radius and shadow are all covered.

A custom rule is justified only when (a) the property has no utility equivalent (gradient,
animation, clip-path, transform), or (b) the value falls outside the utility scale. Even then the
rule body stays minimal — every property a utility can express goes on `ExtendedClass` beside your
class name, not into your class body.

The failure this prevents: a seven-property class where five of the properties are
`display-flex align-items-center justify-content-center border-radius-circle` under different names,
now maintained by you instead of by the framework.

## Rule zero: restyle, don't shadow

**Before you write one BEM class, find out whether OutSystems UI already names this thing. If it
does, you restyle THAT name.** BEM is how you name what the framework has *no* name for — it is
not a parallel vocabulary to run beside the framework's.

Read the pattern in the frontend-skills pack (`vendor/outsystems-frontend-skills/ui-frameworks/outsystems-ui/`)
and grep the framework's own SCSS (`vendor/outsystems-ui/src/scss/`) for the widget **and every variant of it**. Then:

| What you found | Write this | Never this |
| --- | --- | --- |
| Framework has the widget class | `.btn { … }` — the **bare** class | `.acme-button.btn { … }` |
| Framework has the variant class | `.btn-primary`, `.btn-large`, `.btn-success` | `.acme-button--primary`, `--big` |
| Framework has the token | redefine `--color-primary`, `--space-m` in the theme | mint `--acme-color-primary` beside it |
| Framework has **no** equivalent | `.acme-<block>--<variant>` + `ExtendedClass` | — |
| Widget doesn't exist at all | → `outsystems-custom-block` (L5) | — |

**Why the second column is not "safer".** `.acme-button.btn` reads like careful, scoped hygiene.
It isn't: the platform never emits `.acme-button`, so the rule only fires when a developer types
it into `ExtendedClass` on that one widget. Every button they forget renders framework-grey. A
theme built that way doesn't theme anything — it ships a per-widget opt-in and calls itself a
design system. Restyling the bare class is what makes the brand the default.

**Restyling a bare class disturbs its siblings.** Your rule lands at the same specificity as the
framework's and later in the cascade, so `.btn { height: 38px }` silently overrides
`.btn-small { height: 32px }`. Enumerate the framework's sibling modifiers; map each to a design
variant, or exclude it on purpose (`.btn:not(.btn-small)`). Never leave one to break by accident,
and never invent a size or colour the design doesn't specify just to fill a gap — say the gap
exists.

**Deliver the mapping, not just the CSS.** When you restyle framework classes, the developer's
instruction is "set the widget's **Style** property to Primary", not an `ExtendedClass` string.
Output the mapping table (framework class → design variant) alongside the code.

## Inputs needed

From context or quick inference:
1. **What component?** (name, screenshot if available)
2. **OutSystems UI pattern this extends?** (Card, Button, etc. — or "Custom Block")
3. **CSS location?** (Theme / Block / Screen — decided by `vendor/outsystems-frontend-skills/common/css-customization.md`, not by this skill)
4. **States needed?** (hover, focus, disabled, active, error, loading…)

If anything is unclear, make a reasonable assumption and state it. Don't pause for clarification on every detail.

## BEM rules

```
.{prefix}-{block}                            /* Block */
.{prefix}-{block}__{element}                 /* Element */
.{prefix}-{block}--{modifier}                /* Modifier */
.{prefix}-{block}__{element}--{state}        /* Element state */
```

### Forbidden (refuse to generate)

```css
.acme-card.is-open { }                      /* coupling */
.acme-card[data-state="open"] { }           /* data attribute styling */
.acme-card { color: #1A73E8; padding: 16px; }  /* hard-coded values */
#b1-CardWrapper { }                         /* OutSystems-generated IDs */
.acme-card { color: red !important; }       /* unjustified !important */
.acme-button.btn { }                        /* opt-in gate on a framework class — style .btn */
.acme-button--big { }                       /* duplicates .btn-large — style .btn-large */
```

### Required patterns

```css
.acme-card--is-open { }                     /* state as modifier */
.acme-card { color: var(--color-primary); padding: var(--space-m); }  /* tokens */
.acme-card:hover { }                        /* pseudo-classes OK */
```

## Output format

Two shapes, and rule zero decides which:

- **Restyling a framework widget** (the common case) — selectors are the framework's own bare
  class names. Deliver the mapping table and "set the widget's Style property to X" in the
  handover, not an `ExtendedClass` string and not as a comment block in the CSS. See
  `references/common-patterns.md`.
- **Building something the framework has no name for** — full BEM under the project prefix,
  applied via `ExtendedClass`. That is the shape below.

```css
/* acme-card — custom Block CSS. Spec: specs/components/cmp-card/. OSUI baseline v2.30.0. */

/* Block */
.acme-card { /* ... */ }

/* Elements */
.acme-card__header { }
.acme-card__body { }
.acme-card__footer { }

/* Modifiers (variants) */
.acme-card--featured { }
.acme-card--compact { }

/* States */
.acme-card--is-loading { }
.acme-card__header--is-active { }

/* Pseudo-state interactions */
.acme-card:hover { }
.acme-card:focus-visible { }
.acme-card[aria-disabled="true"] { }

/* Responsive (mobile-first) */
@media (min-width: 768px) {
  .acme-card { /* tablet+ */ }
}
```

**Keep the header that thin.** Four to eight lines, one-line section markers, and per-rule notes
only as long as the declaration they justify needs — the full rule, and where the prose you are not writing
here goes instead, is `skills/design-loop/references/comment-budget.md`. The escalation level,
the tokens consumed, the alternatives you ruled out and the framework selectors you surveyed all
belong in the PR body and the handover, which is where they get read.

Then provide:
1. **How the developer applies it.** For a framework restyle, the widget property that emits the
   class (`Style = Primary` → `.btn-primary`) — plus the mapping table. Only for classes the
   framework has no name for, the **ExtendedClass string**:
   ```
   ExtendedClass = "acme-card acme-card--featured"
   ```
2. **Where to paste this CSS** (Theme / Block / Screen)
3. **Any Block input parameters** that should be added (if building a custom Block)
4. **Which framework siblings you touched**, and which you deliberately left alone.

## References

- `references/state-vocabulary.md` — Standard state modifier names (loop convention)
- `references/common-patterns.md` — BEM examples for common OS UI patterns (loop convention)
- `references/odc-runtime.md` — what the ODC runtime adds to your markup (gutters, `OSFillParent`,
  the `OSBlockWidget` wrapper, bare Buttons, the RadioGroup structure, the prepended `:root`) and
  how to restyle on top without `!important` (zero-specificity resets). Read it before writing
  CSS for a delivered ODC screen.

Platform knowledge is not duplicated here. For where CSS belongs, the variable and utility catalog,
breakpoints, and the block index, read the upstream pack listed in **Pre-flight** above.
