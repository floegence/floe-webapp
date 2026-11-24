import { builtInShellThemePresets } from './presets.ts';
import type { FloeThemePreset, FloeThemeTokenMap } from './index';

export interface FloeThemeDocument {
  version: 1;
  name: string;
  base: string;
  colors: Record<string, string>;
  editor?: Record<string, string>;
  syntax?: Record<string, string>;
}

export const FLOE_THEME_FILE_LIMIT = 32 * 1024;
const bases: ReadonlyMap<string, FloeThemePreset> = new Map(builtInShellThemePresets.map(preset => [preset.name, preset]));
const hex = /^#[0-9a-f]{6}$/i;
const hexAlpha = /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i;
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);

function colorMap(value: unknown, keys: readonly string[], pattern: RegExp): Record<string, string> {
  if (!record(value)) throw new Error('colors');
  return Object.fromEntries(Object.entries(value).map(([key, color]) => {
    if (!keys.includes(key) || typeof color !== 'string' || !pattern.test(color)) throw new Error(`colors: ${key.slice(0, 80)}`);
    return [key, color.toLowerCase()];
  }));
}

function luminance(hexColor: string) {
  const channels = [1, 3, 5].map(offset => Number.parseInt(hexColor.slice(offset, offset + 2), 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function floeThemeContrastIssue(doc: FloeThemeDocument): string | undefined {
  const tokens: FloeThemeTokenMap = { ...bases.get(doc.base)?.semanticTokens, ...doc.colors };
  for (const [surface, ink] of [['--background', '--foreground'], ['--primary', '--primary-foreground'], ['--card', '--card-foreground'], ['--sidebar', '--sidebar-foreground']]) {
    if (!doc.colors[surface] && !doc.colors[ink]) continue;
    const first = luminance(tokens[surface as `--${string}`]!), second = luminance(tokens[ink as `--${string}`]!);
    const ratio = (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
    if (ratio < 4.5) return `${ink} / ${surface}: ${ratio.toFixed(2)}:1 < 4.5:1`;
  }
}

export function readFloeThemeDocument(input: unknown): FloeThemeDocument {
  if (typeof input === 'string' && (input.length > FLOE_THEME_FILE_LIMIT || new TextEncoder().encode(input).length > FLOE_THEME_FILE_LIMIT)) throw new Error('32 KiB');
  const value: unknown = typeof input === 'string' ? JSON.parse(input) : input;
  if (!record(value) || value.version !== 1 || Object.keys(value).some(key => !['version', 'name', 'base', 'colors', 'editor', 'syntax'].includes(key))) throw new Error('version');
  if (typeof value.name !== 'string' || !value.name.trim() || value.name.length > 80 || /[\p{Cc}\p{Cf}]/u.test(value.name)) throw new Error('name');
  const base = typeof value.base === 'string' && bases.get(value.base);
  if (!base || (base.mode !== 'light' && base.mode !== 'dark')) throw new Error('base');
  const editor = base.monaco?.[base.mode];
  const colors = colorMap(value.colors, Object.keys(base.semanticTokens ?? {}).filter(key => !key.includes('shadow')), hex);
  return { version: 1, name: value.name.trim(), base: base.name, colors,
    ...(value.editor === undefined ? {} : { editor: colorMap(value.editor, Object.keys(editor?.colors ?? {}), hexAlpha) }),
    ...(value.syntax === undefined ? {} : { syntax: colorMap(value.syntax, editor?.rules.map(rule => rule.token) ?? [], hex) }),
  };
}

export function resolveFloeThemeDocument(id: string, input: FloeThemeDocument): FloeThemePreset {
  const doc = readFloeThemeDocument(input);
  const base = bases.get(doc.base)!;
  const mode = base.mode as 'light' | 'dark';
  const tokens: FloeThemeTokenMap = { ...base.semanticTokens, ...doc.colors };
  const token = (key: string) => tokens[`--${key}`]!;
  const editor = base.monaco![mode]!;
  const colors = { ...editor.colors };
  for (const [key, role] of Object.entries({ 'editor.background': '--background', 'editorGutter.background': '--background', 'editor.foreground': '--foreground', 'editorCursor.foreground': '--primary', 'editor.selectionBackground': '--selection-bg', 'editor.selectionForeground': '--selection-fg' })) {
    if (doc.colors[role]) colors[key] = doc.colors[role];
  }
  return { name: id, displayName: doc.name, mode, semanticTokens: tokens, tokens: { [mode]: tokens },
    preview: { background: token('background'), surface: token('card'), sidebar: token('sidebar'), primary: token('primary'), border: token('border'),
      colors: [token('chart-1'), token('chart-2'), token('chart-3'), token('chart-4'), token('chart-5')] },
    monaco: { [mode]: { ...editor, colors: { ...colors, ...doc.editor }, rules: editor.rules.map(rule => ({ ...rule, foreground: doc.syntax?.[rule.token] ?? rule.foreground })) } },
  };
}
