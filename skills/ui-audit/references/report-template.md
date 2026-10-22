# UI audit — <app>

<date> · <platform> · screens audited: <n> of <total> · sources: <MCP lookups, Mentor, getScreen, probe>

What this run could not see, and why: <for example "JavaScript in lifecycle actions — no MCP in
this run">.

## Summary

| Area | Findings | High | Reuse instead of rebuild |
| --- | --- | --- | --- |
| Components (UA-C) | | | <n> could be an existing component or Block |
| Styling (UA-S) | | | <n> classes already exist · <n> values have a variable |
| JavaScript (UA-J) | | | |

## The fixes that remove the most code

1. <Use the OutSystems UI Tabs on Orders, Customers and Invoices instead of three hand-built tab
   sets — delete <n> classes and one Script.>
2. …

## Findings by screen

### <Screen>

| Id | Element or selector | Evidence (source) | Fix — reuse | Sev | Effort |
| --- | --- | --- | --- | --- | --- |
| UA-S1 | `.my-flex` | same declarations as `.display-flex` (probe) | `.display-flex` | medium | S |

## Proposed items for `loop/goal.md`

Proposed, not signed — the scope owner signs before anything is built.

| Item | Kind | Replaces | Screens |
| --- | --- | --- | --- |

## Design findings raised

Conflicts with the brand, tokens or accessibility, routed through `outsystems-design-findings`:
<FND ids, or none>.
