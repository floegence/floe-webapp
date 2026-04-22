// @vitest-environment jsdom

import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
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
});
