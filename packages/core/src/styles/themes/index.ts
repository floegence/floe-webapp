export type ThemeType = 'light' | 'dark' | 'system';
export type FloeThemePresetMode = 'light' | 'dark' | 'both';
export type FloeThemeTokenMap = Partial<Record<`--${string}`, string>>;

export interface FloeMonacoTokenRule {
  token: string;
  foreground: string;
  fontStyle?: string;
}

export interface FloeMonacoThemeDefinition {
  base: 'vs' | 'vs-dark';
  inherit: boolean;
  rules: readonly FloeMonacoTokenRule[];
  colors: Readonly<Record<string, string>>;
}

export interface FloeThemeTokenOverrides {
  shared?: FloeThemeTokenMap;
  light?: FloeThemeTokenMap;
  dark?: FloeThemeTokenMap;
}

export interface FloeThemePreset {
  name: string;
  displayName: string;
  description?: string;
  mode?: FloeThemePresetMode;
  /** Uses the base light.css/dark.css tokens without shell-level overrides. */
  inheritsBaseTokens?: boolean;
  preview?: {
    background: string;
    surface: string;
    primary: string;
    sidebar?: string;
    border?: string;
    colors: readonly [string, string, string, string, string];
  };
  /**
   * Complete resolved shell tokens for non-renderer adapters such as Electron's main process.
   * Unlike `tokens`, this also contains the inherited Classic baseline without applying it as
   * an inline renderer override.
   */
  semanticTokens?: Readonly<FloeThemeTokenMap>;
  /** Optional Monaco definitions keyed by resolved light/dark mode. */
  monaco?: Partial<Record<'light' | 'dark', FloeMonacoThemeDefinition>>;
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
  setAttribute?: (qualifiedName: string, value: string) => void;
  removeAttribute?: (qualifiedName: string) => void;
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

export function isThemeType(value: unknown): value is ThemeType {
  return value === 'light' || value === 'dark' || value === 'system';
}

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

export function mergeThemeTokenMaps(
  ...maps: Array<FloeThemeTokenMap | undefined>
): FloeThemeTokenMap {
  return Object.assign({}, ...maps.filter(Boolean));
}

export function resolveThemeTokens(
  resolvedTheme: 'light' | 'dark',
  ...tokenSources: Array<FloeThemeTokenOverrides | undefined>
): FloeThemeTokenMap {
  return mergeThemeTokenMaps(
    ...tokenSources.map((tokens) => resolveThemeTokenOverrides(tokens, resolvedTheme))
  );
}

export function applyTheme(theme: ThemeType, target?: ThemeTarget): void {
  const root = resolveThemeTarget(target);
  if (!root) return;

  const resolved = theme === 'system' ? getSystemTheme() : theme;

  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
}

export function applyShellThemeAttribute(
  presetName: string | undefined,
  target?: ThemeTarget
): void {
  const root = resolveThemeTarget(target);
  if (!root) return;

  if (presetName) {
    root.setAttribute?.('data-floe-shell-theme', presetName);
  } else {
    root.removeAttribute?.('data-floe-shell-theme');
  }
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

export * from './presets';
