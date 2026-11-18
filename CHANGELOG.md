# Changelog

## 0.103.0

- Theme Studio passes a live preset accessor to custom previews. Read the accessor inside the preview component to retain view and focus while editing or comparing drafts.

## 0.102.1

- Start a standalone light or dark palette, design from the current unsaved draft, and preserve named links and host-specific overrides when re-exporting a resolved theme.

## 0.102.0

- Export independent shell themes with a complete semantic palette, window shadows, terminal overrides and ordered editor syntax rules. Read legacy theme files without changing their appearance.
- Edit searchable theme fields, named colors and references in the shared studio. Draft edits support undo and redo; host appearance features no longer require a built-in installation identity.

## 0.101.52

- Create, preview, import and export portable shell themes through the optional ThemePicker studio. Hosts can register presets at runtime and offer a theme generation action.
- Apply a verified, build-only picomatch mitigation pending an upstream release.

## 0.101.51

- On the image annotation surface, clicking a numbered pin selects it; starting a new rectangle on the same pin keeps the drag through release.

## 0.101.50

- Keep fitted annotation images at the full viewport size without reserving unused scrollbar space.
- Let contextual PromptCards avoid selected regions while respecting measured card size, visible viewport, scaled surface boundaries and the existing consumer bundle budget.

## 0.101.48

- Keep InfiniteCanvas navigation in its transformed viewport so native focus and scrolling cannot offset or clip nodes after fitting, panning or zooming. Verify the visible geometry in Chromium, WebKit and Firefox.

## 0.101.47

- Let image annotation hosts choose one consistent cursor for selection, numbered pins, resize handles and panning, while preserving contextual cursors by default.

## 0.101.46

- Refine image annotations with fine blue outlines, subtle region fills and compact numbered badges. Screen review and exported PNGs use identical markup and original-image geometry.

## 0.101.43

- Position dropdowns and nested menus from their full layout dimensions so entry motion cannot push content beyond viewport or scaled Workbench boundaries.

## 0.101.42

- Restrict inactive image-annotation hit targets to numbered pins so existing regions do not swallow overlapping new selections.

## 0.101.41

- Support ordered image annotations with selectable numbered markers and matching multi-marker PNG export. Existing single-annotation editing remains compatible.

## 0.101.28

- Await observed narrow Workbench toolbar placement in browser qualification, preserving its viewport boundary assertion across WebKit resize scheduling.

## 0.101.27

- Keep graph hover targets stable while nodes travel beneath a stationary pointer; resume on deliberate pointer movement after settlement.

## 0.101.26

- Clip entering and departing child nodes to their animating group bounds.
- Keep route-only focus updates independent of graph geometry copies for large canvases.

## 0.101.25

- Add opt-in graph layout motion with synchronized node bounds, routes and minimap, interruptible transitions and reduced-motion support.
- Retain graph owners and keyboard focus across group expansion; fade departing nodes without allowing stale interaction.
- Correct release version checks after the unpublished 0.101.24 candidate.

## 0.101.23

- Build pointer-lock browser fixture styles directly from source so clean release workers verify the opaque guidance without a preexisting dist directory.

## 0.101.22

- Stabilize image annotation measurements with visible system scrollbars; defer resize measurements outside observer delivery and retain exact coordinates across zoom. Add explicit pointer/touch panning without changing annotations.

## 0.101.21

- Give pointer-lock exit guidance an opaque theme background so it remains legible over arbitrary 3D and HTML content. Verify the computed background in the browser.

## 0.101.20

- Add the isolated `image-annotation` entrypoint for immutable image point/region selection, resizing, keyboard adjustment, zoom and original-pixel PNG export. The editor and export share one validated overlay.

## 0.101.19

- Enable user-activated pointer lock in opaque HTML previews, release it on inactivity or blur, and show localized Escape guidance without moving the document.

## 0.101.17

- Expose Workbench Dock action button references for host-owned anchored surfaces and pointer/keyboard entry, with explicit disposal.

## 0.101.16

- Apply live CodeEditor options after asynchronous initialization, including read-only transitions, without replacing the editor or its document.

## 0.101.15

- Keep compact segmented controls icon-only in both the native buttons and the moving selected ink, including resizing, interrupted selection, and localized layouts.

## 0.101.14

- Preserve embedded menu focus throughout pointer activation in floating windows, including Shadow DOM menus and multiline editor selections.

## 0.101.13

- Preserve overlay input and drafts when related editor menus dispatch composed events through Shadow DOM.

## 0.101.12

- Resolve editor context actions from the Monaco model selection, preserving indentation and multiline text in floating previews and ordinary editors.

## 0.101.11

- Let controlled Tabs delegate activation timing to an existing host transaction while preserving shared indicator motion and keyboard behavior.

## 0.101.10

- Keep segmented-control labels stationary and readable throughout selection travel, reversal, resizing and forced-color rendering without duplicating accessible names.

## 0.101.9

- Pin scaffold Rollup to the available 4.68.1 artifact while registry metadata advertises a missing 4.68.2 tarball; keep npm and pnpm overrides identical.

## 0.101.8

- Keep dialog height measurements in the same layout-pixel space so fractional Firefox/WebKit sizing settles after a content change.

## 0.101.7

- Record the additive disclosure exports in the reviewed public API inventory.

## 0.101.6 (unpublished)

- Add SettingsDisclosure with shared rounded settings surfaces, reversible height and chevron motion, reduced-motion support, accessible focus return, lazy first mount and retained content.

## 0.101.5

- Show the appearance check only on the committed preset using native wrapper visibility; verify rendered checks in the published consumer.

## 0.101.4

- Export a controlled, compact ThemePicker with responsive previews, keyboard navigation, pending feedback and shared theme tokens.

- Keep settings selection on the row surface without a decorative edge rail; preserve keyboard focus.
- Omit empty navigation group labels so ungrouped categories have no blank heading spacer.

## 0.101.3

- Resolve settings control, body and navigation search slots once so stateful controls own one portal and one cleanup lifecycle.
- Require real controlled-select settings acceptance after package build and before publication.

## 0.101.2

- Let later-mounted owned floating windows consume Escape before their containing bottom bar companion.
- Add `SettingsSection.showHeading` for dialog-owned page identity while retaining accessible naming, metadata, actions and body state.

## 0.101.1

- Qualify retained preview loading and inertness in one browser observation so CI cannot compare different document generations.

## 0.101.0

- Allow anchored application commands to use the viewport portal above retained windows while preserving surface-local placement by default.
- Measure and observe the selected portal boundary consistently when positioning, flipping and resizing anchored panels.

## 0.100.0

- Add document-engine search integration, private HTML preview search and all-slide PPTX search.

## 0.99.1

- Keep context menus open while unrelated panes scroll, and dismiss only when their source anchor moves.

## 0.99.0

- Allow global context menus to use the viewport portal above retained prompts while preserving local menu ownership.
- Give the full release qualification and registry propagation sufficient time to finish without cancelling publication readback.

## 0.98.1

- Align the release gate contract with preview search qualification and allow renderer-free cleanup.

## 0.98.0

- Add scoped rendered-text search with keyboard navigation, CSS highlights and retained document state.
- Keep Monaco control tooltips within their owning editor and prevent right-edge reflow from covering controls.
- Suppress all inactive retained-panel paint without changing document layout or identity.


## 0.97.3

- Pin scaffold Tailwind dependencies to the verified release so new consumers do not resolve partially published native dependency sets.

## 0.97.2

- Preserve host-declared response headers in authenticated session HTTP across direct and bridged connections.
- Keep prompt drafts open during secondary-pointer context-menu invocation.

## 0.97.1

- Add logical start/end alignment to anchored panels while preserving default centering, boundary clamping and side placement.

## 0.97.0

- Add explicit target capture, unavailable owner boundaries and non-activating context sources.
- Bound contributed menu icons independently of custom menu row styling and preserve compact slots in Workbench and Notes.

