import { describe, expect, it } from 'vitest';
import { builtInShellThemePresets } from '../src/styles/themes/presets';

const preset = builtInShellThemePresets.find(theme => theme.name === 'porcelain-light')!;
function contrast(first: string, second: string): number {
  const luminance = (hex: string) => [1, 3, 5].map(offset => {
    const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  const values = [luminance(first), luminance(second)];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
}

describe('Porcelain Light reading and interaction palette', () => {
  it('keeps broad surfaces achromatic and matches renderer, thumbnail and editor roles', () => {
    const tokens = preset.semanticTokens!;
    for (const role of ['background', 'foreground', 'card', 'sidebar', 'muted', 'primary', 'accent', 'border']) {
      const color = tokens['--' + role]!;
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(color.slice(1, 3), role).toBe(color.slice(3, 5));
      expect(color.slice(3, 5), role).toBe(color.slice(5, 7));
    }
    expect(tokens['--background']).toBe('#FAFAFA');
    expect(tokens['--card']).toBe('#FFFFFF');
    expect(preset.tokens?.light).toEqual(tokens);
    expect(preset.preview?.background).toBe(tokens['--background']);
    expect(preset.preview?.surface).toBe(tokens['--card']);
    expect(preset.preview?.primary).toBe(tokens['--primary']);
    expect(preset.monaco?.light?.colors['editor.background']).toBe(tokens['--background']);
    expect(tokens['--floe-workbench-canvas']).toBe(tokens['--muted']);
  });

  it('keeps secondary ink readable and essential controls distinct on every porcelain surface', () => {
    const tokens = preset.semanticTokens!;
    for (const role of ['--background', '--card', '--sidebar', '--muted', '--accent', '--floe-well']) {
      for (const ink of ['--muted-foreground', '--floe-field-placeholder', '--floe-ink-quiet', '--floe-ink-ghost']) {
        expect(contrast(tokens[ink]!, tokens[role]!), ink + '/' + role).toBeGreaterThanOrEqual(4.5);
      }
      for (const ink of ['--floe-control-edge', '--ring']) {
        expect(contrast(tokens[ink]!, tokens[role]!), ink + '/' + role).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('keeps syntax legible in inactive selections and search results', () => {
    const editor = preset.monaco!.light!;
    expect(editor.rules.some(rule => rule.token === 'attribute.name')).toBe(true);
    for (const surface of ['editor.background', 'editor.lineHighlightBackground', 'editor.inactiveSelectionBackground', 'editor.selectionHighlightBackground', 'editor.findMatchBackground', 'editor.findMatchHighlightBackground']) {
      for (const rule of editor.rules) expect(contrast(rule.foreground, editor.colors[surface]), rule.token + '/' + surface).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(editor.colors['editor.selectionForeground'], editor.colors['editor.selectionBackground'])).toBeGreaterThanOrEqual(4.5);
  });
});
