# WCAG 2.2 — the delta over 2.1

**This file is deliberately incomplete.** It lists *only* the success criteria WCAG 2.2 adds over
2.1. Everything else — label/input association, alt text, semantic HTML, focus order, error
identification, ARIA states, contrast thresholds, and how each of them maps onto OutSystems
widgets — is platform knowledge and lives upstream:

> `vendor/outsystems-frontend-skills/common/accessibility.md`

Read that first. Come here second, for the seven criteria it predates.

This file exists because upstream is written to **WCAG 2.1 AA** and this loop commits to **2.2 AA**.
That gap is not overlap, so the loop owns it. If upstream moves to 2.2, delete this file rather
than reconciling it.

---

## 2.4.11 Focus Not Obscured (Minimum) — AA

- Focused element is not entirely hidden by author-created content (sticky headers, modal
  overlays, cookie bars, floating action buttons).
- When scrolling, focused elements remain at least partially visible.

Most common real failure: a sticky header with no `scroll-margin-top` on focusable content beneath it.

## 2.4.13 Focus Appearance — AAA

Not required for AA. Applied anyway as the loop's default focus treatment, because it costs
nothing at generation time:

- Focus indicator is ≥ 2px thick, outlining or enclosing the element.
- Focus indicator has ≥ 3:1 contrast against the unfocused state.

Never file a finding against AA conformance for this one — it is above the bar we claim.

## 2.5.7 Dragging Movements — AA

Any drag interaction needs a single-pointer alternative:

| Drag interaction | Required alternative |
| --- | --- |
| Drag-to-reorder list | Up/down buttons, or keyboard `Ctrl`+arrows |
| Drag-to-resize | Keyboard arrows, or a numeric input |
| Drag-to-slide (range) | Arrow-key support and click-to-position |
| Drag-and-drop between columns | A "move to…" menu on the item |

Exceptions: drawing tools and signature pads, where the drag *is* the content.

Relevant to custom Blocks far more than to framework widgets — a hand-built drag handle is a
common L5 output and a common miss.

## 2.5.8 Target Size (Minimum) — AA

- Pointer target ≥ 24×24 CSS pixels.
- Recommended (not required): 44×44 for primary touch targets.
- Exceptions: inline links in a sentence, targets sized by the user agent, targets the user chose
  to shrink, and targets with an equivalent larger control nearby.

**Routing:** enlarging a target where the layout has room is a silent fix. Enlarging one whose size
the design specifies is a `accessibility/target-size` finding — see the fix-vs-flag table in
`../SKILL.md`.

## 3.2.6 Consistent Help — A

Help mechanisms (contact link, chat launcher, FAQ, help icon) appear in the same relative location
on every screen that offers them.

Screen-flow scope, not component scope. Surfaces during a component audit across a set of frames, not
while building one component. Finding type `consistency`.

## 3.3.7 Redundant Entry — A

Information already entered in the same process is auto-populated or selectable — the canonical
case being "billing address same as shipping".

Exceptions: re-entry for security verification, and information that has expired.

Screen-flow scope. Finding type `consistency`.

## 3.3.8 Accessible Authentication (Minimum) — AA

Authentication must not require remembering, transcribing, or pattern-matching unless an
alternative exists.

- Browser password managers and pasting into the field must not be blocked.
- Cognitive-function CAPTCHAs need an alternative.
- Object-recognition and personal-content challenges are permitted only with an alternative.

Applies when a custom auth component is in scope. Standard OutSystems login screens are upstream's
territory — check there first.

---

## Where each of these lands

| Criterion | Scope | Usually surfaces during |
| --- | --- | --- |
| 2.4.11 Focus Not Obscured | Screen / layout | Component build, rendered-fidelity gate |
| 2.4.13 Focus Appearance | Component | CSS generation (auto-applied) |
| 2.5.7 Dragging Movements | Component | Custom Block build (L5) |
| 2.5.8 Target Size | Component | CSS generation → fix or flag |
| 3.2.6 Consistent Help | Flow | Component audit |
| 3.3.7 Redundant Entry | Flow | Component audit |
| 3.3.8 Accessible Auth | Flow | Component audit, custom auth only |
