# Inline HTML canvas

MarkdownMedia presents HTML in one bounded dotted canvas with a compact top
toolbar. A circular arrow button at the top right opens the host preview or an
independent floating copy directly, beside the separate expand control. It stays
disabled until the document is ready. Source and more actions sit on the left;
the document fills the remaining area with narrow side and bottom insets.
The toolbar never covers the document, including on touch screens.
Closing an independent preview restores keyboard focus to its opening control.
Its actions menu retains the host's
file preview and reveal operations, an independent inline preview window,
source copying, and explicit reload. Images share its dotted background and
independent circular controls at the top right. Their padded, contain-sized
viewport keeps the full image visible below the controls, including on touch
screens. Clicking the image or eye still opens the host preview or shared
floating window; the folder action keeps the host's authorized navigation.
Video and audio retain their native playback presentation.

Hosts may pass htmlState="generating" or htmlState="incomplete" with the current
partial source. Neither state executes HTML. Omit htmlState only after the
source is complete. Retain the component's identity as the source grows so
source inspection and expansion survive completion. The host owns generation,
interruption, and retry; this presentation component never resumes a run.

Source inspection hides and makes the existing iframe inert rather than
recreating it, preserving document interaction state. HTML still runs only in
SandboxedHtmlFrame, with its opaque sandbox, network restrictions, and
host-authorized link channel. Source text is rendered as text, never markup.

The optional generating, incomplete, showSource, showPreview, more, copyHTML,
copied, copyFailed, and replay labels let hosts localize every new interaction.
Clipboard denial exposes and selects the source for native copying.

The canvas keeps the same dimensions through loading, failure, retry, and
completion. Controls remain available on touch, respect keyboard focus, and
stay outside the document at narrow widths. Reduced motion disables the dotted
sheen; light, dark, and forced-color themes use semantic colors.
During generation and loading, only a centered status label appears over the
dots. The label uses the shared progress text shimmer; no skeleton card or
placeholder bars frame it. Both animations settle when generation stops, and
reduced motion or forced colors keep the status text readable without motion.

Run the media component tests and scripts/check-chat-media-browser.mjs for
state, geometry, source persistence, and sandbox acceptance. The dedicated
scripts/check-html-preview-browser.mjs covers private link authorization,
independent floating copies, focus restoration, and cleanup in Chromium and
WebKit.
