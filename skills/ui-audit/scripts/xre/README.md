# xre — read an ODC app from its context_graph

`context_graph` returns the published revision of an ODC app as an XRE graph: every screen, block,
widget, action flow, expression, entity and theme reference. These scripts turn that graph into
text you can read and diff. It is read-only evidence, and on ODC it is the best evidence you have.
Use it before asking Mentor what it built.

Python 3.9+, standard library only.

| Script | Does |
| --- | --- |
| `xre.py extract <page.json>... <out.xre>` | Joins the `xre` blocks of every `context_graph` page, in order, into one file. |
| `xre.py summary <app.xre>` | Counts and names the screens, blocks, entities, server and data actions, timers, roles, SQL and JavaScript nodes and REST services, then prints the graph's validation messages. |
| `widgets.py <app.xre> <out.txt> [cracked.json]` | Writes the widget tree of every screen and block, with classes, styles, conditions and bound expressions. |
| `flows.py <app.xre> <out.txt> [cracked.json]` | Writes every client and server action as numbered steps: Ifs, Assigns, aggregates, the actions it runs and where it navigates. |
| `crack.py <app.xre> <compiled-js-dir> <cracked.json>` | Recovers the hashed text literals (see below) by hashing candidate strings. |

## Reading the graph

- An edge with `relationType: "Parent"` points **src = parent → dst = child**. Every other edge is
  a reference (`DataType`, `ReferedObject`, `Style`, `Role` …). If you get this backwards, every
  tree comes out inverted.
- **Text literals are hashed.** A `Text` node carries `TextHash` (the first 10 hex characters of
  the SHA-1 of the value) and `TextLength`, not the text itself. `crack.py` brute-forces strings of
  up to 3 characters and hashes every string literal in the compiled JavaScript
  (`<app-url>/scripts/*.js`, fetched read-only). Hashes it can't recover print as `<txtN>`.
- **JavaScript nodes** keep their source in `JsSourceText`.
- **The theme CSS is not in the graph.** Read it from the deployed `<app-url>/css/*.css`.
- **The role on a screen is unreliable in the graph.** Confirm it with `checkPermissions` in the
  compiled `_oschunk-*.js`.
- **Validation messages carried in the graph can be stale** (from an earlier revision). Trust the
  publish result and the tree, not those messages.

## Typical run

```bash
# 1. save each context_graph page (the harness writes big results to a JSON file)
python xre.py extract page1.json page2.json app.xre
python xre.py summary app.xre
# 2. optional: recover hashed texts from the deployed JavaScript
python crack.py app.xre ./js cracked.json
python widgets.py app.xre widgets.txt cracked.json
python flows.py app.xre flows.txt cracked.json
```

Record the app's revision (`env_app`) next to every dump: a graph is only evidence for the
revision it was read at.
