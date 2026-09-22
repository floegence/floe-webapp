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
