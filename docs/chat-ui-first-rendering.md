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

The main-thread and worker paths use the same isolated parser. Hosts with their
own renderers can call `createMarkdownParser` from
`@floegence/floe-webapp-core/markdown`, then install their renderer or inline
extensions with `parser.use(...)`. It defaults to GFM with line breaks enabled;
hosts can override Marked options without changing another parser instance.

The parser uses `marked-cjk-friendly` for Chinese, Japanese, and Korean emphasis
boundaries, including `**注意：**正文` and `这是**“引用”**的例子`. Whitespace
inside emphasis delimiters and unmatched markers remain literal. This changes
only display tokenization; it never normalizes stored messages or model inputs.
Only the extension's emphasis tokenizer is installed. Strikethrough, code,
escapes, ordinary links, and non-CJK Markdown retain standard parsing.

#### Append-only host rendering

Hosts that render rich Markdown while generation is active can use
`createIncrementalMarkdownParser(parser)` from the same public entry. Marked
remains the semantic authority. Each message owns one parser; call `reset` for
its initial source, `append` with new source only, and `finish` at completion.
An edit or replacement uses `reset`, rather than guessing a text difference.

The returned batch contains block `replace`/`remove`, code or literal
`append_text`, and inline token-range `inline` changes. Apply the entire batch
atomically. Block IDs survive content changes at the same source position;
inline indices address the preceding batch's paragraph tokens. Consumers retain
their DOM for unaffected blocks and inline tokens. Token payloads are detached
from parser state; the reference dictionary is immutable and shared until a
block parse changes it. `snapshot` is an explicit full-copy read for export or
verification, not a streaming render input. Block offsets use normalized LF
source positions; `sourceLength` counts the original UTF-16 input, including
CRLF split across appends.

Ordinary literal and open fenced-code growth processes new text only. Inline
extension start hints participate in the same dependency boundary, including
partial prefixes split across updates. Extensions without start hints retain
the complete inline dependency region for correctness. Paragraph
syntax reparses the live inline dependency region; complete inline tokens and
whitespace checkpoints remain stable. Structural changes reparse the active
block region, including adjacent list continuation. Reference definitions
invalidate indexed dependent blocks. Unclosed syntax retains the dependency
region it can still affect. `finish` performs one authoritative full parse and
publishes necessary corrections, retaining unchanged block IDs.

This parser does not sanitize HTML or authorize media. Host renderers own that
public boundary, citations, media presentation, and DOM disposal. The existing
generic Chat Markdown block keeps its documented deferred rendering policy.

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

### Media request ownership

`MarkdownMedia` compares the complete `kind`, `src`, `html`, and `title` source
values. Equal reconstructed sources retain the request, decoded media, and open
preview. Hosts must replace `resolve` when authorization or resource context
changes; resolver reads are not reactive loading dependencies.

The optional `loadTimeoutMs` is one positive finite deadline for resolution and
HTML loading. Omission leaves loading unbounded. Invalid values fail before
loading. Timeout, failure, Retry, source or resolver changes, and disposal share
one request AbortController; late results cannot replace current media. Hosts
should release temporary URLs when that signal aborts. Failures remain retryable.
Preview dismissal restores focus only from its own connected window to its
connected trigger, so navigation retains focus.
