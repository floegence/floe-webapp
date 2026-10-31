# Design and Demo Contract

## Ownership

Floe retains its existing visual language: opaque reading planes, restrained neutral controls, semantic status colors, concentric radii and compact typography. `language.css` owns the visual roles. Public components own interaction and accessibility; the demo owns fictional domain data and example outcomes. Hosts retain routes, authorization, business state and localized copy. Do not introduce a second theme owner or demo-only copies of core controls.

Home prioritizes complete workflows. Components retains the executable state matrix, usage guidance and public API examples. Guidance remains visible without borrowing warning or success styling for emphasis. The showcase catalog remains the owner of navigation names and page membership.

## Composition and tab geometry

Scenarios uses one lazy demo stylesheet, Floe tokens, and responsive container queries. Related examples stay in three DOM-ordered columns at wide sizes, two columns when space allows, and one column on narrow surfaces. Cards use intrinsic content heights and a consistent gutter; no JavaScript masonry or size observers are needed. Overview pairs summary metrics with the chart. Files and tasks share a primary workspace plus a secondary context/output panel. The visible field width follows its containing form.

Shared Tabs keeps symmetric face borders and vertically centered content at both control sizes. The configured active-border marker is an absolute CSS pseudo-element; its thickness cannot displace the label or close button. Slider mode retains its existing measurement path. No extra nodes, effects, observers, animation loops, or geometry reads are added to tab selection. A connected-panel example uses a transparent bottom border rather than removing its layout space.

## State semantics

- Numeric direction and business assessment are independent. Falling duration can improve; increasing activity can remain neutral. Percentage-point differences are explicit.
- Overview metrics, comparison periods, chart totals and deployment rows derive from one deterministic fixture ending October 31, 2026. Search and environment filters scope the history; the chart explicitly remains all environments.
- Local demo status is neutral. A real failed connection remains an error; successful transport is never invented.
- No results, empty data, loading, cancellation, denial and failure need their own explanation and applicable next action. Domain policy is not inferred from a label or color.
- A completed timer is not a successful save. File success follows the stored snapshot; failure preserves the draft. Task success follows every completed step. Cancelled and failed tasks stop scheduling until explicitly restarted.

## Navigation and retention

First-time visits open Home. Persisted preferences remain authoritative unless an explicit route is supplied. `?view=showcase&section=scenarios&scenario=overview|files|task|compositions` addresses a workflow directly. Browser history restores the selected example. Other activity pages use the activity view and tab parameter; URL updates observe committed layout state, including commands and activity navigation. Activity, Deck and Workbench remain top-level modes.

The Activity session stays mounted across display-mode switches. Showcase families and scenario tabs use the shared lazy KeepAliveStack. Hidden content is inert and retained inputs keep their identity. Each scenario has a stable tabpanel identity. Concise scenario tab names fit narrow viewports without shrinking controls or adding layout measurements to the shared Tabs component. Drafts and saved snapshots use separate demo-scoped persistence keys. Resetting example files requires an explicit discard action and never clears global theme preferences or other examples.

## Interaction and accessibility

Button labels and their geometry remain stable through busy states. Loading occupies the reserved icon slot. Success feedback uses FeedbackIndicator in an existing action row; blocking errors remain visible. Inputs keep their border-only focus contract. Dialog headers carry identity; guidance belongs in the body. Select fields declare an accessible name independently of the selected option.

Validate 390×844, 430×932, 768×1024 and desktop widths in light and dark. Check before/during/after async geometry, long labels, reduced motion, keyboard focus, scrolling and native selection. Do not shrink controls merely to avoid responsive reflow.

## Runtime and performance

Scenario modules load on first entry. The landing page does not start the editor, terminal or every example. Syntax highlighting uses a shared initialization promise when code or rich content needs it. Lazy loading must retain the feature's complete behavior. Dispose timers and invalidate stale asynchronous completions.

Do not add blur, decorative animation loops, per-pointer theme writes, blanket layer promotion or hot-path geometry transitions. Preserve preview/commit, focus, selection and wheel ownership. Cosmetic changes must not cause repeatable performance regressions. Existing alert thresholds are investigation triggers, not an allowance to spend.

Compare the same workload at the same viewport, theme, DPR and renderer using interleaved repetitions. Retain failed samples and traces. Record startup resources separately from input, scrolling, streaming, drag and resize cost. Never reduce data, stop streams or suppress output to pass.

## Verification

- `make check`: repository quality gate and packed consumers.
- `pnpm test:demo-workflows`: complete local workflows, failure/recovery, retained files and responsive screenshots; set FLOE_DEMO_URL to an isolated demo.
- `pnpm test:visual-refinement`: pressed geometry on the actual button catalog.
- Existing surface style, motion, theme, focus and Workbench checks remain authoritative.
- Surface performance and drag qualification use separately prepared baseline/current packages. Reports are local evidence, not browser guarantees.

Publish shared changes before downstream integration. Downstream products validate their own workloads and resource budgets using published artifacts. Demo results do not certify a downstream application.
