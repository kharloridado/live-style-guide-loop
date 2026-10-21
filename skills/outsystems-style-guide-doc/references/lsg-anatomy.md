# LSG anatomy — modules, menu data and routing

Names below use `<DS>` for the design-system stem (e.g. `Nimbus`). The project's real names are in
`project.config.json` → `modules`; always use those.

## Modules by role

| Role (`modules.<role>`) | ODC | O11 | Holds |
|---|---|---|---|
| `theme` | library `<DS>Theme` | CrossDevice `<DS>_Theme`, in the "<Customer> Theme" app | the theme CSS (`dist/theme.css`), fonts, layouts |
| `patterns` | library `<DS>Patterns` | ReactiveLibrary `<DS>_Patterns`, in the Theme app | the public Blocks; references OutSystems UI, never the theme |
| `liveStyleGuide` | app `<DS>LiveStyleGuide` | CrossDevice `<DS>_LSG`, in the "<Customer> Live Style Guide" app | Styles pages, pattern pages, menu data, the TokenReference and class inspector Blocks |
| `patPreview` | — (preview Blocks live in the LSG) | CrossDevice `<DS>_PatPreview`, in the LSG app | one demo Block per pattern, wrapping the real Block with sample data and option toggles |
| `template` | app `Template_<DS>` | CrossDevice `Template_<DS>` | screen templates and sample pages, on the theme |

Build order for a change that spans them: theme → patterns → (O11: patPreview) → LSG → template.
Publish each before the next; the later ones reference the earlier ones.

## Menu data — every page is a record

Navigation is data, not hand-built screens.

| Entity | What it holds |
|---|---|
| `MenuCategories` | The stock categories (Widgets, Numbers, Content, Utilities, Interaction, Adaptive, Navigation), plus **Custom** where the kit has it |
| `MenuSubCategories` (FK to the category) | One record per pattern page: name, label, category, preview image, display order. Its Id selects the pattern on the page |

ODC LSGs keep those for the restyled OutSystems UI patterns and add a parallel pair for the design
system's own components: `<DS>MenuCategories` and `<DS>MenuSubCategories` (with `Is_Active`).

Read the module's real entity names before adding a record; kits differ in spelling.

## Routing a page

| What | ODC | O11 |
|---|---|---|
| Restyled OutSystems UI pattern | the stock `PatternDetail` page for that pattern — the restyle shows once the theme is published | same |
| New component (Block or Web Component wrapper) | a `<DS>MenuSubCategories` record → the `Patterns_<DS>` screen (input `<DS>MenuSubCategoriesId`), with the preview in the `Patterns_Preview_<DS>` flow | a `MenuSubCategories` record under **Custom** → an If branch in the `Patterns_Custom` block's "Custom Sandbox", comparing the selected Id with the record → the demo Block from `PatternsCustom` in PatPreview |
| A new category beyond the stock set | a `<DS>MenuCategories` record | a `MenuCategories` record and a `Patterns_<Category>` dispatcher block |

Never an ad-hoc screen outside the menu data, and never a custom component hidden inside a stock
category.

## Styles pages

| Page | Rendered by |
|---|---|
| Colors | `TokenReference` Kind = Color; above it, in `Intro`, the brand narrative and the Core / Extended split |
| Typography | `TokenReference` Kind = FontSize, then Kind = FontWeight |
| Spacing | Kind = Space |
| Border radius, Border size | Kind = Radius, Kind = BorderSize |
| Shadow | Kind = Shadow |
| Iconography, Grid, Utility classes | by hand, from the real classes; name them in the handover when they change |

`TokenReference` is a Block in the LSG with a required Script; it reads token names and values
from the published theme, so these pages need no edit when a token changes. The project template
ships it (`src/lsg/`, `handover/lsg-foundations.md`).

On O11 kits without it, Styles pages print values with `Utilities_CssVariableValue` /
`Utilities_CssPropertyValue` from PatPreview and build specimens from the real utility classes
(`.preview-*`). Prefer installing `TokenReference`: the kit's specimens list token names by hand,
and that list is what drifts.

## The class inspector

Each component sample sits next to a class inspector Block (`ClassPreviewer`, inputs `WidgetId`,
`Label`) that reads the classes live off the named widget and offers them as click-to-copy chips:
the ExtendedClass recipe, never a hand-written class list. On O11 kits, `CopyClass` chips do the
same job less well; prefer the inspector.
