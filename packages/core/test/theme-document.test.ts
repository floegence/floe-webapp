import { describe, expect, it } from 'vitest';
import { builtInShellThemePresets, floeThemeContrastIssue, readFloeThemeDocument, resolveFloeThemeDocument } from '../src/themes';

const document = { version: 1 as const, base: 'paper', name: 'Harbor', colors: { '--primary': '#255744' }, syntax: { string: '#237851' } };

describe('theme documents', () => {
  it.each(builtInShellThemePresets)('round trips the $name baseline without embedding trusted CSS', base => {
    const input = { version: 1, name: base.displayName, base: base.name, colors: {} };
    const decoded = readFloeThemeDocument(JSON.stringify(input));
    expect(decoded).toEqual(input);
    const preset = resolveFloeThemeDocument('custom-example', decoded);
    expect(preset.semanticTokens).toEqual(base.semanticTokens);
    expect(preset.monaco).toEqual(base.monaco);
    expect(floeThemeContrastIssue(decoded)).toBeUndefined();
  });
  it('projects a changed color into the preview, shell and editor without mutating its base', () => {
    const preset = resolveFloeThemeDocument('custom-example', document);
    expect(preset.preview?.primary).toBe('#255744');
    expect(preset.tokens?.light?.['--primary']).toBe('#255744');
    expect(preset.monaco?.light?.colors['editorCursor.foreground']).toBe('#255744');
    expect(preset.monaco?.light?.rules.find(rule => rule.token === 'string')?.foreground).toBe('#237851');
    expect(floeThemeContrastIssue({ ...document, colors: { '--foreground': '#ffffff', '--background': '#ffffff' } })).toContain('4.5:1');
  });
  it.each([{ version: 2 }, { base: 'future' }, { name: ' ' }, { colors: { '--unexpected': '#000000' } }, { colors: { '--primary': 'var(--card)' } }, { editor: { 'editor.foreground': 'transparent' } }, { syntax: { unknown: '#123456' } }])('rejects unsupported input %j', patch => {
    expect(() => readFloeThemeDocument({ ...document, ...patch })).toThrow();
  });
});
