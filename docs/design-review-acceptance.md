# Design review acceptance

## Scope

This review keeps Floe's current design language and improves the demo's information hierarchy, executable workflows, state semantics, navigation, accessibility and consistency. It adds no visual dependency or continuous decorative work. The shared CSS and interaction geometry remain unchanged.

The review environment is isolated in the floe-webapp-design-review worktree on codex/floe-design-review, based on cf8753b3c6d489228c5238048a373f44a4518822. Main is not merged or modified. There is no push, release or pull request.

## What to review

1. Home: choose a complete workflow, browse the component catalog or switch display modes. Starter code loads only after opening its disclosure.
2. Overview: change 7/30/90-day ranges, search and filter history, inspect a deployment, and recover from no matching results. All summaries use the same deterministic dataset, ending October 31, 2026. A declining metric is not automatically negative.
3. Files and editing: change files without losing drafts, simulate a failed save, save successfully, reload, and cancel or confirm the scoped reset. A successful save reads back the stored snapshot; unavailable storage preserves the open draft and reports a visible error.
4. Async task: start, cancel, fail, retry and inspect the completed report. The simulation never starts remote work. Navigation within the Activity session retains its state.
5. More examples: create and search local projects, change visibility, filter activity, copy the example URL, save/restore a checklist, inspect example usage, send a local message and clear notifications.
6. Navigation: use browser Back/Forward and the Activity/Deck/Workbench switcher. A route identifies the committed view; hidden Activity content retains its DOM and becomes inert.
7. Components and Workbench: inspect the design reference, input focus and overlay behavior, then edit and persist the existing canvas example. Existing user layouts are not reset.
8. Repeat at narrow widths and in both color modes. Check keyboard navigation, text selection, loading-button geometry and readable long project names.

## Performance boundaries

Core styles.css is byte-identical to the baseline. Scenario code and syntax highlighting load on demand; Home does not initialize the code highlighter or rich-content workers. The task simulation owns one bounded timer and stops on cancellation, failure or completion.

Surface qualification compares packed baseline/current packages using the same fixture and five interleaved repetitions. The repository's performance thresholds trigger investigation rather than granting permission to spend rendering time. The complete light-mode run includes list scrolling, chat streaming, terminal output, window dragging/resizing/presence, canvas navigation, menus/dialogs, typing, dense controls, progress updates and control toggles.

These are local browser measurements, not cross-device guarantees or downstream application certification. Startup transfer measurements describe requested gzip-equivalent JS/CSS bytes, not user latency. The dense progress stress workload has frame loss in both baseline and current; preserving the workload does not imply it became smooth on every device.

## Review environment

The production preview is available at http://127.0.0.1:61341/?view=showcase&section=home. It serves the independent worktree build using Vite preview with strict port binding. The development server on port 61340 was stopped after production verification. Local logs and screenshots live under .cache/design-review; packed-consumer performance traces live under .cache/surface-style. These generated files and the task-local Node 24.20.0 runtime are untracked.

## Completed checks

- Repository gate: installation, Go smoke/vet, lint, typecheck, 1,313 tests, production build and distribution verification passed. The first packed-consumer audit stopped because npm closed its TLS connection. Retrying that target passed, including the audit, and every remaining make check target completed. Logs: make-check-final.log and make-check-resumed.log.
- A narrow direct-link inspection found the last scenario tab outside the visible rail. The final solution uses concise, unambiguous tab names (Overview, Files, Tasks, Examples) while preserving the shared Tabs implementation and control sizes. The production acceptance suite checks that the selected tab is fully visible.
- Complete workflows passed at 390, 430, 768 and 1440 pixels, including long names, async control geometry, local saves/reload, explicit failure/cancellation/retry and composed actions. Navigation coverage also exercises actual storage rejection and recovery, scoped reset, browser history, mode changes, reduced motion, lazy Home and the dark logo.
- The complete 12-workload light-mode surface comparison passed its existing criteria. Drag qualification passed with 8.3 ms median P95 input-to-next-frame latency and 0% missed frames on this machine. Traces and the baseline identity remain available locally.

Production qualification on port 61341 passed the complete workflow/navigation suite, pressed-button geometry and Workbench editing/persistence in Chromium and WebKit with paper/slate themes. The final light/dark desktop/phone captures were visually inspected, including the component reference and the direct-linked last scenario tab.

Home requested 237,034 gzip-equivalent JavaScript bytes and 75,164 CSS bytes across 11 JS/CSS resources, versus 1,785,417 JavaScript bytes and 106,874 CSS bytes across 58 resources for the baseline. The comparison opens the same explicit Home route with a fresh context and observes requests for two seconds. This is approximately 86.7% less requested JavaScript; it is not an assertion of an equivalent latency improvement. Existing large editor and rich-content chunks remain on demand, with Vite's existing large-chunk advisory preserved.

An isolated dense-control rerun also passed the existing paired-sample rule with zero missed frames. Its paint median was 14.4% higher, but only two of five matched repetitions increased by more than 10%; the earlier complete run had three of five. Retain this variability as a measurement limit, not a claim of universal zero regression. The stylesheet remains byte-identical; the final implementation retains the baseline Tabs code with no additional layout measurement.

The final dark control-toggle comparison passed after removing the experimental shared-tab measurement change. Standard-material input-to-next-frame P95 was 6.9 ms versus 7.3 ms for baseline, with zero missed frames in both. The rejected experiment and its failing rasterization report remain in design-review-dark-final; the final evidence is design-review-dark-delivery. No thresholds were changed. The delivery build passed lint, full typecheck, production workflow/navigation acceptance and distribution verification again.

The user remains the owner of product acceptance; this branch has not been integrated.

## Restart the review server

Run from the task worktree using the pinned Node version:

    cd /Volumes/JianDisk/code/floegence/floe-webapp-design-review
    export PATH="$PWD/.cache/design-review/toolchain/node-v24.20.0-darwin-arm64/bin:$PATH"
    pnpm --filter @floegence/floe-webapp-demo preview --host 127.0.0.1 --port 61341 --strictPort

The production build is already present in apps/demo/dist. After making further source changes, run pnpm build:demo before previewing. The preview is local to this computer; no deployment or public endpoint is created. Its browser storage is isolated from other localhost ports.
