import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  BUILT_IN_SHELL_THEME_DEFAULTS,
  REQUIRED_SHELL_THEME_TOKENS,
  builtInShellThemePresets,
  getShellThemePresetsForMode,
  normalizeShellThemeSelection,
  resolveShellThemePresetName,
} from '../src/styles/themes';

const testDir = dirname(fileURLToPath(import.meta.url));

function readResolvedClassicTokens(mode: 'light' | 'dark'): Record<string, string | undefined> {
  const source = readFileSync(resolve(testDir, `../src/styles/themes/${mode}.css`), 'utf8');
  const tokens = Object.fromEntries(
    [...source.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gmu)]
      .map((match) => [match[1], match[2].trim()]),
  );
  const resolveValue = (name: string, seen = new Set<string>()): string | undefined => {
    const value = tokens[name];
    const reference = /^var\((--[\w-]+)\)$/u.exec(value ?? '')?.[1];
    if (!reference || seen.has(name)) return value;
    seen.add(name);
    return resolveValue(reference, seen);
  };
  return Object.fromEntries(Object.keys(tokens).map((name) => [name, resolveValue(name)]));
}

describe('built-in shell theme presets', () => {
  it('ships the original pair plus ten distinct presets for each mode', () => {
    expect(builtInShellThemePresets).toHaveLength(22);
    expect(getShellThemePresetsForMode(builtInShellThemePresets, 'light')).toHaveLength(11);
    expect(getShellThemePresetsForMode(builtInShellThemePresets, 'dark')).toHaveLength(11);
    expect(new Set(builtInShellThemePresets.map((preset) => preset.name)).size).toBe(22);

    for (const preset of builtInShellThemePresets) {
      const mode = preset.mode === 'dark' ? 'dark' : 'light';
      const tokens = preset.tokens?.[mode] ?? {};
      expect(
        REQUIRED_SHELL_THEME_TOKENS.every(
          (name) => typeof preset.semanticTokens?.[name] === 'string'
        )
      ).toBe(true);
      if (preset.inheritsBaseTokens) {
        expect(preset.tokens).toBeUndefined();
      } else {
        expect(REQUIRED_SHELL_THEME_TOKENS.every((name) => typeof tokens[name] === 'string')).toBe(
          true
        );
      }
      expect(preset.monaco?.[mode]?.base).toBe(mode === 'dark' ? 'vs-dark' : 'vs');
      expect(preset.monaco?.[mode]?.colors['editor.background']).toBe(
        preset.inheritsBaseTokens ? preset.preview?.background : tokens['--background']
      );
      if (preset.inheritsBaseTokens) {
        expect(preset.monaco?.[mode]?.colors['editor.foreground']).toBeTruthy();
      } else {
        expect(preset.monaco?.[mode]?.colors['editor.foreground']).toBe(tokens['--foreground']);
      }
    }
  });

  it('resolves invalid selections to the configured per-mode defaults', () => {
    expect(resolveShellThemePresetName(builtInShellThemePresets, 'light', 'ocean', 'paper')).toBe(
      'paper'
    );
    expect(resolveShellThemePresetName(builtInShellThemePresets, 'dark', 'ocean', 'ink')).toBe(
      'ocean'
    );
    expect(
      normalizeShellThemeSelection(
        { version: 1, light: 'unknown', dark: 'forest' },
        builtInShellThemePresets,
        BUILT_IN_SHELL_THEME_DEFAULTS
      )
    ).toEqual({ version: 1, light: 'classic-light', dark: 'forest' });
    expect(
      normalizeShellThemeSelection('paper', builtInShellThemePresets, BUILT_IN_SHELL_THEME_DEFAULTS)
    ).toEqual({ version: 1, light: 'classic-light', dark: 'classic-dark' });
  });

  it('keeps generated pre-paint CSS in sync with the catalog token names', () => {
    const css = readFileSync(
      resolve(testDir, '../src/styles/themes/shell-presets.generated.css'),
      'utf8'
    ).toLowerCase();
    const floeCss = readFileSync(resolve(testDir, '../src/styles/floe.css'), 'utf8');

    expect(css).not.toContain('@layer');
    expect(floeCss.indexOf("@import './themes/shell-presets.generated.css';")).toBeGreaterThan(
      floeCss.indexOf("@import './themes/dark.css';")
    );
    for (const preset of builtInShellThemePresets) {
      if (preset.inheritsBaseTokens) {
        expect(css).not.toContain(`[data-floe-shell-theme='${preset.name}']`);
        continue;
      }
      expect(css).toContain(`[data-floe-shell-theme='${preset.name}']`);
      for (const mode of ['light', 'dark'] as const) {
        if (preset.mode !== mode) continue;
        const tokens = preset.tokens?.[mode] ?? {};
        for (const token of REQUIRED_SHELL_THEME_TOKENS) {
          expect(css).toContain(`${token}: ${tokens[token]};`.toLowerCase());
        }
      }
    }
  });

  it('keeps Classic adapter metadata identical to the inherited renderer CSS', () => {
    for (const [name, mode] of [['classic-light', 'light'], ['classic-dark', 'dark']] as const) {
      const preset = builtInShellThemePresets.find((entry) => entry.name === name);
      const cssTokens = readResolvedClassicTokens(mode);
      expect(preset?.inheritsBaseTokens).toBe(true);
      for (const token of REQUIRED_SHELL_THEME_TOKENS) {
        expect(preset?.semanticTokens?.[token], `${name}:${token}`).toBe(cssTokens[token]);
      }
    }
  });

  it('keeps the demo pre-paint whitelist in sync with every preset', () => {
    const demoIndex = readFileSync(resolve(testDir, '../../../apps/demo/index.html'), 'utf8');

    expect(demoIndex).toContain(
      "const defaults = { light: 'classic-light', dark: 'classic-dark' }"
    );
    for (const preset of builtInShellThemePresets) {
      expect(demoIndex).toContain(`'${preset.name}'`);
    }
  });
});
