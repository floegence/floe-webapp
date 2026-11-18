import { builtInShellThemePresets, REQUIRED_SHELL_THEME_TOKENS } from './presets.ts';
import { readFloeThemeDocument, resolveFloeThemeDocument } from './themeDocument.ts';
import type { FloeMonacoTokenRule, FloeThemePreset, FloeThemeTokenMap } from './index';

type Strings = Record<string, string>;
export interface ThemeShadowLayer {
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
}
export interface PortableShellTheme {
  version: 2;
  name: string;
  mode: 'light' | 'dark';
  features: string[];
  palette: Strings;
  colors: Strings;
  shadow: ThemeShadowLayer[];
  editor: Strings;
  terminal?: Strings;
  parts?: Strings;
  syntax: FloeMonacoTokenRule[];
}

export const PORTABLE_THEME_LIMIT = 128 * 1024;
const shadowKey = '--floe-window-shadow';
export const shellColorRoles = [
  ...new Set(
    builtInShellThemePresets.flatMap((preset) => Object.keys(preset.semanticTokens ?? {}))
  ),
]
  .filter((key) => key !== shadowKey)
  .sort();
const roleSet = new Set(shellColorRoles);
export const terminalThemeRoles = [
  'background',
  'foreground',
  'cursor',
  'cursorAccent',
  'selectionBackground',
  'selectionForeground',
  ...['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'].flatMap((key) => [
    key,
    `bright${key[0]!.toUpperCase()}${key.slice(1)}`,
  ]),
];
const literalRoles = new Set([
  '--background',
  '--foreground',
  '--primary',
  '--primary-foreground',
  '--card',
  '--card-foreground',
  '--sidebar',
  '--sidebar-foreground',
  '--border',
  '--muted',
  '--muted-foreground',
  '--success',
  '--warning',
  '--error',
  '--info',
]);
const required = REQUIRED_SHELL_THEME_TOKENS.filter((key) => key !== shadowKey);
const percentage = /^(?:100(?:\.0+)?|\d{1,2}(?:\.\d+)?)%$/;
const hex = /^#[a-f\d]{6}(?:[a-f\d]{2})?$/i;
const rgb = /^rgb\((?:\d{1,3} ){2}\d{1,3}(?: \/ (?:100|\d{1,2})%)?\)$/;
const functional =
  /^(?:hsl\(\d{1,3} \d{1,3}% \d{1,3}%\)|oklch\((?:0(?:\.\d+)?|1) 0(?:\.\d+)? \d{1,3}\))$/;
const reference = /^var\((--[a-z0-9-]+)\)$/;
const mix =
  /^color-mix\(in srgb, (var\(--[a-z0-9-]+\)|#[a-fA-F0-9]{6}) (\d{1,3}%), (var\(--[a-z0-9-]+\)|white|#[a-fA-F0-9]{6})\)$/;
const fail = (path: string): never => {
  throw new Error(path);
};
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const keysOnly = (value: Record<string, unknown>, keys: string[], path: string) => {
  for (const key of Object.keys(value))
    if (!keys.includes(key)) fail(`${path}.${key.slice(0, 80)}`);
};
const length = (value: number) => (value === 0 ? '0' : `${value}px`);
function decodeShadow(value: string): ThemeShadowLayer[] {
  if (value === 'none') return [];
  return value.split(', ').map((layer) => {
    const match = /^(-?\d+)(?:px)? (-?\d+)(?:px)? (\d+)(?:px)?(?: (-?\d+)(?:px)?)? (.+)$/.exec(
      layer
    );
    if (!match) return fail(shadowKey);
    return {
      x: +match[1]!,
      y: +match[2]!,
      blur: +match[3]!,
      spread: Number(match[4] ?? 0),
      color: match[5]!,
    };
  });
}

const documents = new WeakMap<FloeThemePreset, PortableShellTheme>();
export function exportShellTheme(preset: FloeThemePreset): PortableShellTheme {
  const source = documents.get(preset);
  if (source) return structuredClone(source);
  const mode = preset.mode;
  if (mode !== 'light' && mode !== 'dark') return fail('mode');
  const editor = preset.monaco?.[mode];
  if (!editor) return fail('editor');
  const colors: Strings = Object.fromEntries(
    Object.entries(preset.semanticTokens ?? {}).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string'
    )
  );
  const shadow = decodeShadow(colors[shadowKey] ?? 'none');
  delete colors[shadowKey];
  const editorColors = { ...editor.colors };
  for (const [key, role] of Object.entries({
    'editor.background': 'background',
    'editorGutter.background': 'background',
    'editor.foreground': 'foreground',
    'editorCursor.foreground': 'primary',
    'editor.selectionBackground': 'selection-bg',
    'editor.selectionForeground': 'selection-fg',
  })) {
    if (editorColors[key] === colors[`--${role}`]) editorColors[key] = `@${role}`;
  }
  return {
    version: 2,
    name: preset.displayName,
    mode,
    features: [...(preset.features ?? [])],
    palette: {},
    colors,
    shadow,
    editor: editorColors,
    syntax: editor.rules.map((rule) => ({ ...rule })),
  };
}

function strings(
  input: unknown,
  path: string,
  keyAllowed: (key: string) => boolean,
  limit: number
): Strings {
  if (!record(input) || Object.keys(input).length > limit) return fail(path);
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => {
      if (!keyAllowed(key) || typeof value !== 'string' || value.length > 256)
        return fail(`${path}.${key.slice(0, 80)}`);
      return [key, value];
    })
  );
}

function project(doc: PortableShellTheme) {
  const memo = new Map<string, string>();
  const pending = new Set<string>();
  const resolve = (value: string, path: string): string => {
    if (!value.startsWith('$') && !value.startsWith('@')) return value;
    const prior = memo.get(value);
    if (prior !== undefined) return prior;
    const source = value.startsWith('$') ? doc.palette : doc.colors;
    const key = (value.startsWith('@') ? '--' : '') + value.slice(1);
    if (!Object.hasOwn(source, key) || pending.has(value)) return fail(`${path}: ${value}`);
    pending.add(value);
    const result = resolve(source[key]!, path);
    pending.delete(value);
    memo.set(value, result);
    return result;
  };
  const color = (value: string, path: string, allowRecipe: boolean) => {
    const result = resolve(value, path);
    if (hex.test(result)) return result;
    if (
      allowRecipe &&
      (rgb.test(result) || functional.test(result) || reference.test(result) || mix.test(result))
    )
      return result;
    return fail(path);
  };
  for (const [key, value] of Object.entries(doc.palette)) color(value, `palette.${key}`, false);
  const tokens: Strings = Object.fromEntries(
    Object.entries(doc.colors).map(([key, value]) => [
      key,
      key === '--floe-progress-primary-white-mix'
        ? percentage.test(value)
          ? value
          : fail(key)
        : color(value, `colors.${key}`, !literalRoles.has(key)),
    ])
  );
  for (const [key, value] of Object.entries(doc.terminal ?? {}))
    tokens[`--terminal-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`] = color(
      value,
      `terminal.${key}`,
      false
    );
  for (const [key, value] of Object.entries(doc.parts ?? {}))
    tokens[`--theme-part-${key}`] = color(value, `parts.${key}`, false);
  // CSS recipes retain their links in the renderer, but must form a closed acyclic graph.
  const done = new Set<string>();
  const visit = (key: string) => {
    if (done.has(key)) return;
    if (pending.has(key) || !Object.hasOwn(tokens, key)) fail(`colors.${key}`);
    pending.add(key);
    for (const match of tokens[key]!.matchAll(/var\((--[a-z0-9-]+)\)/g)) visit(match[1]!);
    pending.delete(key);
    done.add(key);
  };
  for (const key of Object.keys(tokens)) visit(key);
  tokens[shadowKey] =
    doc.shadow
      .map(({ x, y, blur, spread, color: ink }, index) => {
        const paint = resolve(ink, `shadow.${index}.color`);
        if (!hex.test(paint) && !rgb.test(paint)) fail(`shadow.${index}.color`);
        return [
          length(x),
          length(y),
          length(blur),
          ...(spread ? [length(spread)] : []),
          paint,
        ].join(' ');
      })
      .join(', ') || 'none';
  const editor = Object.fromEntries(
    Object.entries(doc.editor).map(([key, value]) => [key, color(value, `editor.${key}`, false)])
  );
  const syntax = doc.syntax.map((rule, index) => {
    const foreground = color(rule.foreground, `syntax.${index}.foreground`, false);
    if (foreground.length !== 7) fail(`syntax.${index}.foreground`);
    return { ...rule, foreground };
  });
  return { tokens, editor, syntax };
}

export function readPortableShellTheme(source: unknown): PortableShellTheme {
  if (
    typeof source === 'string' &&
    (source.length > PORTABLE_THEME_LIMIT ||
      new TextEncoder().encode(source).length > PORTABLE_THEME_LIMIT)
  )
    fail('128 KiB');
  const input: unknown = typeof source === 'string' ? JSON.parse(source) : source;
  if (!record(input)) return fail('theme');
  if (input.version === 1)
    return exportShellTheme(resolveFloeThemeDocument('migration', readFloeThemeDocument(input)));
  keysOnly(
    input,
    [
      'version',
      'name',
      'mode',
      'features',
      'palette',
      'colors',
      'shadow',
      'editor',
      'syntax',
      'terminal',
      'parts',
    ],
    'theme'
  );
  if (input.version !== 2) return fail('version');
  if (
    typeof input.name !== 'string' ||
    !input.name.trim() ||
    input.name.length > 80 ||
    /[\p{Cc}\p{Cf}]/u.test(input.name)
  )
    return fail('name');
  if (input.mode !== 'light' && input.mode !== 'dark') return fail('mode');
  if (
    !Array.isArray(input.features) ||
    input.features.length > 32 ||
    input.features.some(
      (value) => typeof value !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(value)
    ) ||
    new Set(input.features).size !== input.features.length
  )
    return fail('features');
  const palette = strings(
    input.palette,
    'palette',
    (key) => /^[a-z][a-z0-9-]{0,63}$/.test(key),
    256
  );
  const colors = strings(input.colors, 'colors', (key) => roleSet.has(key), roleSet.size);
  for (const key of required) if (!Object.hasOwn(colors, key)) fail(`colors.${key}`);
  if (!Array.isArray(input.shadow) || input.shadow.length > 8) return fail('shadow');
  const shadow = input.shadow.map((layer, index): ThemeShadowLayer => {
    if (!record(layer)) return fail(`shadow.${index}`);
    keysOnly(layer, ['x', 'y', 'blur', 'spread', 'color'], `shadow.${index}`);
    for (const key of ['x', 'y', 'blur', 'spread']) {
      const value = layer[key];
      if (
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        Math.abs(value) > 256 ||
        (key === 'blur' && value < 0)
      )
        fail(`shadow.${index}.${key}`);
    }
    if (typeof layer.color !== 'string' || layer.color.length > 100)
      return fail(`shadow.${index}.color`);
    return {
      x: Number(layer.x),
      y: Number(layer.y),
      blur: Number(layer.blur),
      spread: Number(layer.spread),
      color: layer.color,
    };
  });
  const editor = strings(
    input.editor,
    'editor',
    (key) => /^[a-zA-Z][\w-]{0,79}(?:\.[\w-]{1,80}){1,5}$/.test(key),
    512
  );
  const terminal =
    input.terminal === undefined
      ? undefined
      : strings(
          input.terminal,
          'terminal',
          (key) => terminalThemeRoles.includes(key),
          terminalThemeRoles.length
        );
  const parts =
    input.parts === undefined
      ? undefined
      : strings(input.parts, 'parts', (key) => /^[a-z][a-z0-9-]{0,79}$/.test(key), 256);
  if (!Array.isArray(input.syntax) || input.syntax.length > 512) return fail('syntax');
  const syntax = input.syntax.map((rule, index): FloeMonacoTokenRule => {
    if (
      !record(rule) ||
      typeof rule.token !== 'string' ||
      !/^[\w.-]{0,128}$/.test(rule.token) ||
      typeof rule.foreground !== 'string' ||
      rule.foreground.length > 128
    )
      return fail(`syntax.${index}`);
    keysOnly(rule, ['token', 'foreground', 'fontStyle'], `syntax.${index}`);
    if (
      rule.fontStyle !== undefined &&
      (typeof rule.fontStyle !== 'string' ||
        !/^(?:(?:bold|italic|underline|strikethrough)(?: |$)){0,4}$/.test(rule.fontStyle))
    )
      return fail(`syntax.${index}.fontStyle`);
    return {
      token: rule.token,
      foreground: rule.foreground,
      ...(typeof rule.fontStyle === 'string' ? { fontStyle: rule.fontStyle } : {}),
    };
  });
  const doc: PortableShellTheme = {
    version: 2,
    name: input.name.trim(),
    mode: input.mode,
    features: [...input.features],
    palette,
    colors,
    shadow,
    editor,
    syntax,
    ...(terminal && { terminal }),
    ...(parts && { parts }),
  };
  if (new TextEncoder().encode(JSON.stringify(doc, null, 2) + '\n').length > PORTABLE_THEME_LIMIT)
    fail('128 KiB');
  project(doc);
  return doc;
}

export function portableContrastIssue(doc: PortableShellTheme): string | undefined {
  const { tokens } = project(doc);
  const rgbOf = (text: string) =>
    [1, 3, 5, 7].map((offset, index) =>
      index === 3 && text.length === 7 ? 1 : parseInt(text.slice(offset, offset + 2), 16) / 255
    );
  const over = (top: number[], bottom: number[]) =>
    top.slice(0, 3).map((channel, index) => channel * top[3]! + bottom[index]! * (1 - top[3]!));
  const luminance = (channels: number[]) =>
    channels.reduce(
      (sum, channel, index) =>
        sum +
        [0.2126, 0.7152, 0.0722][index]! *
          (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4),
      0
    );
  const canvas = over(rgbOf(tokens['--background']!), Array(3).fill(doc.mode === 'light' ? 1 : 0));
  for (const [surface, ink] of [
    ['--background', '--foreground'],
    ['--card', '--card-foreground'],
    ['--primary', '--primary-foreground'],
    ['--sidebar', '--sidebar-foreground'],
  ] as const) {
    const background = surface === '--background' ? canvas : over(rgbOf(tokens[surface]!), canvas);
    const first = luminance(background),
      second = luminance(over(rgbOf(tokens[ink]!), background));
    const ratio = (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
    if (ratio < 4.5) return `${ink} / ${surface}: ${ratio.toFixed(2)}:1 < 4.5:1`;
  }
}

export function resolvePortableShellTheme(id: string, input: PortableShellTheme): FloeThemePreset {
  const doc = readPortableShellTheme(input);
  const { tokens, editor, syntax } = project(doc);
  const preset: FloeThemePreset = {
    name: id,
    displayName: doc.name,
    mode: doc.mode,
    features: doc.features,
    semanticTokens: tokens as FloeThemeTokenMap,
    tokens: { [doc.mode]: tokens },
    preview: {
      background: tokens['--background']!,
      surface: tokens['--card']!,
      sidebar: tokens['--sidebar']!,
      primary: tokens['--primary']!,
      border: tokens['--border']!,
      colors: [
        tokens['--chart-1']!,
        tokens['--chart-2']!,
        tokens['--chart-3']!,
        tokens['--chart-4']!,
        tokens['--chart-5']!,
      ],
    },
    monaco: {
      [doc.mode]: {
        base: doc.mode === 'light' ? 'vs' : 'vs-dark',
        inherit: true,
        colors: editor,
        rules: syntax,
      },
    },
  };
  documents.set(preset, doc);
  return preset;
}

export function createBlankShellTheme(mode: 'light'|'dark', name: string): PortableShellTheme {
  const baseline = builtInShellThemePresets.find(preset => preset.mode === mode && preset.inheritsBaseTokens)!;
  const doc = exportShellTheme(baseline);
  doc.name = name;
  for (const [role,value] of Object.entries(doc.colors)) {
    if (!hex.test(value)) continue;
    const key = role.slice(2);
    doc.palette[key] = value;
    doc.colors[role] = `$${key}`;
  }
  return doc;
}
