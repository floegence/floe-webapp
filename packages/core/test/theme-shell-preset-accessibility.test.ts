import { describe, expect, it } from 'vitest';
import { builtInShellThemePresets } from '../src/styles/themes';

type Rgb = readonly [number, number, number];

function parseHex(value: string): Rgb {
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  if (!match) throw new Error(`Unsupported shell theme color: ${value}`);
  return [0, 2, 4].map((offset) =>
    Number.parseInt(match[1].slice(offset, offset + 2), 16)
  ) as unknown as Rgb;
}

function channelToLinear(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

function contrastRatio(first: string, second: string): number {
  const luminance = ([red, green, blue]: Rgb) =>
    0.2126 * channelToLinear(red) +
    0.7152 * channelToLinear(green) +
    0.0722 * channelToLinear(blue);
  const firstLuminance = luminance(parseHex(first));
  const secondLuminance = luminance(parseHex(second));
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('shell theme accessibility', () => {
  it('keeps text, controls, statuses, selections, and charts readable in every preset', () => {
    for (const preset of builtInShellThemePresets) {
      const mode = preset.mode === 'dark' ? 'dark' : 'light';
      const monacoTheme = preset.monaco?.[mode];
      if (!monacoTheme) throw new Error(`Missing Monaco theme for ${preset.name}`);
      expect(
        contrastRatio(
          monacoTheme.colors['editor.foreground'],
          monacoTheme.colors['editor.background']
        ),
        `${preset.name}:editor-foreground`
      ).toBeGreaterThanOrEqual(4.5);
      for (const rule of monacoTheme.rules) {
        expect(
          contrastRatio(rule.foreground, monacoTheme.colors['editor.background']),
          `${preset.name}:monaco:${rule.token}`
        ).toBeGreaterThanOrEqual(3);
      }

      if (preset.inheritsBaseTokens) continue;
      const tokens = preset.tokens?.[mode];
      if (!tokens) throw new Error(`Missing ${mode} tokens for ${preset.name}`);
      const color = (name: `--${string}`) => {
        const value = tokens[name];
        if (!value) throw new Error(`${preset.name} is missing ${name}`);
        return value;
      };

      expect(
        contrastRatio(color('--foreground'), color('--background')),
        preset.name
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(color('--card-foreground'), color('--card')),
        preset.name
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(color('--muted-foreground'), color('--background')),
        preset.name
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(color('--primary-foreground'), color('--primary')),
        preset.name
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(color('--input'), color('--background')),
        preset.name
      ).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(color('--input'), color('--card')), preset.name).toBeGreaterThanOrEqual(
        3
      );
      expect(
        contrastRatio(color('--terminal-foreground'), color('--terminal-background')),
        preset.name
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(color('--selection-fg'), color('--selection-bg')),
        preset.name
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(color('--selection-on-primary-bg'), color('--primary')),
        preset.name
      ).toBeGreaterThanOrEqual(3);
      expect(
        contrastRatio(color('--selection-on-primary-fg'), color('--selection-on-primary-bg')),
        preset.name
      ).toBeGreaterThanOrEqual(4.5);

      for (const status of ['success', 'warning', 'error', 'info'] as const) {
        expect(
          contrastRatio(color(`--${status}`), color(`--${status}-foreground`)),
          `${preset.name}:${status}`
        ).toBeGreaterThanOrEqual(4.5);
      }

      for (const index of [1, 2, 3, 4, 5] as const) {
        expect(
          contrastRatio(color(`--chart-${index}`), color('--background')),
          `${preset.name}:chart-${index}`
        ).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
