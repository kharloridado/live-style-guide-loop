---
name: outsystems-mentor-build
description: Drive a build inside a real ODC module through Mentor over the OutSystems MCP — screens, layouts, widget trees, theme CSS — and verify it actually landed. Use this skill whenever work is being applied to a live OutSystems app rather than emitted as files: creating or editing a screen, assembling a widget tree, adding a placeholder or an optional region to a Layout, pasting a theme, or sequencing and publishing Mentor turns. Also use it when writing a Mentor Studio prompt for a developer to paste (a handover), especially a structural one split across the theme module and consumer apps, and whenever a Mentor turn reports success and you are about to believe it.
---

# Driving an ODC build through Mentor

This skill is the **design-system layer** for changing a live ODC module over the MCP. The MCP
itself is OutSystems' — its `outsystems` plugin declares the server and its `outsystems` skill owns
how to drive it: read `tools/list` first, Mentor sessions, publishing inside a Mentor turn, polling
long runs, error categories, and **confirming every tenant write with the user**. Load that skill
before the first tool call; where the two differ on the mechanics, OutSystems' skill wins. This
skill adds what a design system needs on top. It holds no platform facts: what a Layout is, which placeholders it exposes, which
widget is right for a piece of content — all of that is upstream's, cited below and never
restated here.

What it owns is the part that has repeatedly gone wrong in practice: **Mentor reporting
success for a change that did not land**, and agents inventing structure the platform
already defines.

## The one-line rule

> Build with what the platform already has, in the shape the module already uses — then
> **prove it in a browser**, because nothing else in the pipeline can see the failure.

## Before the first turn — read the module, don't guess it

Two lookups, always, before you write a prompt:

1. **The module's default Theme.** The same context lookup that returns the theme stylesheet
   also returns `layout` (name + key), `menu` and `grid`. That `layout` is the Layout block
   every screen in the module uses, and it is the one your screen must use. Do not infer it
   from the app name, and do not let Mentor pick.
2. **The existing screens.** They show you the convention already in force — which flow
   screens live in, how they are named, what the module actually looks like.

Guessing either is how a screen ends up detached from the app it lives in.

## Layouts and widget choice — upstream owns this, read it

| Need | Read |
| --- | --- |
| Which Layout, its placeholders, one-Layout-per-screen, the default-Layout deletion trap | `vendor/outsystems-frontend-skills/ui-frameworks/outsystems-ui/layouts.md` |
| Which widget for which content, and the semantic hierarchy | `vendor/outsystems-frontend-skills/common/atomic-design.md` |
| Headings, typography hierarchy, section structure | `vendor/outsystems-frontend-skills/ui-frameworks/outsystems-ui/polish-checklist.md` |
| Every block's arguments, placeholders, events | `vendor/outsystems-frontend-skills/ui-frameworks/outsystems-ui/blocks-index.md` |
| Where CSS belongs — Theme vs Screen vs Block | `vendor/outsystems-frontend-skills/common/css-customization.md` |
| Semantic structure and landmarks for a11y | `vendor/outsystems-frontend-skills/common/accessibility.md` |

Two upstream points are worth naming here only because ignoring them is the common failure,
not because this skill restates them:

- **A screen is not a blank page.** It wraps in exactly one Layout block, and content goes
  into that Layout's *named placeholders* — the page title in `Title`, the body in
  `MainContent`. Content authored at the screen root renders detached: no menu, no header,
  no chrome.
- **`Container` is the last resort in the widget hierarchy, not the default.** Upstream's
  order is: **OS UI block → `AdvancedHtml` with a semantic HTML5 tag → platform interactive
  widget → `Container`**. Reaching for a styled `Container` where any of the first three
  exists is a downgrade, and for headings it is an accessibility regression. See the polish
  checklist's typography table.

  Read the hierarchy as a *search order you must actually walk*, not a preference. The two
  steps skipped most often, because a `Container` looks right on screen either way:

  | Content | Correct | The downgrade |
  | --- | --- | --- |
  | Screen title | `AdvancedHtml Tag="h1"` in the Layout's `Title` placeholder — **one per screen** | plain text in `Title`, which emits no heading at all |
  | Titled group of content | the **`Section`** block (`Title` + `Content` placeholders), or **`SectionGroup`** to compose several with a sticky index | `Container` + a styled title `Container` |
  | Section heading | `AdvancedHtml Tag="h2"`–`"h6"`, in document order, no skipped levels | styled `Container` |
  | Body copy | `AdvancedHtml Tag="p"` | `Container` |

  **Confirm the block before you name it in a prompt.** Search the tenant for it and read
  its real placeholders — they vary by OS UI version. `Section` in `OutSystemsUI_2_16`
  exposes `Title` and `Content` only, while the pattern reference also documents an
  `Actions` placeholder; a prompt that fills `Actions` against that version fails. And if
  Mentor cannot find a block, it must **say so, not silently substitute a `Container`** —
  tell it that explicitly in the prompt.

## ⚠ Never build UI as an HTML literal

Do not hand Mentor a block of markup to drop into a widget. Two distinct things are being
ruled out, and one thing is **not**:

| Approach | Verdict |
| --- | --- |
| A whole layout as an HTML string in an **Expression** widget | **Never.** |
| A whole layout as an HTML string in an **`AdvancedHtml`** widget | **Never** — same defect, different widget. |
| `AdvancedHtml` with a **single semantic tag** (`h1`…`h6`, `p`, `strong`) wrapping real content | **Correct, and upstream-mandated.** Not what this rule bans. |

The ban is on *pasting markup instead of building widgets*. It is not a ban on
`AdvancedHtml`, which is how you get a real `<h2>` instead of a `<div>` that merely looks
like one. An over-broad reading of this rule produces screens whose every heading is a
styled `Container` — which is its own defect.

Why the literal is wrong:

- **An Expression renders as a `<span>`.** Wrap a layout in one and nothing inside it is a
  widget the platform models. It cannot be inspected, restyled, reordered or reused in
  Studio or by a later Mentor turn, and the `ExtendedClass` / BEM-on-native-widgets approach
  has nothing to attach to.
- **`Escape Content = No` does not exist on the ODC reactive Expression.** It is a
  Traditional Web property. Mentor will accept the instruction, store an `EscapeContent`
  extended property, and report `change_applied: true` with zero validation errors — and the
  page will render `<div class="…">` as visible text. The model is not lying about what it
  stored; the property has no effect on that widget.

Build the tree instead: name each widget, its Style Class, and its literal text. A widget
tree in a prompt is longer to write than a blob of HTML and far more reliable to apply (an
order of magnitude fewer Mentor retries).

### Target HTML as a *spec* is different — and needs saying so

A structural prompt (a Layout, a shared `Common` Block) may describe the result as the **rendered
HTML it must produce**. That is not the literal this section bans, provided the prompt does three
things:

1. **A widget legend** maps every piece of markup to a widget: `data-block="X.Y"` = Block `Y` from
   `X`, `data-container` = Container, `data-advancedhtml` = HTML Element with that tag,
   `data-expression` = Expression, `data-link` / `data-image` = Link / Image, a `<div>` marked
   `<!-- PLACEHOLDER Name -->` = Placeholder, `class` = the widget's Style Classes.
2. **One explicit sentence:** "Build these as real widgets. Never paste this HTML into an
   Expression or an HTML Element." Mentor reads HTML well; without the sentence it may take the
   shortcut.
3. **Diff markers** on each line — `<- ADD`, `<- MOVE here`, `<- REMOVE …`, `(unchanged)` — so it is
   an edit to the existing tree, not a rebuild.

Target HTML with a legend usually lands a Layout restructure in one pass where prose widget trees
need repeated corrections. Verification is unchanged: the outline check, class check and boxes below still decide.

## Prompts a human pastes into Mentor Studio

When the output is a prompt for a developer to paste (a handover), rather than an MCP turn you
drive, add these on top of everything above:

- **Self-contained.** Mentor sees no repo, no handover, no vendored pack and no skill — only what is
  in the module. Cite no repo file, path, finding id or ref section. State each upstream rule in
  plain words in an "OutSystems UI rules to follow" list.
- **Imported specs, once proven.** The project template keeps the design system agent-readable as
  Markdown in `specs/` (usage specs, foundations, token reference, decisions) so it can be imported
  into an ODC module as Resources — context for Mentor and for whoever uses the Live Style Guide.
  If the module has them **and** you have confirmed Mentor reads them there (ask it to summarise
  one by name; check the answer against the file), a prompt may name the resource instead of
  restating it. Keep the rules a wrong build would break inline either way.
- **One prompt per module, in build order.** Split the work with `outsystems-frontend-router` Step 4
  first: Prompt A in the theme module (the public layout Block, with every app-specific slot a
  Placeholder), Prompt B in each consumer app (`Common` Blocks and the screens that fill the
  placeholders). Label each with its module. In the project template, an entry in
  `handover/handover-map.json` takes `mentor.prompts: [{ title, text }]` for this.
- **Placeholder, Container or Text.** A slot whose content changes per screen is a Placeholder
  (keep `placeholder-empty` on it); a Container only wraps; Text/Expression is chrome that never
  changes.
- **Name what not to touch, with the reason** — especially framework-wide switches. Mentor turned on
  a layout's `EnableAccessibilityFeatures` against a plain instruction; that switch changes focus
  and hover styles of every input, dropdown, button and checkbox inside the layout.
- **Shared Blocks: add, don't move.** If another layout hosts the same Block, moving a widget inside
  it changes that layout too. Add a second instance where the new layout needs it and switch with
  CSS scoped to the layout.
- **"Every branch".** If a Block has an `If`, say the target markup applies to every branch, or
  Mentor edits one.
- **Fixed-string attributes**; `If(…, "page", "false")`, never `""`.
- **End with a report request:** list every widget added, moved or deleted, by Block and Name, and
  flag anything not built exactly as the target shows.
- **After it runs, measure the published page and send a delta** — a short prompt scoped to one
  Block: numbered steps, a `Result:` snippet, "No CSS, no JavaScript, no other changes."

## Widget libraries — Mentor builds around them, Studio adds them

An app that uses a `WidgetLibrary` asset (one built with the OutSystems Frontend CLI, `osfe`) cannot
be built end to end through Mentor. Two limits, both seen on every widget library tried:

- **Mentor cannot add the dependency.** Its element search has no widget type, so the library never
  shows up, and referencing it by asset key fails with "An internal error occurred while referencing
  producer". `(System)`, OutSystemsUI and OutSystemsCharts reference fine, so this is specific to
  widget libraries, not to dependencies.
- **Mentor cannot load a revision that has the dependency** ("An unexpected error occurred"). The
  revision before it still loads.

So the order is fixed: **slots first, widgets last.**

1. Mentor builds everything else — data, blocks, screens, actions, variables, theme — from a
   revision **without** the dependency. Where a widget goes, it leaves a **slot**: a Container named
   `Slot_<Purpose>` with the project's slot class, holding one Text that names the widget and every
   binding (`ReactAria Switch · Label "Is pending" · Is selected = ExampleIsPending`). Every variable
   and action the binding names exists before the slot is handed over.
2. A person (or a computer-use agent, `references/odc-studio-computer-use.md`) adds the dependency in
   ODC Studio and fills each slot. **The slot text is the checklist**: delete it, drop the widget,
   set exactly what it says.
3. After that the app stays in Studio. To change it through Mentor again, load the last revision
   without the dependency and **publish over** the Studio revisions (see "Sequencing turns"), then
   redo step 2. Say which Studio work that discards before you ask.

Detect it before the first turn: if the spec, the handover or the app's references name a
`WidgetLibrary` asset, plan this split up front instead of discovering it at the reference step.

## Classing a widget — Style Classes first, Extended Properties as the fallback

A widget gets its classes from the **Style Classes** property. Use it whenever it can do the
job. Reach for an **Extended Properties** entry named `class` only when Style Classes cannot
— and when you do, carry the platform's classes yourself.

| Mechanism | What it does |
| --- | --- |
| **Style Classes** property | **Prefer this.** Appends to what the platform already put on the element. |
| Extended Property `class` | **Fallback only.** Sets the raw HTML attribute, *replacing* the platform's own classes wholesale. |

The order matters because of that difference: Style Classes adds, an Extended Property
`class` overwrites. Falling back is fine when it is the only way to express what you need —
but the moment you do, every class the platform would have supplied becomes yours to
restate, `btn` and any grid or layout classes included.

The failure mode is silent and total: the widget keeps rendering, so nothing in the pipeline
objects, but it has quietly lost every class the platform gave it.

**Buttons always keep the platform `btn` base.** A Button's classes must read `btn` first,
then any variant:

    btn                         <- correct: a bare Button is already the low-emphasis variant
    btn btn-primary             <- correct: framework variant
    btn acme-btn--secondary     <- correct: design-system variant, base still present
    acme-btn--secondary         <- WRONG: no base

The platform does **not** prepend `btn` for you — whatever the class string says is what
ships. Put the base and the modifier in one field together, and do not split them across
Style Classes and a second mechanism. If a Button has to be classed through an Extended
Property `class`, `btn` must appear in that value too; nothing adds it back.

**Why the base matters more than it looks.** A design-system button stylesheet typically
puts every visual property (background, border, padding, radius, type) on the `.btn` base
and lets the variant classes assign nothing but custom properties. That collapses dozens of
states into a flat, readable cascade — at the cost of zero graceful degradation. A button
carrying only `acme-btn--secondary` sets nine custom properties that **nothing reads**, and
falls back to the browser's own `2px outset` / `padding: 1px 6px` chrome. Not degraded:
unstyled — behind a green build gate and a clean Mentor validation.

**Telling the two mechanisms apart from the DOM — a weak signal, so do not lean on it.** The
platform adds classes of its own (e.g. `ThemeGrid_MarginGutter`), and their absence alongside
a missing base *suggests* the attribute was replaced rather than appended. But it is a
correlate, not the thing:

- **False negative.** A Button with its margin property set to `None` emits no
  `ThemeGrid_MarginGutter` at all. Absence is not evidence of a clobber.
- **It misses the failure you are more likely to have.** A page can pass this check on every
  button while many carry the *wrong variant* — a well-formed class list with the wrong
  contents.

Measure `btn` presence directly — it is one line and it is the property you care about — and
assert the expected *variant* per row on top of it. Ask the model to read its own tree when
you need to know the mechanism.

**Check it in the browser, not in the model** — and assert the variants, not just the base:

```js
const b = [...document.querySelectorAll('button')];
({ total: b.length,
   missingBase: b.filter(x => !x.classList.contains('btn')).length,
   variants: b.reduce((m, x) => (m[x.className] = (m[x.className] || 0) + 1, m), {}) })
```

`missingBase` must be 0, and the variant tally must match what the design says each row holds.
A base-only check passes a page whose variants are scrambled.

**Defensive CSS is the belt, not the braces.** Writing the base rule as
`:is(.btn, [class*="ds-btn--"])` makes a modifier self-sufficient if someone does drop the
base, and keeps specificity at 0,1,0. Worth doing — but it repairs the stylesheet, not the
widget, and the widget is still wrong. Fix both.

## Extending a Layout — three rules for a new region

Adding a band to a Layout (a context bar under the top menu, a sub-header, a toolbar) is the
most common structural change after adding a screen. Three rules, each with a failure mode
that ships silently.

### 1. The class goes ON the placeholder, not on a wrapper the screen supplies

    Placeholder "PropertyBar"   Style Classes: my-property-bar placeholder-empty

not

    Placeholder "PropertyBar"   (bare)
    └─ Container                Style Classes: my-property-bar     <- the screen's

Both render the same DOM the first time. They diverge on every screen after that.

When the layout owns the class, the region has **one** definition and a screen cannot spell
it differently, forget it, or wrap it in something else. When the screen owns it, the
region's contract is distributed across every screen that uses it, and the layout block —
the thing whose name implies it defines the layout — defines nothing.

The tell that you got it wrong: the styling instructions in your handover have to explain
what container to create. If a screen author needs to know a class name to make a layout
region look right, the class is in the wrong place.

### 2. An optional placeholder MUST carry `placeholder-empty`

    Style Classes: my-property-bar placeholder-empty

**An empty placeholder still emits its element.** This is the misconception worth killing,
because it is load-bearing and it reads as plausible: people reason that a placeholder is
"replaced by" its content, so nothing means no element. It does not work that way. The
framework ships

```scss
.placeholder-empty:empty { display: none; }
```

and that rule would have no reason to exist if empty placeholders produced no DOM.

So a region whose band styling lives on the placeholder — per rule 1 — renders that styling
on **every screen that leaves it empty**: a bare, content-free strip of background, borders
and padding. `placeholder-empty` is what makes the region genuinely optional rather than
merely blank.

**The source path lies about its scope — check the compiled CSS, not the tree.** The rule
lives in `src/scss/08-servicestudio-preview/_placeholder-empty-odc.scss`, a directory whose
name says editor-preview-only. The ODC variant ships **unguarded at runtime**. Its O11
sibling in the same folder, `_placeholder-empty-o11.scss`, *is* wrapped in
`html[data-uieditorversion^="1"]`. Two near-identical files, one guarded and one not, in a
folder named for the guarded case. Grep the built stylesheet and read the selector that
actually shipped.

`:empty` is strict — it matches only when the element has no child nodes at all. That is what
you want here, and it means you must not "helpfully" put a comment or a spacer inside the
placeholder.

**Know what the collapse rule actually weighs, because the intuition runs backwards.**
`.placeholder-empty:empty` scores **(0,2,0)** — `:empty` is a pseudo-*class*, so it counts in
the class column, not the element column. Getting this wrong in either direction costs you:

- A design-system rule like `.my-layout .my-property-bar` is *also* (0,2,0). It does not
  out-rank the collapse — it **ties** it, and the tie is settled by load order. Your theme
  loads after the framework, so you win every time. That means **an equally specific
  `display` in your own file silently defeats the collapse**; you do not need a more specific
  one, and reviewers looking for a specificity escalation will not find one.
- Conversely a single-class rule (`.my-property-bar`, (0,1,0)) genuinely loses to the
  framework and appears to work. Do not bank it — it wins by accident and breaks the moment
  the selector picks up a second class.

The durable fix is not arithmetic, it is structure: **put no `display` on the band at all.**
Style the band (background, borders, shadow) on the placeholder, and put the flex row on the
inner `ThemeGrid_Container` per rule 3. Then the two mechanisms never compete. Back it with a
probe that renders a genuinely empty placeholder and measures `display: none` — an argument in
a comment is not a guard, and this exact bug survived a clean validation and a green publish.

### 3. The content row takes framework classes — `ThemeGrid_Container display-flex align-items-center`

```
<div class="my-property-bar placeholder-empty">              <- band: background, borders, shadow
  <div class="ThemeGrid_Container display-flex align-items-center">   <- row: ALL framework classes
    …
  </div>
</div>
```

**Read the layout's own equivalent region before you write a line of CSS, and copy how it is
built.** That is the whole rule, and it is cheap: ask the model for the literal Style Classes
on the existing rows. In a stock ODC `LayoutTopMenu` you will find

| Element | Style Classes, verbatim from the module |
| --- | --- |
| the 56px top row | `header-top ThemeGrid_Container` |
| its inner row | `header-content display-flex ` |
| the Title + Actions row | `content-top display-flex align-items-center` |

Every one of those expresses the flex row as **classes on the widget**, not as declarations in
a stylesheet. A new region that writes `display: flex; align-items: center` into the design
system's CSS is re-implementing `.display-flex` and `.align-items-center` — utilities the
framework already ships (`05-useful/_display-flex.scss`). Your stylesheet should carry only
what has no utility equivalent: the design's own `gap`, `padding-block`, colours and borders.

**`ThemeGrid_Container` is the one a new sibling does not inherit.** It is what applies the
grid's max-width and the horizontal gutters, and the top row carries it *explicitly* — so a
band added beside that row gets none of it and renders full-bleed with its content flush to
the viewport edge. Add it, or add a wrapper inside the band that has it.

Note also that `display-flex` on the inner row is scoped to **that row's** children. It does
nothing for a sibling at the outer level; each region declares its own.

This mirrors how the framework builds the header one level up (`.header` is the band,
`.header-top.ThemeGrid_Container` is the content), and it is what gives the region the app's
own responsive gutters instead of a hand-rolled set. Splitting band from content is also
what lets the band be full-bleed while its content stays aligned with everything else on the
page.

**The gutter collision, and why it is not obvious.** Inside a header, the framework sets

```css
.header .ThemeGrid_Container { padding: var(--space-none) var(--space-xl); }
```

Two traps in that one line:

- **It is the `padding` shorthand**, so it resets `padding-block` to `0`. A band that needs
  vertical padding must set `padding-block` explicitly, and must win the cascade to do it.
  The responsive variants (`.tablet .header .ThemeGrid_Container`, `.phone …`) use the
  shorthand too, at (0,3,0) — the same specificity a naive override lands on, so it resolves
  on source order. **Measure the computed value at every device class; do not reason it out.**
- **The design may not want the framework's gutter.** A design that binds the band to one
  spacing token and the row above it to another is differentiating them deliberately, and
  adopting `ThemeGrid_Container` wholesale silently discards that. Adopt the container for
  its centring and its responsive behaviour, then scope the horizontal padding back to the
  designed value using the framework's own device class (`.desktop …`), letting tablet and
  phone inherit. That is not an invented breakpoint — it is the platform's device
  classification — so it stays legitimate even when the design ref has no mobile frame.

If you cannot have both, say so and let a human choose. Quietly taking the framework's
number is changing a design value without telling anyone.

## Sequencing turns

- **One coherent section per turn.** A turn carrying an entire large screen is the least
  reliable thing you can ask for.
- **Publish between turns.** Everything a turn changes lives only in the server-side session
  until published, and a session that GCs re-downloads the OML from the tenant — unpublished
  work is simply gone. Publishing between turns means a failure costs one turn, not the
  build.
- **Publish the data model before the screens that bind to it.**
- **Resume the same session** with `mentor_session_id` + the newest `mentor_session_token`.
  A failed or cancelled turn never advances committed state — resume it, don't start a fresh
  `app_key` session, which burns a tenant slot and drops unpublished edits.
- **…until the conversation fills up. Then a fresh session per screen.** Attachments are
  inlined into the conversation history (Mentor answers "I used the CSS pasted in your
  message"). After a few large turns, every prompt fails within seconds, even a bare "Publish":
  - `OS-AISA-50001` ("Mentor ran into an issue… clear the chat")
  - `OS-AISA-50002` ("Problem with the AI Provider service")

  Retrying the same session does not recover it. Its unpublished work is lost.

  On KojoshinRebuild, three 25–80 KB attachments plus one 12-Block, 17-minute turn killed a session. What then worked every time, for 8 screens:
  - `mentor_start_session` → `mentor_load_asset` (the published revision) → upload one **pack of 20 KB or less** for that screen (its original widget tree, its logic, its spec lines) → one build turn → a separate "Publish" turn → `mentor_close_session`.
  - Up to two small screens share a session.
  - Never put a whole theme and a dozen Blocks in one turn.
- **Attachments are per conversation.** Re-upload them in every new session: `mentor_request_upload`, then `curl -X PUT --data-binary @file "<uploadUrl>"` (it expires after 30 minutes). At most 3 refs per prompt. Wrap CSS in a ```` ```css ```` block inside a `.md`; `.css` is not an allowed type.
- **A fresh session knows nothing of earlier turns.** Open each prompt with what already exists ("the data model, server actions, theme, LayoutEnso and the Blocks X, Y already exist"). For navigation to screens that don't exist yet, leave a TODO and wire it in the turn that creates them.
- **Creating an app:** `mentor_create_asset` requires `portfolioKey`, though its schema marks it optional. Read it from `env_list` (the Development environment's) or from an existing app. The asset comes from the platform template: Login, InvalidPermissions, two RecoverPassword screens, UserProfile, ChangePassword, five Layouts, Menu, MenuIcon, ApplicationTitle, UserInfo, an EmailTheme and a role named after the app. Plan a clean-up turn, and check you did not end up with a second role (`<App>2`).
  The web app template also brings OutSystems UI, OutSystemsCharts and OutSystemsMaps, and there is
  no blank option. An app that must not use OutSystems UI spends its first turn removing them: every
  template screen, block, layout, menu and action that depends on them, then the references, then a
  theme with no base theme.
- **On a timeout, raise `max_turn_time` and retry the same app.** Never create a new app; that
  discards everything the session already applied.
- **Large specs go as attached files, one batch per turn.** For many similar screens, generate one
  spec file per batch — 5 to 7 screens, at most 14 KB — attach it, and ask the turn to build that
  batch and publish. Six screens took about 1.5 minutes plus the publish, and a failure cost one
  batch, not the app. Check the batch in the browser before sending the next.
- **Large seeds go in batches of about 150 records.** Mentor's seeding script ran out of memory on
  537 static-entity records in one go; it recovered by batching on its own, but ask for batches up
  front.
- **Publishing from an older base revision is rejected as a conflict.** Mentor publishes over the
  newer revisions only when the prompt says so explicitly. When that is the intent (the
  widget-library split above), say it, and name what the newer revisions held that will be lost.
- **A session can lose its loaded asset.** A run comes back `not_found`, then Mentor answers that no
  app is selected. `mentor_load_asset` again, then resend the same prompt; do not start a new app.
- **Wait for the run to be terminal before the next prompt.** A turn can publish, lose track of what
  it built and publish the same revision again as a no-op ("the screens were already in the app").
  The live revision is what `env_app` says, never what the turn's prose says.
- **When moving existing widgets, say MOVE.** "Move the tree into the Content placeholder,
  do not rebuild it" preserves classes, text and order. Left ambiguous, Mentor may
  regenerate — and a regenerated tree is a new chance to drift from the spec.

## Verification — the part that is not optional

**`change_applied: true` is not evidence.** Neither is `validation.error_count: 0`, nor a
confident summary. All three were present on a screen that shipped rendering its own markup
as visible text.

**A step that failed shows only in the prose.** A turn asked for six steps reported
`changeApplied: true` and 0 errors while one step (adding a widget-library reference) had failed;
only a sentence in its reply said so. Read the whole reply, then check each requested step against
the model or the page — not the turn as a whole.

Nothing else in the pipeline can catch this class of defect: the deterministic build gate
checks the repo, not the tenant; Mentor's validation checks the model, not the rendering;
Studio Preview is explicitly not trusted. **Load the published URL in a real browser.**

After publishing, check in this order:

1. **The publish actually deployed.** `no_changes_detected: true` means the deployment live
   in that environment is *not* this publication — nothing landed. Never report it as shipped.
2. **The screen renders at all**, and its title is right.
3. **The app's chrome is present** — menu, header. Absence means the Layout was skipped.
   Check this deliberately: *a screenshot cropped to the content area looks identical either
   way*, which is exactly how a layout-less screen gets signed off.
4. **No HTML tag text is visible.** Reading `<div class="…">` or `&#45;` as words on the page
   means the UI was built as a literal.
5. **The widget tree is what you asked for** — the elements are real widgets, headings are
   real headings, not one `Expression`.

   **Assert the document outline, don't eyeball it.** This is the one check that catches a
   page built entirely from styled `Container`s, and nothing else in the pipeline can: such
   a page renders *pixel-perfect*, passes validation with zero errors, and looks correct in
   every screenshot. In the browser:

   ```js
   [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => h.tagName + ': ' + h.textContent.trim())
   ```

   - **Zero headings on a content screen is a FAIL**, always. It means the `Title`
     placeholder got plain text and every section heading is a `div`.
   - Expect **exactly one `h1`** (the screen title, from the Layout's `Title` placeholder)
     and one `h2` per section, in document order.
   - A useful companion signal: count `div`s inside your content root. A specimen or detail
     screen in the low hundreds of `div`s with no headings is the signature of this defect.

   Screens with zero headings routinely pass a Mentor turn reporting `change_applied: true`,
   zero validation errors and a visual screenshot review.
6. **The content itself** — counts, values, order, against the spec of record.
7. **The rendered class strings**, for anything you styled. A widget that lost its
   platform base class still renders, so only the DOM shows it — see "Classing a widget"
   above for the one-liner.

Read the model back through the context lookups as well as looking at the page, but treat
the browser as the authority. Note that the context lookups can lag a publish by some
seconds; a screen missing from `context_screens` immediately after a successful publish is
usually index lag, and the browser settles it.

**Batch builds: probe the DOM, not screenshots.** After each batch publish, run one DOM probe over
the batch's pages: h1 count, h2 list in order, slot texts, table-of-contents links, table roles,
`aria-current`. It is faster than screenshots and catches what they miss — Mentor put a section
heading after its content with no validation error. Probe many routes from one page by loading each
in a hidden same-origin iframe (the harness's `build/gate/probe-pages.js`), not one navigation per
route.

### Lint for Mentor's leftovers after every publish

These defects passed Mentor's own validation with 0 errors and a confident "done", and were
visible only in the DOM or the model graph. Check for them after every publish, not once at
the end:

| Leftover | Find it |
| --- | --- |
| The widget's default text left beside the real content: `Button` in Buttons (calendar days, Cancel/Save, back), `link` in Links. A row link's accessible name becomes "link" | `[...document.querySelectorAll('button,a')].filter(e=>/^(Button\|link\|Link)/.test(e.textContent.trim()))` |
| A RadioGroup keeping the template's `Option 1/2/3` beside new items labelled `New Item` | the labels of `[data-radio-group] label` |
| Icon widgets with no icon name | `i.ph` (or the icon library's class) with no `ph-<name>` class |
| A Container Width set in grid columns by accident (`ThemeGrid_Width1`: a 36 px note) | `[class*=ThemeGrid_Width]` |
| A second role (`<App>2`), indexes reported but not created, a reported delete rule that differs from the model | `context_graph`: `IRole`, `IEntity` attributes (`DeleteRule`), index nodes |
| Logic silently dropped ("LogMessage isn't available in this module") | the turn's own reply, then the flow in the graph |

**Parse the graph instead of asking.** `ui-audit/scripts/xre/` dumps every widget tree and action flow of the published revision, which turns "did it build what I asked" into a diff.

**Layout regions nobody fills.** A Layout placeholder that no screen uses still renders an
empty element on every screen. Before you add a region, check which screens will fill it.
Give every optional one `placeholder-empty` (rule 2 above), or don't add it.

### Constraints Mentor reported that were true

- A Layout placeholder cannot be named `Content` (it is reserved); use `MainContent`.
- The HTML Element widget rejects the tag `main`; use a Container with `role="main"`.
- A screen cannot read a Setting directly; return it from a server action.
- A List source cannot be a list literal; fill a local list in OnInitialize.
- A variable's Default Value must be a literal. `CurrDate()` is accepted; `AddDays(CurrDate(), 3)`
  is rejected. Mark computed initial values in the spec so the builder assigns them in
  OnInitialize, which only assigns variables and never fetches data.
- An element `id` cannot be set as an extended attribute (the platform owns ids). In-page anchors
  use a `data-anchor` attribute and `scrollIntoView`; on ODC the scroll container is
  `.active-screen`, not the document (`outsystems-bem-css/references/odc-runtime.md`).
- A Link's OnClick can call a screen action only, not a client action. A shared client action
  (ScrollToAnchor) needs a one-node screen-action wrapper on each screen that uses it.
- Enum properties of library widgets are design-time only and cannot be bound to a variable. An
  example that switches one renders one widget per value, each with a Visible condition.
- ProgressCircle colour inputs take colour identifiers; wrap hex values in a text-to-identifier conversion. Set TrailColor and ProgressColor explicitly, or it uses its blue-grey defaults.
- The platform log action may be unavailable in a fresh module. Mentor then drops the logging silently, so ask for it explicitly or accept the gap.
- **A theme `@import` never loads on ODC.** The compiler prepends the generated `:root` (Theme properties) and `.login-screen` rules to the stylesheet. Load web fonts with one guarded JavaScript node in OnApplicationReady instead (`<link rel=preconnect>` + `<link id="<app>-fonts">`, skipped when the id exists). Verify it by diffing the deployed `/<App>/css/<App>.<Theme>__*.css` against the source.

### Never verify a size or a count from the model's own report

Ask Mentor to paste a stylesheet section back and it will do so faithfully — that is reading.
Ask it how long the file is and you get a language model counting characters, which is not.

A model-reported length can be off by a third while the content is intact. Treated as evidence,
it reads as a truncation and triggers a pointless re-paste — or a "repair" that really damages
the file.

So split the two kinds of question:

| Question | Ask |
| --- | --- |
| "what does this element/section contain?" | the model — it reads the module |
| "how many bytes / how many of X / did anything else change?" | the **context service**, which returns a server-side byte count, or a diff you compute yourself |

And sanity-check any size against the artifact you generated it from: a theme pasted from a
build should match that build's byte count within a small, *stable* delta (line endings and the
editor's preamble). A delta that matches the one you measured before the change is strong
evidence nothing was lost; a delta that suddenly moves is worth chasing.

### Per-widget property edits can silently no-op — check the revision number

Bulk work (replacing a theme stylesheet, a screen stylesheet) applies reliably. **Per-widget
property edits are a different story**, and the failure is not an error — it is a confident,
itemised, entirely fabricated report.

Typical failures: values moved onto the wrong widgets, correct widgets damaged, and a complete
no-op whose result carries a per-widget "read-back" table and passing self-checks for changes
that were never written.

**The mechanism: positional addressing is unsound, because traversal order is not render
order — and is not stable between sessions.**

This is the part worth carrying. On the screen in question, the widgets in *flat sibling*
rows were enumerated in render order every single time. The widgets in rows nested inside a
wrapper Container were not. One session's enumeration matched the rendered DOM one-for-one,
so keying the edit on "your own tree order" looked like the fix; a **fresh session over the
same OML produced a different order** and wrote ten individually-correct values onto ten
wrong widgets.

So every positional scheme fails here, and they fail *plausibly* — the values are right, the
count is right, only the assignment is wrong:

| Addressing | How it failed |
| --- | --- |
| Row label ("the row labelled accent cool") | Mapping slipped one row; correct rows damaged. |
| Ordinal ("the 15th Button") | Values applied in a shuffled order. |
| The model's own enumeration | Correct in the session that produced it, wrong in the next. |

**A self-check on the unambiguous rows does not protect you.** Asking it to verify the first
N widgets before editing passes trivially, because the flat rows are exactly the ones that
always map correctly. The check confirms nothing about the nested ones you actually care
about.

Prefer an addressing scheme the tree itself carries — a widget Name where one exists, or a
property already unique to the target. Where the widgets are anonymous and only position
distinguishes them, per-widget editing over this transport is not reliable; say so and hand
it over.

Two cheap tells, neither of which requires trusting the summary:

1. **The publish creates no new revision.** A publish that returns `succeeded` with the SAME
   revision number as the previous one deployed nothing, whatever `no_changes_detected` says.
   Record the revision before you start.
2. **A read-back that disagrees with itself.** If you ask the model to re-read the values it
   just wrote and some *unrelated* property (Enabled, caption, order) has drifted from an
   earlier enumeration of the same tree, the read-back is describing a tree that does not
   exist. Treat the whole report as void.

When per-widget edits fail twice, stop and hand the human a checklist. More turns cost far
more than the couple of minutes the edit takes in Studio, each one risks damaging widgets
that were already right, and if the targets are distinguished only by position the next
attempt is not more likely to work than the last.

## Reporting

Say which revision landed, and what you verified versus what you inferred. When a turn
reported success and the browser disagreed, say so plainly — that gap is the single most
useful thing to carry back, and burying it is how the next build repeats it.

If a Mentor turn's terminal result carries `internal_retry_count >= 3`, submit an
`agent_observation` / `builder_retry_friction` through `submit_feedback`. It is the signal
that the prompt shape is fighting the builder.
