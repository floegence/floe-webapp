import { createMemo, createSignal, createEffect, onCleanup, type Accessor } from 'solid-js';
import { createSimpleContext } from './createSimpleContext';
import { useResolvedFloeConfig } from './FloeConfigContext';
import {
  applyShellThemeAttribute,
  applyTheme,
  getSystemTheme,
  isThemeType,
  normalizeShellThemeSelection,
  presetSupportsMode,
  resolveThemeTokens,
  syncThemeTokenOverrides,
  type FloeShellThemeMode,
  type FloeShellThemeSelection,
  type FloeThemePreset,
  type ThemeType,
} from '../styles/themes';

export interface ThemeContextValue {
  theme: Accessor<ThemeType>;
  resolvedTheme: Accessor<'light' | 'dark'>;
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
  themePresets: Accessor<readonly FloeThemePreset[]>;
  themePreset: Accessor<FloeThemePreset | undefined>;
  setThemePreset: (presetName: string | undefined) => void;
  shellPresets: Accessor<readonly FloeThemePreset[]>;
  shellPreset: Accessor<FloeThemePreset | undefined>;
  shellPresetForMode: (mode: FloeShellThemeMode) => FloeThemePreset | undefined;
  setShellPreset: (presetName: string) => void;
  selectShellTheme: (mode: FloeShellThemeMode, presetName: string) => void;
}

function resolvePresetName(
  presetName: string | undefined,
  presets: readonly FloeThemePreset[],
  fallbackPresetName?: string
): string | undefined {
  if (presets.length === 0) return undefined;
  if (presetName && presets.some((preset) => preset.name === presetName)) return presetName;
  if (fallbackPresetName && presets.some((preset) => preset.name === fallbackPresetName))
    return fallbackPresetName;
  return presets[0]?.name;
}

export function createThemeService(): ThemeContextValue {
  const floe = useResolvedFloeConfig();
  const storageKey = () => floe.config.theme.storageKey;
  const defaultTheme = () => floe.config.theme.defaultTheme;
  const themeTokens = () => floe.config.theme.tokens;
  const themePresets = () => floe.config.theme.presets ?? [];
  const presetStorageKey = () => floe.config.theme.presetStorageKey ?? `${storageKey()}-preset`;
  const defaultPresetName = () =>
    resolvePresetName(floe.config.theme.defaultPreset, themePresets());
  const shellPresets = () => floe.config.theme.shellPresets ?? [];
  const shellPresetStorageKey = () =>
    floe.config.theme.shellPresetStorageKey ?? `${storageKey()}-shell-preset`;
  const defaultShellPreset = () => floe.config.theme.defaultShellPreset ?? {};

  const storedThemeValue = floe.persist.load<unknown>(storageKey(), defaultTheme());
  const storedTheme = isThemeType(storedThemeValue) ? storedThemeValue : defaultTheme();
  const [theme, setThemeSignal] = createSignal<ThemeType>(storedTheme);
  const storedPreset = floe.persist.load<string | undefined>(
    presetStorageKey(),
    defaultPresetName()
  );
  const [themePresetName, setThemePresetSignal] = createSignal<string | undefined>(
    resolvePresetName(storedPreset, themePresets(), defaultPresetName())
  );
  const storedShellSelection = floe.persist.load<unknown>(shellPresetStorageKey(), undefined);
  const [shellThemeSelection, setShellThemeSelection] = createSignal<FloeShellThemeSelection>(
    normalizeShellThemeSelection(storedShellSelection, shellPresets(), defaultShellPreset())
  );
  const [systemTheme, setSystemTheme] = createSignal<'light' | 'dark'>(getSystemTheme());
  let appliedTokenNames: string[] = [];

  const themePreset = createMemo(() => {
    const resolvedPresetName = resolvePresetName(
      themePresetName(),
      themePresets(),
      defaultPresetName()
    );
    if (!resolvedPresetName) return undefined;
    return themePresets().find((preset) => preset.name === resolvedPresetName);
  });

  // Resolved theme (actual light/dark value)
  const resolvedTheme = (): 'light' | 'dark' => {
    const current = theme();
    if (current === 'system') {
      return systemTheme();
    }
    return current;
  };

  const shellPresetForMode = (mode: FloeShellThemeMode): FloeThemePreset | undefined => {
    const presetName = shellThemeSelection()[mode];
    if (!presetName) return undefined;
    return shellPresets().find(
      (preset) => preset.name === presetName && presetSupportsMode(preset, mode)
    );
  };

  const shellPreset = createMemo(() => shellPresetForMode(resolvedTheme()));

  createEffect(() => {
    const nextPresetName = resolvePresetName(
      themePresetName(),
      themePresets(),
      defaultPresetName()
    );
    if (themePresetName() !== nextPresetName) {
      setThemePresetSignal(nextPresetName);
    }
  });

  createEffect(() => {
    const current = shellThemeSelection();
    const next = normalizeShellThemeSelection(current, shellPresets(), defaultShellPreset());
    if (current.light !== next.light || current.dark !== next.dark) {
      setShellThemeSelection(next);
    }
  });

  // Listen for system theme changes
  if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    onCleanup(() => mediaQuery.removeEventListener('change', handleChange));
  }

  // Apply theme when it changes
  createEffect(() => {
    const currentTheme = theme();
    const resolved = resolvedTheme();
    const activeShellPreset = shellPreset();
    applyTheme(currentTheme);
    applyShellThemeAttribute(activeShellPreset?.name);
    appliedTokenNames = syncThemeTokenOverrides(
      resolveThemeTokens(resolved, themeTokens(), activeShellPreset?.tokens, themePreset()?.tokens),
      appliedTokenNames
    );
  });

  onCleanup(() => {
    applyShellThemeAttribute(undefined);
    appliedTokenNames = syncThemeTokenOverrides(undefined, appliedTokenNames);
  });

  const setTheme = (newTheme: ThemeType) => {
    setThemeSignal(newTheme);
    floe.persist.debouncedSave(storageKey(), newTheme);
  };

  const toggleTheme = () => {
    const current = resolvedTheme();
    setTheme(current === 'light' ? 'dark' : 'light');
  };

  const setThemePreset = (presetName: string | undefined) => {
    const nextPresetName = resolvePresetName(presetName, themePresets(), defaultPresetName());
    setThemePresetSignal(nextPresetName);
    if (!nextPresetName) {
      floe.persist.remove(presetStorageKey());
      return;
    }
    floe.persist.debouncedSave(presetStorageKey(), nextPresetName);
  };

  const updateShellPreset = (mode: FloeShellThemeMode, presetName: string): boolean => {
    const preset = shellPresets().find(
      (candidate) => candidate.name === presetName && presetSupportsMode(candidate, mode)
    );
    if (!preset) return false;

    const current = shellThemeSelection();
    if (current[mode] === preset.name) return true;
    const next: FloeShellThemeSelection = { ...current, version: 1, [mode]: preset.name };
    setShellThemeSelection(next);
    floe.persist.debouncedSave(shellPresetStorageKey(), next);
    return true;
  };

  const setShellPreset = (presetName: string) => {
    const preset = shellPresets().find((candidate) => candidate.name === presetName);
    if (!preset) return;
    const mode = preset.mode === 'light' || preset.mode === 'dark' ? preset.mode : resolvedTheme();
    updateShellPreset(mode, presetName);
  };

  const selectShellTheme = (mode: FloeShellThemeMode, presetName: string) => {
    if (!updateShellPreset(mode, presetName)) return;
    setTheme(mode);
  };

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    themePresets,
    themePreset,
    setThemePreset,
    shellPresets,
    shellPreset,
    shellPresetForMode,
    setShellPreset,
    selectShellTheme,
  };
}

export const { Provider: ThemeProvider, use: useTheme } = createSimpleContext<ThemeContextValue>({
  name: 'Theme',
  init: createThemeService,
});
