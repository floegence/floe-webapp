import { createMemo, createSignal, createEffect, onCleanup, untrack, type Accessor, type JSX } from 'solid-js';
import { createSimpleContext } from './createSimpleContext';
import { useResolvedFloeConfig } from './FloeConfigContext';
import {
  applyShellThemeAttribute,
  applySurfaceStyleAttribute,
  isFloeSurfaceStyle,
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
  type FloeSurfaceStyle,
} from '../styles/themes';

export interface ThemeContextValue {
  surfaceStyle: Accessor<FloeSurfaceStyle>;
  setSurfaceStyle: (style: FloeSurfaceStyle) => void;
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

/** An explicit target is owned for this service's lifetime. Its theme changes
 * and palette motion never reach an enclosing document or sibling surface. */
export function createThemeService(target?: HTMLElement): ThemeContextValue {
  const floe = useResolvedFloeConfig();
  const root = target ?? (typeof document === 'undefined' ? undefined : document.documentElement);
  const original = target ? {
    light: target.classList.contains('light'), dark: target.classList.contains('dark'),
    colorScheme: target.style.getPropertyValue('color-scheme'),
    colorSchemePriority: target.style.getPropertyPriority('color-scheme'),
    material: target.getAttribute('data-floe-surface-style'),
    shell: target.getAttribute('data-floe-shell-theme'),
    features: target.getAttribute('data-floe-theme-features'),
    themeScope: target.getAttribute('data-floe-theme'),
  } : undefined;
  const originalTokens = new Map<string, { value: string; priority: string }>();
  const restoreToken = (name: string) => {
    const prior = originalTokens.get(name);
    if (prior?.value) target?.style.setProperty(name, prior.value, prior.priority);
    else target?.style.removeProperty(name);
  };
  let disposed = false;
  const storageKey = () => floe.config.theme.storageKey;
  const defaultTheme = () => floe.config.theme.defaultTheme;
  const surfaceStyleStorageKey = () => floe.config.theme.surfaceStyleStorageKey ?? `${storageKey()}-surface-style`;
  const defaultSurfaceStyle: FloeSurfaceStyle = 'soft-neumorphic';
  const storedSurfaceStyle = floe.persist.load<unknown>(surfaceStyleStorageKey(), defaultSurfaceStyle);
  if (!isFloeSurfaceStyle(storedSurfaceStyle)) {
    // A retired material (`standard`) was read as the only material above, so the
    // stale key would otherwise outlive the upgrade and be re-read forever.
    floe.persist.remove(surfaceStyleStorageKey());
  }
  const [surfaceStyle, setSurfaceStyleSignal] = createSignal<FloeSurfaceStyle>(
    isFloeSurfaceStyle(storedSurfaceStyle) ? storedSurfaceStyle : defaultSurfaceStyle
  );
  // Only one material exists, so the setter keeps the public API but has
  // nothing to store: persisting a constant would only leave stale keys behind.
  const setSurfaceStyle = (style: FloeSurfaceStyle) => {
    setSurfaceStyleSignal(isFloeSurfaceStyle(style) ? style : defaultSurfaceStyle);
  };
  // Material updates never rerun palette application or recreate the consumer tree.
  createEffect(() => applySurfaceStyleAttribute(surfaceStyle(), root));
  const themeTokens = () => floe.config.theme.tokens;
  const themePresets = () => floe.config.theme.presets ?? [];
  const presetStorageKey = () => floe.config.theme.presetStorageKey ?? `${storageKey()}-preset`;
  const defaultPresetName = () =>
    resolvePresetName(floe.config.theme.defaultPreset, themePresets());
  const shellPresets = createMemo(() => [...(floe.config.theme.shellPresets ?? []), ...(floe.config.theme.additionalShellPresets?.() ?? [])]);
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
    if (target) target.setAttribute('data-floe-theme', '');
    applyTheme(currentTheme, root);
    applyShellThemeAttribute(activeShellPreset?.name, root);
    root?.setAttribute('data-floe-theme-features', (activeShellPreset?.features ?? []).join(' '));
    const tokens = resolveThemeTokens(resolved, themeTokens(), activeShellPreset?.tokens, themePreset()?.tokens);
    if (target) {
      for (const name of Object.keys(tokens)) {
        if (!originalTokens.has(name)) originalTokens.set(name, {
          value: target.style.getPropertyValue(name), priority: target.style.getPropertyPriority(name),
        });
      }
    }
    const previousNames = appliedTokenNames;
    appliedTokenNames = syncThemeTokenOverrides(
      tokens, previousNames, root
    );
    if (target) for (const name of previousNames) if (!appliedTokenNames.includes(name)) restoreToken(name);
    // Resolve only palette transitions before the next paint. Functional motion
    // (including an in-flight drawer, switch, or exit) retains its own timeline.
    if (root) {
      queueMicrotask(() => {
        if (disposed) return;
        const finished = new Set<Animation>();
        // Finishing an inherited color can start a descendant's own transition.
        // Resolve that finite cascade in this same paint, once per animation.
        for (;;) {
          const pending = (root.getAnimations?.({ subtree: true }) ?? [])
            .filter((animation) => !finished.has(animation) &&
              'transitionProperty' in animation &&
              /(^|-)color$|^(fill|stroke|box-shadow)$/.test(String(animation.transitionProperty)));
          if (pending.length === 0) break;
          for (const animation of pending) {
            finished.add(animation);
            animation.finish();
          }
        }
      });
    }
  });

  onCleanup(() => {
    disposed = true;
    applySurfaceStyleAttribute(undefined, root);
    applyShellThemeAttribute(undefined, root);
    root?.removeAttribute('data-floe-theme-features');
    appliedTokenNames = syncThemeTokenOverrides(undefined, appliedTokenNames, root);
    if (target && original) {
      target.classList.toggle('light', original.light);
      target.classList.toggle('dark', original.dark);
      if (original.colorScheme) target.style.setProperty('color-scheme', original.colorScheme, original.colorSchemePriority);
      else target.style.removeProperty('color-scheme');
      for (const [name, value] of [['data-floe-surface-style', original.material], ['data-floe-shell-theme', original.shell], ['data-floe-theme-features', original.features], ['data-floe-theme', original.themeScope]] as const) {
        if (value === null) target.removeAttribute(name);
        else target.setAttribute(name, value);
      }
      for (const name of originalTokens.keys()) restoreToken(name);
    }
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
    surfaceStyle,
    setSurfaceStyle,
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

const themeContext = createSimpleContext<ThemeContextValue>({
  name: 'Theme',
  init: createThemeService,
});

export const useTheme = themeContext.use;

export function ThemeProvider(props: { children: JSX.Element; /** Stable owned element; omitted uses the document root. */ target?: HTMLElement }) {
  const value = createThemeService(untrack(() => props.target));
  return <themeContext.Context.Provider value={value}>{props.children}</themeContext.Context.Provider>;
}
