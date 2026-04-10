// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render as renderSolid } from 'solid-js/web';
import { useOverlayMask } from '../src/hooks/useOverlayMask';

interface OverlayMaskHarnessProps {
  allowHotkeys?: readonly string[];
}

function OverlayMaskHarness(props: OverlayMaskHarnessProps) {
  let rootRef: HTMLDivElement | undefined;

  useOverlayMask({
    open: () => true,
    root: () => rootRef,
    blockHotkeys: true,
    allowHotkeys: () => props.allowHotkeys,
  });

  return (
    <div ref={rootRef}>
      <button type="button">Inside overlay</button>
    </div>
  );
}

function dispatchKeydown(target: HTMLElement, key: string): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      ctrlKey: true,
      metaKey: true,
      bubbles: true,
      cancelable: true,
    }),
  );
}

describe('useOverlayMask hotkey routing', () => {
  const disposers: Array<() => void> = [];
  const mount = (view: () => unknown, host: HTMLElement) => {
    disposers.push(renderSolid(view, host));
  };

  afterEach(() => {
    while (disposers.length) {
      disposers.pop()?.();
    }
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('blocks window hotkeys by default while the overlay is focused', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    mount(() => <OverlayMaskHarness />, host);

    const bubbleSpy = vi.fn();
    window.addEventListener('keydown', bubbleSpy);

    const button = host.querySelector('button') as HTMLButtonElement | null;
    expect(button).toBeTruthy();

    dispatchKeydown(button!, '.');

    expect(bubbleSpy).not.toHaveBeenCalled();

    window.removeEventListener('keydown', bubbleSpy);
  });

  it('allows only the explicitly allowlisted hotkeys to reach window handlers', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    mount(() => <OverlayMaskHarness allowHotkeys={['mod+.']} />, host);

    const bubbleSpy = vi.fn();
    window.addEventListener('keydown', bubbleSpy);

    const button = host.querySelector('button') as HTMLButtonElement | null;
    expect(button).toBeTruthy();

    dispatchKeydown(button!, '.');
    dispatchKeydown(button!, 'k');

    expect(bubbleSpy).toHaveBeenCalledTimes(1);
    expect((bubbleSpy.mock.calls[0] ?? [])[0]).toBeInstanceOf(KeyboardEvent);
    expect(((bubbleSpy.mock.calls[0] ?? [])[0] as KeyboardEvent).key).toBe('.');

    window.removeEventListener('keydown', bubbleSpy);
  });
});
