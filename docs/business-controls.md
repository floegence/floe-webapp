# Business controls and framework contracts

Floe owns reusable Solid controls, interaction mechanics, design tokens, and their browser acceptance. Applications own domain validation, authorization, queries, persistence, routing, and translations. The demo's Business controls page is an executable composition example; its source is reused by browser acceptance.

## Forms

Use FormField with a unique name and, when necessary, an explicit id. Put identity on the field so FormLabel and the control share it. Input, Textarea, AffixInput, NumberInput, Checkbox, Switch, Select, Combobox, MultiSelect, Slider, and DatePicker read the field context. For a native or external control, use FormControl's render function or useFormControl and spread the reactive binding. Explicit control props can override defaults; keep an overridden id consistent with the label.

FormDescription and FormMessage register accessible descriptions in the client. The description and error props on FormField make associations available during source-level server rendering too. Render FormMessage when supplying a field error. Multiple controls belong in separate fields or a labelled fieldset; one FormField represents one control identity. Existing RadioGroup remains a labelled native radio group; give it a name and use fieldset/legend for group guidance.

Form validates native constraints before submission and optionally calls host validate with FormData. The validator returns named messages or undefined; the first invalid control receives focus. FormMessage can render validator issue arrays with message properties. No validation library or data model is required. Async submission exposes aria-busy; duplicate submission is ignored. Reset clears validation, invalidates outstanding validation, and invokes onReset. Controlled values remain host-owned: update them in onReset or accept the change callbacks. Pending network writes are not cancelled by resetting a form; the host owns cancellation and idempotency. Use the second onSubmit argument, { form, data }, for stable form identity and the submitted snapshot after asynchronous validation; native event.currentTarget is cleared when dispatch ends. Handle rejected submissions with onSubmitError.

## Selection and state

Select is a single-value combobox/listbox, Combobox adds text search, and MultiSelect retains a list of values. Dropdown remains an action menu. Never locate Select options as menuitem. Existing Select imports from Dropdown continue to work. Select, Combobox and MultiSelect use the shared directional menu presence: their untransformed layer owns placement, their child owns enter/exit motion, and a closing panel is immediately inert while retained until its CSS transition finishes. Reopening reverses the same panel; reduced motion uses the shared immediate recipe.

Selection popups size to their content, with the trigger width as a minimum and the viewport as a maximum. A compact trigger must not force longer option labels into a narrow column. Labels wrap only when the available viewport width requires it.

Controlled value/open props are authoritative; defaultValue/defaultOpen are initialization and reset defaults. Callbacks request state changes and do not mutate controlled props. Do not switch between controlled and uncontrolled modes during a component's lifetime. Selection participates in native FormData, required validation, disabled state, and reset through a hidden native select. Selected values remain in form submission even when remote search no longer returns their options. Hosts should retain selected labels in their option cache for display.

Keyboard support includes arrows, Home/End for Select, typeahead, Enter, Escape, and Tab. Disabled options cannot be selected. Search hosts own fetch cancellation, query identity, stale-response rejection, and pagination; filter=false disables local filtering. Loading/error/retry do not discard selected values. These controls render the supplied option set; hosts must bound remote result sizes rather than passing unbounded collections.

Popover accepts a trigger render function receiving aria-haspopup, aria-expanded, and aria-controls. Spread that binding on the actual button. Existing JSX triggers remain supported and own their own accessible properties. Escape from inside returns focus to the trigger; outside interaction preserves the clicked target. Shared overlay and surface-portal ownership still apply.

## Tables and dates

Table primitives preserve native table semantics. DataTable receives already projected rows and host-owned sort, selected keys, hidden columns, toolbar, and pagination. Selection uses stable row keys and preserves off-page selections. createTableModel is an optional pure filter → sort → page helper and clamps stale pages after filtering. DataTable retains current rows while loading or failing; hosts should not clear useful data during refresh. Large result sets require host pagination or the existing VirtualList; DataTable does not claim grid editing or row virtualization.

Calendar, DatePicker, and DateRangePicker exchange Gregorian civil dates as YYYY-MM-DD. They do not silently convert a date into a timestamp. Hosts explicitly choose a time zone when turning a date into an instant. Week starts are explicit (0–6), display formatting follows LocaleProvider, and min/max constrain selection. Arrow keys navigate days, Home/End navigate a week, PageUp/PageDown navigate months, and Shift adds year navigation. Unavailable dates can receive keyboard focus for discovery but cannot be selected. Controlled month is the host's navigation state.

Accordion retains collapsed content and form state. Breadcrumb is a generic navigation primitive. Use their /ui exports: the legacy umbrella Calendar icon and file-browser Breadcrumb retain their existing meanings.

## Locale and direction

LocaleProvider receives a complete FloeLocale containing locale, direction, and messages. useFloeLocale formats numbers and dates through Intl and validates message substitutions. The standalone default is English; a host supplying messages must provide every key, with matching placeholders, and must never merge a partial catalog with English. Providers are reactive, so changing locale or direction updates mounted controls.

This provider covers the business-control and pagination vocabulary. Existing shell, editor, file-browser, PDF, and other domain-specific copy retain their established configuration contracts. It does not claim automatic translation of arbitrary product text or complete RTL conversion of the Workbench. New selection, calendar, table, breadcrumb, accordion, and pagination layouts consume direction; acceptance exercises LTR and RTL. Products own the document language and direction.

## Packaging, compatibility, and acceptance

Use published npm artifacts and public subpaths. /ui is the general-control surface; /app is application composition. Do not import source internals or copy upstream implementations into products. Source ownership/distribution is not the runtime component registry: the latter registers application behavior, not installable third-party code. A separate code registry is unnecessary until there is a concrete distribution use case.

The built UI is browser DOM output. Source-level SSR tests verify pure render relationships; they do not promise built-package server rendering or hydration. Use pure data helpers in server code only where the public entry is explicitly server-safe. Render Floe UI inside a client boundary.

scripts/check-public-api.mjs compares the built root, ui, and app export names with a reviewable inventory. Intentional additions require explicit inventory review; it is not a substitute for signature compatibility tests. Existing import paths and legacy names remain compatible. Deprecations must document the replacement and migration before removal; breaking behavior requires a versioned release and downstream acceptance.

scripts/check-consumer-budgets.mjs bundles representative consumers from built public entrypoints, measures initial gzip JavaScript (Solid runtime external, styles excluded), and rejects eager optional editor/document/graph engines. Budgets are 24 KB for Button, 50 KB for the business-form composition, and 180 KB for the application shell. Installed dependency size and initial browser JavaScript are distinct; heavy optional dependency packaging should be split only with measured benefit and a migration contract.

Run make check for deterministic repository acceptance. test:business-controls exercises the actual example in Chromium, WebKit, and Firefox with keyboard, native submission/reset, validation, retained state, RTL, and axe WCAG checks. test:input-focus and overlay acceptance preserve border-only focus, theme geometry, and surface ownership. Automated axe coverage is evidence, not a claim of complete assistive-technology certification.

## Selection popup motion acceptance (0.90.7)

`node scripts/check-select-motion-browser.mjs --all` exercises Select, Combobox and MultiSelect in Chromium, WebKit and Firefox at 390px and 1280px, with normal and reduced motion, above/below placement, stable geometry, immediate exit input revocation and same-panel reversal. `check-business-controls-browser.mjs` retains field, form submission/reset, keyboard, RTL and accessibility coverage.

The nested-window cases also verify that Escape dismisses the selection listbox while preserving the focused control and containing window, then closes the window on the next Escape (0.90.9).

The same three-engine matrix verifies content-driven popup width, viewport bounds and readable long options (0.90.10).
