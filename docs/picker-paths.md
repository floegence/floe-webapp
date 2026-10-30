# Picker Path Semantics

Starting with 0.49.0, DirectoryPicker, DirectoryInput, FileOpenPicker and
FileSavePicker use absolute paths throughout: directory entries, initial values,
selection callbacks, navigation state and loader requests. `/` is always the
filesystem root. `homePath` is a display hint for static pickers, not a path
prefix. Only an explicit `~` or `~/...` input expands against Home; relative paths
are rejected. The host resolves canonical paths and symbolic links.

## Remote directory navigation

Provide `loadPathContext()` and `loadDirectory(path, { showHidden })` together.
The path context contains `homePathAbs`, `defaultRootId`, and a `roots` array of
`id`, `label`, `pathAbs`, optional `permissions` and optional `hidden` properties.
A static `pathContext` is also available for hosts whose context lifecycle is
owned elsewhere. Remote consumers never get an inferred Home or Root when their
context is unavailable. Root permissions describe navigation affordances; the
host loader must independently authorize every requested path.

Every open and `scopeKey` change refreshes the context. All navigation entrypoints
use one data source and load the target directory directly, without enumerating
ancestors. Input edits, closure, a newer navigation, or a replaced environment
invalidate older responses. Only a successful latest navigation commits its
path and entries. An error retains the requested input and last committed
contents, blocks confirmation, and exposes retry. Empty directories are valid;
failed loads are never converted to empty directories or Home navigation.

`DirectoryInput` accepts the containing form's `open` state and reports
`onValidityChange`. Keep form submission disabled while false. Its `onChange`
fires only after successful validation, including successful initial loading.
The expandable panel shares the same core as the dialog; it does not create a
nested modal or own surrounding form metadata. `scrollViewportProps` lets the
host mark actual scroll regions using its existing interaction contract.

`copy` and `formatError` localize the common controls and host error categories.
Home/root labels come from the supplied context. `initialShowHidden` controls the
initial listing, and the user can change it in the panel. Folder creation stays
optional and uses the validated absolute parent path. File pickers retain ordered
multiple selection, file filters, selection limits and filename validation.

`DirectoryPicker` accepts host-ranked `suggestedPaths` and a localized
`suggestedPathsLabel`, for example recent project directories. Empty or invalid
paths are omitted and duplicate absolute paths collapse in their original order.
The host owns ranking, scope, and the number of suggestions. Suggestions occupy
a tab alongside the context roots, selected initially and on each reopen or scope
change. Root tabs reveal the regular directory browser in the same content area.
Tab arrows move focus; Enter or Space activates a tab. Each compact suggestion row
shows the directory name and path, with the full path in its accessible label and
tooltip. Activating a suggestion uses the same navigation source and loader as
typed paths, opens the directory browser and moves focus to its path input. It
neither adds an authorized root nor confirms a selection. Confirmation is disabled
while the suggestions tab is visible. Failed
or pending navigation continues to block confirmation. No suggestion history is
stored by the picker.

## Controlled directory favorites

All four presentations accept optional `directoryFavorites` metadata. Hosts supply
ordered absolute `paths`, `loading`, a localized `error`, `editable`,
`pendingPaths`, `onRefresh()` and async `onSetFavorite(path, favorite)`.
The host owns authenticated scope, durable storage, item-level transactions and
cross-client refresh. Pickers never persist this metadata or infer permissions.
Without the contract, existing root and suggestion behavior is unchanged.

Favorites remain a visible location even when empty. A local name/path filter
only searches the supplied list. Separate navigation and star buttons avoid
nested controls and accidental navigation. Current validated directories, folder
rows and suggestions expose the same favorite action; context menus capture the
path and owner, support Shift+F10/Escape and restore focus through the shared
overlay stack. Touch users can use the visible star. Busy actions retain their
geometry and failures remain visible without blocking ordinary browsing.

Favorites and suggestions are shortcut views, never valid selections. Directory
confirmation, embedded validity and file confirmation all use the same view
owner. Navigating a shortcut returns to browsing and validates the target through
the existing loader. File lists are shown only while browsing; ordered selections
and save filenames survive location switches. Shortcut lists have constrained
scrolling, forward host viewport markers, and scroll keyboard focus into view
with ArrowUp/ArrowDown/Home/End. Hosts still control list limits and ranking.

## Migration from 0.48.x

This is an intentional minor-version API break while the package is pre-1.0.
Remove the former `onExpand` / `ensurePath` tree hydration callbacks and use
`loadDirectory` instead. Remove all Home-relative tree conversion and supply
absolute `FileItem.path`, `initialPath`, and file selections. Callbacks now return
absolute paths directly; never prepend Home to their output. The previous
`PickerEnsurePath` types and dual path conversion helpers are removed.

Static examples may continue to provide `files` containing an absolute tree;
they use the same navigation state and a static directory lookup. They do not
stand in for permission-checked remote loaders. Do not mix static and remote
authority or construct a second navigation/cache owner around the picker.

## Creating a directory

Hosts opt in with onCreateFolder(parentPath, name) and retain filesystem write authorization. The picker accepts one nonempty child name, excluding dot segments, slashes and NUL; it never interprets a name as a nested or absolute path. New folder focuses the input, Enter submits once, and Escape cancels the form before dismissing its dialog. The pending button retains its geometry and exposes busy state. Failure preserves the editable name; cancel clears it. Success refreshes the parent listing and does not confirm selection. Navigation, scope replacement, close and unmount retire the form; a late effect result cannot change a newer intent or replay the write. Canceling the picker does not undo an already submitted filesystem operation.

The check-directory-create-browser.mjs acceptance covers keyboard behavior, failure recovery, stale results and responsive light/dark geometry.
