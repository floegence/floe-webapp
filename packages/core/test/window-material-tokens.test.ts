import { describe, expect, it } from 'vitest';
import { builtInShellThemePresets } from '../src/styles/themes';

const windowTokens = [
  '--floe-window-background',
  '--floe-window-foreground',
  '--floe-window-muted-foreground',
  '--floe-window-titlebar-background',
  '--floe-window-border',
  '--floe-window-shadow',
] as const;

describe('non-modal window theme contract', () => {
  it('provides the complete window palette to every built-in renderer and adapter', () => {
    for (const preset of builtInShellThemePresets) {
      for (const token of windowTokens) {
        expect(preset.semanticTokens?.[token], `${preset.name}: ${token}`).toBeTruthy();
        if (!preset.inheritsBaseTokens) {
          expect(preset.tokens?.[preset.mode === 'dark' ? 'dark' : 'light']?.[token]).toBe(
            preset.semanticTokens?.[token]
          );
        }
      }
    }
  });
});
