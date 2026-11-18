// Browser-neutral shell theme metadata for Node.js and Electron main-process adapters.
export { FLOE_THEME_FILE_LIMIT, floeThemeContrastIssue, readFloeThemeDocument, resolveFloeThemeDocument, type FloeThemeDocument } from './styles/themes/themeDocument';
export {
  BUILT_IN_SHELL_THEME_DEFAULTS,
  REQUIRED_SHELL_THEME_TOKENS,
  assertUniqueThemePresetNames,
  builtInShellThemePresets,
  getShellThemePresetsForMode,
  normalizeShellThemeSelection,
  presetSupportsMode,
  resolveShellThemePresetName,
  type FloeShellThemeDefaults,
  type FloeShellThemeMode,
  type FloeShellThemeSelection,
} from './styles/themes/presets';
export type {
  FloeSurfaceStyle,
  FloeMonacoThemeDefinition,
  FloeMonacoTokenRule,
  FloeThemePreset,
  FloeThemePresetMode,
  FloeThemeTokenMap,
  FloeThemeTokenOverrides,
} from './styles/themes';
