// @vitest-environment jsdom

import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider, useTheme, type ThemeContextValue } from '../src/context/ThemeContext';
import {
  FloeConfigProvider,
  type FloeStorageAdapter,
  type FloeConfig,
} from '../src/context/FloeConfigContext';
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
    document.documentElement.removeAttribute('data-floe-surface-style');
    document.body.innerHTML = '';
  });

  function mountSurface(
    config: Partial<FloeConfig['theme']> = {},
    initial: Record<string, unknown> = {},
    enabled = true
  ) {
    const storage = createStorage(initial);
    const host = document.createElement('div');
    document.body.appendChild(host);
    let service!: ThemeContextValue;
    function Probe() {
      service = useTheme();
      return <input value="draft" />;
    }
    dispose = render(
      () => (
        <FloeConfigProvider
          config={{
            storage: { namespace: 'material', adapter: storage.adapter, enabled },
            theme: config,
          }}
        >
          <ThemeProvider>
            <Probe />
          </ThemeProvider>
        </FloeConfigProvider>
      ),
      host
    );
    return { ...storage, service, host };
  }

  it('defaults to standard and changes only material without remounting input or writing palette keys', () => {
    const { service, host, values } = mountSurface();
    const input = host.querySelector('input')!;
    input.value = 'unsubmitted draft';
    input.focus();
    input.setSelectionRange(2, 7);
    expect(service.surfaceStyle()).toBe('standard');
    service.setSurfaceStyle('soft-neumorphic');
    expect(document.documentElement.dataset.floeSurfaceStyle).toBe('soft-neumorphic');
    expect(host.querySelector('input')).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('unsubmitted draft');
    expect(input.selectionStart).toBe(2);
    vi.runAllTimers();
    expect([...values.keys()]).toEqual(['material-theme-surface-style']);
    expect(JSON.parse(values.get('material-theme-surface-style')!)).toBe('soft-neumorphic');
    dispose?.();
    dispose = undefined;
    expect(document.documentElement.hasAttribute('data-floe-surface-style')).toBe(false);
  });

  it.each([undefined, null, 'unknown', 1, { style: 'soft-neumorphic' }])(
    'falls back to the configured default for invalid stored material %j',
    (stored) => {
      const { service } = mountSurface(
        { defaultSurfaceStyle: 'soft-neumorphic', surfaceStyleStorageKey: 'surface' },
        { 'material-surface': stored }
      );
      expect(service.surfaceStyle()).toBe('soft-neumorphic');
    }
  );

  it('restores a custom storage key and honors persistence disabled', () => {
    const { service, values } = mountSurface(
      { surfaceStyleStorageKey: 'surface' },
      { 'material-surface': 'soft-neumorphic' }
    );
    expect(service.surfaceStyle()).toBe('soft-neumorphic');
    service.setSurfaceStyle('standard');
    vi.runAllTimers();
    expect(JSON.parse(values.get('material-surface')!)).toBe('standard');
    dispose?.();
    dispose = undefined;
    const disabled = mountSurface(
      { defaultSurfaceStyle: 'standard' },
      { 'material-theme-surface-style': 'soft-neumorphic' },
      false
    );
    expect(disabled.service.surfaceStyle()).toBe('standard');
    disabled.service.setSurfaceStyle('soft-neumorphic');
    vi.runAllTimers();
    expect(disabled.values.size).toBe(1);
    disabled.service.setSurfaceStyle('standard');
    vi.runAllTimers();
    expect(JSON.parse(disabled.values.get('material-theme-surface-style')!)).toBe(
      'soft-neumorphic'
    );
  });

  it('preserves token source order and clears obsolete material token overrides', () => {
    const { service } = mountSurface({
      tokens: { shared: { '--floe-surface-shadow-raised': '1px 1px 2px red' } },
      presets: [
        {
          name: 'custom',
          displayName: 'Custom',
          tokens: { light: { '--floe-surface-shadow-raised': '2px 2px 3px blue' } },
        },
        { name: 'plain', displayName: 'Plain' },
      ],
    });
    expect(document.documentElement.style.getPropertyValue('--floe-surface-shadow-raised')).toBe(
      '2px 2px 3px blue'
    );
    service.setSurfaceStyle('soft-neumorphic');
    service.setTheme('dark');
    expect(document.documentElement.style.getPropertyValue('--floe-surface-shadow-raised')).toBe(
      '1px 1px 2px red'
    );
    service.setThemePreset('plain');
    service.setSurfaceStyle('standard');
    expect(document.documentElement.style.getPropertyValue('--floe-surface-shadow-raised')).toBe(
      '1px 1px 2px red'
    );
    dispose?.();
    dispose = undefined;
    expect(document.documentElement.style.getPropertyValue('--floe-surface-shadow-raised')).toBe(
      ''
    );
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
