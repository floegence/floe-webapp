import { describe, expect, it } from 'vitest';
import {
  builtInShellThemePresets,
  normalizeShellThemeSelection,
  BUILT_IN_SHELL_THEME_DEFAULTS,
} from '../src/styles/themes';

function preset(name: string) {
  const value = builtInShellThemePresets.find((entry) => entry.name === name);
  expect(value, name).toBeDefined();
  return value!;
}

describe('Cloud White and Soft Black', () => {
  it('keeps white reading, cards, popovers and terminals on one neutral canvas', () => {
    const theme = preset('cloud-white');
    const tokens = theme.semanticTokens!;
    expect(theme.mode).toBe('light');
    for (const role of ['--background', '--card', '--popover', '--terminal-background']) {
      expect(tokens[role], role).toBe('#FFFFFF');
    }
    expect(tokens['--foreground']).toBe('#30343B');
    expect(tokens['--sidebar']).toBe('#FAFBFC');
    expect(tokens['--primary']).toBe('#365FC0');
    expect(theme.monaco?.light?.colors['editor.background']).toBe('#FFFFFF');
    expect(theme.preview?.background).toBe(tokens['--background']);
  });

  it('uses soft text and semantic colors across a near-black reading and window surface', () => {
    const theme = preset('soft-black');
    const tokens = theme.semanticTokens!;
    expect(theme.mode).toBe('dark');
    expect(tokens['--background']).toBe('#09090B');
    expect(tokens['--card']).toBe('#101113');
    expect(tokens['--foreground']).toBe('#C6C5C1');
    expect(tokens['--muted-foreground']).toBe('#96979D');
    expect(tokens['--terminal-foreground']).toBe(tokens['--foreground']);
    expect(tokens['--success']).toBe('#91B39B');
    expect(tokens['--warning']).toBe('#C8B28A');
    expect(tokens['--error']).toBe('#D29292');
    expect(tokens['--floe-window-background']).toBe('var(--card)');
    expect(theme.monaco?.dark?.colors['editor.foreground']).toBe(tokens['--foreground']);
    expect(theme.monaco?.dark?.colors['editorError.foreground']).toBe(tokens['--error']);
    expect(theme.preview?.surface).toBe(tokens['--card']);
  });

  it('admits both new selections without changing defaults or existing choices', () => {
    expect(BUILT_IN_SHELL_THEME_DEFAULTS).toEqual({
      light: 'porcelain-light',
      dark: 'porcelain-dark',
    });
    for (const selection of [
      { version: 1, light: 'cloud-white', dark: 'soft-black' },
      { version: 1, light: 'classic-light', dark: 'porcelain-dark' },
    ]) {
      expect(
        normalizeShellThemeSelection(
          selection,
          builtInShellThemePresets,
          BUILT_IN_SHELL_THEME_DEFAULTS
        )
      ).toEqual(selection);
    }
  });
});
