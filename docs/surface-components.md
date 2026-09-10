# Surface component coverage

The optional soft neumorphic material is a lightweight shared component system: restrained depth, crisp marks and fast feedback, rather than heavy embossed frames. Every component family below has a deliberate visual role and state contract. `docs/surface-style.md` owns configuration, persistence, surface tokens, input focus, high contrast, and performance rules. This inventory owns coverage and prevents a container-only implementation from being presented as a complete material system.

## Design decisions

- Use a common light direction and separate raised, recessed, and floating treatments. Ordinary surfaces use at most two decorative shadows; independent focus indicators are additional. Compact indicators use smaller relief than containers; metadata must not cast large shadows across adjacent rows.
- Preserve semantic hues, labels, checkmarks, position, progress values, and disabled behavior. Depth supplements these signals; it never becomes the only state indicator. Unselected Checkbox and Switch wells use the existing muted-foreground face. Radio uses a hollow 1px outline and transparent interior so its unselected state stays quiet; selection adds a solid dot and a 6% primary tint. The browser matrix checks at least 3:1 for the visible Radio outline and Switch thumb across all non-HC palettes.
- Dark surfaces use a slightly lighter carrying plane, a 4% white interior light and 20% black shade; no exterior white halo or opaque black groove. Increasing blur around near-black surfaces does not establish readable relief. Tune light/dark independently, with local Workbench palettes participating.
- Neutral borders and separators remain quiet. Input focus changes the existing uniform border to an opaque 88% muted-foreground / card blend, with at least 3:1 adjacent contrast in the built-in non-HC palette matrix. All four edges use one color so native editors retain the uniform-border raster path. Error and high-contrast boundaries remain explicit.
- Add material to existing semantic elements. Do not add wrappers, alternate controls, state stores, polling, cursor lighting, or decoration animation loops. Existing functional transforms and progress animations retain their contracts.

## Component matrix

| Component | Material and state treatment | Behavioral boundary |
| --- | --- | --- |
| Button | Compact raised action; primary/destructive colors retain meaning; pressed fill and inset relief for toggle state | Native disabled/loading, click, keyboard focus, sizes and icons |
| Card | Raised default grouping surface; avoid repeated raised descendants | Explicit rich variants and tilt remain opt-in independent effects |
| Tag | Subtle interior lighting on solid or soft badges; all six semantic roles and three sizes | Literal content, truncation, icon/dot, non-interactive semantics |
| Input / Textarea / Select | Recessed field, quiet edges, stable decoration during focus | Draft, selection, composition, disabled, validation, all sizes |
| NumberInput / AffixInput / DirectoryInput | One recessed compound boundary; quiet internal separators | Internal controls stay frameless; local keyboard fill; dropdown ownership |
| Radio | Hollow 1px indicator without a default shadow; selected dot and light tint; button/card/tile variants share a pressed selection treatment | Stable native group name, checked value, change event, keyboard, disabled |
| Checkbox | Recessed square, semantic checked/mixed face; button/card/tile selection shares Radio treatment | Native checked/indeterminate meaning and multi-select semantics; the mixed property and ARIA now match the visual indicator |
| Switch | Tight recessed track and a crisp shadow-free thumb, readable at 1× and 2× | Native switch state; 140ms reversible translate, existing travel, focus and disabled behavior |
| SegmentedControl | Recessed rail and raised selected segment | Selection, keyboard focus, per-option and whole-control disabled states |
| Tabs | Quiet rail and colored selected tab face; existing indicator remains meaningful | Overflow, close/add actions, optimistic selection, configurable slider geometry |
| Pagination | Compact raised page controls, pressed current page | Page selection, bounds, disabled arrows, native page-size and jump controls |
| LinearProgress | Recessed track and clean semantic fill | Width/value, buffer, stripes, indeterminate and labels |
| CircularProgress | Circular recessed/raised carrying surface around the semantic vector track | Stroke geometry, percentage, size, hidden track and indeterminate rotation |
| SegmentedProgress | Small recessed empty segments and clean filled segments | Rounded segment counts, value and semantic hue |
| StepsProgress / Stepper | Consistent compact stage wells and selected/completed faces | Current/completed/pending distinctions, labels, orientation, clickability |
| Dialog | Floating material at the existing visible dialog boundary | Focus trap/restore, placement, local host, footer and close behavior |
| Dropdown / submenu | Compact floating menu surface and color-led active rows | ARIA, keyboard, submenu placement, nearest host and focus restore |
| Tooltip | Small separated surface with restrained depth | Existing delay, accessibility relation and placement |
| CommandPalette | Floating command surface; recessed search; flat result rows | Filtering, keyboard selection, focus trap and command execution |
| File/Directory pickers | Compose the same dialog, fields, controls and flat file rows | Navigation, selection, opening/saving and validation remain product semantics |
| HighlightBlock / QuoteBlock | Tinted shallow information plane; semantic accent retained | Alert/quote meaning, rich content, citation and existing variants |
| ProcessingIndicator | Pill/card visible boundaries use compact material; minimal and explicitly selected rich status animations retain their presentation | Existing processing status and elapsed-time behavior; do not add decoration loops |
| Form | Structure stays flat; composed controls own their material | Labels, descriptions, validation and action layout |
| Charts | Plot and data series stay flat; containing Card can carry relief | Axes, data geometry, colors and legends are information, not decorative seams |
| ChatInput | One recessed composer with quiet toolbar seam | Draft, send, attachments, composition and local actions |
| Chat messages / code / logs | Readable flat content; controls inherit shared treatments | Streaming, text selection/copy, syntax colors, virtualization |
| Shell / Panel | Flat carrying planes with subdued structural separators | Density, resizer hit targets, mobile safe areas, layout and navigation |
| FloatingWindow | Opaque floating shell and local lightweight hot state | Shared pointer session, geometry, focus and portal ownership |
| WorkbenchWidget | Local-palette floating shell; color-led selected header | Stable instance, embedded focus, wheel/text ownership and projection |
| Workbench HUD / lock / dock | Small floating or raised controls with quiet seams | Canvas controls, lock state, dock actions and existing placement |
| InfiniteCanvas / SurfaceFloatingLayer / MobileKeyboard | No independent decorative layer; material belongs to the visible consumer | Coordinates, input routing, portal and keyboard viewport mechanisms |

## Acceptance matrix

The same component-state gallery must be reviewed in standard and soft modes, light and dark, all supported sizes, selected/unselected, hover/pressed, keyboard focus, disabled/loading, invalid, and mixed/indeterminate states where applicable. Browser assertions must verify actual values, keyboard ownership and unchanged geometry, not only the presence of role attributes. High contrast stays flat and explicit. Published styles and Tailwind consumers must both render the gallery correctly.

Selection faces respond in their first painted frame: Radio, Checkbox, Tab and segment colors do not crossfade. A Radio's solid dot has a short 90ms scale motion and Checkbox marks have a 100ms micro entrance; Checkbox/Switch wells have tight static lighting while Radio indicators stay hollow and shadow-free. Moving Switch thumbs and progress fills use no default shadow; fixed tracks own their depth so frequent updates avoid per-face shadow painting. The Switch thumb keeps its existing background fill in both states; only its position and track color change. This avoids repainting the moving face in dark mode, while the palette matrix verifies at least 3:1 thumb-to-track contrast. Explicit public shadow overrides remain supported. Test rapid Radio and Tab arrow navigation and Switch reversals before an animation finishes. Floating layers must complete both opacity and transform on entry/exit, reverse without remounting, and keep their shadow visible outside the geometry boundary. The shared presence owner schedules a bounded final paint before disposal; it never turns decoration into an animation loop. `scripts/check-surface-motion-browser.mjs` records these cases and 1×/2× screenshots for both CSS consumers.

Performance evidence must state the actual renderer. Headless Shell software rasterization is different from full Chromium's hardware-backed renderer; preserve results from both when used, and do not silently replace a failed environment. Measure the final component system against the same baseline fixture and renderer, including dense controls, selection changes, progress updates, input, streaming and window/canvas hot interactions.

## Behavioral findings from the state audit

The baseline packed gallery reproduced distinct generated names for options in a RadioGroup, which prevented native arrow-key group navigation. Generate the fallback name once per group; preserve explicit names and stable option IDs. The baseline mixed Checkbox only displayed a minus glyph. Synchronize its native `indeterminate` property and `aria-checked="mixed"`, while preserving consumer refs. Focused client tests and real keyboard browser checks cover both repairs.
