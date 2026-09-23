# Document reload presentation

`@floegence/floe-webapp-core/reload-placeholder` bridges a full document reload
with anonymous geometry from the previous authorized page. It does not persist
HTML, text, images, URLs, input values, resource records or permission facts.
Ordinary resource refreshes should continue to retain their live view instead.

Insert `createReloadPlaceholderScript({ storageKey, scopeStorageKey })` as an
inline classic script at the beginning of the document head, before external
scripts and styles. Respect the host's CSP nonce or hash policy. The script has
no framework dependency. Provide a small static first-visit loading surface in
the HTML; an absent, malformed, oversized or incompatible record never prevents
normal startup. Viewport or scope changes reject the old geometry.

The application obtains `getReloadPlaceholder()` after its module starts. The
controller owns one handoff:

- `restrictTo(mainElement)` reveals the live shell while preserving the previous
  content geometry. Navigation outside the main region stays usable.
- `finish()` reveals the current selected view when it has restored a successful
  snapshot, loaded live data, or reached an actionable error/access gate. Restore
  any scroll geometry before removing the placeholder; do not reveal an
  intermediate default list skeleton underneath it.
- `arm(shellElement, surfaceSelector)` enables capture on `pagehide`, after an
  authorized presentation has become visible. Choose actual shell, section and
  card/table surfaces, excluding transient dialogs and portals. Text and replaced elements become anonymous rectangles;
  user strings and image sources are never read into storage.
- `clear()` disarms capture, removes the layer and deletes its record. Call this
  on explicit access revocation or navigation to a different presentation. Do
  not treat this geometry as authority to show cached resource contents.

Mark a region with `data-floe-reload-omit` when it should stay blank during reload.
Capture skips that element and all descendant surfaces, text, images, and controls;
the surrounding shell is still captured. This is presentation policy only and does
not change the live region's visibility, accessibility, or interactions. Explicit
scroll restoration inside omitted regions remains available.

Scroll containers may opt in with stable, product-owned
`data-floe-reload-scroll="inventory"` identifiers. Only offsets and these fixed
identifiers are retained; never use resource IDs as identifiers. `finish()`
restores the matching containers before revealing the live view.

Records live only in `sessionStorage`, with at most 240 geometry boxes, 12 scroll
containers and 48,000 characters. Capture happens at document departure, not on
each poll or animation frame. Storage failures are nonfatal. Resize discards the
current layer; back/forward-cache restoration removes it. The host retains
ownership of navigation, authentication, resource hydration, errors and retry.

The layer is inert, has no pointer handlers, does not contain cached content and
has no fade or entry animation. It preserves layout rather than claiming that a
resource is present. Real resource changes may still alter the final page.

`scripts/check-reload-placeholder-browser.mjs` verifies actual hard reload with
the application module held, matching prior card bounds, safe serialization,
corruption handling and scope isolation.
