// @vitest-environment jsdom

import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  WORKBENCH_REGION_FILL_OPTIONS,
  WorkbenchSurface,
  createDefaultWorkbenchState,
  type WorkbenchSurfaceApi,
  type WorkbenchState,
  type WorkbenchWidgetDefinition,
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
    body: () => <div data-testid="files-body">Files</div>,
    defaultTitle: 'Files',
    defaultSize: { width: 360, height: 240 },
  },
  {
    type: 'custom.terminal',
    label: 'Terminal',
    icon: () => null,
    body: () => <div data-testid="terminal-body">Terminal</div>,
    defaultTitle: 'Terminal',
    defaultSize: { width: 420, height: 260 },
  },
];

const projectedWidgetDefinitions: readonly WorkbenchWidgetDefinition[] = widgetDefinitions.map(
  (definition) => ({
    ...definition,
    renderMode: 'projected_surface',
  })
);

const projectedClickableWidgetDefinitions: readonly WorkbenchWidgetDefinition[] =
  projectedWidgetDefinitions.map((definition) => ({
    ...definition,
    body: (props) => (
      <button type="button" data-testid={`projected-click-${props.widgetId}`}>
        {definition.label}
      </button>
    ),
  }));

async function flushWorkbenchEffects(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function findWidgetRoot(host: ParentNode, widgetId: string): HTMLElement {
  const root = host.querySelector(
    `[data-floe-workbench-widget-id="${widgetId}"]`
  ) as HTMLElement | null;
  expect(root).toBeTruthy();
  return root!;
}

function readElementZIndex(element: HTMLElement): number {
  return Number.parseInt(element.style.zIndex || '0', 10);
}

function dispatchPointerEvent(
  type: string,
  target: EventTarget,
  options: {
    pointerId?: number;
    clientX?: number;
    clientY?: number;
    buttons?: number;
  } = {}
): void {
  const EventCtor = typeof PointerEvent === 'function' ? PointerEvent : MouseEvent;
  const event = new EventCtor(type, {
    bubbles: true,
    button: 0,
    clientX: options.clientX ?? 0,
    clientY: options.clientY ?? 0,
  });
  if (!('pointerId' in event)) {
    Object.defineProperty(event, 'pointerId', {
      configurable: true,
      value: options.pointerId ?? 1,
    });
  }
  Object.defineProperty(event, 'buttons', {
    configurable: true,
    value: options.buttons ?? 1,
  });
  target.dispatchEvent(event);
}

function mockWorkbenchCanvasFrame(host: HTMLElement): void {
  const frame = host.querySelector(
    '[data-floe-workbench-canvas-frame="true"]'
  ) as HTMLElement | null;
  expect(frame).toBeTruthy();
  Object.defineProperty(frame, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      left: 100,
      top: 50,
      right: 900,
      bottom: 650,
      width: 800,
      height: 600,
      x: 100,
      y: 50,
      toJSON: () => undefined,
    }),
  });
}

describe('WorkbenchSurface api', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('supports launcher filtering together with the expanded surface api', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    let surfaceApi: WorkbenchSurfaceApi | null = null;
    let readState: () => WorkbenchState = () => createDefaultWorkbenchState(widgetDefinitions);

    render(() => {
      const [state, setState] = createSignal(createDefaultWorkbenchState(widgetDefinitions));
      readState = state;

      return (
        <WorkbenchSurface
          state={state}
          setState={setState}
          widgetDefinitions={widgetDefinitions}
          launcherWidgetTypes={['custom.files']}
          interactionAdapter={{
            surfaceRootAttr: 'data-test-workbench-surface-root',
            widgetRootAttr: 'data-test-workbench-widget-root',
            widgetIdAttr: 'data-test-workbench-widget-id',
          }}
          onApiReady={(api) => {
            surfaceApi = api;
          }}
        />
      );
    }, host);

    await Promise.resolve();

    expect(
      host.querySelector('button[aria-label="Files — click to solo, drag to canvas to create"]')
    ).toBeTruthy();
    expect(
      host.querySelector('button[aria-label="Terminal — click to solo, drag to canvas to create"]')
    ).toBeNull();

    surfaceApi!.createWidget('custom.files', {
      centerViewport: false,
      worldX: 200,
      worldY: 120,
    });
    await Promise.resolve();

    const [widget] = readState().widgets;
    expect(widget?.type).toBe('custom.files');
    expect(widget).toMatchObject({
      x: 20,
      y: 0,
      width: 360,
      height: 240,
    });
    expect(surfaceApi!.findWidgetById(widget!.id)).toMatchObject({
      id: widget!.id,
      title: 'Files',
    });

    surfaceApi!.updateWidgetTitle(widget!.id, 'README.md');
    await Promise.resolve();

    expect(readState().widgets[0]?.title).toBe('README.md');
    expect(host.querySelector('[data-test-workbench-surface-root="true"]')).toBeTruthy();

    const widgetRoot = host.querySelector(
      `[data-test-workbench-widget-root="true"][data-test-workbench-widget-id="${widget!.id}"]`
    ) as HTMLElement | null;
    expect(widgetRoot).toBeTruthy();
  });

  it('moves visual front ownership to the newest projected widget when it is created', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    let surfaceApi: WorkbenchSurfaceApi | null = null;

    render(() => {
      const [state, setState] = createSignal(
        createDefaultWorkbenchState(projectedWidgetDefinitions)
      );

      return (
        <WorkbenchSurface
          state={state}
          setState={setState}
          widgetDefinitions={projectedWidgetDefinitions}
          onApiReady={(api) => {
            surfaceApi = api;
          }}
        />
      );
    }, host);

    await flushWorkbenchEffects();

    const files = surfaceApi!.createWidget('custom.files', {
      centerViewport: false,
      worldX: 260,
      worldY: 180,
    });
    await flushWorkbenchEffects();
    const terminal = surfaceApi!.createWidget('custom.terminal', {
      centerViewport: false,
      worldX: 300,
      worldY: 220,
    });
    await flushWorkbenchEffects();

    const filesRoot = findWidgetRoot(host, files!.id);
    const terminalRoot = findWidgetRoot(host, terminal!.id);

    expect(readElementZIndex(terminalRoot)).toBeGreaterThan(readElementZIndex(filesRoot));
  });

  it('drops a stale visual front owner when another projected widget becomes persistent top', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    let surfaceApi: WorkbenchSurfaceApi | null = null;
    let writeState: (updater: (prev: WorkbenchState) => WorkbenchState) => void = () => {};

    render(() => {
      const [state, setState] = createSignal(
        createDefaultWorkbenchState(projectedWidgetDefinitions)
      );
      writeState = setState;

      return (
        <WorkbenchSurface
          state={state}
          setState={setState}
          widgetDefinitions={projectedWidgetDefinitions}
          onApiReady={(api) => {
            surfaceApi = api;
          }}
        />
      );
    }, host);

    await flushWorkbenchEffects();

    const files = surfaceApi!.createWidget('custom.files', {
      centerViewport: false,
      worldX: 260,
      worldY: 180,
    });
    const terminal = surfaceApi!.createWidget('custom.terminal', {
      centerViewport: false,
      worldX: 300,
      worldY: 220,
    });
    await flushWorkbenchEffects();

    surfaceApi!.focusWidget(files!, { centerViewport: false });
    await flushWorkbenchEffects();

    writeState((prev) => {
      const topZIndex = prev.widgets.reduce((max, widget) => Math.max(max, widget.z_index), 1) + 1;
      return {
        ...prev,
        widgets: prev.widgets.map((widget) =>
          widget.id === terminal!.id ? { ...widget, z_index: topZIndex } : widget
        ),
        selectedWidgetId: terminal!.id,
        selectedObject: { kind: 'widget', id: terminal!.id },
      };
    });
    await flushWorkbenchEffects();

    const filesRoot = findWidgetRoot(host, files!.id);
    const terminalRoot = findWidgetRoot(host, terminal!.id);

    expect(readElementZIndex(terminalRoot)).toBeGreaterThan(readElementZIndex(filesRoot));
  });

  it('lets a clicked persistent-top projected widget reclaim visual front ownership', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    let surfaceApi: WorkbenchSurfaceApi | null = null;

    render(() => {
      const [state, setState] = createSignal(
        createDefaultWorkbenchState(projectedClickableWidgetDefinitions)
      );

      return (
        <WorkbenchSurface
          state={state}
          setState={setState}
          widgetDefinitions={projectedClickableWidgetDefinitions}
          onApiReady={(api) => {
            surfaceApi = api;
          }}
        />
      );
    }, host);

    await flushWorkbenchEffects();

    const files = surfaceApi!.createWidget('custom.files', {
      centerViewport: false,
      worldX: 260,
      worldY: 180,
    });
    const terminal = surfaceApi!.createWidget('custom.terminal', {
      centerViewport: false,
      worldX: 300,
      worldY: 220,
    });
    await flushWorkbenchEffects();

    surfaceApi!.focusWidget(files!, { centerViewport: false });
    await flushWorkbenchEffects();
    surfaceApi!.focusWidget(terminal!, { centerViewport: false });
    await flushWorkbenchEffects();

    const filesRoot = findWidgetRoot(host, files!.id);
    const terminalRoot = findWidgetRoot(host, terminal!.id);

    expect(readElementZIndex(terminalRoot)).toBeGreaterThan(readElementZIndex(filesRoot));

    const filesButton = host.querySelector(
      `[data-testid="projected-click-${files!.id}"]`
    ) as HTMLButtonElement | null;
    const terminalButton = host.querySelector(
      `[data-testid="projected-click-${terminal!.id}"]`
    ) as HTMLButtonElement | null;
    expect(filesButton).toBeTruthy();
    expect(terminalButton).toBeTruthy();

    dispatchPointerEvent('pointerdown', filesButton!, { pointerId: 91 });
    dispatchPointerEvent('pointerup', filesButton!, { pointerId: 91, buttons: 0 });
    filesButton!.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
    await flushWorkbenchEffects();

    expect(readElementZIndex(filesRoot)).toBeGreaterThan(readElementZIndex(terminalRoot));

    dispatchPointerEvent('pointerdown', terminalButton!, { pointerId: 92 });
    dispatchPointerEvent('pointerup', terminalButton!, { pointerId: 92, buttons: 0 });
    terminalButton!.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
    await flushWorkbenchEffects();

    expect(readElementZIndex(terminalRoot)).toBeGreaterThan(readElementZIndex(filesRoot));
  });

  it('applies text annotation defaults when creating text through the surface api', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    let surfaceApi: WorkbenchSurfaceApi | null = null;
    let readState: () => WorkbenchState = () => createDefaultWorkbenchState(widgetDefinitions);

    render(() => {
      const [state, setState] = createSignal(createDefaultWorkbenchState(widgetDefinitions));
      readState = state;

      return (
        <WorkbenchSurface
          state={state}
          setState={setState}
          widgetDefinitions={widgetDefinitions}
          textAnnotationDefaults={{
            font_family: 'ui-sans-serif',
            font_size: 45,
            font_weight: 800,
            width: 460,
            height: 108,
          }}
          onApiReady={(api) => {
            surfaceApi = api;
          }}
        />
      );
    }, host);

    await Promise.resolve();
    const annotation = surfaceApi!.createTextAnnotation({
      worldX: 600,
      worldY: 320,
    });
    await Promise.resolve();

    expect(annotation).toMatchObject({
      kind: 'text',
      font_family: 'ui-sans-serif',
      font_size: 45,
      font_weight: 800,
      width: 460,
      height: 108,
      x: 370,
      y: 266,
    });
    const storedAnnotation = readState().annotations?.find((item) => item.id === annotation!.id);
    expect(storedAnnotation).toMatchObject({
      id: annotation!.id,
      width: 460,
      height: 108,
    });

    surfaceApi!.updateTextAnnotation(annotation!.id, {
      text: 'Ship layered canvas ✨',
      color: '#64748b',
    });
    await Promise.resolve();

    expect(surfaceApi!.findAnnotationById(annotation!.id)).toMatchObject({
      text: 'Ship layered canvas ✨',
      color: '#64748b',
    });
  });

  it('exposes sticky note and background layer helpers for downstream hosts', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    let surfaceApi: WorkbenchSurfaceApi | null = null;
    let readState: () => WorkbenchState = () => createDefaultWorkbenchState(widgetDefinitions);

    render(() => {
      const [state, setState] = createSignal(createDefaultWorkbenchState(widgetDefinitions));
      readState = state;

      return (
        <WorkbenchSurface
          state={state}
          setState={setState}
          widgetDefinitions={widgetDefinitions}
          onApiReady={(api) => {
            surfaceApi = api;
          }}
        />
      );
    }, host);

    await Promise.resolve();

    const sticky = surfaceApi!.createStickyNote({ worldX: 300, worldY: 240 });
    const region = surfaceApi!.createBackgroundLayer({ worldX: 640, worldY: 360 });
    await Promise.resolve();

    expect(sticky).toMatchObject({
      kind: 'sticky_note',
      x: 170,
      y: 148,
    });
    expect(region).toMatchObject({
      name: 'Focus area',
      x: 360,
      y: 180,
    });

    surfaceApi!.updateStickyNote(sticky!.id, { body: 'Runtime integration note', color: 'sage' });
    surfaceApi!.updateBackgroundLayer(region!.id, {
      fill: '#8fa1aa',
      material: 'grid',
      opacity: 0.5,
    });
    await Promise.resolve();

    expect(surfaceApi!.findStickyNoteById(sticky!.id)).toMatchObject({
      body: 'Runtime integration note',
      color: 'sage',
    });
    expect(surfaceApi!.findBackgroundLayerById(region!.id)).toMatchObject({
      fill: '#8fa1aa',
      material: 'grid',
      opacity: 0.5,
    });

    surfaceApi!.deleteStickyNote(sticky!.id);
    surfaceApi!.deleteBackgroundLayer(region!.id);
    await Promise.resolve();

    expect(surfaceApi!.findStickyNoteById(sticky!.id)).toBeNull();
    expect(surfaceApi!.findBackgroundLayerById(region!.id)).toBeNull();
    expect(readState().stickyNotes?.some((item) => item.id === sticky!.id)).toBe(false);
    expect(readState().backgroundLayers?.some((item) => item.id === region!.id)).toBe(false);
  });

  it('applies host background layer defaults when creating regions', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    let surfaceApi: WorkbenchSurfaceApi | null = null;

    render(() => {
      const [state, setState] = createSignal(createDefaultWorkbenchState(widgetDefinitions));

      return (
        <WorkbenchSurface
          state={state}
          setState={setState}
          widgetDefinitions={widgetDefinitions}
          backgroundLayerDefaults={{
            fill: WORKBENCH_REGION_FILL_OPTIONS[1],
            opacity: 0.42,
            material: 'solid',
            name: 'Planning area',
            width: 620,
            height: 420,
          }}
          onApiReady={(api) => {
            surfaceApi = api;
          }}
        />
      );
    }, host);

    await Promise.resolve();

    const region = surfaceApi!.createBackgroundLayer({ worldX: 640, worldY: 360 });
    await Promise.resolve();

    expect(region).toMatchObject({
      name: 'Planning area',
      fill: WORKBENCH_REGION_FILL_OPTIONS[1],
      opacity: 0.42,
      material: 'solid',
      x: 330,
      y: 150,
      width: 620,
      height: 420,
    });
  });

  it('renders a drag placement preview that matches the committed region frame', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    let readState: () => WorkbenchState = () => createDefaultWorkbenchState(widgetDefinitions);

    render(() => {
      const [state, setState] = createSignal({
        ...createDefaultWorkbenchState(widgetDefinitions),
        mode: 'background' as const,
        activeTool: 'background-region' as const,
      });
      readState = state;

      return (
        <WorkbenchSurface
          state={state}
          setState={setState}
          widgetDefinitions={widgetDefinitions}
          backgroundLayerDefaults={{
            width: 620,
            height: 420,
            name: 'Planning area',
          }}
        />
      );
    }, host);

    await Promise.resolve();
    mockWorkbenchCanvasFrame(host);

    const regionButton = host.querySelector(
      'button[aria-label="Region — drag to canvas to create"]'
    ) as HTMLButtonElement | null;
    expect(regionButton).toBeTruthy();

    dispatchPointerEvent('pointerdown', regionButton!, {
      pointerId: 51,
      clientX: 130,
      clientY: 620,
      buttons: 1,
    });
    dispatchPointerEvent('pointermove', document, {
      pointerId: 51,
      clientX: 500,
      clientY: 350,
      buttons: 1,
    });
    await Promise.resolve();

    const preview = host.querySelector(
      '.workbench-placement-preview.is-background-region'
    ) as HTMLElement | null;
    expect(preview).toBeTruthy();
    expect(preview!.style.width).toBe('620px');
    expect(preview!.style.height).toBe('420px');
    expect(preview!.style.transform).toBe('translate3d(10px, 30px, 0)');

    dispatchPointerEvent('pointerup', document, {
      pointerId: 51,
      clientX: 500,
      clientY: 350,
      buttons: 0,
    });
    await Promise.resolve();

    expect(host.querySelector('.workbench-placement-preview')).toBeNull();
    const createdRegion = readState().backgroundLayers?.find(
      (item) => item.name === 'Planning area'
    );
    expect(createdRegion).toMatchObject({
      name: 'Planning area',
      x: 10,
      y: 30,
      width: 620,
      height: 420,
    });
  });
});
