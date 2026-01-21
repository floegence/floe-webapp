export type ThemeType = 'light' | 'dark' | 'system';

export interface FloeTheme {
  name: string;
  displayName: string;
  type: 'light' | 'dark';
}

export const builtInThemes: FloeTheme[] = [
  { name: 'light', displayName: 'Light', type: 'light' },
  { name: 'dark', displayName: 'Dark', type: 'dark' },
];

export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: ThemeType): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const resolved = theme === 'system' ? getSystemTheme() : theme;

  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
}
