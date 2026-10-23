# Driving ODC Studio with computer use

For the steps Mentor cannot do — adding a widget-library dependency and filling the slots it left
(SKILL.md → "Widget libraries"), or a per-widget edit that failed twice over the MCP. Observed in
ODC Studio 1.7 driven through screenshots, mouse and keyboard; check them against the Studio
version you have.

Studio is a desktop app, so this runs under the computer-use tools and their access rules. Every
publish from Studio is still a tenant write: confirm it with the user, then verify it the way
SKILL.md → "Verification" says (`env_app` for the live revision, then the page in a browser).

## Placing widgets

- **Drag from the toolbox slowly.** Mouse down on the widget, several small moves, a pause over the
  drop target, then mouse up. A single fast drag does not register.
- **Starting a drag scrolls the canvas to the selected widget.** Select something next to the drop
  target first, so the target is still under the pointer. Or skip the canvas: paste into the target
  selected in the **Widget Tree**.
- **Copy a configured widget into the next slot.** Select the done widget, copy, select the next
  slot Container in the Widget Tree, paste, then change only what differs. It is faster than a
  fresh drag and keeps the bindings.

## Deleting

- **Delete widgets from the Widget Tree, not the canvas.** Clicking a Text that is already selected
  puts it into inline edit, and Delete then removes characters instead of the widget.

## Typing into properties

- **Property fields ignore clipboard paste.** Type long values in chunks of 15 characters or
  fewer.
- **Pick variables and actions from the suggestion list** rather than typing the whole name.
- **Confirm a field with Return, not Tab.** Typing while the canvas has focus edits the canvas.

## Checking your work

Read the property pane back after each widget against the slot's text (the slot text is the
checklist). Publish once per screen or batch, not once at the end. When 18 widgets went into one
revision and its publish failed (OS-FEW-POST-50000), nothing could say which widget broke it.
