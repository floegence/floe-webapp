// @vitest-environment jsdom

import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  WorkbenchSurface,
  createDefaultWorkbenchState,
  type WorkbenchState,
  type WorkbenchWidgetDefinition,
  type WorkbenchWidgetItem,
} from '../src/components/workbench';

vi.mock('solid-motionone', () => ({
  Motion: new Proxy(
    {},
    {
      get:
        () =>
        ({ children }: { children?: unknown }) =>
          children ?? null,
    }
  ),
}));

const widgetDefinitions: readonly WorkbenchWidgetDefinition[] = [
  {
    type: 'custom.files',
    label: 'Files',
    icon: () => null,
    body: () => <div>Files</div>,
    defaultTitle: 'Files',
    defaultSize: { width: 360, height: 240 },
  },
  {
    type: 'custom.terminal',
    label: 'Terminal',
    icon: () => null,
    body: () => <div>Terminal</div>,
    defaultTitle: 'Terminal',
    defaultSize: { width: 420, height: 260 },
  },
];

function widget(
  id: string,
  type: 'custom.files' | 'custom.terminal',
  x: number,
  y: number,
  createdAtUnixMs: number
): WorkbenchWidgetItem {
  return {
    id,
    type,
    title: id,
    x,
    y,
    width: type === 'custom.files' ? 360 : 420,
    height: type === 'custom.files' ? 240 : 260,
    z_index: createdAtUnixMs,
    created_at_unix_ms: createdAtUnixMs,
  };
}

async function flushEffects(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function configureCanvasFrame(host: ParentNode): HTMLElement {
  const frame = host.querySelector(
    '[data-floe-workbench-canvas-frame="true"]'
  ) as HTMLElement | null;
  const modelFrame = host.querySelector('.workbench-canvas') as HTMLElement | null;
  expect(frame).toBeTruthy();
  expect(modelFrame).toBeTruthy();
  Object.defineProperties(frame!, {
    getBoundingClientRect: {
      configurable: true,
      value: () => ({
        left: 0,
        top: 0,
        right: 800,
        bottom: 600,
        width: 800,
        height: 600,
        x: 0,
        y: 0,
        toJSON: () => undefined,
      }),
    },
  });
  Object.defineProperties(modelFrame!, {
    clientWidth: { configurable: true, get: () => 800 },
    clientHeight: { configurable: true, get: () => 600 },
  });
  resizeObserverCallback?.(
    [{ target: modelFrame!, contentRect: { width: 800, height: 600 } } as ResizeObserverEntry],
    {} as ResizeObserver
  );
  return frame!;
}

function dockButton(host: ParentNode, id: string): HTMLButtonElement {
  const button = host.querySelector(
    `button[data-workbench-dock-component="${id}"]`
  ) as HTMLButtonElement | null;
  expect(button).toBeTruthy();
  return button!;
}

let animationFrames: FrameRequestCallback[] = [];
let resizeObserverCallback: ResizeObserverCallback | null = null;

class ResizeObserverMock {
  constructor(callback: ResizeObserverCallback) {
    resizeObserverCallback = callback;
  }

  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

function finishNavigation(now = 500): void {
  const frames = animationFrames;
  animationFrames = [];
  for (const frame of frames) frame(now);
}

describe('WorkbenchSurface Dock focus cycle', () => {
  beforeEach(() => {
    animationFrames = [];
    resizeObserverCallback = null;
    (globalThis as typeof globalThis & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver =
      ResizeObserverMock as unknown as typeof ResizeObserver;
    vi.spyOn(performance, 'now').mockReturnValue(0);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      animationFrames.push(callback);
      return animationFrames.length;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    delete (globalThis as typeof globalThis & { ResizeObserver?: typeof ResizeObserver })
      .ResizeObserver;
  });

  it('focuses spatially ordered widgets, advances, wraps, resets, and preserves scale', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const filesLower = widget('files-lower', 'custom.files', 20, 300, 2);
    const filesUpper = widget('files-upper', 'custom.files', 100, 20, 1);
    const terminal = widget('terminal', 'custom.terminal', 700, 40, 3);
    let readState: () => WorkbenchState = () => createDefaultWorkbenchState(widgetDefinitions);
    let writeState: (updater: (previous: WorkbenchState) => WorkbenchState) => void = () => {};

    render(() => {
      const initial = createDefaultWorkbenchState(widgetDefinitions);
      const [state, setState] = createSignal<WorkbenchState>({
        ...initial,
        widgets: [filesLower, filesUpper, terminal],
        viewport: { x: -40, y: 15, scale: 0.65 },
        selectedWidgetId: null,
        selectedObject: null,
      });
      readState = state;
      writeState = setState;
      return (
        <WorkbenchSurface
          state={state}
          setState={setState}
          widgetDefinitions={widgetDefinitions}
          dockItemActivationMode="focus-cycle"
        />
      );
    }, host);

    await flushEffects();
    configureCanvasFrame(host);
    const filesButton = dockButton(host, 'custom.files');
    expect(filesButton.getAttribute('aria-label')).toBe('Files 2');

    filesButton.click();
    await flushEffects();
    expect(readState().selectedObject).toEqual({ kind: 'widget', id: filesUpper.id });
    expect(document.activeElement?.getAttribute('data-floe-workbench-widget-id')).toBe(
      filesUpper.id
    );
    expect(filesButton.getAttribute('aria-label')).toBe('Files 1/2');
    finishNavigation();
    expect(readState().viewport).toEqual({ x: 218, y: 209, scale: 0.65 });

    filesButton.click();
    await flushEffects();
    expect(readState().selectedObject).toEqual({ kind: 'widget', id: filesLower.id });
    finishNavigation();
    expect(readState().viewport.scale).toBe(0.65);

    filesButton.click();
    await flushEffects();
    expect(readState().selectedObject).toEqual({ kind: 'widget', id: filesUpper.id });

    writeState((previous) => ({
      ...previous,
      selectedWidgetId: terminal.id,
      selectedObject: { kind: 'widget', id: terminal.id },
    }));
    await flushEffects();
    filesButton.click();
    await flushEffects();
    expect(readState().selectedObject).toEqual({ kind: 'widget', id: filesUpper.id });

    dockButton(host, 'custom.terminal').click();
    await flushEffects();
    filesButton.click();
    await flushEffects();
    expect(readState().selectedObject).toEqual({ kind: 'widget', id: filesUpper.id });
  });

  it('creates empty widget and layer types at the viewport center and focuses them while locked', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    let readState: () => WorkbenchState = () => createDefaultWorkbenchState(widgetDefinitions);
    let writeState: (updater: (previous: WorkbenchState) => WorkbenchState) => void = () => {};

    render(() => {
      const initial = createDefaultWorkbenchState(widgetDefinitions);
      const [state, setState] = createSignal<WorkbenchState>({
        ...initial,
        locked: true,
        viewport: { x: 40, y: 20, scale: 0.8 },
      });
      readState = state;
      writeState = setState;
      return (
        <WorkbenchSurface
          state={state}
          setState={setState}
          widgetDefinitions={widgetDefinitions}
          dockItemActivationMode="focus-cycle"
        />
      );
    }, host);

    await flushEffects();
    configureCanvasFrame(host);
    const filesButton = dockButton(host, 'custom.files');
    expect(filesButton.getAttribute('aria-label')).toBe('Files +');
    filesButton.click();
    await flushEffects();

    expect(readState().widgets[0]).toMatchObject({
      type: 'custom.files',
      x: 270,
      y: 230,
    });
    expect(readState().locked).toBe(true);
    expect(document.activeElement?.getAttribute('data-floe-workbench-widget-id')).toBe(
      readState().widgets[0]?.id
    );

    dockButton(host, 'sticky-note').click();
    await flushEffects();
    const sticky = readState().stickyNotes?.[0];
    expect(sticky).toBeTruthy();
    expect(document.activeElement?.getAttribute('data-wb-object-id')).toBe(sticky?.id);

    writeState((previous) => ({ ...previous, mode: 'background' }));
    await flushEffects();
    dockButton(host, 'text').click();
    await flushEffects();
    const annotation = readState().annotations?.[0];
    expect(annotation).toBeTruthy();
    expect(document.activeElement?.getAttribute('data-wb-object-id')).toBe(annotation?.id);
    expect(
      host
        .querySelector(`[data-wb-object-id="${annotation?.id}"] [data-wb-part="content"]`)
        ?.getAttribute('contenteditable')
    ).toBe('false');

    dockButton(host, 'background-region').click();
    await flushEffects();
    const region = readState().backgroundLayers?.[0];
    expect(region).toBeTruthy();
    expect(document.activeElement?.getAttribute('data-wb-object-id')).toBe(region?.id);
    expect(readState().locked).toBe(true);
    expect(readState().viewport.scale).toBe(0.8);
  });
});
