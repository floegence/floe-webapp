# Mermaid diagrams

Floe owns the shared Mermaid-syntax rendering and reading surface. Install the
published optional peers pele@1.13.0 and katex@0.18.10 in applications that
render diagrams. Import Diagram from @floegence/floe-webapp-core/diagrams
and its diagrams.css stylesheet. Supply a complete DiagramLabels catalog,
original source, and optional host clipboard/navigation callbacks.

Pele is a third-party published dependency, not a repository-owned engine.
Parser/layout defects block adoption when they violate required compatibility;
never patch, vendor, rewrite source, or silently fall back to another engine.

## Ownership

The shared renderer lazily loads Pele's diagram types, preserves authored
orientation, sanitizes SVG and independently sanitizes formula MathML before
insertion. KaTeX is loaded only for math labels. Links are inert unless the host
owns navigation; external images and arbitrary icon markup are not loaded.
The host retains resource authorization, document/message identity and original
source. Rendering creates no durable state and never rewrites source.

One retained view owns resize/font observers and cancels stale results. Theme
colors use inherited CSS variables without replacing SVG. Source inspection,
copy feedback, expansion and zoom remain local. The shared Dialog owns focus,
Escape and overlay placement. Ordinary wheel input is never captured by the
inline diagram; expanded views use constrained native scrolling. No diagram
engine or new UI parser owns Workbench input.

Closed-fence admission uses isClosedMarkdownFence from the public Markdown
entry. A stopped stream is not proof that a fence is complete. Hosts decorate
only affected committed regions and retain completed diagrams on later output.

## Runtime and compatibility

Rendering yields between jobs; it is not a worker and cannot interrupt a
single synchronous layout. Bounds are 50,000 source characters, 500 edges,
4,000,000 SVG characters and 128 queued requests. Exceeding them is an explicit
local error with complete source available. These limits do not truncate text.
There is no cross-instance SVG cache, so accessibility and definition IDs stay
unique. Layout-changing width/font updates preserve the current document's
selection until replacement is safe; pure palette changes schedule no render.

MermaidBlock, renderMermaid, useMermaid and explicit host renderer/worker
configuration remain public. An explicitly configured renderer is authoritative;
a failure never switches to Pele. Its output crosses the same sanitizer.
New applications should consume the diagram entry directly. The historical
theme argument continues to reach explicitly configured workers; the default
Pele surface inherits CSS semantic colors instead of global Mermaid themes.

## Evidence

pnpm test:diagrams builds a production consumer of the dist entry and checks
15 diagram families, CJK, math, safe SVG, cancellation, local error recovery,
source/copy, retained themes and expansion in Chromium and WebKit at wide and
narrow widths. This fixture does not certify unlimited graph size. Product
hosts must separately qualify streaming, input ownership and their shipped
asset protocol using published package installations.

The shared viewport reserves its loading/error geometry. Source/preview and copy feedback use intrinsically reserved localized labels; browser acceptance compares geometry across these transitions at desktop and narrow widths.
