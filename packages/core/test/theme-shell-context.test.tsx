// @vitest-environment jsdom

import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider, useTheme, type ThemeContextValue } from '../src/context/ThemeContext';
import { FloeConfigProvider, type FloeStorageAdapter } from '../src/context/FloeConfigContext';
import { builtInShellThemePresets } from '../src/styles/themes';

function createStorage(initial: Record<string, unknown> = {}) {
  const values = new Map(
    Object.entries(initial).map(([key, value]) => [key, JSON.stringify(value)])
  );
  const adapter: FloeStorageAdapter = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    keys: () => [...values.keys()],
  };
  return { adapter, values };
}

describe('shell theme context', () => {
  let dispose: (() => void) | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    dispose?.();
    dispose = undefined;
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.removeAttribute('style');
    document.documentElement.removeAttribute('data-floe-shell-theme');
    document.body.innerHTML = '';
  });

  it('keeps shell and chart channels independent while remembering both modes', () => {
    const { adapter, values } = createStorage();
    const host = document.createElement('div');
    document.body.appendChild(host);
    let service: ThemeContextValue | undefined;

    function Probe() {
      service = useTheme();
      return null;
    }

    dispose = render(
      () => (
        <FloeConfigProvider
          config={{
            storage: { namespace: 'theme-test', adapter },
            theme: {
              defaultTheme: 'system',
              shellPresets: builtInShellThemePresets,
              defaultShellPreset: { light: 'paper', dark: 'ink' },
              presets: [
                {
                  name: 'charts',
                  displayName: 'Charts',
                  tokens: { light: { '--chart-1': '#123456' }, dark: { '--chart-1': '#ABCDEF' } },
                },
              ],
              defaultPreset: 'charts',
            },
          }}
        >
          <ThemeProvider>
            <Probe />
          </ThemeProvider>
        </FloeConfigProvider>
      ),
      host
    );

    expect(service?.theme()).toBe('system');
    expect(service?.resolvedTheme()).toBe('light');
    expect(service?.shellPreset()?.name).toBe('paper');
    expect(document.documentElement.dataset.floeShellTheme).toBe('paper');
    expect(document.documentElement.style.getPropertyValue('--background')).toBe('#F5F1E8');
    expect(document.documentElement.style.getPropertyValue('--chart-1')).toBe('#123456');

    service?.selectShellTheme('dark', 'forest');
    expect(service?.theme()).toBe('dark');
    expect(service?.shellPreset()?.name).toBe('forest');
    expect(service?.shellPresetForMode('light')?.name).toBe('paper');
    expect(document.documentElement.dataset.floeShellTheme).toBe('forest');
    expect(document.documentElement.style.getPropertyValue('--chart-1')).toBe('#ABCDEF');

    service?.setTheme('system');
    expect(service?.theme()).toBe('system');
    expect(service?.resolvedTheme()).toBe('light');
    expect(service?.shellPreset()?.name).toBe('paper');

    service?.selectShellTheme('light', 'classic-light');
    expect(service?.theme()).toBe('light');
    expect(service?.shellPreset()?.name).toBe('classic-light');
    expect(document.documentElement.dataset.floeShellTheme).toBe('classic-light');
    expect(document.documentElement.style.getPropertyValue('--background')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--chart-1')).toBe('#123456');

    service?.setTheme('system');
    expect(service?.shellPreset()?.name).toBe('classic-light');

    vi.runAllTimers();
    expect(JSON.parse(values.get('theme-test-theme-shell-preset') ?? 'null')).toEqual({
      version: 1,
      light: 'classic-light',
      dark: 'forest',
    });
    expect(JSON.parse(values.get('theme-test-theme') ?? 'null')).toBe('system');
  });
});
