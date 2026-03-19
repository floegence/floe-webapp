export type ThemeType = 'light' | 'dark' | 'system';
export type FloeThemeTokenMap = Partial<Record<`--${string}`, string>>;

export interface FloeThemeTokenOverrides {
  shared?: FloeThemeTokenMap;
  light?: FloeThemeTokenMap;
  dark?: FloeThemeTokenMap;
}

export interface FloeThemePreset {
  name: string;
  displayName: string;
  description?: string;
  tokens?: FloeThemeTokenOverrides;
}

export interface ThemeTarget {
  classList: {
    add: (...tokens: string[]) => void;
    remove: (...tokens: string[]) => void;
  };
  style: {
    colorScheme?: string;
    setProperty: (property: string, value: string) => void;
    removeProperty: (property: string) => void;
  };
}

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

function resolveThemeTarget(target?: ThemeTarget): ThemeTarget | undefined {
  if (target) return target;
  if (typeof document === 'undefined') return undefined;
  return document.documentElement as ThemeTarget;
}

export function resolveThemeTokenOverrides(
  tokens: FloeThemeTokenOverrides | undefined,
  resolvedTheme: 'light' | 'dark'
): FloeThemeTokenMap {
  return {
    ...(tokens?.shared ?? {}),
    ...(resolvedTheme === 'light' ? (tokens?.light ?? {}) : (tokens?.dark ?? {})),
  };
}

export function mergeThemeTokenMaps(...maps: Array<FloeThemeTokenMap | undefined>): FloeThemeTokenMap {
  return Object.assign({}, ...maps.filter(Boolean));
}

export function resolveThemeTokens(
  resolvedTheme: 'light' | 'dark',
  ...tokenSources: Array<FloeThemeTokenOverrides | undefined>
): FloeThemeTokenMap {
  return mergeThemeTokenMaps(...tokenSources.map((tokens) => resolveThemeTokenOverrides(tokens, resolvedTheme)));
}

export function applyTheme(theme: ThemeType, target?: ThemeTarget): void {
  const root = resolveThemeTarget(target);
  if (!root) return;

  const resolved = theme === 'system' ? getSystemTheme() : theme;

  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
}

export function syncThemeTokenOverrides(
  tokens: FloeThemeTokenMap | undefined,
  previousTokenNames: Iterable<string> = [],
  target?: ThemeTarget
): string[] {
  const root = resolveThemeTarget(target);
  if (!root) return [];

  const nextEntries = Object.entries(tokens ?? {}).filter((entry): entry is [string, string] => {
    const [, value] = entry;
    return typeof value === 'string' && value.length > 0;
  });
  const nextTokenNames = new Set(nextEntries.map(([name]) => name));

  for (const tokenName of previousTokenNames) {
    if (!nextTokenNames.has(tokenName)) {
      root.style.removeProperty(tokenName);
    }
  }

  for (const [tokenName, value] of nextEntries) {
    root.style.setProperty(tokenName, value);
  }

  return [...nextTokenNames];
}
