import type {
  FloeMonacoThemeDefinition,
  FloeMonacoTokenRule,
  FloeThemePreset,
} from '../../styles/themes';

export interface MonacoThemeData {
  base: 'vs' | 'vs-dark';
  inherit: boolean;
  rules: FloeMonacoTokenRule[];
  colors: Record<string, string>;
}

export interface MonacoThemeRegistry {
  defineTheme: (themeName: string, themeData: MonacoThemeData) => void;
  setTheme: (themeName: string) => void;
}

export interface ResolvedFloeMonacoTheme {
  name: string;
  definition?: FloeMonacoThemeDefinition;
}

export function resolveFloeMonacoTheme(
  mode: 'light' | 'dark',
  preset?: FloeThemePreset
): ResolvedFloeMonacoTheme {
  const definition = preset?.monaco?.[mode];
  if (!definition) {
    return { name: mode === 'dark' ? 'vs-dark' : 'vs' };
  }

  return {
    name: `floe-shell-${mode}-${preset.name}`,
    definition,
  };
}

export function applyFloeMonacoTheme(
  registry: MonacoThemeRegistry,
  mode: 'light' | 'dark',
  preset?: FloeThemePreset
): string {
  const resolved = resolveFloeMonacoTheme(mode, preset);

  if (resolved.definition) {
    const themeData: MonacoThemeData = {
      ...resolved.definition,
      rules: resolved.definition.rules.map((rule) => ({ ...rule })),
      colors: { ...resolved.definition.colors },
    };
    registry.defineTheme(resolved.name, themeData);
  }

  registry.setTheme(resolved.name);
  return resolved.name;
}
