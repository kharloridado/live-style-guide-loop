# LSG page spec

What a delivered page contains, in order. The project's usage spec §9 is the source for each page;
write it there first, then build the page from it.

## A. Component or pattern page

| # | Section | Content |
|---|---|---|
| 1 | Header | Breadcrumbs (Patterns > Category > Name), the title from the menu record, "Back to Overview" |
| 2 | Definition | One sentence, written for this design system, directly under the title |
| 3 | Metadata | Type (OutSystems UI restyle / custom Block; native widget restyle with `framework: "none"`), base pattern, BEM block or tag, module, level L1–L5, status (Draft / Approved / Deprecated), and the one-line provenance. A deprecated pattern names its replacement |
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

## C. Before a handover or release — the sweep

- Every public Block in the patterns module has a menu record, a preview and a page.
- No page carries OutSystems UI default prose, Lorem ipsum, a `[ClientName]`-style placeholder,
  starter-kit module names (`StarterApp_`, `_Reactive_LSG`, `StyleGuidePreview`) or another
  project's names.
- The homepage, the footer and every "<App> - <Section>" title are this design system's.
- Each custom component's definition and "When to Use" differ from the base pattern's text.
- No menu record points at a screen or module that does not ship.
