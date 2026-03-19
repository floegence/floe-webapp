import { createMemo, createSignal, createEffect, onCleanup, type Accessor } from 'solid-js';
import { createSimpleContext } from './createSimpleContext';
import { useResolvedFloeConfig } from './FloeConfigContext';
import {
  applyTheme,
  getSystemTheme,
  resolveThemeTokens,
  syncThemeTokenOverrides,
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
}

function resolvePresetName(
  presetName: string | undefined,
  presets: readonly FloeThemePreset[],
  fallbackPresetName?: string
): string | undefined {
  if (presets.length === 0) return undefined;
  if (presetName && presets.some((preset) => preset.name === presetName)) return presetName;
  if (fallbackPresetName && presets.some((preset) => preset.name === fallbackPresetName)) return fallbackPresetName;
  return presets[0]?.name;
}

export function createThemeService(): ThemeContextValue {
  const floe = useResolvedFloeConfig();
  const storageKey = () => floe.config.theme.storageKey;
  const defaultTheme = () => floe.config.theme.defaultTheme;
  const themeTokens = () => floe.config.theme.tokens;
  const themePresets = () => floe.config.theme.presets ?? [];
  const presetStorageKey = () => floe.config.theme.presetStorageKey ?? `${storageKey()}-preset`;
  const defaultPresetName = () => resolvePresetName(floe.config.theme.defaultPreset, themePresets());

  const storedTheme = floe.persist.load<ThemeType>(storageKey(), defaultTheme());
  const [theme, setThemeSignal] = createSignal<ThemeType>(storedTheme);
  const storedPreset = floe.persist.load<string | undefined>(presetStorageKey(), defaultPresetName());
  const [themePresetName, setThemePresetSignal] = createSignal<string | undefined>(
    resolvePresetName(storedPreset, themePresets(), defaultPresetName())
  );
  const [systemTheme, setSystemTheme] = createSignal<'light' | 'dark'>(getSystemTheme());
  let appliedTokenNames: string[] = [];

  const themePreset = createMemo(() => {
    const resolvedPresetName = resolvePresetName(themePresetName(), themePresets(), defaultPresetName());
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

  createEffect(() => {
    const nextPresetName = resolvePresetName(themePresetName(), themePresets(), defaultPresetName());
    if (themePresetName() !== nextPresetName) {
      setThemePresetSignal(nextPresetName);
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
    applyTheme(currentTheme);
    appliedTokenNames = syncThemeTokenOverrides(
      resolveThemeTokens(resolved, themeTokens(), themePreset()?.tokens),
      appliedTokenNames
    );
  });

  onCleanup(() => {
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

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    themePresets,
    themePreset,
    setThemePreset,
  };
}

export const { Provider: ThemeProvider, use: useTheme } = createSimpleContext<ThemeContextValue>({
  name: 'Theme',
  init: createThemeService,
});
