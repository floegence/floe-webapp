// @vitest-environment jsdom

import { render } from 'solid-js/web';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WorkbenchWidget } from '../src/components/workbench/WorkbenchWidget';
import type {
  WorkbenchWidgetDefinition,
  WorkbenchWidgetItem,
} from '../src/components/workbench/types';

const FILES_WIDGET_TYPE = 'custom.files';

const filesWidgetDefinition: WorkbenchWidgetDefinition<typeof FILES_WIDGET_TYPE> = {
  type: FILES_WIDGET_TYPE,
  label: 'Files',
  icon: () => <svg aria-hidden="true" />,
  body: () => <div data-testid="widget-body">Body</div>,
  defaultTitle: 'Files',
  defaultSize: { width: 480, height: 320 },
};

function createWidgetSnapshot(): WorkbenchWidgetItem<typeof FILES_WIDGET_TYPE> {
  return {
    id: 'widget-files-1',
    type: FILES_WIDGET_TYPE,
    title: 'Files',
    x: 0,
    y: 0,
    width: 480,
    height: 320,
    z_index: 42,
    created_at_unix_ms: 1,
  };
}

function dispatchPointerDown(target: EventTarget): void {
  const EventCtor = typeof PointerEvent === 'function' ? PointerEvent : MouseEvent;
  const event = new EventCtor('pointerdown', {
    bubbles: true,
    button: 0,
  });
  if (!('pointerId' in event)) {
    Object.defineProperty(event, 'pointerId', { configurable: true, value: 1 });
  }
  target.dispatchEvent(event);
}

describe('WorkbenchWidget interaction ownership', () => {
  let dispose: (() => void) | undefined;

  afterEach(() => {
    dispose?.();
    dispose = undefined;
    document.body.innerHTML = '';
  });

  it('focuses the widget shell without stealing focus from the local body', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const outsideInput = document.createElement('input');
    document.body.appendChild(outsideInput);

    const onSelect = vi.fn();
    const onCommitFront = vi.fn();

    dispose = render(() => (
      <WorkbenchWidget
        definition={filesWidgetDefinition}
        widgetId="widget-files-1"
        widgetTitle="Files"
        widgetType={FILES_WIDGET_TYPE}
        x={0}
        y={0}
        width={480}
        height={320}
        renderLayer={1}
        itemSnapshot={createWidgetSnapshot}
        selected={false}
        optimisticFront={false}
        topRenderLayer={2}
        viewportScale={1}
        locked={false}
        filtered={false}
        onSelect={onSelect}
        onContextMenu={() => {}}
        onStartOptimisticFront={() => {}}
        onCommitFront={onCommitFront}
        onCommitMove={() => {}}
        onCommitResize={() => {}}
        onRequestDelete={() => {}}
      />
    ), host);

    const widgetRoot = host.querySelector('[data-floe-workbench-widget-id="widget-files-1"]') as HTMLElement | null;
    const widgetHeader = host.querySelector('.workbench-widget__header') as HTMLElement | null;
    const widgetBody = host.querySelector('[data-testid="widget-body"]') as HTMLElement | null;
    expect(widgetRoot).toBeTruthy();
    expect(widgetHeader).toBeTruthy();
    expect(widgetBody).toBeTruthy();

    outsideInput.focus();
    expect(document.activeElement).toBe(outsideInput);

    dispatchPointerDown(widgetBody!);
    await Promise.resolve();

    expect(document.activeElement).toBe(outsideInput);
    expect(onSelect).toHaveBeenCalledWith('widget-files-1');
    expect(onCommitFront).toHaveBeenCalledWith('widget-files-1');

    dispatchPointerDown(widgetHeader!);
    await Promise.resolve();

    expect(document.activeElement).toBe(widgetRoot);
  });

  it('opens the workbench context menu only from shell-owned zones', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const onWidgetContextMenu = vi.fn();
    const onBodyContextMenu = vi.fn();

    dispose = render(() => (
      <WorkbenchWidget
        definition={{
          ...filesWidgetDefinition,
          icon: () => <svg aria-hidden="true" />,
          body: () => (
            <div data-floe-canvas-interactive="true">
              <button type="button" data-testid="widget-body-button" onContextMenu={onBodyContextMenu}>
                Body
              </button>
            </div>
          ),
        }}
        widgetId="widget-files-1"
        widgetTitle="Files"
        widgetType={FILES_WIDGET_TYPE}
        x={0}
        y={0}
        width={480}
        height={320}
        renderLayer={1}
        itemSnapshot={() => ({ ...createWidgetSnapshot(), z_index: 7 })}
        selected={false}
        optimisticFront={false}
        topRenderLayer={2}
        viewportScale={1}
        locked={false}
        filtered={false}
        onSelect={() => {}}
        onContextMenu={onWidgetContextMenu}
        onStartOptimisticFront={() => {}}
        onCommitFront={() => {}}
        onCommitMove={() => {}}
        onCommitResize={() => {}}
        onRequestDelete={() => {}}
      />
    ), host);

    const widgetHeader = host.querySelector('.workbench-widget__header') as HTMLElement | null;
    const bodyButton = host.querySelector('[data-testid="widget-body-button"]') as HTMLButtonElement | null;
    expect(widgetHeader).toBeTruthy();
    expect(bodyButton).toBeTruthy();

    bodyButton!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await Promise.resolve();

    expect(onBodyContextMenu).toHaveBeenCalledTimes(1);
    expect(onWidgetContextMenu).not.toHaveBeenCalled();

    widgetHeader!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await Promise.resolve();

    expect(onWidgetContextMenu).toHaveBeenCalledTimes(1);
  });
});
