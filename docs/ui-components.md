
## Contextual prompts

`PromptCard.tools` accepts compact host-owned actions beside the attachment button.
The host owns async work, cancellation and result admission; capture work must not
block typing or trigger when the card opens. Keep feedback in the existing toolbar
or attachment area.

`createContextSourceRegistry<T>(document)` registers live element instances with
read-only state readers. Pointer/focus activation identifies the innermost source;
menus outside registered sources retain the previous source. `capture()` freezes
the current facts, selection and viewport rectangle only when explicitly called.
An authenticated embedded host may forward `activate(id)`. Dispose registrations
and the registry with their owners. It is not a permission, screenshot service,
background observer or persistent store. Products must validate scope, bound data,
and exclude sensitive content before submission.
