# Assessment — <name>

Figma: file `<fileKey>`, node(s) `<node>` · read <yyyy-mm-dd> · library of record `<figma.fileKey>`
<"same file" | "a different file: <what that means for the matches">>
Annotated: <Artifact link>

## Summary

| Outcome | Regions |
| --- | --- |
| Reuse | |
| Reuse + variant | |
| Coming (queued or in review) | |
| New from OutSystems UI (`framework: "none"`: New native widget) | |
| New custom | |
| Screen-only | |

| Styles | Values |
| --- | --- |
| Token exists | |
| Unbound in Figma, token exists | |
| New token or finding | |

**What it takes:** <one paragraph a project lead can act on — e.g. "Buildable from the library
except the filter bar (new custom Block) and a status colour with no token; two existing items
need a variant. Five items, about M.">

## Layout

<The layout pattern or OutSystems UI layout Block, the placeholders each region fills, the closest
screen template, the column Blocks.>

## Regions

| # | Region | Outcome | Matches / built from | Evidence | Plan |
| --- | --- | --- | --- | --- | --- |
| 1 | Header | Reuse | `pat-layout-side`, Title placeholder | instance of library node `1:23` = ref node | — |
| 2 | Filter bar | New custom | — (checked `cmp-*`, blocks-index: no match) | raw frame, 3 dropdowns + chips | `cmp-filter-bar`, L5 |

## Styles

| Value | Where | Outcome | Token or finding |
| --- | --- | --- | --- |

## Build plan

| Order | Item | Kind | Level | Figma node | Depends on | Effort |
| --- | --- | --- | --- | --- | --- | --- |

## Screen assembly

<Layout → per placeholder: the Block, its inputs, what goes in its placeholders. For the app team;
not a design-system item.>

## Proposed rows for `loop/goal.md`

Proposed, not signed — merging the plan PR signs them.

| # | Item id | Component | Tier | Figma node | Notes |
| --- | --- | --- | --- | --- | --- |

## Questions for the designer

<One per open decision; DESIGNER-DECISION-TEMPLATE.md where options need measuring.>

## Findings

<FND ids raised through outsystems-design-findings, or none.>
