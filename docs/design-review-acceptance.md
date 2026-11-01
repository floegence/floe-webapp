# Design review acceptance

## Scope

This review keeps Floe's current design language and improves the demo's information hierarchy, executable workflows, state semantics, navigation, accessibility and consistency. It adds no visual dependency or continuous decorative work. The follow-up corrects shared tab face geometry and reorganizes the four scenario views with lazy, static CSS. Control heights and existing interaction ownership remain unchanged.

The review was developed in the isolated floe-webapp-design-review worktree on codex/floe-design-review, based on cf8753b3c6d489228c5238048a373f44a4518822. After visual review, the user authorized main integration and publication as v0.86.70. The release workflow validates the versioned packages and reads back published artifacts.

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

The follow-up adds static tab indicator utilities to core styles.css. Scenario layout CSS loads only with ScenariosPage. Scenario code and syntax highlighting load on demand; Home does not initialize the code highlighter or rich-content workers. The task simulation owns one bounded timer and stops on cancellation, failure or completion.

Surface qualification compares packed baseline/current packages using the same fixture and five interleaved repetitions. The repository's performance thresholds trigger investigation rather than granting permission to spend rendering time. The complete light-mode run includes list scrolling, chat streaming, terminal output, window dragging/resizing/presence, canvas navigation, menus/dialogs, typing, dense controls, progress updates and control toggles.

These are local browser measurements, not cross-device guarantees or downstream application certification. Startup transfer measurements describe requested gzip-equivalent JS/CSS bytes, not user latency. The dense progress stress workload has frame loss in both baseline and current; preserving the workload does not imply it became smooth on every device.

## Review environment

The production preview is available at http://127.0.0.1:61341/?view=showcase&section=home. It serves the independent worktree build using Vite preview with strict port binding. The development server on port 61340 was stopped after production verification. Local logs and screenshots live under .cache/design-review; packed-consumer performance traces live under .cache/surface-style. These generated files and the task-local Node 24.20.0 runtime are untracked.

## Prior implementation evidence (e4e6fec8)

- Repository gate: installation, Go smoke/vet, lint, typecheck, 1,313 tests, production build and distribution verification passed. The first packed-consumer audit stopped because npm closed its TLS connection. Retrying that target passed, including the audit, and every remaining make check target completed. Logs: make-check-final.log and make-check-resumed.log.
- A narrow direct-link inspection found the last scenario tab outside the visible rail. The final solution uses concise, unambiguous tab names (Overview, Files, Tasks, Examples) without adding shared-tab layout measurements or shrinking controls. The production acceptance suite checks that the selected tab is fully visible.
- Complete workflows passed at 390, 430, 768 and 1440 pixels, including long names, async control geometry, local saves/reload, explicit failure/cancellation/retry and composed actions. Navigation coverage also exercises actual storage rejection and recovery, scoped reset, browser history, mode changes, reduced motion, lazy Home and the dark logo.
- The complete 12-workload light-mode surface comparison passed its existing criteria. Drag qualification passed with 8.3 ms median P95 input-to-next-frame latency and 0% missed frames on this machine. Traces and the baseline identity remain available locally.

Production qualification on port 61341 passed the complete workflow/navigation suite, pressed-button geometry and Workbench editing/persistence in Chromium and WebKit with paper/slate themes. The final light/dark desktop/phone captures were visually inspected, including the component reference and the direct-linked last scenario tab.

Home requested 237,034 gzip-equivalent JavaScript bytes and 75,164 CSS bytes across 11 JS/CSS resources, versus 1,785,417 JavaScript bytes and 106,874 CSS bytes across 58 resources for the baseline. The comparison opens the same explicit Home route with a fresh context and observes requests for two seconds. This is approximately 86.7% less requested JavaScript; it is not an assertion of an equivalent latency improvement. Existing large editor and rich-content chunks remain on demand, with Vite's existing large-chunk advisory preserved.

An isolated dense-control rerun also passed the existing paired-sample rule with zero missed frames. Its paint median was 14.4% higher, but only two of five matched repetitions increased by more than 10%; the earlier complete run had three of five. Retain this variability as a measurement limit, not a claim of universal zero regression. At that revision the stylesheet was byte-identical and Tabs retained the baseline code. The follow-up below supersedes that implementation claim, while still adding no layout measurement.

The final dark control-toggle comparison passed after removing the experimental shared-tab measurement change. Standard-material input-to-next-frame P95 was 6.9 ms versus 7.3 ms for baseline, with zero missed frames in both. The rejected experiment and its failing rasterization report remain in design-review-dark-final; the final evidence is design-review-dark-delivery. No thresholds were changed. The delivery build passed lint, full typecheck, production workflow/navigation acceptance and distribution verification again.

## Tab alignment and scenario composition follow-up

The user reported an asymmetric selected tab and inconsistent scenario layouts. The preserved pre-change build is in .cache/design-review/followup/before-dist. Its closable tab measured 0px top / 2px bottom borders and a -1px label/close-control center offset at a 32px height. The new browser regression fails on that build and passes after correction: symmetric 1px borders and zero center offset, with the same 32px height. Indicator thickness is painted with an absolute pseudo-element, so no extra node, measurement, observer or animation loop is introduced. The connected-panel sample retains transparent border space instead of removing it.

Examples now groups the nine existing working cards into three related, content-height columns. At narrower container widths it uses two or one columns. DOM and keyboard order follow those groups. Overview pairs the four metrics with the chart; Files and Tasks use a primary workspace plus supporting context/output. The page uses existing Floe color, radius, typography and controls with one consistent card/gutter rhythm. A container query responds to available content width, including the shell sidebar. No new dependency, blur, image or remote request is added.

- Full make check passed: 1,313 tests, lint, typecheck, build, distribution and packed consumers, plus the required browser gates. The final demo stylesheet was then moved to its lazy route and rebuilt; lint and dedicated visual checks passed after that change.
- Development and final production workflows passed at 390, 430, 768 and 1440px, including local persistence, failure/recovery, cancellation, checklist snapshots, copying, messaging and notification actions.
- Visual regression checks cover light/dark tab centering, add/close, nine-card retention, card containment, consistent gutters and long project names at 390, 430, 768, 1280 and 1440px. Additional inspection at 1920px found no card overflow.
- Desktop/mobile screenshots in light and dark were inspected. The production visual suite passed after the final build. Evidence, failed pre-fix checks and subsequent passing logs are retained in .cache/design-review/followup.
- Final Home resources: 237,224 gzip-equivalent JavaScript bytes and 75,308 CSS bytes across 12 requests. The 3,292-byte scenario stylesheet is a separate lazy asset and is absent from Home requests. The small increase over the prior review revision is recorded explicitly; startup transfer is not a latency measurement.

Performance follow-up uses five interleaved control-toggle repetitions (including tabs) with the preserved cf8753b3 baseline and identical packed fixtures. Light mode passed. In the first dark matrix, standard/current versus standard/baseline passed (paint 38.34 vs 41.80 ms/s; raster 4.53 vs 4.53 ms/s; input P95 7.5 vs 7.4 ms). Current soft versus baseline standard triggered a raster investigation (6.03 vs 4.53 ms/s, four paired increases). This failed cross-material report is retained, not discarded.

The subsequent dark **same-material** comparison used soft baseline and soft current, with no source, workload, data or threshold changes. It passed: paint 38.21 vs 37.77 ms/s (+1.2%, one paired increase), raster 4.92 vs 5.82 ms/s, input P95 7.7 vs 7.8 ms. Every recorded sample in these follow-up runs had zero missed frames and zero long tasks. The same-material result does not establish a repeatable regression from this change, but the first cross-material alert and sample variability remain limitations. Reports: design-review-followup-light, design-review-followup-dark and design-review-followup-dark-matched under .cache/surface-style. This is local control-toggle evidence, not a universal performance guarantee or a rerun of the previous full workload suite.

## Floating window title inset follow-up

The shared FloatingWindow title now uses the same 12px horizontal inset as its body instead of 8px. The 32px titlebar, edge-aligned controls, drag ownership and window geometry remain unchanged. This is a static spacing change with no additional nodes, JavaScript work, observers or animation.

The existing header browser check now asserts title/body alignment and opens the Demo through its explicit section route. It fails against the previous production build (8px instead of 12px) and passes the rebuilt Demo at 390px and 1440px in light and dark modes, including maximize/restore, edge clicks, keyboard focus and close. Focused lint, core typecheck, all 26 floating-window geometry/open-cycle tests and the production build passed. Chromium and WebKit drag checks also passed, covering reachability, release recovery, retained content, cancellation and reduced motion. Evidence and screenshots are under .cache/design-review/window-inset.

A fresh Home resource comparison uses the same 1440px viewport, fresh browser contexts and two-second observation window. Requested gzip-equivalent JS/CSS bytes and resource counts are:

| Build | JavaScript bytes | CSS bytes | JS/CSS requests |
| --- | ---: | ---: | ---: |
| Original cf8753b3 baseline | 1,785,417 | 106,874 | 58 |
| Before Tabs/Scenarios refinements (e4e6fec8, port 61342) | 237,034 | 75,164 | 11 |
| Current, including title inset (port 61341) | 237,223 | 75,308 | 12 |

The overall review reduces requested startup JavaScript by 86.7% and CSS by 29.5% relative to the original baseline. The later visual refinements do not introduce a further startup reduction: compared with e4e6fec8 they add 189 JavaScript bytes, 144 CSS bytes and one request. These figures measure loading volume, not elapsed startup time, CPU usage, memory or task completion speed. The runtime comparisons above predate this padding-only change and establish no general speedup; no new runtime performance qualification is claimed for this follow-up.

The user remains the owner of product acceptance. The review implementation and the floating-window correction are included in the v0.86.70 release scope.

## Restart the review server

Run from the task worktree using the pinned Node version:

    cd /Volumes/JianDisk/code/floegence/floe-webapp-design-review
    export PATH="$PWD/.cache/design-review/toolchain/node-v24.20.0-darwin-arm64/bin:$PATH"
    pnpm --filter @floegence/floe-webapp-demo preview --host 127.0.0.1 --port 61341 --strictPort

The production build is already present in apps/demo/dist. After making further source changes, run pnpm build:demo before previewing. The preview is local to this computer; no deployment or public endpoint is created. Its browser storage is isolated from other localhost ports.
