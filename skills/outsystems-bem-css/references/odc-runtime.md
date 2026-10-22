# What the ODC runtime does to your markup, and how to restyle on top of it

Observed in running ODC Reactive apps (OutSystems UI 2.x), not taken from docs. Every item here
caused visible drift in a delivered screen that passed Mentor's validation. Check the compiled CSS
and the DOM before relying on any of it for your tenant's version.

## Classes and wrappers the runtime adds

- **`ThemeGrid_MarginGutter`** goes on the second and later inline widgets inside a container, and
  adds a left margin. A layout that looks right in the model can shift by that margin.
- **`ThemeGrid_Width<n>`** appears when a Container's Width is set in grid columns. A builder can
  set it by accident (a 36 px wide note).
- **`OSFillParent`** (`display:block; width:100%`) sits on Inputs, Lists and RadioGroup items, and
  makes flex children full width. Override it with an explicit, equally or more specific rule.
- **Every Block instance renders inside `div.OSBlockWidget`** (inline). Two consequences:
  - In `ul > div.OSBlockWidget > li`, adjacent-sibling selectors (`.row + .row`) never match.
    Target `.OSBlockWidget + .OSBlockWidget > .row`, or `li + li > .OSBlockWidget > .row`.
  - A button inside a Block inside a grid cell does not stretch to the cell. Use
    `li > .OSBlockWidget { display:block }` and `width:100%` on the control.
- **A List with Mode Custom and Tag `ul`** renders a real `ul` / `li` (good for semantics), adds
  `<script>` nodes between the items, and keeps the browser's bullets and 40 px indent until reset.
- **The ODC compiler prepends** `:root{--color-primary…}` (from the Theme properties) and
  `.login-screen{background-image…}` to the Theme stylesheet. A Theme `@import` therefore never
  loads. Load web fonts from the OnApplicationReady system event, or self-host them with
  `@font-face`.

## Widgets that render bare

- **The Button widget** with your own classes is a native `<button>` with no `.btn` class: the
  browser's default border and background show through. Reset it once, at zero specificity:
  `:where(.my-app) button { font:inherit; color:inherit; background:transparent; border:0; padding:0; margin:0; cursor:pointer; appearance:none }`.
- **The RadioGroup** is
  `div[data-radio-group] > div > div[data-radio-button].OSFillParent > input.radio-button + label`.
  OutSystems UI rules on `[data-radio-group] [data-radio-button]` (inline-flex, margin) and on the
  input (`position:relative`) beat single-class app selectors. To restyle it as pills:
  `.my-picker [data-radio-button]{margin:0}`,
  `.my-picker [data-radio-button] input[type=radio]{position:absolute; opacity:0; inset:0}`,
  then style `label` and `input:checked + label`. A builder may leave the template's
  `Option 1/2/3` radios in place: delete them.
- **ProgressCircle** takes colour identifiers, and its trail defaults to a blue-grey. Set the
  trail and progress colours explicitly.
- **InlineSVG** (`SVGCode` input) is the way to render an SVG string. Never put SVG markup in an
  Expression, and never rewrite `innerHTML` from JavaScript.

## Layouts

- A copied LayoutBlank root is `display:flex` in a **row**. A custom Layout whose header, main and
  bottom regions are direct children needs `flex-direction:column` and `width:100%` on the
  children. Otherwise the main region shrinks to its content (a 326 px column in a 430 px canvas).
- The placeholder name `Content` is reserved; the HTML Element widget rejects the tag `main` (use a
  Container with `role="main"`).
- An empty placeholder still renders its element. Give optional regions `placeholder-empty`, and
  don't add a region no screen fills (see `outsystems-mentor-build` → "Extending a Layout").

## Restyling without `!important`

- **Resets need zero specificity.** `:where(.my-app) :where(ul,ol) { list-style:none; margin:0; padding:0 }`.
  A reset written as `.my-app ul` (0,1,1) outranks every single-class rule (0,1,0) and silently
  wipes paddings such as `.my-strip` and `.my-row`.
- **Base font rules on `.my-app input` / `.my-app button`** outrank single-class font rules.
  Re-assert a font with `.my-app .my-input-serif`, or put the base rule in `:where()`.
- **The link colour base** goes in `:where(.my-app) a, :where(.my-app) a:visited`, so single-class
  link rules win without `!important`.
- **Set the Theme properties to brand values.** `--color-primary` and `--color-secondary` come
  from them, and OutSystems UI components read them; overriding them later in CSS leaves the
  generated `:root` disagreeing with yours.
