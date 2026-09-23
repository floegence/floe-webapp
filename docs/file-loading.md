# File browser initial loading

`FileListView`, `FileGridView`, and `FileBrowserStatusBar` accept `initializing`.
Set it only before the first successful directory response. A successful empty
directory is a result; background refresh must retain the existing view.

The initial list keeps its real header, responsive columns, persisted column
ratios, row height, and icon slots. Grid placeholders use the real container-based
column calculation, tile size, spacing, and icon/name geometry. The status bar
reserves its usual height without publishing a false count or path. Placeholders
are decorative, do not enter the file model, and cannot be selected or opened.
The host supplies a localized loading label on its surrounding status region.

`data-file-list-header` and `data-file-list-row` identify shared geometry. Host
compact styling must apply to both pending and successful rows through these
markers, instead of selecting only buttons or depending on incidental DOM depth.

The file provider remains the owner of view mode, column ratios, selection,
navigation, and filtering. This API adds presentation only; it does not fetch,
cache, change paths, or add a second loading state machine.

`scripts/check-file-loading-browser.mjs` compares item, cell, and status bounds
before and after the first result at narrow, medium, and wide viewport sizes. It
also checks that a confirmed empty directory uses the normal empty state.
