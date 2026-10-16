import { describe, expect, it } from 'vitest';
import { builtInShellThemePresets } from '../src/styles/themes/presets';

function luminance(hex: string): number {
  expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
  return [1, 3, 5].map(offset => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrast(a: string, b: string): number {
  const values = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (values[1] + 0.05) / (values[0] + 0.05);
}

function hueAndSaturation(hex: string): { hue: number; saturation: number } {
  const [red, green, blue] = [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const maximum = Math.max(red, green, blue), minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  if (delta === 0) return { hue: 0, saturation: 0 };
  const sector = maximum === red ? (green - blue) / delta
    : maximum === green ? (blue - red) / delta + 2 : (red - green) / delta + 4;
  return { hue: (sector * 60 + 360) % 360, saturation: delta / (1 - Math.abs(maximum + minimum - 1)) };
}

describe('inline code theme palette', () => {
  it.each(builtInShellThemePresets)('$name pairs readable text with a quiet theme-specific fill', preset => {
    const tokens = preset.semanticTokens!;
    const foreground = tokens['--inline-code-foreground']!;
    const background = tokens['--inline-code-background']!;
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(preset.name === 'hc-light' ? 7 : 4.5);
    expect(contrast(background, tokens['--background']!)).toBeLessThan(1.2);
    if (!preset.inheritsBaseTokens) {
      expect(preset.tokens?.[preset.mode === 'dark' ? 'dark' : 'light']?.['--inline-code-foreground']).toBe(foreground);
      expect(preset.tokens?.[preset.mode === 'dark' ? 'dark' : 'light']?.['--inline-code-background']).toBe(background);
    }
  });

  it.each(builtInShellThemePresets)('$name emphasizes references with a saturated nonpurple foreground', preset => {
    const { hue, saturation } = hueAndSaturation(preset.semanticTokens!['--inline-code-foreground']!);
    expect(saturation).toBeGreaterThanOrEqual(0.55);
    expect(hue < 245 || hue > 330).toBe(true);
  });

  it('assigns a distinct pair to every built-in palette', () => {
    const pairs = builtInShellThemePresets.map(preset => {
      const tokens = preset.semanticTokens!;
      return [tokens['--inline-code-foreground'], tokens['--inline-code-background']].join('/');
    });
    expect(new Set(pairs).size).toBe(builtInShellThemePresets.length);
  });
});
