---
name: outsystems-style-guide-doc
description: Keep the project's Live Style Guide (LSG) in step with the design system — the OutSystems app that documents every token and component with live previews. Knows the LSG's modules and routing on ODC and O11, which page a change touches (a new colour → the Colors page, a new custom component → a menu record, a page and a preview), the page spec, and how the page work reaches the module (OutSystems MCP, else a Mentor prompt on ODC or Service Studio steps on O11). Use it whenever a component, pattern or token is added or changed, when the user asks to document a component or update the Live Style Guide, when writing a usage spec's §9, and before a handover or a release.
---

# The Live Style Guide

The Live Style Guide (LSG) is the OutSystems application where the design system is documented
**live**: every foundation (colour, type, spacing, radius, border, shadow, icons) and every
component, rendered by the real theme and the real Blocks. It is a deliverable. A component
without its LSG page is not done, and a token the LSG does not show is a token nobody can find.

This skill owns **what the LSG needs when the design system changes**. It does not restate
OutSystems UI facts: Blocks, placeholders and arguments come from the vendored pack via
`outsystems-frontend-router`; driving Mentor comes from `outsystems-mentor-build`.

## Pre-flight

Read `project.config.json`:

- `environment` — `ODC` or `O11`. The anatomy and the fallback channel differ.
- `modules` — the module (and on O11 the application) for each role: `theme`, `patterns`,
  `liveStyleGuide`, `template`, and `patPreview` on O11. Name modules from here; never guess one.
- `odcTenant` — set on ODC when an OutSystems MCP is available; `null` means none.

Missing or `<<PLACEHOLDER>>` values: stop and run `/lsg:project-setup`. Never guess a value.

## What a change does to the LSG

Run this for every item the loop builds, and write the answer into the PR body and the handover.

| Change | LSG work |
|---|---|
| Token added, removed or re-valued | Foundation pages rendered from the theme (the `TokenReference` Block, installed by the project's `handover/lsg-foundations.md`): **none** — they update at the next theme publish. Say so in the PR. Not installed yet: name the Styles page and the rows to update, and recommend installing the Block. |
| A token kind `TokenReference` does not cover (icons, grid, breakpoints, utility classes) | Update that Styles page by hand; name it in the handover. |
| A colour family added (a new hue, not a new step) | Also check the Colors page narrative and its Core / Extended split. |
| OutSystems UI pattern restyled (L1–L3) | Its **stock pattern page** shows the new look automatically once the theme is published. Update the page's text only where this design system's usage differs, and record the ExtendedClass recipe. |
| New Block or Web Component (L4–L5) | A **new page**: a menu record, the page, a live preview with every variant and state, the class inspector. `references/lsg-anatomy.md` has the routing for each platform. |
| Variant, state or input added to a component | Its preview gains that variant or state, and its options area the matching control. |
| Component deprecated | The page stays, marked deprecated, naming its replacement. |
| Public Block added to the patterns module for internal use | It still needs a menu record and a page, or the inventory check below fails. |

## Writing the page

The project's usage spec carries a `## 9. Live Style Guide` section (the template's
`specs/README.md`): the page, the definition, "When to use", provenance, preview and class
inspector. Write it in the same PR as the code. `references/page-spec.md` has the full page
spec, section by section, and the foundation-page spec.

Three rules carry most of the quality:

1. **Write the prose for this design system.** One-sentence definition; "Use the <Name> to …";
   "Add the <Block> to the <Placeholder> placeholder." Never paste the OutSystems UI base
   pattern's text onto a custom component, and never leave a page without text.
2. **Show, don't describe.** The preview is the real Block, one instance per variant and state,
   each widget named so the class inspector can read it. Values are printed live from the theme,
   never typed.
3. **State provenance in one line**: "OutSystems UI <Pattern>, restyled", "New component", or
   "Wraps <library>" with a link. A discouraged component names its replacement.

## Getting the page into the module

After the merge, `/lsg:deliver` takes the first channel available — the same rule as every other
OutSystems change:

1. **The OutSystems MCP, when one is connected** (ODC: the tenant endpoint in `.mcp.json`; O11: Service Studio's own MCP server on the developer's machine). Drive
   it with `outsystems-mentor-build`: read the module's menu entities and an existing pattern page
   first, then add the record, the page and the preview in the shape those already have.
2. **No MCP on ODC → a Mentor Studio prompt** in the handover, run in `modules.liveStyleGuide`
   after the Patterns prompt (the page previews a Block that must already exist).
3. **No MCP on O11 → Service Studio steps** in the handover: the PatPreview demo Block in
   `modules.patPreview`, then the menu record and the page in `modules.liveStyleGuide`.

In the handover map, an item that needs a page gets one prompt per module, in build order:
`mentor.prompts: [{ title, text }, …]` — Patterns first, then the LSG.

Then **verify in a browser** after publish: the page is reachable from the menu, the preview
renders every state, the class inspector shows the classes the spec names, and the foundation
pages list the new tokens. Service Studio preview does not run the page scripts and is never the
check.

## Before a handover or a release

- Every public Block in the patterns module has a menu record and a page.
- No page carries OutSystems UI default prose, Lorem ipsum, a `[ClientName]`-style placeholder or
  a module name from a starter kit or an old project.
- Every Styles intro (how many radii, shadow levels, type steps, weights) is re-counted against
  this theme; the renderers make the table right, not the sentence above it.
- The foundation pages show the tokens of the theme being released.

## Rules

1. The LSG page ships with the code: never mark a component done without it, and never hand over
   a component whose handover does not cover its page.
2. Register every custom component in the menu data. Never an ad-hoc screen, never hidden inside
   a stock category.
3. Never hand-maintain a list that can be read live: token values, token names, class lists.
4. Build the page in the shape the module already uses; read it before adding to it.
5. A value the design states that the page cannot show faithfully is a finding, not a rounding.
