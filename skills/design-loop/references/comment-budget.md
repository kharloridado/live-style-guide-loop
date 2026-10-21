# Comment budget — the artifact is not the review surface

Applies to every file the loop writes: `tokens/*.css`, `src/blocks/*.css`,
`src/components/*.js`. Read by the `maker` (what to write), the `checker`
(what to fail), `outsystems-bem-css` and `outsystems-token-extractor`.

**The rule: the code says WHAT. The PR says WHY.**

Prose in an artifact reaches the wrong reader: the reviewer already has it in the PR, the
developer scrolls past it while pasting into ODC, and `build:theme:ship` strips it from the
customer's copy. Each kind of prose below has a destination a person can actually find.

## Where each kind of prose goes

| Prose | Destination | Not |
|---|---|---|
| Approach chosen, alternatives ruled out, assumptions | PR body §Decision log, verbatim | the file header |
| What this item deliberately does **not** build, and why | PR §What a human still has to check + the item's issue | a banner in the CSS |
| Ref-vs-drawing disagreements, re-ref requests | `specs/<kind>/<id>/ref.md` under `## Ref discrepancies` | a comment block |
| "What the framework actually emits" selector inventories | the maker's DECISION-LOG → PR §Plan | the file header |
| Design variant → framework class mapping | `handover/<artifact>.md` — the developer sets the widget's Style property from it | the file header |
| Computed contrast ratios that pass | PR §Gates | beside every token |
| A design conflict built faithfully | a filed finding (bug) | an `OBSERVATION:` note in code |
| A conflict you noticed but chose not to file | `findings/findings-register.md` | a code comment |

## The budget

- **Header** — **4 lines on a token file, up to 8 on a component**: what the file is, its spec
  ref, the framework baseline it was written against, which findings are filed against it, and a
  pointer to the handover for the tables and contracts. Plus the `/* @section Group / Name */`
  line where the theme build needs one.
- **Section markers: one line, no ASCII art** — `/* Sizes */`. No box-drawing characters, no
  rules of `═` or `─`, no centred banners.
- **Per-rule notes: as long as they need to be to justify a declaration in this file, and no
  longer.** Most are one line. The ones that earn more are the ones where deleting the
  declaration would break something silently — a specificity hand-back, a load-bearing
  `display`, a `:not()` that excludes a framework sibling, a value whose conflict is filed
  (`/* #12 filed: 2.4:1, built as drawn */`). **A note past ~15 lines has stopped explaining a
  declaration and started arguing a case; move the argument.**

### The test that replaces counting lines

**Delete the CSS and read the comment. If it still makes sense on its own, it is not a code
comment — it is PR prose in the wrong file.**

A comment that says *why this declaration exists* dies with the declaration. A comment that says
*why we chose this approach over three others*, or *what the design got wrong*, or *what the
framework emits*, stands perfectly well on its own — which is exactly why it belongs somewhere a
person can find it, and why nobody will ever update it where it is.

Do not enforce a percentage. The first version of this file said "comments under 10% of a file's
lines, none over 3", which was a plausible-looking number nobody had measured — the failure mode
this project has a whole rule about. Measured: sweeping seven real block files and five token
files took them from 5,389 lines to 1,779, and what survived is roughly 45% comment, because what
is left is mostly one-declaration rules that each need their one line of why. The longest
surviving note is 17 lines and it is the right length: it is the one that stops someone deleting
a card's bottom anchor.

## Not a comment problem — leave these alone

- The TOC and section banners in `dist/theme.css`. The build generates them and the project
  requires them; they survive `build:theme:ship` on purpose.
- A Script's or Web Component's header API contract — `init` options and callbacks (or attributes, properties, events, slots), one line each.
  That is the element's public interface and it is read in ODC, not in review. Keep it; it is not
  a place for rationale.
- Licence and attribution headers in vendored files.
