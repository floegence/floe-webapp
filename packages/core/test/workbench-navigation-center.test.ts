// @vitest-environment jsdom

import { createRoot, createSignal, untrack } from 'solid-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useWorkbenchModel } from '../src/components/workbench/useWorkbenchModel';
import type {
  WorkbenchState,
  WorkbenchWidgetDefinition,
  WorkbenchWidgetItem,
} from '../src/components/workbench/types';
import { createWorkbenchFilterState } from '../src/components/workbench/widgets/widgetRegistry';

const definitions: readonly WorkbenchWidgetDefinition[] = [
  {
    type: 'custom.panel',
    label: 'Panel',
    icon: () => null,
    body: () => null,
    defaultTitle: 'Panel',
    defaultSize: { width: 200, height: 120 },
  },
];

function createWidget(id: string, x: number, y: number): WorkbenchWidgetItem<'custom.panel'> {
  return {
    id,
    type: 'custom.panel',
    title: id,
    x,
    y,
    width: 200,
    height: 120,
    z_index: 1,
    created_at_unix_ms: 1,
  };
}

function createWorkbenchState(widgets: readonly WorkbenchWidgetItem[], selectedWidgetId: string | null): WorkbenchState {
  return {
    version: 1,
    widgets: [...widgets],
    viewport: { x: 0, y: 0, scale: 1 },
    locked: false,
    filters: createWorkbenchFilterState(definitions),
    selectedWidgetId,
  };
}

function createFrameHarness(initialWidth: number, initialHeight: number) {
  const element = document.createElement('div');
  let width = initialWidth;
  let height = initialHeight;

  Object.defineProperty(element, 'clientWidth', {
    configurable: true,
    get: () => width,
  });
  Object.defineProperty(element, 'clientHeight', {
    configurable: true,
    get: () => height,
  });

  return {
    element,
    setSize(nextWidth: number, nextHeight: number) {
      width = nextWidth;
      height = nextHeight;
    },
  };
}

class ResizeObserverMock {
  static instances: ResizeObserverMock[] = [];

  readonly callback: ResizeObserverCallback;
  readonly observed = new Set<Element>();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    ResizeObserverMock.instances.push(this);
  }

  observe(target: Element) {
    this.observed.add(target);
  }

  unobserve(target: Element) {
    this.observed.delete(target);
  }

  disconnect() {
    this.observed.clear();
  }

  emit(target: Element, width: number, height: number) {
    const entry = {
      target,
      contentRect: { width, height },
    } as ResizeObserverEntry;
    this.callback([entry], this as unknown as ResizeObserver);
  }

  static reset() {
    ResizeObserverMock.instances = [];
  }
}

function flushLatestAnimationFrame(now = 480) {
  const callbacks = [...rafQueue];
  rafQueue = [];
  const callback = callbacks.at(-1);
  if (!callback) {
    throw new Error('Expected a pending requestAnimationFrame callback.');
  }
  callback(now);
}

let rafQueue: FrameRequestCallback[] = [];

describe('workbench navigation centering', () => {
  beforeEach(() => {
    rafQueue = [];
    ResizeObserverMock.reset();
    (
      globalThis as typeof globalThis & { ResizeObserver?: typeof ResizeObserver }
    ).ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
    vi.spyOn(performance, 'now').mockReturnValue(0);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      rafQueue.push(callback);
      return rafQueue.length;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    ResizeObserverMock.reset();
    delete (globalThis as typeof globalThis & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
    document.body.innerHTML = '';
  });

  it('centers the newly selected widget when arrow navigation moves focus', () => {
    createRoot((dispose) => {
      const widgets = [
        createWidget('widget-left', 0, 0),
        createWidget('widget-right', 600, 0),
      ];
      const [state, setState] = createSignal(createWorkbenchState(widgets, 'widget-left'));
      const model = useWorkbenchModel({
        state,
        setState,
        onClose: vi.fn(),
        widgetDefinitions: definitions,
      });
      const frame = createFrameHarness(800, 600);

      model.setCanvasFrameRef(frame.element);
      model.navigation.handleArrowNavigation('right');
      flushLatestAnimationFrame();

      expect(untrack(state).selectedWidgetId).toBe('widget-right');
      expect(untrack(state).viewport).toEqual({
        x: -300,
        y: 240,
        scale: 1,
      });

      dispose();
    });
  });

  it('recovers from an initial zero-size frame after a resize observer update', () => {
    createRoot((dispose) => {
      const widget = createWidget('widget-right', 600, 0);
      const [state, setState] = createSignal(createWorkbenchState([widget], widget.id));
      const model = useWorkbenchModel({
        state,
        setState,
        onClose: vi.fn(),
        widgetDefinitions: definitions,
      });
      const frame = createFrameHarness(0, 0);

      model.setCanvasFrameRef(frame.element);
      frame.setSize(800, 600);
      ResizeObserverMock.instances[0]?.emit(frame.element, 800, 600);

      model.navigation.focusWidget(widget);
      flushLatestAnimationFrame();

      expect(untrack(state).viewport).toEqual({
        x: -300,
        y: 240,
        scale: 1,
      });

      dispose();
    });
  });

  it('keeps only the latest navigation animation active when focus changes repeatedly', () => {
    createRoot((dispose) => {
      const left = createWidget('widget-left', 0, 0);
      const right = createWidget('widget-right', 600, 0);
      const [state, setState] = createSignal(createWorkbenchState([left, right], left.id));
      const model = useWorkbenchModel({
        state,
        setState,
        onClose: vi.fn(),
        widgetDefinitions: definitions,
      });
      const frame = createFrameHarness(800, 600);

      model.setCanvasFrameRef(frame.element);
      model.navigation.focusWidget(right);
      model.navigation.focusWidget(left);

      expect(rafQueue).toHaveLength(2);

      const [firstFrame, secondFrame] = rafQueue;
      rafQueue = [];
      firstFrame?.(480);

      expect(untrack(state).viewport).toEqual({
        x: 0,
        y: 0,
        scale: 1,
      });

      secondFrame?.(480);

      expect(untrack(state).selectedWidgetId).toBe(left.id);
      expect(untrack(state).viewport).toEqual({
        x: 300,
        y: 240,
        scale: 1,
      });

      dispose();
    });
  });
});
