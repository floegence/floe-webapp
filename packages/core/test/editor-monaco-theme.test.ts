import { describe, expect, it, vi } from 'vitest';
import {
  applyFloeMonacoTheme,
  resolveFloeMonacoTheme,
  type MonacoThemeRegistry,
} from '../src/components/editor/monacoTheme';
import { builtInShellThemePresets } from '../src/styles/themes';

describe('Monaco shell themes', () => {
  it('registers and applies the active shell preset theme', () => {
    const preset = builtInShellThemePresets.find((candidate) => candidate.name === 'monokai');
    const defineTheme = vi.fn<MonacoThemeRegistry['defineTheme']>();
    const setTheme = vi.fn<MonacoThemeRegistry['setTheme']>();

    const themeName = applyFloeMonacoTheme({ defineTheme, setTheme }, 'dark', preset);

    expect(themeName).toBe('floe-shell-dark-monokai');
    expect(defineTheme).toHaveBeenCalledOnce();
    expect(defineTheme).toHaveBeenCalledWith(
      themeName,
      expect.objectContaining({
        base: 'vs-dark',
        colors: expect.objectContaining({
          'editor.background': '#272822',
          'editorCursor.foreground': '#F92672',
        }),
      })
    );
    expect(setTheme).toHaveBeenCalledWith(themeName);
  });

  it('falls back to Monaco built-ins when a custom preset has no editor definition', () => {
    expect(resolveFloeMonacoTheme('light')).toEqual({ name: 'vs' });
    expect(resolveFloeMonacoTheme('dark')).toEqual({ name: 'vs-dark' });
  });
});
