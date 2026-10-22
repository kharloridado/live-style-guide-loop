# ui-audit checks

Each check names its evidence and its fix. Paths are under `vendor/outsystems-frontend-skills/`.
Severity is a default; raise it where the pattern repeats across screens, lower it on a one-off.

Sources: **P** probe (`probe.json`), **L** ODC lookups or app references, **M** Mentor (a lead
only), **G** O11 `getScreen`, **X** ODC `context_graph` parsed with `scripts/xre/`, **D** the
deployed CSS or compiled script bundles, **H** an anonymous read-only HTTP GET, **R** a read of the
rendered screen.

## The reuse ladder — every fix climbs it, top first

1. An **OutSystems UI component** (`ui-frameworks/outsystems-ui/blocks-index.md`) or **utility
   class / variable** (`ui-frameworks/outsystems-ui/styles-and-utilities.md`).
2. A **design-system** Block, token or class (`specs/components/`, `src/blocks/`, `tokens/`).
3. A **Block or class the app already has** (inventory, app and library rows).
4. Only then something new: a restyle of the framework class first (`ExtendedClass`), a custom
   Block last (`outsystems-custom-block`).

## Components

| Id | What | Evidence | Fix | Sev |
| --- | --- | --- | --- | --- |
| **UA-C1** | Hand-built where an **OutSystems UI component exists** — tabs, accordion, popup, dropdown, tooltip, card, alert, badge, tag, pagination, wizard, date picker made from Containers and HTML | P `lookalikes` (class named like a pattern, `osuiPattern` is a hint to verify), `containerControls`; G/M widget tree; R | The component, named from `blocks-index.md` with the arguments and placeholders that cover the design; restyle it with `ExtendedClass` where it does not look right | high |
| **UA-C2** | A **Block that already exists re-created** — a second card, header or empty state when the design system or the app already ships one | inventory: same structure and purpose under another name; P repeated markup with different class names; L/G Block lists | Replace with the existing Block; where it lacks one variant, add the variant to it (an input or a placeholder), never a copy | high |
| **UA-C3** | A **Container where a widget or semantic element belongs** — a clickable div, a text styled as a heading, a div list | P `containerControls` (click listener or control role on a div/span), `fakeHeadings`; G | Button / Link / the pattern for the job; an AdvancedHtml `h1`–`h6`, `ul`, `nav` — the order in `common/atomic-design.md` | high (clickable), medium |
| **UA-C4** | **Used more than once, not a Block** — a component, a pattern wrapped or configured the same way, or a group of widgets that appears in two or more places, on one screen or across screens, built each time instead of being one reusable Block | P `repeats` (the same structure in 2+ places across every probed screen, text ignored; `alreadyBlock` names a Block some copies already use); G/M widget trees compared; P `blocks` for what is a Block already | One Block with typed inputs for what varies (text, state, data) and placeholders for what each caller fills; every copy replaced by it. Where a Block for it already exists, that Block (UA-C2) | high across screens · medium on one screen |
| **UA-C5** | A **custom atom** replacing Button, Input or another core widget | G/M; P an input or button built from divs | The core widget, restyled — the custom one loses validation, accessibility and theming | high |
| **UA-C6** | A **template Block overridden** until unrecognisable, or a screen built from Empty when a Screen Template fits | G/M; R | The closest template or pattern (`ui-frameworks/outsystems-ui/screen-templates.md`) | low |

## Styling

| Id | What | Evidence | Fix | Sev |
| --- | --- | --- | --- | --- |
| **UA-S1** | **A class that already exists, written again** — an app class whose declarations equal an OutSystems UI utility, a design-system class, or another app class | P `duplicateClasses` (`reuse` names the class; variables resolved, units normalised) | Delete the class and apply the existing one (`ExtendedClass` / Style Classes); two app copies → keep one in the Theme | medium (high when repeated) |
| **UA-S2** | **Rebuilt instead of restyled** — a new class standing in for a framework class or variant (`.my-button-blue` for `.btn-primary`, `--big` for `.btn-large`) | P app class applied beside or instead of the framework class; inventory | Restyle the framework class or variant in the Theme, or set the variant; never a parallel class (`outsystems-bem-css`) | medium |
| **UA-S3** | **Inline styles** — the Style property or a `style` attribute carrying colour, spacing or typography | P `inlineStyles` with `frameworkSet: false`; G | A utility class, or a class in the Theme (`common/css-customization.md` → Anti-patterns) | medium |
| **UA-S4** | **Hard-coded values where a variable exists** | P `hardcoded` → `literals[].existingVariable` (same value, a fitting name) | `var(--…)` named in the finding; with no variable, the value is a design decision — a token for it, or a design finding when it is off the palette | medium (brand colour: high) |
| **UA-S5** | **`!important`** | P `important` | Fix the selector or the level it is written at; it usually marks CSS in the wrong place | low |
| **UA-S6** | **CSS outside the Theme** — rules in Screen or Block stylesheets that are not genuinely local, or the same rule in several Blocks | G/M stylesheet per screen and Block; P app sheets other than the Theme's | Move to the Theme (`common/css-customization.md` → Where styles live) | medium |
| **UA-S7** | **A reserved layout class reused** — `.main-content`, `.sidebar`, `.header`, `.content`, `.footer`, `.main`, `.layout` on app elements, or a hand-built sidebar or header | P app rules on those selectors; R | The Layout's own placeholders and the Menu; app names prefixed (`outsystems-design-to-app` → theme-collisions) | medium |
| **UA-S8** | **A framework imported over OutSystems UI** — Bootstrap, Tailwind and the like | P `sheets` | Remove it; OutSystems UI has the primitives (`common/ui-performance.md`) | high |
| **UA-S9** | **Global selectors** — `*`, `body`, bare element selectors in app CSS | P app rules | Scope to a class | low |
| **UA-S10** | **`@import` in an ODC Theme** (web fonts, usually) — it never loads: at publish the compiler puts the generated `:root{--color-primary…}` (Theme properties) and `.login-screen{…}` in front of the stylesheet, so the `@import` follows a rule and browsers ignore it. Often hidden by JavaScript that injects the same `<link>` | D the deployed Theme CSS: an `@import` after the first rule; P the font requested only by a script | **Not** "move the `@import` to the top" — it cannot be first on ODC. Load fonts with one guarded JavaScript node in the OnApplicationReady system event (`<link rel=preconnect>` + `<link id="<app>-fonts" rel=stylesheet>`, skipped if the id exists), or self-host them with `@font-face` as Resources | high when the font matters to the brand |

## JavaScript

Lifecycle actions: OnInitialize, OnReady, OnRender, OnParametersChanged, OnDestroy. Evidence is
G on O11, X on ODC (every `IJavaScriptNode` with its source and owning action; M only as a
fallback), confirmed on the page: a listener left behind, a slow first paint, a console error.

| Id | What | Evidence | Fix | Sev |
| --- | --- | --- | --- | --- |
| **UA-J1** | **Heavy OnReady** — data fetching, API calls or long loops | G/M; R slow first render | An aggregate or data action with Fetch At Start; keep OnReady to setting state (`common/ui-performance.md`) | medium |
| **UA-J2** | **Selecting by typed id or global query** — `getElementById('Input1')`, `document.querySelector('.x')` | G/M | The widget's `.Id` passed in; queries scoped to that element (`outsystems-custom-block`) | high (breaks when two instances render) |
| **UA-J3** | **Listeners, observers or timers never cleaned up** | G/M: added in OnReady, nothing in OnDestroy; R listeners stack on revisits | Remove them in OnDestroy, keyed by the widget Id | high |
| **UA-J4** | **setTimeout / polling to wait for the DOM** | G/M | OnReady / OnRender, or the pattern's own client action or event | medium |
| **UA-J5** | **OutSystems UI internals mutated** — adding classes or attributes inside a pattern's DOM, calling its private API | G/M; P classes added at runtime inside `osui-` elements | `ExtendedClass` and the pattern's client actions (`ui-frameworks/outsystems-ui/pattern-client-actions.md`) | high |
| **UA-J6** | **The same JavaScript pasted** in several screens | G/M | One Block with one required Script (`outsystems-custom-block`) | medium |
| **UA-J7** | **Styling from JavaScript** — `element.style.x = …` | G/M; P inline styles that appear only after load | Toggle a class | medium |
| **UA-J8** | **Script tags or libraries in HTML** instead of Required Scripts | G/M; P script elements in the body | A Script resource with Required Scripts | low |

## App health

Not front-end checks, but they sit in the same model and a UI-only pass misses them. Evidence is
X on ODC (G and the data model on O11), confirmed by H or R where it can be. Report them in their
own section, and lead the report with any that are high.

| Id | What | Evidence | Fix | Sev |
| --- | --- | --- | --- | --- |
| **UA-A1** | **No per-user data ownership** in an app whose records are personal: no User Identifier on the root entities, and `GetUserId()` used only on Login | X entity attributes; `GetUserId` references by owner | A `UserId` on each root entity, every aggregate and SQL filtered by it, ownership checked in every server action that takes a record id (raise a `NotFound` user exception) — or record "shared by design" as a decision | high |
| **UA-A2** | **Hard-coded data literals in logic** — a fallback to one record by name, a magic id, a date | X aggregate filters comparing an attribute with a Text literal (recover hashed literals with `crack.py`) | An empty or not-found state; never another record | medium |
| **UA-A3** | **Exposed REST without authentication** — `Authentication: None`, cross-site requests allowed, documentation on | X `RestService` properties; H anonymous GET of the method and `swagger.json`, `access-control-allow-origin` | Delete it when nothing needs it; otherwise authentication, no documentation, a narrow CORS | medium (high when it writes or returns data) |
| **UA-A4** | **Timers that write data on publish, or on a fixed clock** — `Schedule: When published` seeding data in every environment; a daily evaluation with a fixed UTC offset | X `ITimer.Schedule` and the action it wakes; the arguments it passes (`AddHours(CurrDateTime(), -5)`) | No seeding timer (opt-in seed behind a Setting); time-zone-aware evaluation per user | medium |
| **UA-A5** | **Server calls inside loops, or several per user action** — N+1 in data actions; a client action calling 2+ server actions in sequence (non-atomic) | X For Each cycles containing `IExecuteServerActionNode`; the platform's `ConsecutiveServerInteractions` warning | One server action per user intent; set-based aggregates; helpers as in-memory functions | medium |
| **UA-A6** | **SQL where an aggregate does** — correlated subqueries per row, a column/structure mismatch warning | X `ISQLNode.SQL`; the `SQL_ColumnsMismatch` warning | Aggregates, plus building rows in memory | medium |
| **UA-A7** | **Prototype or seed screens reachable** — a screen marked temporary whose OnInitialize writes data | X the screen's OnInitialize flow; D the route table in `_osbundle-<App>.index` (is it deployed yet?) | Remove before promotion; never open it during the audit | high |
| **UA-A8** | **Dead scaffolding** — a consumed REST with a placeholder base URL, a timer nothing wakes, an unused aggregate, template screens and Layouts nothing uses | X references and validation messages (`Unused …`) | Delete | low |

## OutSystems' implementation rubric

With an app's `.oml` and OutSystems' internal tooling, the pack's
`.claude/skills/review-ui-implementation/rubric.md` scores 16 criteria. Where a check here covers
one, name it in the finding so the two reports line up: UA-C1 → 1 Block Selection · UA-C4 → 3
Common Block Extraction · UA-S6 → 4 Theme Extensions Discipline · UA-S4 → 5 CSS Variables ·
UA-S1 → 6 Utilities-First · UA-S5 → 7 `!important` · UA-C3 → 8 Layout Container Discipline ·
UA-S7 → 12 Chrome Placement · UA-S2 → 14 Block-Native Treatment vs CSS Override. The JavaScript
checks and inline styles are this skill's own.

## Used more than once means a Block

Anything used in two or more places is a reusable Block — never built twice, never pasted. That
covers a whole component, an OutSystems UI pattern wrapped or configured the same way each time
(the pattern inside a Block that sets its wrapper, `ExtendedClass` and arguments), a group of
widgets (a labelled field, a card header, an empty state), and the JavaScript behind them (UA-J6).
The fix is one Block plus a usage, never "keep the copies in sync". What it does not cover:

- **Rows of one List or Table.** One template rendered per record is one place.
- **A pattern used as it ships.** Two Dropdowns with their own defaults are two uses of
  OutSystems UI, not a repeat; the probe treats a bare pattern as a leaf for this reason.
- **Used once.** A Block for something used in one place adds indirection, not reuse
  (`common/atomic-design.md` → Page-specific organisms).

## Known false positives

- Inline custom properties and inline styles inside `osui-` elements: OutSystems UI writes them.
- `lookalikes` is a name match. A class called `card-…` inside the app's own Card Block is fine;
  verify the element against the pack before UA-C1.
- `repeats` matches structure, not purpose. Two structures that look alike but mean different
  things (an address card and a product card) are still one Block with inputs when the structure
  is the same, and two Blocks when their states or behaviour differ — judge it on the screens.
  Raise `--min-nodes` (default 5) when small repeats drown the large ones.
- `duplicateClasses` compares single-class rules only, and exact declaration sets. A class that
  differs by one declaration is a restyle candidate (UA-S2), not a duplicate.
- `existingVariable` means the same value under a fitting name, not the same meaning: 16px padding
  that happens to equal `--space-base` is a reuse only when the design means that spacing step.
- A value the design system's `specs/decisions.md` rules on, or a class in
  `findings.knownFalsePositiveClasses`.
