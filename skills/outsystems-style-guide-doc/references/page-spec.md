# LSG page spec

What a delivered page contains, in order. The project's usage spec §9 is the source for each page;
write it there first, then build the page from it.

## A. Component or pattern page

| # | Section | Content |
|---|---|---|
| 1 | Header | Breadcrumbs (Patterns > Category > Name), the title from the menu record, "Back to Overview" |
| 2 | Definition | One sentence, written for this design system, directly under the title |
| 3 | Metadata | Type (OutSystems UI restyle / custom Block), base pattern, BEM block or tag, module, level L1–L5, status (Draft / Approved / Deprecated), and the one-line provenance. A deprecated pattern names its replacement |
| 4 | Live preview | `Pattern_Preview` wrapping the real Block, its content in an If with `ShowTrueOrPreview` for design mode. Toggles in the options area (O11: ButtonGroups fed by `StyleGuide_<Pattern><Property>` entities; ODC: an `Advanced` placeholder with Switch / ButtonGroup / Dropdown), all bound to the real inputs. `-no-options` when there are none |
| 5 | When to use | "When to Use", then "Use the <Name> to …" and "Add the <Block> to the <Placeholder> placeholder." |
| 6 | Variants and states | One named instance per variant and state, or Tabs; every state the frozen ref draws |
| 7 | Classes | The class inspector next to each named widget: the ExtendedClass recipe |
| 8 | Code | `CodeSnippet` for bound arguments where they matter; copy through `navigator.clipboard` |
| 9 | Tokens | `TokenReference` with a `Filter` for this component's tokens, where it has its own |
| 10 | Accessibility | Keyboard, ARIA, focus ring; anything the design conflicts with, as an FND reference |
| 11 | Do / Don't | Two short lists. Brand and contrast conflicts appear as FND references, never silent fixes |
| 12 | Caveats | "Note:" lines for platform limits |
| 13 | Changelog | Version and date, matching the theme release |

Rows 1, 2, 4 and 5 are the minimum a page ships with. The rest is added as the component has it.

**Prose voice.** The definition / "Use the X to …" / "Add … to the … placeholder" triplet works for
custom components too. Write it for the component: pasting the base pattern's OutSystems UI text
onto a custom component, or leaving a page with no text, are the two defects delivered LSGs
show most.

## B. Foundation page (Styles)

1. A one-sentence "<Topic> reference …" intro, counted against this theme (how many radii, steps,
   weights) — in `TokenReference`'s `Intro` placeholder.
2. `TokenReference` with the right `Kind`: specimen, token, live value, copy.
3. For classes rather than tokens (utilities, icons, grid): a class table built from the real
   classes, with copy.
4. A value the design states that the theme holds off-scale is shown as it is, tagged with its
   FND id.

Colors opens with the design system's brand narrative and its Core / Extended split.

## C. Widget-library page

For an LSG that documents a widget library (an `osfe` `WidgetLibrary` asset) rather than Blocks —
one page per widget, in the shape of a component library's public docs. React Aria's docs anatomy
maps onto it directly.

| # | Section | Content |
|---|---|---|
| 1 | Header | Title (the page's only `h1`), the one-sentence lead, the category, a link to the upstream docs page |
| 2 | Example | The live widget with its controls beside it and the code below, all bound to screen variables |
| 3 | Behaviour | Sections only some widgets have (Events, Pending, Variants, Selection); each one gets its own table-of-contents link |
| 4 | Usage | When to use it, and what to use instead |
| 5 | Accessibility | The keyboard table, then the note on roles, labels and focus |
| 6 | API | Every property: Studio name, type, default, required, description |
| 7 | Styling | The root class, the state selectors, and how to restyle through its custom properties |
| 8 | On this page | A table of contents for 2–7 |

**Docs text is data.** The text of 1 and 4–7 lives in static entities (`Widget.Lead`, `Usage`,
`A11yNote`, `CssClass`, plus `WidgetProperty`, `KeyboardInteraction`, `WidgetState`), and one
`WidgetReference(WidgetKey)` Block renders Usage, Accessibility, API and Styling from them. A
screen holds only its header and its example. The API rows are **generated from the widgets' code**
— each property's Studio name, description, type, default and kind — never typed (rule 3).

**Shared sample data.** Collection examples read one set of static entities (fruits, a file tree,
people, breadcrumbs, menu actions) instead of a list per screen. The generator names each from one
explicit map, never by inflecting a plural.

**What the platform makes you specify:**

- **Enum properties are design-time only.** A widget's enum property (a Button's Variant) cannot be
  bound to a variable, so an example that switches it renders one widget per value, each with a
  Visible condition on the selected value.
- **Default Values are literals.** A computed initial value (`AddDays(CurrDate(), 3)`) is marked in
  the spec as set in OnInitialize; `CurrDate()` itself is accepted as a default.
- **The table of contents has an extra-links placeholder** between Example and Usage for the
  sections from row 3. A fixed link list in the shared Block silently drops them.
- **Every widget goes in a slot** (`outsystems-mentor-build` → "Widget libraries"), and the slot
  text names the widget and every binding.

## D. Before a handover or release — the sweep

- Every public Block in the patterns module has a menu record, a preview and a page.
- No page carries OutSystems UI default prose, Lorem ipsum, a `[ClientName]`-style placeholder,
  starter-kit module names (`StarterApp_`, `_Reactive_LSG`, `StyleGuidePreview`) or another
  project's names.
- The homepage, the footer and every "<App> - <Section>" title are this design system's.
- Each custom component's definition and "When to Use" differ from the base pattern's text.
- No menu record points at a screen or module that does not ship.
