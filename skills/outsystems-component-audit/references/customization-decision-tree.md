# Customization Decision Tree (L1–L5 Escalation)

Walk top to bottom. Stop at the first level that satisfies the design.

```
┌─────────────────────────────────────────────────────┐
│  Q: Is the difference just a token value?           │
│     If YES → L1: Update :root token only            │
└─────────────────────────────────────────────────────┘
                       │ NO
                       ▼
┌─────────────────────────────────────────────────────┐
│  Q: Does an OS UI utility class do this?            │
│     If YES → L2: Attach utility via Style Classes   │
└─────────────────────────────────────────────────────┘
                       │ NO
                       ▼
┌─────────────────────────────────────────────────────┐
│  Q: Does OS UI already NAME this thing — the        │
│     widget class, or a variant of it?               │
│     If YES → L3a: restyle THAT class, BARE          │
│              (.btn, .btn-primary, .card, .tag)      │
└─────────────────────────────────────────────────────┘
                       │ NO — framework has no name for it
                       ▼
┌─────────────────────────────────────────────────────┐
│  Q: Same pattern, an EXTRA variant the framework    │
│     ships no class for?                             │
│     If YES → L3b: ExtendedClass + BEM modifier      │
└─────────────────────────────────────────────────────┘
                       │ NO
                       ▼
┌─────────────────────────────────────────────────────┐
│  Q: Custom API needed but OS UI pattern exists?     │
│     If YES → L4: Wrap pattern in custom Block       │
└─────────────────────────────────────────────────────┘
                       │ NO
                       ▼
┌─────────────────────────────────────────────────────┐
│  Q: Pattern fits, but needs behaviour its inputs    │
│     don't expose?                                   │
│     If YES → L4.5: Set*Configs / Set*Event, the     │
│              OSUI JS API, or a stateful wrapper     │
└─────────────────────────────────────────────────────┘
                       │ NO
                       ▼
┌─────────────────────────────────────────────────────┐
│  L5: Build a custom Block + its required Script     │
│  No OS UI pattern fits.                             │
└─────────────────────────────────────────────────────┘
```

## Per-level summary

### L1 — Token change
```css
:root { --color-primary: #7C3AED; }
```
**1 minute. Global effect. No CSS written.**

### L2 — Utility class
```
Style Classes: "text-neutral-8 pt-2"
```
**30 seconds. No CSS written.**

### L3a — Restyle the framework's own class (the default, and the common case)
```css
/* Every button in the app. No ExtendedClass anywhere, nothing to remember. */
.btn         { border-radius: var(--border-radius-soft); font-weight: var(--font-weight-bold); }
.btn-primary { background-color: var(--color-primary); color: var(--color-base-white); }
```
**Nothing for the developer to apply — they set the widget's own Style property.**

L3a is where most of a design system lands, and skipping it is the single most common mistake
in this whole tree. `.acme-button.btn` is **not** L3a: it is a gate on a class the platform
never emits, so the widget renders unbranded unless someone types it in per instance. Restyling
the bare class is what makes the brand the default instead of an opt-in.

Restyling a bare class disturbs its siblings — `.btn { height }` overrides `.btn-small`'s own
height at equal specificity, later in the cascade. Map every sibling modifier or exclude it on
purpose (`.btn:not(.btn-small)`).

### L3b — ExtendedClass + BEM modifier (only where the framework has NO class)
```
ExtendedClass = "acme-card acme-card--featured"

.acme-card--featured {
  border: var(--border-size-m) solid var(--color-primary);
}
```
**5–15 minutes per variant.** Verify the framework really lacks it first — grep the widget SCSS
**and** `src/scripts/OSFramework/OSUI/Pattern/*/Enum.ts`, where much of the class vocabulary
actually lives.

### L4 — Wrap pattern in custom Block
```
Block: ProductCard (Patterns Library)
  Inputs: ProductName, Price, ImageURL, OnAddToCart
  Internal: OS UI Card + Image + Button widgets
  Block CSS: .acme-product-card BEM rules
```
**30–60 minutes. Reusable everywhere.**

### L4.5 — Extend the pattern's behaviour, don't replace it
```
Carousel, DatePicker, DropdownSearch, RangeSlider and friends take typed configuration
beyond their input parameters:

  SetCarouselConfigs(WidgetId, JSON)        -- provider options
  SetDatePickerEvent(WidgetId, EventName)   -- provider events
  OutSystems.OSUI.Patterns.CarouselAPI.*    -- direct JS, for what the actions don't cover

Wrap it in a Block when the extension needs to persist state across re-renders.
```
**1–3 hours, and it survives upstream updates** — you are using the pattern's own extension
surface rather than out-specifying its CSS or rebuilding it.

Full API surface: `vendor/outsystems-frontend-skills/ui-frameworks/outsystems-ui/extensibility.md`.
**This rung is mandatory before any L5 on a pattern that already exists.** Reaching for a custom
Block because a pattern "can't do X" — when X is one `Set*Configs` call — trades a supported
extension point for a component you now maintain forever.

### L5 — custom Block + required Script
```
1. PricingToggle Block (widgets, placeholders, typed inputs, events)
2. acme-pricing-toggle.css  (BEM, tokens only — ships in the theme)
3. acme-pricing-toggle.js   (init / update / destroy, the Block's Required Script)
4. Specimen page for browser QA
```
**1–4 hours. Best for components OutSystems UI doesn't have.**

### L6 — Fork OutSystems UI
**Almost never. You'd lose all upstream updates.**

## Healthy distribution
- L1 / L2: 60–70%
- L3a / L3b: 20–25% — and **most of that should be L3a.** A component audit that routes a
  widget OutSystems UI already ships to L3b is describing a parallel design system, not a
  theme. If L3b outnumbers L3a, re-read the framework's class vocabulary before writing CSS.
- L4: 5–10%
- L4.5: 2–5% — and it should be **larger than L5.** More designs ask for behaviour an existing
  pattern nearly has than for a component the framework genuinely lacks.
- L5: 1–5%
- L6: 0%

If your codebase has too many L4–L5, the design system is fighting OutSystems UI. Talk to design.

## Why L5 = a custom Block with a required Script

An L5 is an OutSystems Block a developer drags from the toolbox: widgets, placeholders and typed
input parameters they can see and edit in Studio, styled by the theme through `ExtendedClass`.
Behaviour the widgets cannot express lives in one vanilla-JS Script the Block requires, driven by
its OnReady / OnParametersChanged / OnDestroy (`init` / `update` / `destroy`, keyed by widget Id).

- The developer works in the platform's own model; Mentor and Service Studio can build and change
  every part of it.
- Styling is ordinary theme CSS, held to the same token audit as every restyle.
- The Script owns behaviour only, and a Block with no behaviour needs no Script at all.

Route L5 to `outsystems-custom-block`. Use `outsystems-web-component` only where the project already
ships Web Components and the new component belongs with them, or the user asks for one.
