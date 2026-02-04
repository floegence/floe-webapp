# Chat UI-First Rendering (Non-Blocking Markdown + Diff)

This document describes the repo changes that enforce the "UI responsiveness first" principle for chat rendering:

- Stream Markdown as **plain text** (never block input/scroll during `block-delta`).
- Render Markdown to rich HTML **after** streaming ends.
- Ensure **large Markdown** and **large diffs** do **not block** the main thread:
  - heavy computation runs in **Web Workers**
  - heavy rendering uses **virtualization / bounded DOM**

Scope: `packages/core/src/components/chat/**` (demo is updated only for regression).

## Goals

- Keep chat interactions responsive (typing, scrolling, opening/closing UI).
- Avoid any synchronous heavy work in hot paths (render, input handlers, scroll handlers).
- Provide deterministic fallbacks when a Worker is not available/configured.

## Non-goals

- Perfect Markdown security/sanitization (current behavior treats Markdown HTML as trusted).
- Pixel-perfect unified diff line numbers (the existing UI is a simplified diff view).

## Key Changes

### 1) Message list: virtualized by default

`ChatContainer` uses `VirtualMessageList` by default to avoid full DOM rendering when messages grow.

- Source: `packages/core/src/components/chat/ChatContainer.tsx`

### 2) Markdown: stream plain text, render rich after completion

During streaming (`streamingMessageId === messageId`), Markdown blocks render as plain text only.
After streaming ends, Markdown is rendered to HTML **outside** the current paint:

- Small Markdown: `deferAfterPaint` + main-thread parsing is acceptable.
- Large Markdown: parsing is offloaded to a **Markdown Worker**.
- If no Worker is configured for large Markdown: keep plain text (never block).

### 3) Code diff: compute in Worker + virtualize rendering

The code-diff block no longer computes diff synchronously in render.
Instead it builds a serializable diff model asynchronously:

- Small diffs: deferred computation on main thread (after paint).
- Large diffs: compute in a **Diff Worker**.
- Rendering is virtualized (fixed row height) inside a bounded scroll container so large diffs do not create huge DOM trees.

### 4) Height cache: make variable-height virtualization reactive (batched)

Chat message height measurements update a cache. To make virtual list math reactive without thrashing:

- `setMessageHeight()` updates the cache and bumps a version signal at most once per frame.
- The virtual list re-measures when the version changes.

### 5) Host callbacks: always leave the UI hot path first

Callbacks that may run host-defined logic are invoked via `deferNonBlocking()` so host code cannot accidentally block UI:

- `onRetry`
- `onChecklistChange`

## Worker Integration (Recommended)

The core package exposes:

- `createMarkdownWorker()` / `configureMarkdownWorker(worker)`
- `createDiffWorker()` / `configureDiffWorker(worker)`

Vite example (host app initialization):

```ts
import {
  createMarkdownWorker,
  configureMarkdownWorker,
  createDiffWorker,
  configureDiffWorker,
} from '@floegence/floe-webapp-core/chat';

configureMarkdownWorker(createMarkdownWorker()!);
configureDiffWorker(createDiffWorker()!);
```

Notes:

- Worker creation is guarded (`typeof Worker === 'undefined'` returns `null`).
- Large Markdown/Diff will stay in the non-blocking fallback mode when a Worker is not available/configured.

## Verification

Run the repo gate:

- `make check`

Manual smoke:

- Chat: stream Markdown; typing/scrolling stays responsive.
- Chat: open a large diff block; the UI remains responsive while it computes/renders.

