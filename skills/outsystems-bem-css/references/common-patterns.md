# Common patterns for restyling OutSystems UI

Reference implementations for the most commonly customized OutSystems UI widgets and patterns.
Replace `acme-` with the project's stored prefix.

## Read this before copying anything below

**These examples restyle the framework's OWN class names. That is deliberate and it is the
point** (SKILL.md → *Rule zero: restyle, don't shadow*). A parallel vocabulary such as
`.acme-btn--primary` brands nothing until a developer hand-types `ExtendedClass` on each widget.

Every selector below was verified against `vendor/outsystems-ui/src/scss/` and the pattern
enums under `src/scripts/OSFramework/OSUI/Pattern/`. **Verify them against the version your
environment actually runs before you ship** — check the pattern in
`vendor/outsystems-frontend-skills/ui-frameworks/outsystems-ui/`, and when it and the SCSS disagree,
the published page's rendered DOM decides.

---

## Button — the canonical restyle

**Framework vocabulary** (`03-widgets/_btn.scss`): `.btn` and the modifiers `.btn-primary`,
`.btn-success`, `.btn-error`, `.btn-cancel`, `.btn-small`, `.btn-large`, plus `[disabled]`.
`.btn` and each modifier are single-class selectors — your override sits at the same
specificity and wins on source order, because the theme loads after the framework.

**Step 1 — map the design's variants onto the framework's classes.** This table is a handover
instruction, so it goes in `handover/<artifact>.md` and the decision log — not in the CSS file
header, where the developer who needs it never looks.

| Framework class | Widget property | Design variant |
| --- | --- | --- |
| `.btn` (bare) | Style = Default | the design's secondary-weight / outline button |
| `.btn-primary` | Style = Primary | primary |
| `.btn-success` | Style = Success | success |
| `.btn-error` | Style = Error | error / destructive |
| `.btn-cancel` | Style = Cancel | muted / neutral |
| `.btn-large` | Size = Large | the design's big size |
| `.btn-small` | Size = Small | *(no counterpart — see step 3)* |
| — | ExtendedClass | variants the framework has no class for |

**Step 2 — write the base against the bare class.**

```css
/* Every OutSystems button in the app, with no ExtendedClass anywhere. */
.btn {
  background-color: var(--color-surface-default);
  color: var(--color-primary);
  border: 0;
  box-shadow: inset 0 0 0 var(--border-size-s) currentColor;
  border-radius: var(--border-radius-soft);
  font-family: var(--font-family-base);
  font-weight: var(--font-weight-bold);
}

.btn-primary {
  background-color: var(--color-primary);
  color: var(--color-base-white);
}

.btn-success { background-color: var(--color-success); color: var(--color-base-ink); }
.btn-error   { background-color: var(--color-error);   color: var(--color-base-white); }
```

**Step 3 — handle the siblings you just disturbed.** This is the step that gets skipped.
`.btn { height }` lands at the same specificity as `.btn-small { height }` and later in the
cascade, so it silently wins and the small button stops being small. Exclude what the design
has no answer for, rather than inventing one:

```css
/* .btn-small excluded: the design draws no small button — it keeps the framework's box. */
.btn:not(.btn-small) {
  height: var(--acme-button-height);
  padding: var(--acme-button-padding-block) var(--acme-button-padding-inline);
  font-size: var(--font-size-sm);
}

.btn-large { height: var(--acme-button-height-big); font-size: var(--font-size-lg); }
```

**Step 4 — only now, a prefixed class**, and only for variants the framework genuinely lacks:

```css
/* No framework equivalent: verified against _btn.scss. Applied via ExtendedClass. */
.acme-button--inverse { background-color: var(--color-base-lighter); color: var(--color-base-ink); }
.acme-button--outline { background-color: transparent; color: var(--color-primary); }
```

**Step 5 — neutralise framework behaviour that fights the design.** OutSystems UI derives
hover/active from a filter rather than designed colours (`.desktop .btn:hover { filter:
brightness(0.9) }`). If the design specifies literal hover fills, switch the filter off — and
match its specificity deliberately, `.desktop .btn:hover` is `(0,3,0)`:

```css
.btn, .btn:hover, .btn:hover:active, .desktop .btn:hover { filter: none; }
```

---

## Card

**Framework vocabulary** (`04-patterns/02-content/_card.scss`): `.card`. Related patterns own
`.card-background`, `.card-item`, `.card-sectioned`.

```css
.card {
  background-color: var(--color-surface-default);
  border: var(--border-size-s) solid var(--color-border-subtle);
  border-radius: var(--border-radius-soft);
  padding: var(--space-m);
}
```

Variants the framework has no class for get a prefixed modifier, applied via `ExtendedClass`:

```css
.acme-card--featured { border-color: var(--color-primary); border-width: var(--border-size-m); }
.acme-card--compact  { padding: var(--space-s); }
```

Note what is *not* here: no `.acme-card__header` / `__body` / `__footer`. Those are placeholders
you fill in the Block — style the content widgets you actually put in them.

---

## Tabs

**Framework vocabulary** (`Pattern/Tabs/Enum.ts`) — the framework already ships full BEM, so
there is nothing to re-name:

```
.osui-tabs                      .osui-tabs--is-active
.osui-tabs__header              .osui-tabs--is-vertical
.osui-tabs__header-item         .osui-tabs--is-justified
.osui-tabs__content             .osui-tabs__header__indicator
.osui-tabs__content-item
```

```css
.osui-tabs__header { border-bottom: var(--border-size-s) solid var(--color-border-subtle); }

.osui-tabs__header-item {
  padding: var(--space-s) var(--space-m);
  color: var(--color-text-subtle);
  font-weight: var(--font-weight-semi-bold);
}

.osui-tabs__header-item.osui-tabs--is-active { color: var(--color-primary); }

.osui-tabs__header__indicator { background-color: var(--color-primary); }
```

`.osui-tabs--is-active` is the framework's own state class, applied by its JavaScript. Styling
it is correct — the "no state coupling" BEM rule bans *inventing* `.acme-tabs.is-open`, not
consuming a state class the platform maintains.

---

## Tag / Badge

**Framework vocabulary** (`04-patterns/02-content/_tag.scss`): `.tag`, `.tag-small`,
`.tag-medium`, plus the `background-*` / `text-*` colour utilities it composes with.

```css
.tag {
  border-radius: var(--border-radius-pill);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}

.tag-small  { padding: var(--space-xs) var(--space-s); }
.tag-medium { padding: var(--space-s) var(--space-m); }
```

Semantic colours ride the framework's existing `background-*` utilities, which the theme's
token layer has already re-pointed — so there is nothing per-status to write here. If the design
needs a status the utilities don't cover, *then* add `.acme-tag--<status>`.

---

## When there is genuinely no framework equivalent

Full BEM under the project prefix, applied via `ExtendedClass`. This is the shape for the
things the framework does not name — and only those.

```css
.acme-step-indicator { }
.acme-step-indicator__step { }
.acme-step-indicator__step--is-complete { }
```

Before you write it: grep the widget SCSS **and** the pattern enums
(`src/scripts/OSFramework/OSUI/Pattern/*/Enum.ts`). Half the framework's class vocabulary lives
in the TypeScript enums, not the stylesheets, so a widget can look absent from SCSS and still
own the exact name you were about to mint.
