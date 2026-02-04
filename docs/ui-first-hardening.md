# UI-First Hardening

This document tracks a set of UI responsiveness and cross-input hardening fixes in this repo.

Scope: `packages/core` (components + hooks). Demo apps are only touched when needed for regression.

## Goals

- Keep interactions UI-first: update/close UI synchronously, defer heavier work (`deferNonBlocking` / `deferAfterPaint`).
- Ensure global listeners (document/window) are scoped and always cleaned up.
- Ensure mobile and desktop are both usable (mouse + touch + keyboard).

## Findings And Planned Fixes

### 1) `AffixInput` / `AffixSelect`: document listeners can leak

Problem:
- `AffixSelect` manually registers `document` listeners (`mousedown`, `keydown`) in `setupListeners()`,
  but some close paths only call `setOpen(false)` and do not call `cleanupListeners()`.
- This can leave stale listeners after closing via: outside click, `Escape`, selecting an option, or unmount.

Source:
- `packages/core/src/components/ui/Input.tsx` (internal `AffixSelect`)

Fix:
- Drive listener registration from a reactive `createEffect(() => open())` with `onCleanup` removal.
- Ensure all close paths only flip `open` and let the effect cleanup handle listener removal.

Acceptance:
- No `document` listeners remain after closing the affix dropdown (any close path).
- No errors when the component unmounts while the dropdown is open.

---

### 2) FileBrowser list/grid drag: global pointer listeners need unmount cleanup

Problem:
- `FileListItem` / `FileGridItem` register `document` listeners for drag (`pointermove/up/cancel`).
- Cleanup happens when a drag ends, but there is no component-level `onCleanup` to cover unmount mid-drag.
  With virtualization / filtering / view switches, an item can unmount while listeners are still attached.

Source:
- `packages/core/src/components/file-browser/FileListView.tsx` (`FileListItem`)
- `packages/core/src/components/file-browser/FileGridView.tsx` (`FileGridItem`)

Fix:
- Add `onCleanup` per item to cancel any active drag and always remove global listeners/timers.

Acceptance:
- No stuck “dragging” state after list/grid re-renders or virtual window changes mid-drag.
- No leaked `document` pointer listeners after unmount.

---

### 3) `useAutoScroll`: scroll listener is never removed

Problem:
- `useAutoScroll().setScrollRef(el)` attaches a `scroll` listener but never removes it.
- If the container element changes or the owning component unmounts, the listener can leak.

Source:
- `packages/core/src/components/chat/hooks/useAutoScroll.ts`

Fix:
- Track the current element and remove the listener when:
  - a new ref is set, or
  - the hook owner is disposed (`onCleanup`).

Acceptance:
- No leaked `scroll` listeners after unmount or ref changes.

---

### 4) Launchpad: global keydown should not hijack typing

Problem:
- Launchpad listens on `document.keydown` and uses ArrowLeft/ArrowRight for pagination.
- When the search input is focused, Arrow keys should not paginate (should remain a typing/navigation key).

Source:
- `packages/core/src/components/launchpad/Launchpad.tsx`

Fix:
- Ignore ArrowLeft/ArrowRight while the event target (or `document.activeElement`) is a typing element
  (`input/textarea/select/[contenteditable]/role="textbox"`).
- Keep `Escape` working even while typing.

Acceptance:
- With the search input focused, Arrow keys do not change pages.
- `Escape` still closes the launchpad.

---

### 5) Chat Image/Mermaid preview: improve mobile input + safe-area

Problem:
- Pan is mouse-only (`onMouseDown/Move/Up`) and zoom is wheel-only (`onWheel`).
  This is not usable on touch devices.
- Toolbar/hint positioning does not account for safe-area insets.

Source:
- `packages/core/src/components/chat/blocks/ImageBlock.tsx`
- `packages/core/src/components/chat/blocks/MermaidBlock.tsx`
- `packages/core/src/components/chat/styles/chat.css` (`.chat-image-dialog-*`)

Fix:
- Add pointer-based pan for all pointer types, and pinch-to-zoom for touch (2 pointers).
- Add safe-area aware offsets for toolbar/hint in CSS (use `env(safe-area-inset-*)`).

Acceptance:
- Touch: drag to pan when zoomed; pinch to zoom in/out; tap backdrop to close.
- Desktop: wheel zoom and drag pan still work.
- Toolbar/hint do not overlap notches/home indicators.

---

### 6) `useKeybind`: make global keybind safer by default

Problem:
- `useKeybind` registers a global `window.keydown` handler and always `preventDefault()`.
- It does not provide the common “ignore while typing” behavior required by the repo guidelines.

Source:
- `packages/core/src/hooks/useKeybind.ts`

Fix:
- Add an options parameter (e.g. `ignoreWhenTyping?: boolean`, `allowWhenTypingWithin?: string`).
- Default to ignoring while typing, mirroring `CommandContext` behavior.

Acceptance:
- Using `useKeybind()` does not interfere with inputs by default.

## Verification

Run the repo gate locally:

- `make check`

