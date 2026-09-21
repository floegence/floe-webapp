# Controlled input history

`createInputHistoryController` is exported by `@floegence/floe-webapp-core/chat`.
It recalls host-provided text without submitting messages, fetching history, or
persisting another draft. Supply unique `{ id, text }` entries oldest first.

The `read` callback returns the current scope, controlled value, draft revision,
entries, and eligibility. `write` synchronously commits text to that same editor.
Increment the revision for every host mutation, even when text is unchanged.
Call `synchronize` when these inputs change. Reactive synchronization during a
controller write is safe. `onChange(state, reason)` exposes a one-based position
from newest and the session's total, or null when browsing ends. Only the
`navigate` reason should announce recall or return to the empty editor.

Invoke `handleKeyDown(event, textarea)` after higher-priority menus. Only an
unmodified ArrowUp in an exactly empty editor starts browsing. ArrowUp recalls
older entries, ArrowDown recalls newer entries and finally the empty draft.
The oldest boundary does not wrap. Escape restores empty while browsing.
Successful navigation consumes the event and places the caret at the end.
IME, range selection, modifiers, disabled and read-only editors retain native
ownership. Other editing or caret keys end browsing without consuming the key.

Call `reset` before input, paste, pointer selection, composition start, blur,
submission or hiding the editor. Reset retains the controlled text. Suppress
automatic completion triggered solely by recall until ordinary editing resumes.
Scopes and external draft revisions cancel browsing without overwriting text.
Candidates are frozen for each browsing session; new entries appear on the next
session. Removing or changing a frozen entry cancels that session.

Hosts own authorization, message filtering, draft storage, localized hints and
announcements, autosizing, and submit behavior. Do not include secret answers or
reconstruct attachments from text. Use an existing polite live region for recall
position and return-to-empty announcements without moving focus or opening a menu.

Validation: `packages/core/test/input-history.test.ts` covers the controller
contract; `scripts/check-input-history-browser.mjs` verifies native textarea
keyboard, selection and composition behavior in Chromium.
