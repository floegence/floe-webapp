# Inline HTML canvas

MarkdownMedia presents HTML in one bounded dotted canvas, with circular expand
and source controls outside the document. Its actions menu retains the host's
file preview and reveal operations, an independent inline preview window,
source copying, and explicit reload. Images, video, and audio keep their own
existing presentation.

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

Run the media component tests and scripts/check-chat-media-browser.mjs for
state, geometry, source persistence, and sandbox acceptance. The dedicated
scripts/check-html-preview-browser.mjs covers private link authorization,
independent floating copies, focus restoration, and cleanup in Chromium and
WebKit.
