// @vitest-environment jsdom

import { createRoot, createSignal } from 'solid-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createFloatingPresence,
  type FloatingPresence,
} from '../src/components/ui/floatingPresence';

const disposers: Array<() => void> = [];

function createPresenceHarness(initialOpen: boolean, exitDurationMs = 120) {
  let setOpen: ((open: boolean) => void) | undefined;
  let presence: FloatingPresence | undefined;
  let dispose: (() => void) | undefined;

  createRoot((rootDispose) => {
    dispose = rootDispose;
    const [open, setHarnessOpen] = createSignal(initialOpen);
    setOpen = setHarnessOpen;
    presence = createFloatingPresence({ open, exitDurationMs });
  });

  disposers.push(() => dispose?.());
  return {
    setOpen: (open: boolean) => setOpen?.(open),
    mounted: () => presence?.mounted() ?? false,
    state: () => presence?.state(),
    exiting: () => presence?.exiting() ?? false,
  };
}

describe('createFloatingPresence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', ((callback: FrameRequestCallback) => {
      const handle = window.setTimeout(() => callback(0), 16);
      return handle;
    }) as typeof requestAnimationFrame);
    vi.stubGlobal('cancelAnimationFrame', ((handle: number) => {
      window.clearTimeout(handle);
    }) as typeof cancelAnimationFrame);
  });

  afterEach(() => {
    while (disposers.length > 0) {
      disposers.pop()?.();
    }
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('keeps a surface mounted during exit and then unmounts it', async () => {
    const presence = createPresenceHarness(false);

    expect(presence.mounted()).toBe(false);

    presence.setOpen(true);
    await Promise.resolve();
    expect(presence.mounted()).toBe(true);
    expect(presence.state()).toBe('entering');

    vi.runOnlyPendingTimers();
    await Promise.resolve();
    expect(presence.state()).toBe('open');

    presence.setOpen(false);
    await Promise.resolve();
    expect(presence.state()).toBe('exiting');
    expect(presence.exiting()).toBe(true);

    // The close event may precede the first CSS transition frame.
    vi.advanceTimersByTime(32);
    vi.advanceTimersByTime(119);
    await Promise.resolve();
    expect(presence.mounted()).toBe(true);

    vi.advanceTimersByTime(1);
    await Promise.resolve();
    expect(presence.mounted()).toBe(true);
    vi.advanceTimersByTime(16);
    expect(presence.mounted()).toBe(false);
  });

  it('cancels the pending unmount when reopened during exit', async () => {
    const presence = createPresenceHarness(true);
    vi.runOnlyPendingTimers();
    await Promise.resolve();

    presence.setOpen(false);
    await Promise.resolve();
    expect(presence.state()).toBe('exiting');

    vi.advanceTimersByTime(60);
    presence.setOpen(true);
    await Promise.resolve();
    expect(presence.mounted()).toBe(true);
    expect(presence.state()).toBe('open');
    expect(vi.getTimerCount()).toBe(0);

    vi.runOnlyPendingTimers();
    await Promise.resolve();
    expect(presence.state()).toBe('open');
  });

  it('does not re-enter when a source change keeps the surface open', async () => {
    let invalidateOpenSource = () => undefined;
    let openPresence: FloatingPresence | undefined;

    createRoot((dispose) => {
      const [openRevision, setOpenRevision] = createSignal(0);
      invalidateOpenSource = () => setOpenRevision((revision) => revision + 1);
      openPresence = createFloatingPresence({
        open: () => {
          openRevision();
          return true;
        },
      });
      disposers.push(dispose);
    });

    vi.runOnlyPendingTimers();
    await Promise.resolve();
    expect(openPresence?.state()).toBe('open');

    invalidateOpenSource();
    await Promise.resolve();

    expect(openPresence?.state()).toBe('open');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not defer an active exit when a source change keeps the surface closed', async () => {
    let close = () => undefined;
    let invalidateClosedSource = () => undefined;
    let presence: FloatingPresence | undefined;

    createRoot((dispose) => {
      const [snapshot, setSnapshot] = createSignal({ open: true, revision: 0 });
      close = () => setSnapshot((current) => ({ open: false, revision: current.revision + 1 }));
      invalidateClosedSource = () =>
        setSnapshot((current) => ({ ...current, revision: current.revision + 1 }));
      presence = createFloatingPresence({ open: () => snapshot().open, exitDurationMs: 120 });
      disposers.push(dispose);
    });

    vi.runOnlyPendingTimers();
    await Promise.resolve();
    expect(presence?.state()).toBe('open');

    close();
    await Promise.resolve();
    expect(presence?.state()).toBe('exiting');
    expect(presence?.mounted()).toBe(true);

    vi.advanceTimersByTime(60);
    invalidateClosedSource();
    await Promise.resolve();
    vi.advanceTimersByTime(108);
    await Promise.resolve();

    expect(presence?.mounted()).toBe(false);
  });

  it('uses a near-instant exit when reduced motion is requested', async () => {
    vi.stubGlobal('matchMedia', ((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    })) as typeof matchMedia);

    const presence = createPresenceHarness(true);
    vi.runOnlyPendingTimers();
    await Promise.resolve();

    presence.setOpen(false);
    await Promise.resolve();
    expect(presence.state()).toBe('exiting');

    vi.advanceTimersByTime(1);
    await Promise.resolve();
    expect(presence.mounted()).toBe(false);
  });

  it('cancels an exit before its first frame when reopened', async () => {
    const presence = createPresenceHarness(true);
    vi.runOnlyPendingTimers();
    presence.setOpen(false);
    presence.setOpen(true);
    await Promise.resolve();
    expect(presence.state()).toBe('open');
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(300);
    expect(presence.mounted()).toBe(true);
  });

  it('cancels the final exit frame on disposal', async () => {
    const presence = createPresenceHarness(true);
    vi.runOnlyPendingTimers();
    presence.setOpen(false);
    vi.advanceTimersByTime(152);
    await Promise.resolve();
    expect(presence.mounted()).toBe(true);
    expect(vi.getTimerCount()).toBe(1);
    disposers.pop()?.();
    expect(vi.getTimerCount()).toBe(0);
  });

  describe('with a motion element', () => {
    function createElementPresence() {
      let setOpen: ((open: boolean) => void) | undefined;
      let presence: FloatingPresence | undefined;
      const element = document.createElement('div');

      createRoot((dispose) => {
        disposers.push(dispose);
        const [open, setHarnessOpen] = createSignal(true);
        setOpen = setHarnessOpen;
        presence = createFloatingPresence({ open, element: () => element });
      });

      vi.stubGlobal('getComputedStyle', (() => ({
        transitionDuration: '0.18s, 0.18s',
        transitionProperty: 'opacity, transform',
      })) as typeof getComputedStyle);

      return {
        element,
        setOpen: (open: boolean) => setOpen?.(open),
        mounted: () => presence?.mounted() ?? false,
        state: () => presence?.state(),
      };
    }

    function transition(type: string, propertyName: string) {
      const event = new Event(type, { bubbles: true }) as TransitionEvent;
      Object.defineProperty(event, 'propertyName', { value: propertyName });
      return event;
    }

    it('waits for every animated property before unmounting', async () => {
      const presence = createElementPresence();
      vi.runOnlyPendingTimers();
      await Promise.resolve();

      presence.setOpen(false);
      await Promise.resolve();
      expect(presence.state()).toBe('exiting');

      presence.element.dispatchEvent(transition('transitionrun', 'opacity'));
      presence.element.dispatchEvent(transition('transitionrun', 'transform'));
      presence.element.dispatchEvent(transition('transitionend', 'opacity'));
      await Promise.resolve();
      expect(presence.mounted()).toBe(true);

      presence.element.dispatchEvent(transition('transitionend', 'transform'));
      await Promise.resolve();
      expect(presence.mounted()).toBe(false);
    });

    it('ignores transitions reported by descendants', async () => {
      const presence = createElementPresence();
      vi.runOnlyPendingTimers();
      await Promise.resolve();

      presence.setOpen(false);
      await Promise.resolve();
      presence.element.dispatchEvent(transition('transitionrun', 'opacity'));
      presence.element.dispatchEvent(transition('transitionrun', 'transform'));

      const child = document.createElement('span');
      presence.element.append(child);
      child.dispatchEvent(transition('transitionend', 'opacity'));
      child.dispatchEvent(transition('transitionend', 'transform'));
      await Promise.resolve();
      expect(presence.mounted()).toBe(true);
    });

    it('does not wait forever when the transition never reports', async () => {
      const presence = createElementPresence();
      vi.runOnlyPendingTimers();
      await Promise.resolve();

      presence.setOpen(false);
      await Promise.resolve();
      expect(presence.mounted()).toBe(true);

      vi.advanceTimersByTime(300);
      await Promise.resolve();
      expect(presence.mounted()).toBe(false);
    });
  });
});
