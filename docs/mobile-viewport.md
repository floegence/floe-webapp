# Mobile application viewport

`@floegence/floe-webapp-core/viewport` exposes `observeViewport`,
`readViewportSnapshot`, and `viewportStyle` without a framework dependency.
One observer per Window measures dynamic content size, visual viewport bounds,
safe areas, and focused-editor keyboard occlusion. Visible bounds use client CSS pixels. `fixedOffset` converts client coordinates
to fixed CSS positioning, including Safari keyboard page panning. `viewportStyle`
applies that conversion once. Browser chrome changes, pinch zoom, and hardware-keyboard focus do not
by themselves indicate a soft keyboard. Subscriptions share event-driven updates;
the last unsubscribe removes listeners and the measurement probe.

Use `AppViewport` from `@floegence/floe-webapp-core/layout` once at the document
root. Set `Shell.fillParent` for Shells inside that host. Keep page scrolling inside content surfaces;
do not wrap the host in another `100vh` shell. The host never remounts children
or changes focus. Safe areas belong to chrome and floating boundaries, not an
additional inset on the whole visible viewport.

`Shell.mobileAccessory` retains a bottom accessory immediately above navigation.
`hideMobileNavigationWhenKeyboardOpen` opts into hiding navigation during actual
soft-keyboard occlusion; the navigation node remains mounted. BottomBarCompanion
uses the shared visible bounds and the actual accessory anchor. It also observes
scrolling ancestors, so scrolling cannot leave fixed geometry at stale coordinates.

Standalone remote viewers can subscribe to the same API. Keyboard occlusion
changes local presentation, not the remote application's requested size. Use the
unoccluded `layout` dimensions for that request, and independently authorize input
against the current decoded capture binding. A focused DOM input is not proof of
remote input authorization.

`scripts/check-mobile-viewport-browser.mjs` exercises Chromium and WebKit. A real
iOS Safari soft-keyboard check remains required for a product claiming iOS support.

## Dialogs and floating windows

`Dialog` constrains its panel to the current visible viewport and safe area,
including nonzero visual offsets and Safari page panning. Headers and footers
remain outside the scrolling body. Hosts may request a full-height panel with
`h-full`; viewport-sized heights and `max-h-none` must not bypass the constraint.
Use `presentation="side-drawer"` for right-aligned management surfaces, or
`presentation="bottom-drawer"` for bottom-aligned panels. Keep panel placement
inside this contract rather than applying fixed positioning in product CSS.
Projected dialogs intersect the host boundary with the safe visible viewport
before projecting into host coordinates.

`FloatingWindow` uses the same visible boundary for opening, dragging, resizing,
and maximizing. Viewport changes project the remembered user geometry without
replacing the content, moving focus, or overwriting the preferred window size.
`viewportInsets` reserves additional host chrome inside that boundary. Global
windows subscribe to viewport events; only explicit moving surface boundaries
retain their existing frame-based transform observation.

`scripts/check-overlay-viewport-browser.mjs` covers all three dialog presentations
and floating windows in Chromium and WebKit, including safe areas, fixed-origin
panning, repeated keyboard occlusion, rotation, editor retention and reading the
last line. Run it with `--serve` for a task-owned Simulator Safari fixture.
