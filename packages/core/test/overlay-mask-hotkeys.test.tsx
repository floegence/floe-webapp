// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSignal } from 'solid-js';
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

it('routes outside pointer and focus only to the topmost overlay owner', () => {
  const outer = vi.fn(), inner = vi.fn();
  const host = document.createElement('div'); document.body.append(host);
  const dispose = renderSolid(() => {
    let root: HTMLDivElement | undefined, child: HTMLDivElement | undefined;
    useOverlayMask({ open: () => true, root: () => root, onInteractOutside: outer, lockBodyScroll: false, trapFocus: false, autoFocus: false });
    useOverlayMask({ open: () => true, root: () => child, onInteractOutside: inner, autoFocus: false });
    return <><div ref={root}>Parent</div><div ref={child}><input /></div></>;
  }, host);
  try {
    const input = host.querySelector('input')!;
    input.dispatchEvent(new Event('pointerdown', { bubbles: true })); input.focus();
    expect(outer).not.toHaveBeenCalled(); expect(inner).not.toHaveBeenCalled();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(outer).not.toHaveBeenCalled(); expect(inner).toHaveBeenCalledOnce();
  } finally { dispose(); host.remove(); }
});

it('does not restore a retired overlay trigger over a newly opened interaction owner', async () => {
  vi.useFakeTimers();
  const host = document.createElement('div'); document.body.append(host);
  const trigger = document.createElement('button'); document.body.append(trigger); trigger.focus();
  const [oldOpen, setOldOpen] = createSignal(true), [nextOpen, setNextOpen] = createSignal(false);
  const outside = vi.fn();
  const dispose = renderSolid(() => {
    let oldRoot: HTMLDivElement | undefined, nextRoot: HTMLDivElement | undefined;
    useOverlayMask({ open: oldOpen, root: () => oldRoot, autoFocus: false });
    useOverlayMask({ open: nextOpen, root: () => nextRoot, autoFocus: false, lockBodyScroll: false, onInteractOutside: outside });
    return <><div ref={oldRoot}><input /></div><div ref={nextRoot}><input /></div></>;
  }, host);
  try {
    host.querySelector('input')!.focus();
    setOldOpen(false); (document.activeElement as HTMLElement).blur(); setNextOpen(true);
    await vi.runAllTimersAsync();
    expect(outside).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(trigger);
  } finally { dispose(); host.remove(); trigger.remove(); vi.useRealTimers(); }
});
