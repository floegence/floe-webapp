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
      get: () => ({ children }: { children?: unknown }) => children ?? null,
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
});
