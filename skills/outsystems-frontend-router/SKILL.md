---
name: outsystems-frontend-router
description: First stop for any OutSystems UI / ODC frontend question or build. It routes into the vendored OutSystems frontend-skills pack by path, so block names, arguments, placeholders, client actions, CSS variables, layouts, patterns and the WCAG-to-widget mapping are read rather than recalled, and it decides which ODC module each part of a change belongs in (the theme module first, then each consumer app, such as a Live Style Guide or a product app). Use it before naming any OutSystems UI block, placeholder, argument, client action or CSS variable; before writing a Mentor prompt or a handover; and whenever a request touches a layout, a shared Common block, or more than one ODC module.
---

# OutSystems frontend router

This skill holds **no platform facts**. It is the route to them, plus one judgement the pack does
not make: **which module a piece of work belongs in**. See `ARCHITECTURE.md` for why the line sits
there.

## The one-line rule

> Read the pack, check it against what the app actually renders, split the work by module —
> then hand off to the skill that builds it.

## Step 1 — Find the pack, or say you can't

The pack lives at `vendor/outsystems-frontend-skills/` in the consuming project. Its state —
`vendored-copy` or `submodule`, and the pin — is in `project.config.json` → `platformKnowledge`.

**If the path is missing, say so and stop.** Do not answer a catalogue question (which block, which
placeholder, which variable) from memory. A confident guess is the failure this plugin exists to
prevent.

Never edit, add to, or copy out of `vendor/`. If the pack is wrong, the workaround lives on our
side and the fix is an issue upstream.

## Step 2 — Route through the pack's own entry points

Load in this order, and stop as soon as you have the answer. The pack is written for exactly this
token budget.

1. `outsystems-agents/SKILL.md` — picks the stack and the next router.
2. **One** router: `ui-frameworks/outsystems-ui/SKILL.md` (Reactive Web / Phone App),
   `ui-frameworks/mobile-ui/SKILL.md` (Mobile UI Template), or `common/SKILL.md` (accessibility,
   CSS placement, responsive, performance, composition, images and icons).
3. **One** leaf doc that router names. `.claude/skills/INDEX.md` lists every leaf if you need to
   find one directly.

Quote the path you read when you state a fact from it, so a reviewer can check it.

With `framework: "none"` (`project.config.json`), read `ui-frameworks/outsystems-ui/` for native
widget markup only: its patterns, layouts, utilities and variables are not loaded in the project.

## Step 3 — Check the pack against the live app

The pack documents the OutSystems templates. A real app runs **its own copies** of the template
Blocks, and they drift. When the answer decides structure (placeholder names, Style Classes,
attributes, which Block renders where), **read the published page's DOM** before acting on it.

| When they disagree about… | Who wins |
| --- | --- |
| What this app's Blocks actually render | the live DOM |
| What OutSystems recommends doing | the pack |

Record the difference in the item's ref and save the DOM excerpt beside it. Real examples from one
side-menu build: the app's `BreadcrumbsItem` had an `Icon` placeholder that the pack does not list;
the app's layout wrapped the `Title` placeholder in its own `h1`, so screens nested headings; a
`LoginInfo` Container carried an icon-font class that turned its text into glyphs.

## Step 4 — Split the work by module, before any build or prompt

An ODC change rarely lives in one module. Work out where each part belongs **first**, because the
module decides who can reference what, and the order you build in.

**Read the project's module map** — it is a project value, never restate it here:
`project.config.json` → `odcThemeModule`, and the module table in the project's
`specs/foundations/platform.md`. If neither names a module you need, ask; do not invent one.

Then assign each part:

| Part | Belongs in |
| --- | --- |
| Theme CSS, tokens, fonts | the theme module |
| A reusable **layout** Block, public, with the design-system class baked into the OutSystems UI layout wrapper's `ExtendedClass` | the theme module |
| Generic template Blocks a theme layout needs (e.g. the menu-toggle icon) | the theme module, copied in unchanged |
| Design-system Blocks (custom Blocks and their Scripts) shared by every app | the theme module, or a design-system library if the project has one |
| App-specific chrome that **fills** a layout's placeholders — the app's `Menu`, `ApplicationTitle`, `UserInfo` | each consumer app's `Common` flow |
| Screens, data, logic | each consumer app — a Live Style Guide is a consumer too |

With `framework: "none"` (`project.config.json`), the layout Block wraps native widgets: there is
no OutSystems UI layout.

Four rules follow:

1. **Dependencies point one way.** Consumer → theme, never back. A theme Block that needs something
   app-specific gets a **Placeholder** for it, not a reference.
2. **One prompt (or MCP turn sequence) per module**, labelled with the module it runs in.
3. **Build in dependency order:** theme CSS → theme module → library → each consumer app (e.g. the
   Live Style Guide, then product apps). Publish each module before starting the next one.
4. **Verify after each module**, on the published page of a consumer that uses it. A theme layout
   can only be seen through a screen.

## Step 5 — Hand off

| Next | Skill |
| --- | --- |
| Restyle a native widget or write theme CSS | `outsystems-bem-css` |
| Prompt Mentor — over the MCP, or a prompt a human pastes | `outsystems-mentor-build` |
| Build a component the framework does not ship | `outsystems-custom-block` |
| Assess a mockup against the Live Style Guide and plan the work | `/lsg:assess` |
| Triage a design against what OutSystems UI ships | `outsystems-component-audit` |
| Audit an existing app's UI and front end against what already exists | `/lsg:ui-audit` |

**Mentor sees what is in the module, not the repo.** It cannot read the vendored pack, the repo or
this skill. It *may* be able to read Markdown the project imports into an ODC module as Resources —
the design system's usage specs, foundations, token reference and decisions, which the project
template keeps agent-readable in `specs/` for exactly this. Until that is verified for the module
you are prompting in, write everything a Mentor prompt depends on into the prompt in plain words;
once verified, name the imported resource and keep only the load-bearing rules inline.
