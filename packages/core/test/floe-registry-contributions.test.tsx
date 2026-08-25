// @vitest-environment jsdom

import { createSignal, onMount } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivityAppsMain } from '../src/app/ActivityAppsMain';
import { FloeProvider } from '../src/app/FloeProvider';
import { FloeRegistryContributions } from '../src/app/FloeRegistryContributions';
import {
  useComponentRegistry,
  type ComponentRegistryValue,
  type FloeComponent,
} from '../src/context/ComponentRegistry';

const disposers: Array<() => void> = [];
const testConfig = { storage: { enabled: false } } as const;

beforeEach(() => {
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
  while (disposers.length > 0) disposers.pop()?.();
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function waitFor(assertion: () => void): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }
  throw lastError;
}

describe('FloeRegistryContributions', () => {
  it('serializes removal behind an in-flight mount lifecycle', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const events: string[] = [];
    let finishMount: (() => void) | undefined;
    let registry: ComponentRegistryValue | undefined;
    const [components, setComponents] = createSignal<readonly FloeComponent[]>([
      {
        id: 'plugin:one',
        name: 'Plugin One',
        component: () => <div />,
        sidebar: { renderIn: 'main', fullScreen: true },
        onMount: () =>
          new Promise<void>((resolve) => {
            events.push('mount:start');
            finishMount = () => {
              events.push('mount:end');
              resolve();
            };
          }),
        onUnmount: () => {
          events.push('unmount');
        },
      },
    ]);

    const Harness = () => {
      registry = useComponentRegistry();
      return <FloeRegistryContributions components={components()} />;
    };

    disposers.push(
      render(
        () => (
          <FloeProvider config={testConfig}>
            <Harness />
          </FloeProvider>
        ),
        host
      )
    );

    await waitFor(() => expect(events).toEqual(['mount:start']));
    setComponents([]);
    await Promise.resolve();
    expect(events).toEqual(['mount:start']);

    finishMount?.();
    await waitFor(() => expect(events).toEqual(['mount:start', 'mount:end', 'unmount']));
    expect(registry?.getComponent('plugin:one')).toBeUndefined();
    expect(registry?.mountedComponents().has('plugin:one')).toBe(false);
  });

  it('refreshes a retained id without restarting lifecycle or replacing its KeepAlive view', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const lifecycleMount = vi.fn();
    const lifecycleUnmount = vi.fn();
    const stableViewMount = vi.fn();
    const replacementViewMount = vi.fn();
    let registry: ComponentRegistryValue | undefined;

    const StableView = () => {
      onMount(stableViewMount);
      return <div data-view="stable">Stable view</div>;
    };
    const ReplacementView = () => {
      onMount(replacementViewMount);
      return <div data-view="replacement">Replacement view</div>;
    };
    const initial: FloeComponent = {
      id: 'plugin:stable',
      name: 'Initial name',
      component: StableView,
      sidebar: { order: 10, renderIn: 'main', fullScreen: true },
      onMount: lifecycleMount,
      onUnmount: lifecycleUnmount,
    };
    const [components, setComponents] = createSignal<readonly FloeComponent[]>([initial]);

    const Harness = () => {
      registry = useComponentRegistry();
      return (
        <>
          <FloeRegistryContributions components={components()} />
          <ActivityAppsMain activeId={() => 'plugin:stable'} />
        </>
      );
    };

    disposers.push(
      render(
        () => (
          <FloeProvider config={testConfig}>
            <Harness />
          </FloeProvider>
        ),
        host
      )
    );

    await waitFor(() => {
      expect(host.querySelector('[data-view="stable"]')).not.toBeNull();
      expect(lifecycleMount).toHaveBeenCalledTimes(1);
      expect(stableViewMount).toHaveBeenCalledTimes(1);
    });

    setComponents([
      {
        ...initial,
        name: 'Updated name',
        component: ReplacementView,
      },
    ]);

    await waitFor(() => {
      expect(registry?.sidebarItems()[0]?.name).toBe('Updated name');
    });
    expect(lifecycleMount).toHaveBeenCalledTimes(1);
    expect(lifecycleUnmount).not.toHaveBeenCalled();
    expect(stableViewMount).toHaveBeenCalledTimes(1);
    expect(replacementViewMount).not.toHaveBeenCalled();
    expect(host.querySelector('[data-view="stable"]')).not.toBeNull();
  });
});
