---
name: outsystems-custom-block
description: Build a component OutSystems UI does not ship (L5) as a custom OutSystems Block — real widgets, placeholders and typed input parameters — with one required Script whose init / update / destroy the Block calls from OnReady, OnParametersChanged and OnDestroy. This is the default for every L5 build on ODC and O11. Use it when the component audit routes an element to L5, when the user asks for a custom component, a custom Block, or "a Block with a script", and when reviewing or handing over one.
---

# Custom Block + required Script — the L5 build

An L5 component is an **OutSystems Block** a developer drags from the toolbox: widgets they can
see and select, placeholders for content, input parameters with real types, Block events. What the
widgets cannot do on their own — keyboard handling, measuring, timers, observers — lives in **one
vanilla-JS Script the Block requires**, driven by the Block's lifecycle.

Why this shape: the developer works in the same model as everything else in the module, Mentor
and Service Studio can build and edit every part of it, the styling is ordinary theme CSS on
`ExtendedClass`, and the script owns behaviour only.

Clear the L4.5 gate in `outsystems-component-audit` first: a pattern that exists but "can't do X" is
not an L5.

## Pre-flight

Read `project.config.json`: `classPrefix` (BEM block and file names), `jsNamespace` (the script's
global), `environment` (ODC or O11), `modules.patterns` (where the Block lives). Missing values:
stop and run `/lsg:project-setup`.

Read the vendored pack through `outsystems-frontend-router` for any OutSystems UI Block you nest
inside, its placeholders and arguments. Never name one from memory.

## What gets built

| Part | Where | Notes |
|---|---|---|
| The Block | `modules.patterns` | widgets, placeholders, inputs, events, lifecycle actions |
| Styles | `src/blocks/<prefix><name>.css` → the theme | BEM on the widgets' Style Classes / `ExtendedClass`; tokens only |
| Behaviour | `src/components/<prefix><name>.js` → a Script in `modules.patterns`, the Block's only Required Script | `window.<Ns>.<Block>` with `init`, `update`, `destroy` |
| Enumerations | Static Entities in `modules.patterns` | one record per allowed value; a single Text `Value` attribute as Identifier holding the literal the CSS/JS expects |

No Script at all is fine — a Block of widgets and placeholders styled by the theme is the simplest
L5. Add the Script only for behaviour the widgets cannot express.

## The Block

- **Widgets first.** Build the tree from OutSystems UI Blocks, `AdvancedHtml` with a semantic tag,
  platform widgets, and `Container` last (upstream's order; `outsystems-mentor-build` has it).
  Never an HTML string in an Expression.
- **Placeholders** for every slot whose content the consumer decides (title, body, actions,
  icon). Keep `placeholder-empty` on them so an empty one collapses.
- **Inputs** typed for what they are: Static Entity Identifiers for variants, sizes and states;
  Boolean for flags; Text for free text. Classes are composed in `ExtendedClass` expressions from
  them: `"<prefix>stepper <prefix>stepper--" + Size + If(Compact, " <prefix>stepper--compact", "")`.
- **Events** for what the consumer reacts to. A script raises one through a Client Action on the
  Block named `Raise<Event>` holding a single Trigger Event node.
- **Name the widget the script works on** (usually the root Container) — its `.Id` is the instance
  key.

## The Script contract

```js
/* <prefix>stepper.js — behaviour for the Stepper Block. */
(function () {
  "use strict";

  const ns = (window.Nimbus = window.Nimbus || {});
  if (ns.Stepper) return;

  const instances = new Map();

  function bind(root, state) { /* listeners, observers — every one recorded on state */ }
  function unbind(state) { /* remove exactly what bind added */ }

  ns.Stepper = {
    init(widgetId, options, callbacks) {
      const root = document.getElementById(widgetId);
      if (!root) return;
      const existing = instances.get(widgetId);
      if (existing && existing.root === root) return this.update(widgetId, options);
      if (existing) this.destroy(widgetId);
      const state = { root, options: { ...options }, callbacks: callbacks || {} };
      bind(root, state);
      instances.set(widgetId, state);
    },
    update(widgetId, options) {
      const state = instances.get(widgetId);
      if (state) Object.assign(state.options, options);
    },
    destroy(widgetId) {
      const state = instances.get(widgetId);
      if (!state) return;
      unbind(state);
      instances.delete(widgetId);
    },
  };
})();
```

The rules behind it, each one a defect seen in delivered projects:

1. **One instance per widget Id**, in a `Map`. Two Blocks on a screen never share state. Nothing
   on `$public` (one object for every instance) and no module-level "current" element.
2. **`init` is idempotent**: a second call for the same element updates instead of binding twice;
   for a re-rendered element it destroys the old instance first.
3. **`destroy` removes everything `init` added** — listeners, observers, timers, document-level
   handlers — and forgets the instance.
4. **Guard the global** (`if (ns.Stepper) return;`): the Script can load more than once.
5. **Events go out through callbacks** the Block passes at `init`, which call its `Raise<Event>`
   actions. The script never reaches into OutSystems internals.
6. **Classes, not inline styles**, for anything visual: toggle the BEM modifiers the CSS defines.
   Inline style only for computed geometry (a measured height, a position).
7. **Accessibility in the script** where the widgets cannot carry it: roving tabindex, arrow keys,
   `aria-expanded` / `aria-selected` / `aria-current` kept in sync, focus return on close,
   `prefers-reduced-motion`. `references/keyboard-patterns.md` and `references/aria-recipes.md` have
   the recipes.
8. **Vanilla JS, no dependencies.** The header lists the API — `init(widgetId, options, callbacks)`,
   its options and callbacks, one line each (`design-loop/references/comment-budget.md`).

## The lifecycle wiring

Each a Client Action on the Block with one "Run JavaScript" node; `WidgetId` = the named widget's
`.Id`, plus the inputs the script reads:

```js
// OnReady
Nimbus.Stepper.init($parameters.WidgetId,
  { current: $parameters.Current, orientation: $parameters.Orientation },
  { onChange: function (value) { $actions.RaiseOnChange(value); } });
```

```js
// OnParametersChanged
Nimbus.Stepper.update($parameters.WidgetId,
  { current: $parameters.Current, orientation: $parameters.Orientation });
```

```js
// OnDestroy
Nimbus.Stepper.destroy($parameters.WidgetId);
```

Set the Script as the Block's **Required Script**, never as a module-wide include. The handover's
Mentor prompt (ODC) or Service Studio steps (O11) carry exactly these three nodes.

## The specimen

`specs/<kind>/<id>/specimen.html` is the Block's widgets **as the platform renders them** (capture a
published instance when one exists), in every state the ref draws, followed by the script and its
`init` per instance:

```html
<div id="stepper-default" class="nimbus-stepper nimbus-stepper--md">…</div>
<script data-src="src/components/nimbus-stepper.js"></script>
<script>Nimbus.Stepper.init("stepper-default", { current: 2 });</script>
```

## Done means

- The Block, its Static Entities and its Script exist in `modules.patterns`; the Script is required
  by the Block only.
- Two instances on one screen work independently; navigating away and back leaves no duplicate
  listener (destroy ran).
- Its Live Style Guide page exists (`outsystems-style-guide-doc`): one named instance per variant and
  state, the class inspector beside each.
- Checked in a real browser after publish — Service Studio preview does not run the script.

## Web Components

Every new custom component is a custom Block. A project that already ships Web Components keeps
them as they are until someone decides to replace them; never build a new one, and never mix both
shapes in one component.
