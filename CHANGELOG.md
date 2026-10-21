# Changelog

All notable changes to the `lsg` plugin. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
