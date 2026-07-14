// @vitest-environment jsdom

import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { KeepAliveStack } from '../src/components/layout/KeepAliveStack';
import { useViewActivation } from '../src/context/ViewActivationContext';

describe('KeepAliveStack activation presentation', () => {
  const hosts: HTMLElement[] = [];
  afterEach(() => {
    hosts.splice(0).forEach((host) => host.remove());
    vi.restoreAllMocks();
  });

  it('shows the target before publishing after-paint activation', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    hosts.push(host);
    const [activeId, setActiveId] = createSignal('files');

    const View = (props: { id: string }) => {
      const activation = useViewActivation();
      return <div data-view={props.id} data-active={activation.active() ? 'true' : 'false'} />;
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
    await new Promise<void>((resolve) => setTimeout(resolve, 30));

    setActiveId('terminal');
    await Promise.resolve();
    const terminal = host.querySelector<HTMLElement>('[data-view="terminal"]');
    expect(terminal?.parentElement?.style.display).toBe('block');
    expect(terminal?.dataset.active).toBe('false');
    await new Promise<void>((resolve) => setTimeout(resolve, 30));
    expect(terminal?.dataset.active).toBe('true');
    dispose();
  });
});
