import { describe, expect, it } from 'vitest';
import {
  BUILT_IN_SHELL_THEME_DEFAULTS,
  builtInShellThemePresets,
} from '../src/themes';

describe('browser-neutral shell theme entrypoint', () => {
  it('exposes complete semantic metadata without a DOM bootstrap', () => {
    expect(BUILT_IN_SHELL_THEME_DEFAULTS).toEqual({
      light: 'classic-light',
      dark: 'classic-dark',
    });
    expect(builtInShellThemePresets).toHaveLength(22);
    for (const preset of builtInShellThemePresets) {
      expect(preset.semanticTokens?.['--background'], preset.name).toBeTruthy();
      expect(preset.semanticTokens?.['--foreground'], preset.name).toBeTruthy();
      expect(preset.semanticTokens?.['--card'], preset.name).toBeTruthy();
    }
  });
});
