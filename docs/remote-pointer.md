# Remote content pointer ownership

`@floegence/floe-webapp-core/remote-pointer` exports `createRemotePointer` without
framework or transport dependencies. Load `remote-pointer.css` and mark only
remote pixel elements with `data-floe-remote-pointer`. Local controls and the IME
textarea must remain outside that marker. The CSS reserves one-finger movement
for remote content while preserving browser pinch zoom.

Create one controller on a stable content container. `resolveTarget(event)` returns
an immutable token for a painted, permitted window or null for local UI and stale
pixels. `isTargetValid(token)` checks the same connection, window instance and
content mapping before deferred work. Never identify a target only by a reusable
window number. A rebuilt canvas must resolve to a new token.

`sendPointer(command, token)` receives `move`, `down`, `up`, or `scroll` in viewport
CSS coordinates with browser modifiers. Scroll deltas use CSS pixels: positive
means down/right. Do not multiply by devicePixelRatio or capture resolution.
The platform maps positions to its content rectangle and encodes existing pointer
packets. It must not install another content mouse, touch or wheel listener.
It may return false when delivery is unavailable; it must not replay input.

`onActivate(position, token)` runs before deliberate button presses and may
coordinate window focus and the existing remote-input anchor. Scrolling never
calls it or focuses an editor. `onHoldChange(position|null)` presents local hold
feedback; `floe-remote-pointer-hold` supplies a noninteractive indicator style.

A touch stays pending within 8 CSS pixels. A release clicks immediately; two taps
within 350 ms and 16 pixels on the same target form a double click. Movement before
450 ms starts scrolling. A 450 ms hold only arms feedback: later movement starts a
left drag at the original point, while stationary release right clicks. Each touch
chooses one outcome. A second touch cancels the gesture until every contact ends;
browser pinch zoom never becomes remote input. Mouse and pen buttons remain direct.
Scroll is accumulated per animation frame and stops on release without inertia.
Before delivering a later key, text or clipboard command, the consumer calls
`flush()` so prior pointer movement keeps its transport order. This requires no
keyboard listener in the pointer controller.

`reset()` discards queued movement, clears holds and releases owned buttons. The
`release(token)` callback clears backend scroll remainder; it must never release
keyboard input. Window replacement, target geometry changes, local toolbar opening
and transport failure must call reset explicitly. Blur, hiding, viewport changes,
pointer cancellation and capture loss are handled by the controller. `dispose()`
also removes all listeners and observers. Cancellation observers outside the
content surface never consume events or deliver remote input.

Run `pnpm exec vitest run packages/core/test/remote-pointer.test.ts` and
`node scripts/check-remote-pointer-browser.mjs --source --all` during development.
Omit `--source` to verify built public artifacts. Synthetic browser events and CDP
touch sequences are not evidence of physical iOS/Android device acceptance.
