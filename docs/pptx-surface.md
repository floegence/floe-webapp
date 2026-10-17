# Presentation preview surface

`@floegence/floe-webapp-core/pptx` provides `PptxDocumentSurface` for read-only
static PPTX previews. Import this entrypoint lazily; the main entrypoint does not
load the presentation engine. No Office installation, document upload, font
download, or conversion executable is required.

`PptxDocumentSurface.open(bytes, { signal, onNodeError })` returns intrinsic page
dimensions and a page count. `renderPage(index, container)` mounts a page at its
intrinsic size and returns a handle with `ready` and `dispose()`. Hosts own fit,
zoom, scrolling, page labels, localization, windowing, and visible error states.
Only nearby pages should be mounted. Dispose handles on page removal and dispose
the surface on document replacement. Abort obsolete opens and ignore stale
results; a completed obsolete surface must still be disposed. Page disposal is
idempotent, including after document disposal.

The adapter enforces a 20 MiB compressed input limit, the renderer's recommended
ZIP limits, at most 1,000 slides, and bounded positive dimensions. It removes all
external relationships before model construction. Embedded SVG is sanitized;
external references and active content are removed. Optional PDF fallback and
external font acquisition are disabled. Parsing does not execute macros or OLE.
These controls bound supported resource paths; they do not constitute an OS
sandbox or guarantee a fixed CPU time for every hostile document.

This is a static compatibility preview, not a PowerPoint editor or player.
Animations, slide transitions, embedded applications, and all Office drawing
effects are not reproduced. Hosts must disclose static preview limitations and
show node/page errors rather than silently claiming complete rendering. Missing
local fonts can affect layout; supplied fonts require appropriate authorization.

The pinned renderer is `@aiden0z/pptx-renderer` 1.3.0 (Apache-2.0). Its bundled
`mtx-decompressor` 1.4.2 remains MPL-2.0; its ECMA-derived preset geometry retains
the ECMA notice. Original notices, license texts, and geometry provenance ship
under `dist/licenses/pptx/`. The exact unmodified MPL source is available at
https://github.com/ChristopherVR/mtx-decompressor/archive/refs/tags/v1.4.2.tar.gz.
Redistributors must retain these notices and corresponding-source information.
The unmodified MPL source archive is also included. Exact bundled JSZip, pako,
ECharts, ZRender, and supporting-library notices are retained in
`bundled-dependencies.txt`; the standalone browser artifact uses its release-lock
versions rather than dependency ranges resolved by the consuming host.

Acceptance: `pnpm exec vitest run packages/core/test/pptx.test.ts` covers resource
ownership and input boundaries. `node scripts/check-pptx-browser.mjs` exercises
the actual engine, selectable text, external-reference isolation, and cleanup.
Pass a local PPTX path to exercise its charts and layout without committing it.
