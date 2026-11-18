import { describe, expect, it } from 'vitest';
import {
  builtInShellThemePresets,
  exportShellTheme,
  portableContrastIssue,
  readPortableShellTheme,
  resolvePortableShellTheme,
} from '../src/themes';

describe('independent shell themes', () => {
  it.each(builtInShellThemePresets)('renders $name under a new installation identity', (preset) => {
    const file = exportShellTheme(preset);
    expect(file).not.toHaveProperty('base');
    const copy = resolvePortableShellTheme(
      'custom-copy',
      readPortableShellTheme(JSON.stringify(file))
    );
    expect(copy.semanticTokens).toEqual(preset.semanticTokens);
    expect(copy.monaco).toEqual(preset.monaco);
    expect(copy.mode).toBe(preset.mode);
    expect(portableContrastIssue(file)).toBeUndefined();
    expect(copy.features).toEqual(preset.features ?? []);
  });
  it('migrates legacy overrides without adopting visual features absent in v1', () => {
    const file = readPortableShellTheme({
      version: 1,
      base: 'hc-light',
      name: 'Owned',
      colors: { '--primary': '#006248' },
    });
    expect(file.features).toEqual([]);
    expect(file.colors['--primary']).toBe('#006248');
    expect(file.editor['editorCursor.foreground']).toBe('@primary');
    expect(file).not.toHaveProperty('base');
  });
  it('checks composited ink and rejects invalid shadow layers, references and unknown roles', () => {
    const file = exportShellTheme(builtInShellThemePresets[0]);
    file.colors['--foreground'] = '#00000000';
    expect(portableContrastIssue(file)).toContain('1.00:1');
    for (const patch of [
      { shadow: [{ x: 0, y: 0, spread: 0, blur: -1, color: '#ffffff' }] },
      { palette: { loop: '$loop' } },
      { colors: { ...file.colors, '--x': '#123456' } },
      { terminal: { blue: 'url(local)' } },
      { parts: { link: '$absent' } },
    ])
      expect(() => readPortableShellTheme({ ...file, ...patch })).toThrow();
  });
  it('changes linked colors across shell and editor without changing independent fields', () => {
    const file = exportShellTheme(builtInShellThemePresets[0]);
    file.palette.harbor = '#248abe';
    file.colors['--primary'] = '$harbor';
    file.editor['editorCursor.foreground'] = '@primary';
    file.syntax.push({ token: 'custom.language', foreground: '$harbor', fontStyle: 'italic bold' });
    const copy = resolvePortableShellTheme('copy', file);
    expect(copy.semanticTokens?.['--primary']).toBe('#248abe');
    expect(copy.monaco?.light?.colors['editorCursor.foreground']).toBe('#248abe');
    expect(copy.monaco?.light?.rules.at(-1)?.foreground).toBe('#248abe');
    expect(copy.semanticTokens?.['--foreground']).toBe(
      builtInShellThemePresets[0].semanticTokens?.['--foreground']
    );
    file.colors['--primary'] = '@primary';
    expect(() => readPortableShellTheme(file)).toThrow(/primary/);
  });
});
