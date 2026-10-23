# Changelog

All notable changes to the `lsg` plugin. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [4.5.0] — 2026-10-23

A project can now build without OutSystems UI, when its owner explicitly says not to use it: the
design system is built as is, from its own tokens. OutSystems UI stays the default. Pair with
`live-style-guide-harness` from this date, which adds `framework` to `project.config.json`.

### Added

- **`/lsg:project-setup` asks whether the project builds on OutSystems UI**, right after the
  platform and before modules or tokens. The default is `outsystems-ui`. It sets
  `framework: "none"` only when the owner explicitly says not to use OutSystems UI, and records the answer in `project.config.json` and the ruling in
  `specs/decisions.md`. With `none`, the modules are Blank (ODC: libraries and apps) with no base
  theme, the Patterns module references no theme, and the OutSystems UI submodule and
  `build:osui` are skipped.

### Changed

- **Every OutSystems UI rule now depends on `framework`.** With `outsystems-ui` (the default)
  nothing changes. With `none`:
  - The order is native platform widget → restyle through `ExtendedClass` → custom Block (L5).
    Button, Input, Checkbox, Dropdown… still render with the platform's classes, but only the
    theme styles them. OutSystems UI patterns (Accordion, Tabs, Date Picker, Tooltip…) are
    unavailable, so they are L5, with no L4.5 gate.
  - The token extractor declares every token from the source system's own names and values, with
    the project prefix (`--uswds-color-primary`), instead of mapping onto OutSystems UI variables.
  - The component audit's first class is "native platform widget", and `/lsg:assess` has a
    matching outcome, **New native widget** (`native` in `regions.json`, drawn by `annotate.mjs`).
  - `@lsg:checker` measures without a framework base, and its framework-grain domain marks the
    OutSystems UI criteria N/A.
  - The session-start check no longer asks for `vendor/outsystems-ui` or a built OutSystems UI
    base.
  - The Live Style Guide has no stock pattern pages: a restyled native widget gets a page of its
    own.

## [4.4.0] — 2026-10-22

What auditing, rebuilding and re-checking an ODC app through the OutSystems MCP taught (the
Kojoshin audit and its KojoshinRebuild).

### Added

- **`/lsg:revalidate --delivered`.** It checks a published OutSystems screen against its frozen
  ref, or against the original app's screen for a rebuild. It compares region by region using the
  DOM skeleton and the CSS rules that match each element, so every drift row names its cause.
  `@lsg:checker` gains the matching step: leftover default texts, missing icons, stray grid widths,
  bare native elements, layout stacking, and sibling rules broken by `OSBlockWidget`.
- **`ui-audit/scripts/xre/`.** It parses an ODC `context_graph` (XRE) into widget trees and action
  flows, and recovers hashed text literals from the compiled JavaScript.
- **`ui-audit` app-health checks (UA-A1–A8)** and UA-S10, for a dead theme `@import` on ODC.
- **`outsystems-bem-css/references/odc-runtime.md`.** Covers what the ODC runtime adds to your
  markup (`ThemeGrid_MarginGutter`, `OSFillParent`, the `OSBlockWidget` wrapper, bare Buttons, the
  RadioGroup structure, the prepended `:root`) and how to restyle on top of it with
  zero-specificity resets.

### Changed

- **`/lsg:deliver` is not done until revalidation passes**, on ODC and O11. A publish with
  `changeApplied: true` and 0 errors is not that check. Before checking, the user assigns the
  roles, and the minimum test data is created through the app's own UI.
- **`ui-audit` on ODC starts from `context_graph`.** It parses the graph with the scripts and reads
  the theme CSS from the deployed files. The role gate is read from the compiled chunks, because
  the graph's role and validation messages can be stale. It records the revision it read.
- **`outsystems-mentor-build`:**
  - Start a fresh Mentor session per screen when the conversation fills up (OS-AISA-50001/50002);
    attachments belong to one conversation; creating an app needs `portfolioKey`.
  - Lint for Mentor's leftovers after every publish.
  - Parse the graph instead of asking what was built.
  - Don't add a layout region nobody fills.

## [4.3.0] — 2026-10-22

Pair with `live-style-guide-harness` from this date: its `npm run init` no longer writes
`.mcp.json`, and `check:config` fails while an `outsystems` entry remains there.

### Added

- **`/lsg:assess` — the first step for a new design.** Given a Figma mockup of a screen, a flow or
  a component, it checks every part against what the Live Style Guide already has (usage specs,
  frozen refs and their Figma nodes, shipped status), then OutSystems UI, and gives each region one
  outcome: reuse, reuse + a new variant, coming (queued or in review), new from OutSystems UI, new
  custom Block, or screen-only. Every colour, type, spacing, radius and shadow value is matched to a
  token, or raised as a new token or a finding — never rounded; the layout is matched to a layout
  pattern and its placeholders. Anything used twice is a Block. It writes `assessments/<slug>/`
  (the assessment, `regions.json`, the frame) and an annotated page — every region outlined and
  numbered on the screenshot, coloured by outcome (`scripts/annotate.mjs`) — with a build plan in
  dependency order, the screen assembly for the app team, and proposed `loop/goal.md` rows that the
  scope owner signs by merging the plan PR.
- **`/lsg:ui-audit`** audits an existing app's UI and front end, read-only, for what it should
  have reused: an OutSystems UI component or a Block the team already has instead of one built from
  Containers, a class that already exists instead of a new one, a CSS variable instead of a
  hard-coded value. It also checks Containers standing in for widgets, inline styles, CSS outside
  the Theme, `!important`, JavaScript in screen lifecycle actions, and anything used more than once
that is not a Block — 23 checks, each with its
  evidence and the existing thing to reuse. ODC first, through OutSystems' plugin (its lookups,
  and Mentor asked to describe, never to change); O11 through Service Studio's read tools. Its
  browser probe (`scripts/probe.mjs`) reads the published screens: duplicate classes with the class
  to reuse, hard-coded values with the variable that already holds them, pattern look-alikes,
  clickable divs, inline styles. The report is a review Artifact and proposes items for
  `loop/goal.md`, for the scope owner to sign.
- **Reuse before you write.** The maker checks OutSystems UI and the design system for an existing
  class or Block before writing one, and extends an existing Block rather than copying it; the
  checker fails a class or Block that repeats one the project already has.
- **Used more than once means a Block.** Anything that appears in two or more places — a
  component, a pattern wrapped or configured the same way, a group of widgets — is one reusable
  Block with inputs and placeholders. The component audit counts the places and routes repeats to a
  Block; the maker builds one and hands over its uses; the checker fails per-screen rebuilds; and
  `/lsg:ui-audit` finds the copies in a running app: its probe compares element structures across
  every screen it reads, counts rows of one List once, and knows a reused Block (`data-block`) from
  pasted markup, including content placed in a Block's placeholder.

### Changed

- **The ODC MCP is OutSystems' own plugin.** `project-setup` installs `outsystems@outsystems` from
  `OutSystems/outsystems-mcp` with `--config tenant_hostname=<odcTenant>` on each developer's
  machine, and verifies `plugin:outsystems:outsystems` in `claude mcp list`. It no longer writes the
  server into `.mcp.json`, where a second `outsystems` entry duplicated or hid the plugin's.
- **OutSystems' `outsystems` skill drives the tenant.** `/lsg:deliver` and `outsystems-mentor-build`
  load it before the first tool call and follow it for sessions, publishing, polling, errors and
  confirming every tenant write; they add only the design-system layer. Where the two differ on
  the mechanics, OutSystems' skill wins.
- **On O11, OutSystems' `servicestudio-mcp-oml` skill drives Service Studio's MCP.** Setup installs
  it from `OutSystems/outsystems11-mcp` and registers the `servicestudio` server; `/lsg:deliver`
  loads it and lets each write go through Service Studio's Compare-and-Merge before `omlPublish`.
- **The official skill is required, by platform.** The session-start check flags as REQUIRED a
  missing `outsystems` plugin or tenant on ODC (and a tenant that differs from `odcTenant`), or a
  missing `servicestudio-mcp-oml` skill or `servicestudio` server on O11. `/lsg:deliver` refuses the
  MCP path without the official skill, and setup does not report ready until it is in place.

### Removed

- **The `outsystems-web-component` skill.** Every new custom component is a custom Block with a
  required Script (`outsystems-custom-block`); the loop no longer builds Web Components. Its
  keyboard and ARIA recipes moved to `outsystems-custom-block/references/`. A project that already
  ships Web Components keeps them as they are; the checker still reviews one when an item touches it.

### Fixed

- `project-setup` said OutSystems' plugin declares no MCP server. It has since 0.20.0.

## [4.2.1] — 2026-10-21

### Fixed

- **`/lsg:deliver <PR number | item id>` takes that PR even without the `deliverable` label**, so
  work merged in projects older than the label can still be delivered.

## [4.2.0] — 2026-10-21

Pair with `live-style-guide-harness` 0.3 or later (`npm run docs:odc`).

### Added

- **Approved work gets built into OutSystems.** New skill `/lsg:deliver`: after a deliverable PR
  merges, it builds the Block, its Script, its CSS and its Live Style Guide page into the project's
  modules through the OutSystems MCP (the ODC tenant endpoint, or Service Studio's on O11),
  publishes to development and checks the result in a real browser. Without an MCP it hands the
  same steps to a developer — a Mentor Studio prompt on ODC, Service Studio steps on O11. The
  handover issue opens either way, saying which happened. The design loop's pre-flight runs it for
  anything merged since the last run.
- **Every delivery carries its documentation.** `/lsg:deliver` packages the Markdown the merge
  added or changed (the item's usage spec, and any foundation, token reference or decision) with
  `npm run docs:odc` and adds it to the theme module's Resources, and the Live Style Guide's where
  it renders them, so Mentor and other agents building in those apps read the same rules people
  do. Without an MCP, the handover names the files to import.

### Changed

- The loop no longer says integration is manual: nothing touches OutSystems before the merge, and
  `/lsg:deliver` takes it from there.

### Fixed

- **O11 has an MCP after all.** `project-setup` and `outsystems-style-guide-doc` name Service
  Studio's own MCP server, configured per developer machine, as the O11 channel; Service Studio
  steps in the handover remain the fallback.

## [4.1.0] — 2026-10-21

Pair with `live-style-guide-harness` 0.3 or later, including its `modules` config and
`TokenReference` Block.

### Added

- **MIT license.** Other teams may use, copy and adapt the plugin; keep the copyright notice.
- **The loop knows the Live Style Guide.** `outsystems-style-guide-doc` is rebuilt around it: what a
  change does to the LSG (a new token → nothing when the Styles pages render from the theme; a new
  component → a menu record, a page, a live preview and the class inspector), the page spec, the
  modules and routing on ODC and O11 (`references/lsg-anatomy.md`, `references/page-spec.md`), and
  the sweep before a handover or release.
- **L5 is a custom Block with a required Script.** New skill `outsystems-custom-block`: an
  OutSystems Block of widgets, placeholders and typed inputs, plus one vanilla-JS Script exposing
  `window.<Ns>.<Block>.init / update / destroy`, called from the Block's OnReady,
  OnParametersChanged and OnDestroy, one instance per widget Id. The audit, maker, checker, router
  and BEM skill route L5 there; `outsystems-web-component` is kept for projects that already ship
  Web Components, or on request.
- **LSG impact in every build.** The maker returns LSG-IMPACT and writes usage spec §9; the checker
  fails a new component with no page; per-item-build puts the page in the same handover, one
  prompt per module in build order; the PR body gains a "Live Style Guide" section.

### Changed

- **`project-setup` asks for the platform first**, then every module and application by role
  (`project.config.json` → `modules`), sets up the OutSystems MCP whenever the platform has one and
  verifies it with a read-only call, and records the delivery channel: the MCP, else Mentor prompts
  (ODC) or Service Studio steps (O11). `--odc-tenant=none` records an ODC project without MCP access.
- **`outsystems-token-extractor`** names the Styles page a token change shows on, instead of a
  "update swatches" TODO.

## [4.0.0] — 2026-10-21

Pair with `live-style-guide-harness` 0.3 or later.

### Changed

- **Renamed.** The repo and marketplace are `live-style-guide-loop`; the plugin is `lsg`.
  Commands are `/lsg:design-loop`, `@lsg:maker`, `@lsg:checker`. To migrate an existing project,
  in `.claude/settings.json`:
  - `enabledPlugins`: replace `"outsystems-loop@outsystems-loop"` with `"lsg@live-style-guide-loop": true`;
  - `extraKnownMarketplaces`: replace the `outsystems-loop` entry with
    `"live-style-guide-loop": { "source": { "source": "github", "repo": "kharloridado/live-style-guide-loop" } }`;

  then replace `outsystems-loop:` with `lsg:` in the project's CLAUDE.md.
- **`design-loop` leads with the common case**: one request in a session → one PR with its review
  Artifact. Queue runs read `loop/goal.md`'s run settings. `loop/state.json` is an index with a
  fixed status list; decision logs stay in the PR body.
- Every skill reads project values from `project.config.json`; findings are filed with labels only
  (no issue type).
- **Spacing scale, grid, breakpoints and default sizes** are enforced only when written in the
  project's `specs/foundations/` or `specs/decisions.md` — never assumed or guessed. This replaces
  the three-state `conventions` block (`confirmed | assumed | TBD`), which projects never filled in;
  `project.config.json` no longer carries it.

### Added

- **Hooks.** `PreToolUse` runs `npm run build:theme` before a `git commit` that touches `tokens/`,
  `src/`, `specs/` or `build/`, and blocks it when the build fails. `SessionStart` lists missing
  setup.

### Removed

- Board mode: the `board-ship` and `board-sync` skills and their references. A merged PR is the
  approval.
- `figma-to-outsystems` (a second orchestrator beside `design-loop` and the router), and
  `outsystems-onboarding` / `outsystems-project-context`, which kept project values in chat memory.
- The scheduled-routine prompt pack; `project-setup` offers one optional nightly queue run instead.
- `outsystems-component-audit/references/figma-mcp-usage.md` (superseded by
  `outsystems-figma-integration`).
