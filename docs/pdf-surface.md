# Embedded PDF surfaces

`@floegence/floe-webapp-core/pdf` provides a host-neutral PDF.js 6.3.289 adapter
using the official legacy engine, viewer and worker. Embedded clients such as
Electron 41 / Chromium 146 lack APIs including `Math.sumPrecise`; the modern
worker can fail embedded font conversion and silently substitute incorrect glyphs.
Keep the legacy build consistent across all PDF runtime imports and resources.
Import it at the document feature boundary, not through the shell's initial
module graph. The entry is deliberately absent from the root and `full` barrels.
Hosts own document loading UI, viewport geometry, nearby-page virtualization,
zoom policy, access permissions, localization, dirty confirmation and persistence.

Use `pdfAssetsPlugin()` from `@floegence/floe-webapp-core/pdf-assets` in Vite,
import the default asset URL from `virtual:floe-pdf-assets`, and import
`@floegence/floe-webapp-core/pdf.css`. The plugin emits versioned, same-origin
workers, CMaps, standard fonts, codecs, ICC profiles, annotation icons and all
their original license files beneath `pdf-assets/<version>/legacy/`. The build
variant is part of the resource URL so a previously cached modern worker cannot
be reused after upgrading the adapter. No CDN or remote font lookup is needed.

Call `openPdfDocument(bytes, assetsUrl)` and retain its loading task. The adapter
copies the bytes before worker transfer. Destroy the task after disposing the
surface. No PDF JavaScript execution manager or XFA editor is installed.

Create one `PdfDocumentSurface` per document, with a stable `.floe-pdf-surface`
container and a `.pdfViewer` viewer inside it. `mountPage(pdfPage, element)`
returns one serialized render owner. `render(scale)` uses PDF points as CSS
pixels at scale 1; it preserves layers on resize and cancels superseded work.
`dispose()` releases a virtualized page after pending canvas work settles. The
canvas budget is 6,000,000 pixels and 16,384 pixels per dimension; detail canvases
are disabled. Text, annotation and bitmap layers share one viewport. Outer CSS
projection is not included in PDF coordinates or bitmap allocation.

The host calls `setScale`, `setCurrentPage`, and handles `onNavigate`. Search
uses PDF.js's find controller and text highlighter, including normalization and
navigation into unmounted pages. Text selection and browser copy remain native.
Declare the published Workbench text-selection marker separately from wheel
ownership; this module does not activate widgets or intercept shell shortcuts.

Editable sessions expose form filling and single-page selection highlights.
`highlightSelection` returns false for missing, foreign or cross-page selection;
cross-page text remains copyable. Annotation undo/redo belongs to the session;
ordinary text-field undo belongs to the browser. PDF.js global keyboard and
clipboard handlers are scoped to the container; file/image paste and drop are
left to the host. Original page text editing, OCR, signatures, freehand drawing,
redaction and document JavaScript are outside this surface's contract.

`onDirty` latches the host's unsaved state. `save()` returns PDF-native bytes but
does **not** acknowledge persistence. Keep the dirty flag on transport failure;
only clear it after the host has persisted the bytes or explicitly discarded
the draft. Freeze editing during a save and replace the document from the
acknowledged bytes. The same bytes can be used for a user-requested saved copy.

Pass `PdfLocalization(viewer, localize, locale)` to bridge generated PDF.js
labels to the host's catalog, and destroy that host-owned localization object
when closing the document. Its observer watches only the stable viewer root.
The callback returns text and/or accessibility/title attributes for PDF.js IDs;
page labels use `pdfjs-page-landmark`, highlights use
`pdfjs-editor-highlight-editor`, removal uses
`pdfjs-editor-remove-highlight-button`, and the color picker uses
`pdfjs-editor-colorpicker-button`, `pdfjs-editor-colorpicker-dropdown` and
`pdfjs-editor-colorpicker-yellow`. Hosts must also localize annotation metadata
labels for the PDF annotation types they display. Without a supplied service,
the standalone API uses PDF.js's English catalog.

## Attribution and evidence

The adapter is MIT. PDF.js code and its viewer CSS retain Apache-2.0 notices.
The distribution also contains separately licensed standard fonts (including
Liberation's GPL-2.0 with font exception), CMaps, color profiles and codecs.
Do not reduce those resources to the top-level package license; distribute the
original files emitted by the plugin. The synthetic Chinese fixtures embed a
subset of Noto Sans SC under the adjacent SIL Open Font License.

`node scripts/check-pdf-browser.mjs` exercises actual pointer selection and
clipboard at outer projections 1, 0.65 and 1.5 and PDF zooms 1 and 1.5, unembedded
Chinese CMaps, search, form retention across zoom/remount, PDF-native field and
highlight round trips, annotation undo/redo, and input outside the viewer.
It removes `Math.sumPrecise` in both the browser document and a real worker,
requires embedded fonts to load without conversion warnings, and compares the
Chinese/Latin bitmap against the same browser's normal rendering. Text-layer
content alone is not evidence of correct glyph rendering. Asset tests compare
development responses and production output with the pinned legacy distribution.
Artifacts are written to `.cache/pdf-surface`. These checks validate an embedded
page owner; downstream products must additionally verify virtualization bounds,
their projected Workbench shell, save errors and dirty close confirmation.
