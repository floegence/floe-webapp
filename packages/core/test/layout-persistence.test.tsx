// @vitest-environment jsdom
import { render } from 'solid-js/web';
import { afterEach, expect, it, vi } from 'vitest';
import { FloeConfigProvider } from '../src/context/FloeConfigContext';
import { createLayoutService, type LayoutContextValue } from '../src/context/LayoutContext';

let dispose: (() => void) | undefined;
afterEach(() => { dispose?.(); vi.useRealTimers(); vi.unstubAllGlobals(); });
it.each([false, true, undefined])('persists dimensions independently of active tab policy %s', persistActiveTab => {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const values = new Map([['test-layout', JSON.stringify({ sidebar: { activeTab: 'files', width: 360, collapsed: true } })]]);
  let layout!: LayoutContextValue;
  function Probe() { layout = createLayoutService(); return null; }
  dispose = render(() => <FloeConfigProvider config={{
    storage: { namespace: 'test', adapter: {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value); },
      removeItem: key => { values.delete(key); },
    } },
    layout: { sidebar: { persistActiveTab, defaultActiveTab: 'settings' } },
  }}><Probe /></FloeConfigProvider>, document.createElement('div'));
  expect(layout.sidebarActiveTab()).toBe(persistActiveTab === false ? 'settings' : 'files');
  expect(layout.sidebarWidth()).toBe(360);
  layout.setSidebarActiveTab('ports');
  layout.setSidebarWidth(400);
  vi.runAllTimers();
  expect(JSON.parse(values.get('test-layout')!).sidebar).toEqual({
    width: 400, collapsed: false, ...(persistActiveTab === false ? {} : { activeTab: 'ports' }),
  });
});
