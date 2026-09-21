// @vitest-environment jsdom

import { createSignal, lazy, type JSX } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { KeepAliveStack } from '../src/components/layout/KeepAliveStack';
import { ViewActivationProvider, useViewActivation } from '../src/context/ViewActivationContext';

const afterPaint = vi.hoisted(() => [] as Array<() => void>);
vi.mock('../src/utils/defer', () => ({ deferAfterPaint: (callback: () => void) => afterPaint.push(callback) }));

describe('KeepAliveStack activation presentation', () => {
  const hosts: HTMLElement[] = [];
  afterEach(() => {
    hosts.splice(0).forEach((host) => host.remove());
    vi.restoreAllMocks();
    afterPaint.length = 0;
  });

  it('shows the target before publishing after-paint activation', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    hosts.push(host);
    const [activeId, setActiveId] = createSignal('files');

    const View = (props: { id: string }) => {
      const activation = useViewActivation();
      return <div data-view={props.id} data-visible={activation.visible() ? 'true' : 'false'} data-active={activation.active() ? 'true' : 'false'} />;
    };
    const dispose = render(() => (
      <KeepAliveStack
        activeId={activeId()}
        activationMode="after-paint"
        lazyMount={false}
        views={[
          { id: 'files', render: () => <View id="files" /> },
          { id: 'terminal', render: () => <View id="terminal" /> },
        ]}
      />
    ), host);

    await Promise.resolve();
    afterPaint.splice(0).forEach((callback) => callback());

    setActiveId('terminal');
    await Promise.resolve();
    const terminal = host.querySelector<HTMLElement>('[data-view="terminal"]');
    expect(terminal?.parentElement?.style.display).toBe('block');
    expect(terminal?.dataset.visible).toBe('true');
    expect(terminal?.dataset.active).toBe('false');
    const files = host.querySelector<HTMLElement>('[data-view="files"]');
    expect(files?.dataset.visible).toBe('false');
    expect(files?.parentElement?.inert).toBe(true);
    afterPaint.splice(0).forEach((callback) => callback());
    expect(terminal?.dataset.active).toBe('true');
    setActiveId('files');
    setActiveId('terminal');
    afterPaint.splice(0).forEach((callback) => callback());
    expect(files?.dataset.active).toBe('false');
    expect(host.querySelector('[data-view="terminal"]')).toBe(terminal);
    dispose();
  });

  it('combines nested visibility without changing a custom provider activation contract', () => {
    const host = document.createElement('div');
    hosts.push(host);
    const [parentVisible, setParentVisible] = createSignal(true);
    let visible = () => false;
    const dispose = render(() => (
      <ViewActivationProvider value={{ id: 'parent', active: parentVisible, activationSeq: () => 1 }}>
        <KeepAliveStack activeId="child" views={[{ id: 'child', render: () => {
          visible = useViewActivation().visible;
          return <input />;
        } }]} />
      </ViewActivationProvider>
    ), host);
    expect(visible()).toBe(true);
    setParentVisible(false);
    expect(visible()).toBe(false);
    dispose();
  });

  it('keeps loading inside the selected view and ignores a superseded lazy completion', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    hosts.push(host);
    const [active, setActive] = createSignal('warm');
    let resolveCold!: (value: { default: () => JSX.Element }) => void;
    const Cold = lazy(() => new Promise<{ default: () => JSX.Element }>((resolve) => { resolveCold = resolve; }));
    const dispose = render(() => (
      <KeepAliveStack
        activeId={active()}
        renderFallback={(id) => <div role="status">Loading {id}</div>}
        views={[
          { id: 'warm', render: () => <input aria-label="Draft" /> },
          { id: 'cold', render: () => <Cold /> },
        ]}
      />
    ), host);
    const draft = host.querySelector('input')!;
    draft.value = 'Preserve me';
    setActive('cold');
    expect(host.querySelector('[role="status"]')?.textContent).toBe('Loading cold');
    setActive('warm');
    resolveCold({ default: () => document.createElement('article') });
    await Promise.resolve();
    await Promise.resolve();
    expect(host.querySelector('input')).toBe(draft);
    expect(draft.value).toBe('Preserve me');
    expect(draft.parentElement?.style.display).toBe('block');
    expect(host.querySelector('article')?.closest('[data-floe-keep-alive-view]')?.getAttribute('aria-hidden')).toBe('true');
    dispose();
  });
});
