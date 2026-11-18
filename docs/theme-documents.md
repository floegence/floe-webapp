# Portable shell themes

`@floegence/floe-webapp-core/themes` reads portable JSON in renderers and native hosts. A document names a published base; omitted roles inherit from that base. The base determines light or dark mode. A document never chooses a storage key, installation ID or theme source.

```json
{
  "version": 1,
  "name": "Harbor",
  "base": "paper",
  "colors": { "--primary": "#255744", "--ring": "#255744" },
  "editor": { "editor.selectionBackground": "#3a886544" },
  "syntax": { "string": "#237851" }
}
```

`colors` accepts six-digit hex colors for the base's published semantic tokens except shadows. Optional `editor` and `syntax` maps use that base's Monaco color IDs and token names. Editor colors also accept eight-digit hex. Files are UTF-8 JSON up to 32 KiB. Unknown fields, bases, roles and non-literal colors are rejected. Use `floeThemeContrastIssue` to check modified text/surface pairs before installing.

Call `readFloeThemeDocument` at every external boundary. Give each imported document its own host-owned ID and use `resolveFloeThemeDocument` to derive its preview, shell tokens and Monaco definition. Supply installed presets through `theme.additionalShellPresets`. The optional `ThemePicker.studio` is controlled by the host: it previews local drafts, imports and exports files and awaits an explicit save. The optional generation action receives the current document and does not commit it.
