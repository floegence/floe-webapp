// @vitest-environment jsdom

import { onMount } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FloeProvider } from '../src/app/FloeProvider';
import { DeckGrid } from '../src/components/deck/DeckGrid';
import { useDeck, type DeckContextValue } from '../src/context/DeckContext';
import { useWidgetRegistry, type WidgetDefinition } from '../src/context/WidgetRegistry';
import { useDeckDrag } from '../src/hooks/useDeckDrag';

const TEST_WIDGET_TYPE = 'custom.deck-test';

const TEST_WIDGET: WidgetDefinition = {
  type: TEST_WIDGET_TYPE,
  name: 'Deck Test',
  category: 'custom',
  component: () => <div data-testid="deck-widget-body">Body</div>,
  minColSpan: 4,
  minRowSpan: 3,
  defaultColSpan: 6,
  defaultRowSpan: 4,
};

function installPointerPrimitives() {
  if (typeof PointerEvent === 'undefined') {
    (globalThis as typeof globalThis & { PointerEvent?: typeof MouseEvent }).PointerEvent =
      MouseEvent as typeof PointerEvent;
  }

  if (!HTMLElement.prototype.setPointerCapture) {
    HTMLElement.prototype.setPointerCapture = (() => undefined) as typeof HTMLElement.prototype.setPointerCapture;
  }

  if (!HTMLElement.prototype.releasePointerCapture) {
    HTMLElement.prototype.releasePointerCapture = (() => undefined) as typeof HTMLElement.prototype.releasePointerCapture;
  }
}

function installGridGeometry(gridEl: HTMLElement) {
  Object.defineProperty(gridEl, 'clientWidth', { configurable: true, value: 960 });
  Object.defineProperty(gridEl, 'clientHeight', { configurable: true, value: 640 });
  Object.defineProperty(gridEl, 'scrollHeight', { configurable: true, value: 1600 });

  let scrollTop = 0;
  Object.defineProperty(gridEl, 'scrollTop', {
    configurable: true,
    get: () => scrollTop,
    set: (value: number) => {
      scrollTop = value;
    },
  });

  gridEl.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    top: 0,
    right: 960,
    bottom: 640,
    left: 0,
    width: 960,
    height: 640,
    toJSON: () => ({}),
  }) as DOMRect;
}

function dispatchPointer(target: EventTarget, type: string, init: PointerEventInit & { pointerId: number }) {
  const EventCtor = typeof PointerEvent === 'function' ? PointerEvent : MouseEvent;
  const event = new EventCtor(type, {
    bubbles: true,
    cancelable: true,
    ...init,
  });

  if (!('pointerId' in event)) {
    Object.defineProperty(event, 'pointerId', { configurable: true, value: init.pointerId });
  }

  target.dispatchEvent(event);
}

async function flushEffects() {
  await Promise.resolve();
  await Promise.resolve();
}

function DeckHarness(props: { onReady: (deck: DeckContextValue) => void }) {
  const deck = useDeck();
  const widgetRegistry = useWidgetRegistry();

  useDeckDrag();

  onMount(() => {
    widgetRegistry.register(TEST_WIDGET);
    deck.createLayout('Test layout', [
      {
        id: 'widget-a',
        type: TEST_WIDGET_TYPE,
        position: { col: 0, row: 0, colSpan: 6, rowSpan: 4 },
      },
      {
        id: 'widget-b',
        type: TEST_WIDGET_TYPE,
        position: { col: 16, row: 0, colSpan: 6, rowSpan: 4 },
      },
    ]);
    props.onReady(deck);
  });

  return (
    <div style={{ width: '960px', height: '640px' }}>
      <DeckGrid />
    </div>
  );
}

describe('Deck pointer session', () => {
  let dispose: (() => void) | undefined;

  beforeEach(() => {
    installPointerPrimitives();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(() => false),
      })),
    });
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      callback(16);
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  });

  afterEach(() => {
    dispose?.();
    dispose = undefined;
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('keeps a snapped drop preview while the dragged widget follows continuous pointer motion', async () => {
    let deckApi: DeckContextValue | undefined;
    const host = document.createElement('div');
    document.body.appendChild(host);

    dispose = render(() => (
      <FloeProvider>
        <DeckHarness onReady={(deck) => { deckApi = deck; }} />
      </FloeProvider>
    ), host);

    await flushEffects();

    const gridEl = host.querySelector('.deck-grid') as HTMLElement | null;
    expect(gridEl).toBeTruthy();
    installGridGeometry(gridEl!);

    const dragHandle = host.querySelector('[data-widget-drag-handle="widget-a"]') as HTMLElement | null;
    expect(dragHandle).toBeTruthy();

    dispatchPointer(dragHandle!, 'pointerdown', { pointerId: 1, button: 0, clientX: 120, clientY: 96 });
    dispatchPointer(document, 'pointermove', { pointerId: 1, button: 0, clientX: 138, clientY: 106 });
    await flushEffects();

    const widgetEl = host.querySelector('[data-floe-deck-widget-id="widget-a"]') as HTMLElement | null;
    const previewEl = host.querySelector('[data-floe-deck-drop-preview="true"]') as HTMLElement | null;
    expect(widgetEl).toBeTruthy();
    expect(previewEl).toBeTruthy();
    expect(widgetEl!.style.position).toBe('absolute');
    expect(widgetEl!.style.transform).toContain('translate3d(18px, 10px, 0)');
    expect(previewEl!.style.gridArea).toBe('1 / 1 / 5 / 7');
    expect(deckApi!.dragState()?.currentPosition).toEqual({ col: 0, row: 0, colSpan: 6, rowSpan: 4 });
  });

  it('commits drag release through the document fallback even when pointerup lands on another widget', async () => {
    let deckApi: DeckContextValue | undefined;
    const host = document.createElement('div');
    document.body.appendChild(host);

    dispose = render(() => (
      <FloeProvider>
        <DeckHarness onReady={(deck) => { deckApi = deck; }} />
      </FloeProvider>
    ), host);

    await flushEffects();

    const gridEl = host.querySelector('.deck-grid') as HTMLElement | null;
    expect(gridEl).toBeTruthy();
    installGridGeometry(gridEl!);

    const dragHandle = host.querySelector('[data-widget-drag-handle="widget-a"]') as HTMLElement | null;
    const otherWidget = host.querySelector('[data-floe-deck-widget-id="widget-b"]') as HTMLElement | null;
    expect(dragHandle).toBeTruthy();
    expect(otherWidget).toBeTruthy();

    dispatchPointer(dragHandle!, 'pointerdown', { pointerId: 1, button: 0, clientX: 120, clientY: 96 });
    dispatchPointer(document, 'pointermove', { pointerId: 1, button: 0, clientX: 340, clientY: 96 });
    dispatchPointer(otherWidget!, 'pointerup', { pointerId: 1, button: 0, clientX: 340, clientY: 96 });
    await flushEffects();

    expect(deckApi!.dragState()).toBeNull();
    const widget = deckApi!.activeLayout()!.widgets.find((item) => item.id === 'widget-a');
    expect(widget?.position.col).toBe(6);
    expect(widget?.position.row).toBe(0);
  });

  it('commits resize release through the document fallback when the pointer crosses another widget', async () => {
    let deckApi: DeckContextValue | undefined;
    const host = document.createElement('div');
    document.body.appendChild(host);

    dispose = render(() => (
      <FloeProvider>
        <DeckHarness onReady={(deck) => { deckApi = deck; }} />
      </FloeProvider>
    ), host);

    await flushEffects();

    const gridEl = host.querySelector('.deck-grid') as HTMLElement | null;
    expect(gridEl).toBeTruthy();
    installGridGeometry(gridEl!);

    const widget = host.querySelector('[data-floe-deck-widget-id="widget-a"]') as HTMLElement | null;
    const otherWidget = host.querySelector('[data-floe-deck-widget-id="widget-b"]') as HTMLElement | null;
    const resizeHandle = widget?.querySelector('[data-widget-resize-handle="se"]') as HTMLElement | null;
    expect(resizeHandle).toBeTruthy();
    expect(otherWidget).toBeTruthy();

    dispatchPointer(resizeHandle!, 'pointerdown', { pointerId: 2, button: 0, clientX: 220, clientY: 120 });
    dispatchPointer(document, 'pointermove', { pointerId: 2, button: 0, clientX: 420, clientY: 220 });
    dispatchPointer(otherWidget!, 'pointerup', { pointerId: 2, button: 0, clientX: 420, clientY: 220 });
    await flushEffects();

    expect(deckApi!.resizeState()).toBeNull();
    const updated = deckApi!.activeLayout()!.widgets.find((item) => item.id === 'widget-a');
    expect(updated?.position.colSpan).toBeGreaterThan(6);
    expect(updated?.position.rowSpan).toBeGreaterThan(4);
  });

  it('treats lostpointercapture as a shared resize teardown path', async () => {
    let deckApi: DeckContextValue | undefined;
    const host = document.createElement('div');
    document.body.appendChild(host);

    dispose = render(() => (
      <FloeProvider>
        <DeckHarness onReady={(deck) => { deckApi = deck; }} />
      </FloeProvider>
    ), host);

    await flushEffects();

    const gridEl = host.querySelector('.deck-grid') as HTMLElement | null;
    expect(gridEl).toBeTruthy();
    installGridGeometry(gridEl!);

    const widget = host.querySelector('[data-floe-deck-widget-id="widget-a"]') as HTMLElement | null;
    const resizeHandle = widget?.querySelector('[data-widget-resize-handle="se"]') as HTMLElement | null;
    expect(resizeHandle).toBeTruthy();

    dispatchPointer(resizeHandle!, 'pointerdown', { pointerId: 3, button: 0, clientX: 220, clientY: 120 });
    dispatchPointer(document, 'pointermove', { pointerId: 3, button: 0, clientX: 360, clientY: 200 });
    resizeHandle!.dispatchEvent(new Event('lostpointercapture'));
    await flushEffects();

    expect(deckApi!.resizeState()).toBeNull();
    const updated = deckApi!.activeLayout()!.widgets.find((item) => item.id === 'widget-a');
    expect(updated?.position.colSpan).toBeGreaterThan(6);
    expect(updated?.position.rowSpan).toBeGreaterThan(4);
  });
});
