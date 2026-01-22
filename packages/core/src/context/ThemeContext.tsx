import { createSignal, createEffect, onCleanup, type Accessor } from 'solid-js';
import { createSimpleContext } from './createSimpleContext';
import { useResolvedFloeConfig } from './FloeConfigContext';
import { applyTheme, getSystemTheme, type ThemeType } from '../styles/themes';

export interface ThemeContextValue {
  theme: Accessor<ThemeType>;
  resolvedTheme: Accessor<'light' | 'dark'>;
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
}

export function createThemeService(): ThemeContextValue {
  const floe = useResolvedFloeConfig();
  const storageKey = () => floe.config.theme.storageKey;
  const defaultTheme = () => floe.config.theme.defaultTheme;

  const storedTheme = floe.persist.load<ThemeType>(storageKey(), defaultTheme());
  const [theme, setThemeSignal] = createSignal<ThemeType>(storedTheme);
  const [systemTheme, setSystemTheme] = createSignal<'light' | 'dark'>(getSystemTheme());

  // Resolved theme (actual light/dark value)
  const resolvedTheme = (): 'light' | 'dark' => {
    const current = theme();
    if (current === 'system') {
      return systemTheme();
    }
    return current;
  };

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
    applyTheme(theme());
  });

  const setTheme = (newTheme: ThemeType) => {
    setThemeSignal(newTheme);
    floe.persist.debouncedSave(storageKey(), newTheme);
  };

  const toggleTheme = () => {
    const current = resolvedTheme();
    setTheme(current === 'light' ? 'dark' : 'light');
  };

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
  };
}

export const { Provider: ThemeProvider, use: useTheme } = createSimpleContext<ThemeContextValue>({
  name: 'Theme',
  init: createThemeService,
});
