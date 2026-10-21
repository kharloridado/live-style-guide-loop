# Live Style Guide Loop — the `lsg` Claude Code plugin

The **behaviour** half of a Figma → OutSystems (ODC and O11) design-system workflow: 13 skills, a
`maker` / `checker` agent pair, and two hooks. The **project** half — `specs/`, tokens, the theme
build, the fidelity gate, review pages, findings and handovers — is the companion template,
[`live-style-guide-harness`](https://github.com/kharloridado/live-style-guide-harness).

A versioned plugin rather than copied files, so an improvement reaches every project with
`/plugin update`.

## Install

```bash
/plugin marketplace add kharloridado/live-style-guide-loop
/plugin install lsg@live-style-guide-loop --scope project
```

`--scope project` records the plugin in the repo's `.claude/settings.json`, so the whole team gets
the same version. The template already ships that setting. Release notes: [CHANGELOG.md](CHANGELOG.md).

## What's in it

**Agents**

| Agent | Role |
| --- | --- |
| `@lsg:maker` | Builds ONE work item faithfully against its frozen ref. Raises findings; never fixes them. |
| `@lsg:checker` | Judges it: deterministic build gate → rendered-fidelity gate → risk-tiered review → adversarial challenge of every finding → verdict. Never modifies files. |

**Skills**

| Skill | Role |
| --- | --- |
| `/lsg:project-setup` | **Start here on a fresh clone.** Interview → config → deps + submodule → labels → signed inventory → verify it builds. |
| `/lsg:design-loop` | Freeze ref → maker → checker → commit → **one PR per deliverable** with its review Artifact. One request, or the signed queue in `loop/goal.md`. |
| `/lsg:revalidate` | Re-run the checker on an already-built item or PR, without rebuilding it. |
| `outsystems-frontend-router` | First stop for OutSystems UI questions: routes into the vendored frontend-skills pack and splits work by module (theme first, then each app). |
| `outsystems-component-audit` | Triage a design: exists as-is / customize (dual track) / build custom (L1–L5). |
| `outsystems-token-extractor` | Figma variables → `:root` custom properties. |
| `outsystems-figma-integration` | Read Figma through the MCP. |
| `outsystems-bem-css` | BEM CSS that restyles native widgets, token-only. |
| `outsystems-web-component` | Vanilla-JS Web Components + Block wrapper (L5 only). |
| `outsystems-mentor-build` | Drive a build into a live ODC module through Mentor, or write the prompt a developer pastes, and verify it landed. |
| `outsystems-design-findings` | Flag, don't fix: classify, challenge and route design-conformance findings. |
| `outsystems-style-guide-doc` | Live Style Guide pages. |
| `outsystems-git-helpers` | Commit messages, branch names, PR descriptions, changelog entries. |

**Hooks** — active in any project with a `build:theme` script and a `project.config.json`

| Hook | Does |
| --- | --- |
| `PreToolUse` → `pre-commit-gate.mjs` | Before a `git commit` touching `tokens/ src/ specs/ build/`, runs `npm run build:theme` and blocks the commit with its errors when it fails. Skipped in the unfilled template. |
| `SessionStart` → `session-check.mjs` | Lists missing setup steps (deps, submodule, OutSystems UI base, unfilled config). Silent when set up. |

## Two contracts

The plugin holds neither platform facts nor project values. It reads both at runtime.

- **Platform knowledge** comes from OutSystems' own frontend-skills pack, pinned at
  `vendor/outsystems-frontend-skills/` in the project. Skills read block names, arguments, CSS
  variables and the WCAG-to-widget mapping from there; when it is missing they stop rather than
  answer from memory. See [ARCHITECTURE.md](ARCHITECTURE.md).
- **Project values** come from `project.config.json`: `classPrefix`, `jsNamespace`, `figma`,
  `findings` and `knownFalsePositiveClasses`. Spacing scale, grid, breakpoints and default sizes
  are enforced only when written in the project's `specs/foundations/` or `specs/decisions.md` —
  never assumed or guessed; with nothing written, no finding is raised about them.

## How it works

- **One PR per deliverable.** Each item is cut from `origin/main`, built, checked and opened as a PR
  whose body carries the plan, the measurements, both decision logs and the findings
  (`skills/design-loop/references/pr-body.md`). The artifact says WHAT; the PR says WHY
  (`references/comment-budget.md`).
- **The loop never merges.** A human merging the PR is the approval. The handover issue is opened
  after the merge, never at checker PASS.
- **Fidelity is measured, not read.** The checker builds the item's specimen page and measures
  computed styles headlessly with the template's `build/gate/measure-fidelity.mjs`; drift or an
  unmeasurable page forbids a PASS. The committed `measurements.json` then becomes a baseline CI
  re-checks on every push — see the template's `build/gate/README.md`.
- **Everything it reads is a file in the clone**, so it runs the same at a keyboard and in a cloud
  session.

## Local development

```bash
claude plugin validate . --strict
/plugin marketplace add ./          # try a working copy before publishing
```

Bump `version` in both `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` to ship
an update; commits without a version bump do not reach installed projects.

## License

[MIT](LICENSE). The OutSystems frontend-skills pack a project vendors keeps its own BSD-3-Clause
licence.
