import { describe, expect, it } from 'vitest';
import { renderToString } from 'solid-js/web';
import {
  BUILT_IN_SHELL_THEME_DEFAULTS,
  FloeProvider,
  builtInShellThemePresets,
} from '@floegence/floe-webapp-core';
import { ShellThemePicker } from './ShellThemePicker';

describe('ShellThemePicker', () => {
  it('renders system mode and five theme choices for each color mode', () => {
    const html = renderToString(() => (
      <FloeProvider
        config={{
          storage: { enabled: false },
          theme: {
            shellPresets: builtInShellThemePresets,
            defaultShellPreset: BUILT_IN_SHELL_THEME_DEFAULTS,
          },
        }}
      >
        <ShellThemePicker />
      </FloeProvider>
    ));

    expect(html).toContain('System');
    expect(html).toContain('Light themes');
    expect(html).toContain('Dark themes');
    for (const preset of builtInShellThemePresets) {
      expect(html).toContain(preset.displayName);
    }
    expect(html.match(/role="radio"/g)).toHaveLength(22);
  });
});
