# Floe Webapp Workbench Interaction Contract

## Workbench Wheel Ownership

- Inside Workbench, wheel / trackpad scrolling belongs to the canvas by default. Blank canvas areas and unselected widget bounds may zoom the canvas.
- The currently selected widget boundary is a canvas-zoom guard: wheel events inside the selected widget must never trigger canvas zoom.
- Inside the selected widget, local scrolling is allowed only when the pointer is inside an explicitly marked, real constrained local scroll viewport. Otherwise the wheel event should resolve to ignore/no-op, not canvas zoom and not fake local scrolling.
- Unselected widgets must never capture, consume, or block wheel input. Hover state, visual scroll affordance, embedded lists, or transient focus do not grant wheel ownership.
- Text-selection ownership and wheel ownership are separate contracts. A surface may own pointer semantics for native text selection and copy without owning wheel semantics.

## Workbench Text Selection Ownership

- Text selection and copy inside Workbench are first-class interaction contracts alongside wheel, typing, and activation. Do not rely on shell activation, transient focus, global shortcut hacks, or accidental browser defaults as the long-term mechanism.
- Drag-to-select must win over widget activation, canvas interaction, and shell focus reclaim on real text-bearing reading surfaces.
- Real text-bearing reading surfaces must be declared through the exported text-selection surface contract, or projected into that contract by a product-level adapter before widget activation runs. Plain headings, labels, metadata blocks, log lines, and similar read-only text must not silently fall back to widget-body activation semantics in products that expose them as readable content.
- Unselected widgets may still become selected on an initial plain click inside a reading surface, but drag-to-select must not be broken by that selection flow.
- `Ctrl/Cmd+C` should defer to the browser, Monaco, terminals, and other controls that already copy from a real local selection. Do not add product-level forced-copy fallbacks that bypass a verified selection lifecycle.
