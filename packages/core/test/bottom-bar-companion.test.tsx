// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSignal } from 'solid-js';
import { render as renderSolid } from 'solid-js/web';

import { BottomBarCompanion } from '../src/components/layout/BottomBarCompanion';

type Rect = Readonly<{
  left: number;
  top: number;
  width: number;
  height: number;
}>;

const disposers: Array<() => void> = [];
let rafCallbacks = new Map<number, FrameRequestCallback>();
let nextRafId = 1;

function mount(view: () => unknown, host: HTMLElement): void {
  disposers.push(renderSolid(view, host));
}

function mockRect(element: HTMLElement, rect: Rect): void {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      ...rect,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      x: rect.left,
      y: rect.top,
      toJSON: () => undefined,
    }),
  });
}

function flushAnimationFrame(): void {
  const callbacks = [...rafCallbacks.entries()];
  rafCallbacks.clear();
  for (const [id, callback] of callbacks) callback(id);
}

function flushAllAnimationFrames(): void {
  let guard = 0;
  while (rafCallbacks.size > 0) {
    flushAnimationFrame();
    guard += 1;
    if (guard > 20) throw new Error('Animation frame queue did not settle');
  }
}

function finishTransition(surface: HTMLElement, propertyName = 'height'): void {
  const event = new Event('transitionend', { bubbles: true }) as TransitionEvent;
  Object.defineProperty(event, 'propertyName', { value: propertyName });
  surface.dispatchEvent(event);
}

function createFixture(rect: Rect = { left: 300, top: 700, width: 544, height: 48 }) {
  const renderHost = document.createElement('div');
  const portalMount = document.createElement('div');
  const anchor = document.createElement('div');
  document.body.append(renderHost, portalMount, anchor);
  mockRect(anchor, rect);
  return { anchor, portalMount, renderHost };
}

describe('BottomBarCompanion', () => {
  beforeEach(() => {
    rafCallbacks = new Map();
    nextRafId = 1;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: (callback: FrameRequestCallback) => {
        const id = nextRafId;
        nextRafId += 1;
        rafCallbacks.set(id, callback);
        return id;
      },
    });
    Object.defineProperty(window, 'cancelAnimationFrame', {
      configurable: true,
      value: (id: number) => rafCallbacks.delete(id),
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });
  });

  afterEach(() => {
    while (disposers.length > 0) disposers.pop()?.();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('grows upward from the anchor while preserving one shell and one textarea', () => {
    const { anchor, portalMount, renderHost } = createFixture();
    let setOpen: ((value: boolean) => void) | undefined;

    function Harness() {
      const [open, updateOpen] = createSignal(false);
      setOpen = updateOpen;
      return (
        <BottomBarCompanion
          retained
          visible
          open={open()}
          anchor={anchor}
          mount={portalMount}
          id="flower-companion"
          label="Flower"
        >
          <textarea />
        </BottomBarCompanion>
      );
    }

    mount(() => <Harness />, renderHost);
    flushAllAnimationFrames();

    const surface = portalMount.querySelector('[data-floe-bottom-bar-companion]') as HTMLElement;
    const textarea = surface.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'Keep this draft';
    expect(surface.style.cssText).toContain('left: 300px');
    expect(surface.style.cssText).toContain('top: 700px');
    expect(surface.style.cssText).toContain('width: 544px');
    expect(surface.style.cssText).toContain('height: 48px');
    expect(surface.dataset.companionPhase).toBe('collapsed');

    setOpen?.(true);
    flushAnimationFrame();
    expect(surface.dataset.companionPhase).toBe('expanding');
    expect(surface.querySelector('textarea')).toBe(textarea);
    flushAnimationFrame();
    expect(surface.style.bottom).not.toBe('0px');
    expect(surface.style.top).toBe('204px');
    expect(surface.style.height).toBe('544px');
    expect(Number.parseFloat(surface.style.top) + Number.parseFloat(surface.style.height)).toBe(
      748
    );
    expect(surface.querySelector('textarea')).toBe(textarea);
    expect(textarea.value).toBe('Keep this draft');

    finishTransition(surface);
    expect(surface.dataset.companionPhase).toBe('expanded');
    setOpen?.(false);
    flushAllAnimationFrames();
    expect(surface.style.left).toBe('300px');
    expect(surface.style.top).toBe('700px');
    expect(surface.querySelector('textarea')).toBe(textarea);
  });

  it('retargets interrupted transitions without committing a stale frame', () => {
    const { anchor, portalMount, renderHost } = createFixture();
    let setOpen: ((value: boolean) => void) | undefined;

    function Harness() {
      const [open, updateOpen] = createSignal(false);
      setOpen = updateOpen;
      return (
        <BottomBarCompanion
          retained
          visible
          open={open()}
          anchor={anchor}
          mount={portalMount}
          id="companion"
          label="Companion"
        />
      );
    }

    mount(() => <Harness />, renderHost);
    flushAllAnimationFrames();
    const surface = portalMount.querySelector('[data-floe-bottom-bar-companion]') as HTMLElement;

    setOpen?.(true);
    flushAnimationFrame();
    expect(surface.dataset.companionPhase).toBe('expanding');
    expect(surface.style.left).toBe('300px');
    expect(surface.style.top).toBe('700px');
    setOpen?.(false);
    flushAnimationFrame();
    expect(surface.dataset.companionPhase).toBe('collapsed');
    expect(surface.style.left).toBe('300px');
    expect(surface.style.top).toBe('700px');
    flushAllAnimationFrames();

    expect(surface.style.left).toBe('300px');
    expect(surface.style.top).toBe('700px');
    expect(surface.style.width).toBe('544px');
    expect(surface.style.height).toBe('48px');
    expect(surface.style.left).not.toBe('0px');
    expect(surface.style.top).not.toBe('0px');
  });

  it('settles a width-only geometry transition', () => {
    const { anchor, portalMount, renderHost } = createFixture({
      left: 200,
      top: 12,
      width: 700,
      height: 544,
    });
    let setOpen: ((value: boolean) => void) | undefined;

    function Harness() {
      const [open, updateOpen] = createSignal(false);
      setOpen = updateOpen;
      return (
        <BottomBarCompanion
          retained
          visible
          open={open()}
          anchor={anchor}
          mount={portalMount}
          id="companion"
          label="Companion"
        />
      );
    }

    mount(() => <Harness />, renderHost);
    flushAllAnimationFrames();
    const surface = portalMount.querySelector('[data-floe-bottom-bar-companion]') as HTMLElement;
    setOpen?.(true);
    flushAllAnimationFrames();
    expect(surface.style.height).toBe('544px');
    expect(surface.style.width).toBe('544px');
    expect(surface.dataset.companionPhase).toBe('expanding');
    finishTransition(surface, 'width');
    expect(surface.dataset.companionPhase).toBe('expanded');
  });

  it('keeps retained content mounted while visibility and open state change', () => {
    const { anchor, portalMount, renderHost } = createFixture();
    let setVisible: ((value: boolean) => void) | undefined;
    let setRetained: ((value: boolean) => void) | undefined;
    let setOpen: ((value: boolean) => void) | undefined;

    function Harness() {
      const [retained, updateRetained] = createSignal(true);
      const [visible, updateVisible] = createSignal(true);
      const [open, updateOpen] = createSignal(false);
      setRetained = updateRetained;
      setVisible = updateVisible;
      setOpen = updateOpen;
      return (
        <BottomBarCompanion
          retained={retained()}
          visible={visible()}
          open={open()}
          anchor={anchor}
          mount={portalMount}
          id="companion"
          label="Companion"
        >
          <input value="stable" />
        </BottomBarCompanion>
      );
    }

    mount(() => <Harness />, renderHost);
    flushAllAnimationFrames();
    const surface = portalMount.querySelector('[data-floe-bottom-bar-companion]') as HTMLElement;
    const input = surface.querySelector('input');

    setVisible?.(false);
    expect(portalMount.querySelector('input')).toBe(input);
    expect(surface.getAttribute('aria-hidden')).toBe('true');
    expect((surface as HTMLElement & { inert: boolean }).inert).toBe(true);
    setOpen?.(true);
    setVisible?.(true);
    flushAllAnimationFrames();
    expect(portalMount.querySelector('input')).toBe(input);

    setRetained?.(false);
    expect(portalMount.querySelector('[data-floe-bottom-bar-companion]')).toBeNull();
  });

  it('requires an explicit connected mount and retains the last valid anchor frame', () => {
    const { anchor, renderHost } = createFixture({ left: 220, top: 610, width: 480, height: 44 });
    let setPortalMount: ((value: HTMLElement | null) => void) | undefined;

    function Harness() {
      const [portalMount, updatePortalMount] = createSignal<HTMLElement | null>(null);
      setPortalMount = updatePortalMount;
      return (
        <BottomBarCompanion
          retained
          visible
          open={false}
          anchor={anchor}
          mount={portalMount()}
          id="companion"
          label="Companion"
        />
      );
    }

    mount(() => <Harness />, renderHost);
    flushAllAnimationFrames();
    expect(document.querySelector('[data-floe-bottom-bar-companion]')).toBeNull();

    const firstMount = document.createElement('div');
    document.body.appendChild(firstMount);
    setPortalMount?.(firstMount);
    flushAllAnimationFrames();
    const surface = firstMount.querySelector('[data-floe-bottom-bar-companion]') as HTMLElement;
    expect(surface.style.left).toBe('220px');
    expect(surface.style.top).toBe('610px');

    anchor.remove();
    window.dispatchEvent(new Event('resize'));
    flushAllAnimationFrames();
    expect(surface.style.left).toBe('220px');
    expect(surface.style.top).toBe('610px');

    const disconnectedMount = document.createElement('div');
    setPortalMount?.(disconnectedMount);
    flushAllAnimationFrames();
    expect(firstMount.querySelector('[data-floe-bottom-bar-companion]')).toBe(surface);
  });

  it('hides in the retained host until the requested mount becomes connected', async () => {
    const { anchor, portalMount, renderHost } = createFixture();
    let setPortalMount: ((value: HTMLElement | null) => void) | undefined;
    const onDismiss = vi.fn();

    function Harness() {
      const [mountTarget, updateMountTarget] = createSignal<HTMLElement | null>(portalMount);
      setPortalMount = updateMountTarget;
      return (
        <BottomBarCompanion
          retained
          visible
          open
          anchor={anchor}
          mount={mountTarget()}
          id="companion"
          label="Companion"
          onDismiss={onDismiss}
        >
          <textarea />
        </BottomBarCompanion>
      );
    }

    mount(() => <Harness />, renderHost);
    flushAllAnimationFrames();
    const surface = portalMount.querySelector('[data-floe-bottom-bar-companion]') as HTMLElement;
    const textarea = surface.querySelector('textarea');

    setPortalMount?.(null);
    flushAllAnimationFrames();
    expect(portalMount.querySelector('[data-floe-bottom-bar-companion]')).toBe(surface);
    expect(surface.dataset.companionVisibility).toBe('hidden');
    expect((surface as HTMLElement & { inert: boolean }).inert).toBe(true);
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(onDismiss).not.toHaveBeenCalled();

    const nextMount = document.createElement('div');
    setPortalMount?.(nextMount);
    flushAllAnimationFrames();
    expect(portalMount.querySelector('[data-floe-bottom-bar-companion]')).toBe(surface);
    expect(surface.dataset.companionVisibility).toBe('hidden');

    document.body.appendChild(nextMount);
    await Promise.resolve();
    flushAllAnimationFrames();
    expect(nextMount.querySelector('[data-floe-bottom-bar-companion]')).toBe(surface);
    expect(surface.querySelector('textarea')).toBe(textarea);
    expect(surface.dataset.companionVisibility).toBe('visible');
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(onDismiss).toHaveBeenCalledWith('outside-pointer');
  });

  it('retains the shell through active mount disconnect, reconnect, and replacement', async () => {
    const { anchor, portalMount, renderHost } = createFixture();
    let setPortalMount: ((value: HTMLElement | null) => void) | undefined;
    const contentHosts: Array<HTMLElement | null> = [];
    const onDismiss = vi.fn();

    function Harness() {
      const [mountTarget, updateMountTarget] = createSignal<HTMLElement | null>(portalMount);
      setPortalMount = updateMountTarget;
      return (
        <BottomBarCompanion
          retained
          visible
          open
          anchor={anchor}
          mount={mountTarget()}
          id="companion"
          label="Companion"
          contentHostRef={(element) => contentHosts.push(element)}
          onDismiss={onDismiss}
        >
          <textarea />
        </BottomBarCompanion>
      );
    }

    mount(() => <Harness />, renderHost);
    flushAllAnimationFrames();
    const surface = portalMount.querySelector('[data-floe-bottom-bar-companion]') as HTMLElement;
    const contentHost = surface.querySelector('[data-floe-bottom-bar-companion-content]');
    const textarea = surface.querySelector('textarea');

    portalMount.remove();
    await Promise.resolve();
    flushAllAnimationFrames();
    expect(portalMount.querySelector('[data-floe-bottom-bar-companion]')).toBe(surface);
    expect(surface.dataset.companionVisibility).toBe('hidden');
    expect(surface.querySelector('textarea')).toBe(textarea);
    expect(contentHosts.at(-1)).toBe(contentHost);
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(onDismiss).not.toHaveBeenCalled();

    document.body.appendChild(portalMount);
    await Promise.resolve();
    flushAllAnimationFrames();
    expect(surface.dataset.companionVisibility).toBe('visible');
    expect(portalMount.querySelector('[data-floe-bottom-bar-companion]')).toBe(surface);
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(onDismiss).toHaveBeenCalledWith('outside-pointer');

    const replacement = document.createElement('div');
    document.body.appendChild(replacement);
    setPortalMount?.(replacement);
    flushAllAnimationFrames();
    expect(replacement.querySelector('[data-floe-bottom-bar-companion]')).toBe(surface);
    expect(surface.querySelector('textarea')).toBe(textarea);
    expect(contentHosts.at(-1)).toBe(contentHost);
  });

  it('commits a replacement mount only when its paired anchor is ready', async () => {
    const { anchor, portalMount, renderHost } = createFixture();
    let setAnchor: ((value: HTMLElement | null) => void) | undefined;
    let setPortalMount: ((value: HTMLElement | null) => void) | undefined;
    const onDismiss = vi.fn();

    function Harness() {
      const [anchorTarget, updateAnchor] = createSignal<HTMLElement | null>(anchor);
      const [mountTarget, updateMountTarget] = createSignal<HTMLElement | null>(portalMount);
      setAnchor = updateAnchor;
      setPortalMount = updateMountTarget;
      return (
        <BottomBarCompanion
          retained
          visible
          open
          anchor={anchorTarget()}
          mount={mountTarget()}
          id="companion"
          label="Companion"
          onDismiss={onDismiss}
        >
          <textarea />
        </BottomBarCompanion>
      );
    }

    mount(() => <Harness />, renderHost);
    flushAllAnimationFrames();
    const surface = portalMount.querySelector('[data-floe-bottom-bar-companion]') as HTMLElement;
    const textarea = surface.querySelector('textarea');
    const nextMount = document.createElement('div');
    const nextAnchor = document.createElement('div');
    document.body.appendChild(nextMount);
    mockRect(nextAnchor, { left: 360, top: 680, width: 500, height: 48 });

    setAnchor?.(nextAnchor);
    setPortalMount?.(nextMount);
    flushAllAnimationFrames();
    expect(portalMount.querySelector('[data-floe-bottom-bar-companion]')).toBe(surface);
    expect(nextMount.querySelector('[data-floe-bottom-bar-companion]')).toBeNull();
    expect(surface.dataset.companionVisibility).toBe('hidden');
    expect(surface.style.left).toBe('300px');
    expect(surface.style.top).toBe('204px');
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(onDismiss).not.toHaveBeenCalled();

    document.body.appendChild(nextAnchor);
    await Promise.resolve();
    flushAllAnimationFrames();
    expect(nextMount.querySelector('[data-floe-bottom-bar-companion]')).toBe(surface);
    expect(surface.querySelector('textarea')).toBe(textarea);
    expect(surface.dataset.companionVisibility).toBe('visible');
    expect(surface.style.left).toBe('360px');
    expect(surface.style.top).toBe('184px');
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(onDismiss).toHaveBeenCalledWith('outside-pointer');
  });

  it('derives animation and dismissal from the mount owner document', () => {
    const renderHost = document.createElement('div');
    const iframe = document.createElement('iframe');
    document.body.append(renderHost, iframe);
    const ownerDocument = iframe.contentDocument;
    const ownerView = iframe.contentWindow;
    expect(ownerDocument).toBeTruthy();
    expect(ownerView).toBeTruthy();
    const anchor = ownerDocument!.createElement('div');
    const portalMount = ownerDocument!.createElement('div');
    const outside = ownerDocument!.createElement('button');
    ownerDocument!.body.append(anchor, portalMount, outside);
    mockRect(anchor, { left: 80, top: 500, width: 420, height: 44 });

    const ownerRafs = new Map<number, FrameRequestCallback>();
    let ownerRafId = 1;
    Object.defineProperty(ownerView, 'innerWidth', { configurable: true, value: 800 });
    Object.defineProperty(ownerView, 'innerHeight', { configurable: true, value: 700 });
    Object.defineProperty(ownerView, 'requestAnimationFrame', {
      configurable: true,
      value: (callback: FrameRequestCallback) => {
        const id = ownerRafId;
        ownerRafId += 1;
        ownerRafs.set(id, callback);
        return id;
      },
    });
    Object.defineProperty(ownerView, 'cancelAnimationFrame', {
      configurable: true,
      value: (id: number) => ownerRafs.delete(id),
    });
    const observe = vi.fn();
    const disconnect = vi.fn();
    Object.defineProperty(ownerView, 'ResizeObserver', {
      configurable: true,
      value: class {
        observe(element: Element) {
          observe(element);
        }

        disconnect() {
          disconnect();
        }
      },
    });
    const onDismiss = vi.fn();

    mount(
      () => (
        <BottomBarCompanion
          retained
          visible
          open
          anchor={anchor}
          mount={portalMount}
          id="companion"
          label="Companion"
          onDismiss={onDismiss}
        />
      ),
      renderHost
    );
    while (ownerRafs.size > 0) {
      const callbacks = [...ownerRafs.entries()];
      ownerRafs.clear();
      for (const [id, callback] of callbacks) callback(id);
    }

    const surface = portalMount.querySelector('[data-floe-bottom-bar-companion]') as HTMLElement;
    expect(surface.ownerDocument).toBe(ownerDocument);
    expect(surface.style.left).toBe('80px');
    expect(surface.style.top).toBe('12px');
    expect(observe).toHaveBeenCalledWith(anchor);
    expect(observe).toHaveBeenCalledWith(portalMount);
    outside.dispatchEvent(new ownerView!.MouseEvent('pointerdown', { bubbles: true }));
    expect(onDismiss).toHaveBeenCalledWith('outside-pointer');
    expect(rafCallbacks.size).toBe(0);
  });

  it('observes a late-connected replacement mount in another document', async () => {
    const renderHost = document.createElement('div');
    const iframeA = document.createElement('iframe');
    const iframeB = document.createElement('iframe');
    document.body.append(renderHost, iframeA, iframeB);
    const documentA = iframeA.contentDocument!;
    const documentB = iframeB.contentDocument!;
    const viewA = iframeA.contentWindow!;
    const viewB = iframeB.contentWindow!;
    const anchorA = documentA.createElement('div');
    const mountA = documentA.createElement('div');
    const anchorB = documentB.createElement('div');
    const mountB = documentB.createElement('div');
    documentA.body.append(anchorA, mountA);
    documentB.body.append(anchorB);
    mockRect(anchorA, { left: 40, top: 500, width: 420, height: 44 });
    mockRect(anchorB, { left: 120, top: 540, width: 460, height: 46 });

    const crossDocumentRafs = new Map<number, FrameRequestCallback>();
    let crossDocumentRafId = 1;
    for (const ownerView of [viewA, viewB]) {
      Object.defineProperty(ownerView, 'innerWidth', { configurable: true, value: 900 });
      Object.defineProperty(ownerView, 'innerHeight', { configurable: true, value: 760 });
      Object.defineProperty(ownerView, 'requestAnimationFrame', {
        configurable: true,
        value: (callback: FrameRequestCallback) => {
          const id = crossDocumentRafId;
          crossDocumentRafId += 1;
          crossDocumentRafs.set(id, callback);
          return id;
        },
      });
      Object.defineProperty(ownerView, 'cancelAnimationFrame', {
        configurable: true,
        value: (id: number) => crossDocumentRafs.delete(id),
      });
    }
    const flushCrossDocumentRafs = () => {
      let guard = 0;
      while (crossDocumentRafs.size > 0) {
        const callbacks = [...crossDocumentRafs.entries()];
        crossDocumentRafs.clear();
        for (const [id, callback] of callbacks) callback(id);
        guard += 1;
        if (guard > 20) throw new Error('Cross-document RAF queue did not settle');
      }
    };

    let setAnchor: ((value: HTMLElement | null) => void) | undefined;
    let setPortalMount: ((value: HTMLElement | null) => void) | undefined;
    function Harness() {
      const [anchorTarget, updateAnchor] = createSignal<HTMLElement | null>(anchorA);
      const [mountTarget, updateMountTarget] = createSignal<HTMLElement | null>(mountA);
      setAnchor = updateAnchor;
      setPortalMount = updateMountTarget;
      return (
        <BottomBarCompanion
          retained
          visible
          open={false}
          anchor={anchorTarget()}
          mount={mountTarget()}
          id="companion"
          label="Companion"
        >
          <textarea />
        </BottomBarCompanion>
      );
    }

    mount(() => <Harness />, renderHost);
    flushCrossDocumentRafs();
    const surface = mountA.querySelector('[data-floe-bottom-bar-companion]') as HTMLElement;
    const textarea = surface.querySelector('textarea');
    setAnchor?.(anchorB);
    setPortalMount?.(mountB);
    flushCrossDocumentRafs();
    expect(mountA.querySelector('[data-floe-bottom-bar-companion]')).toBe(surface);
    expect(surface.dataset.companionVisibility).toBe('hidden');

    documentB.body.appendChild(mountB);
    await Promise.resolve();
    flushCrossDocumentRafs();
    expect(mountB.querySelector('[data-floe-bottom-bar-companion]')).toBe(surface);
    expect(surface.ownerDocument).toBe(documentB);
    expect(surface.querySelector('textarea')).toBe(textarea);
    expect(surface.dataset.companionVisibility).toBe('visible');
    expect(surface.style.left).toBe('120px');
    expect(surface.style.top).toBe('540px');
  });

  it('honors an initially expanded state without exposing a collapsed frame', () => {
    const { anchor, portalMount, renderHost } = createFixture();
    mount(
      () => (
        <BottomBarCompanion
          retained
          visible
          open
          anchor={anchor}
          mount={portalMount}
          id="companion"
          label="Companion"
        />
      ),
      renderHost
    );
    flushAllAnimationFrames();
    const surface = portalMount.querySelector('[data-floe-bottom-bar-companion]') as HTMLElement;
    expect(surface.dataset.companionPhase).toBe('expanded');
    expect(surface.style.top).toBe('204px');
    expect(surface.style.height).toBe('544px');
  });

  it('dismisses outside pointers in capture and lets owned surfaces handle Escape first', () => {
    const { anchor, portalMount, renderHost } = createFixture();
    const outside = document.createElement('button');
    const ownedPortal = document.createElement('div');
    const ownedInput = document.createElement('input');
    ownedPortal.appendChild(ownedInput);
    document.body.append(outside, ownedPortal);
    outside.addEventListener('pointerdown', (event) => event.stopPropagation());
    const onDismiss = vi.fn();

    mount(
      () => (
        <BottomBarCompanion
          retained
          visible
          open
          anchor={anchor}
          mount={portalMount}
          id="companion"
          label="Companion"
          isOwnedInteraction={(event) => event.composedPath().includes(ownedPortal)}
          onDismiss={onDismiss}
        >
          <input data-testid="inside" />
        </BottomBarCompanion>
      ),
      renderHost
    );
    flushAllAnimationFrames();

    outside.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(onDismiss).toHaveBeenLastCalledWith('outside-pointer');
    onDismiss.mockClear();
    ownedPortal.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(onDismiss).not.toHaveBeenCalled();

    ownedInput.focus();
    ownedInput.addEventListener('keydown', (event) => event.preventDefault(), { once: true });
    ownedInput.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    );
    expect(onDismiss).not.toHaveBeenCalled();
    ownedInput.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    );
    expect(onDismiss).toHaveBeenLastCalledWith('escape');
    onDismiss.mockClear();

    const insideInput = portalMount.querySelector('[data-testid="inside"]') as HTMLInputElement;
    insideInput.focus();
    insideInput.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
        isComposing: true,
      })
    );
    expect(onDismiss).not.toHaveBeenCalled();
    outside.focus();
    outside.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    );
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('applies geometry immediately when reduced motion is preferred', () => {
    const { anchor, portalMount, renderHost } = createFixture();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: true }),
    });
    let setOpen: ((value: boolean) => void) | undefined;

    function Harness() {
      const [open, updateOpen] = createSignal(false);
      setOpen = updateOpen;
      return (
        <BottomBarCompanion
          retained
          visible
          open={open()}
          anchor={anchor}
          mount={portalMount}
          id="companion"
          label="Companion"
        />
      );
    }

    mount(() => <Harness />, renderHost);
    flushAllAnimationFrames();
    const surface = portalMount.querySelector('[data-floe-bottom-bar-companion]') as HTMLElement;
    setOpen?.(true);
    flushAnimationFrame();
    expect(surface.dataset.companionPhase).toBe('expanded');
    expect(surface.style.height).toBe('544px');
    expect(rafCallbacks.size).toBe(0);
  });
});
