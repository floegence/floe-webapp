# Remote surface input

`@floegence/floe-webapp-core/remote-input` provides a framework-free browser input
controller. Import `remote-input.css` alongside the host's published focus styles.
It owns one stable textarea; the operating system owns composition and candidates.
It does not install an input method, synchronize a clipboard, or mirror a remote
document. No entered text is persisted or logged.

Create one controller per remote surface with `createRemoteInput`. Supply an
accessible localized `label` and `commitText`, `sendKey`, and `release` callbacks.
These callbacks receive the immutable target token passed to `bindTarget`.
Reuse that token while the target is unchanged, bind a new token on window or
connection replacement, and bind `null` before pixels or control become stale.
Do not register another keyboard/composition handler for the same surface.

`sendKey` preserves ordinary direct physical typing, modifiers, repeats and
navigation. `commitText` receives confirmed Unicode from composition, dead keys,
software keyboards or native text insertion. Composition navigation never also
becomes a remote key. A backend must deliver committed text without recomposing it
or borrowing the user's clipboard. It must reject unavailable or retired targets.
Input is not replayed after reconnect; callbacks own operation-error presentation.

`setAnchor(clientX, clientY)` positions the real input near the last interaction,
clamped to the surface and visual viewport. `focus()` is for a deliberate content
activation. On touch surfaces, use `setKeyboardVisible(true)` from a user gesture
such as a keyboard toolbar button, and `false` to dismiss. Do not focus on every
remote pointer click: most clicks are not text-editing intent. Resize and visual
viewport events move the anchor without replacing the element or target.

The optional `clipboard` callback claims existing clipboard shortcuts. Return
`true` only when the callback owns delivery, including any required preventDefault;
do not both forward a paste shortcut and commit the resulting local pasted text.
`reset()` cancels buffered composition and releases held keys; `dispose()` also
removes the element and every owned listener. Blur, page hide and target changes
cancel unfinished composition automatically. Delayed completion from a cancelled
transaction cannot insert into a new target. Consecutive identical commits are
independent edits and are never deduplicated by their text.

Run `node scripts/check-remote-input-browser.mjs` against built outputs, or add
`--source` during development and `--all` for Chromium, WebKit and Firefox. Browser
protocol composition tests verify actual editing events but are not evidence of
real iOS/Android keyboards or every operating-system input method.
