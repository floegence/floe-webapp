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
