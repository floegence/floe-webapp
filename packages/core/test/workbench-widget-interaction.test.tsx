// @vitest-environment jsdom

import { createEffect, createSignal, type JSX } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WorkbenchWidget } from '../src/components/workbench/WorkbenchWidget';
import {
  WORKBENCH_WIDGET_ACTIVATION_SURFACE_ATTR,
  resolveWorkbenchWidgetLocalTypingTarget,
} from '../src/components/ui/localInteractionSurface';
import type {
  WorkbenchWidgetBodyActivation,
  WorkbenchWidgetBodyProps,
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

function dispatchPointerEvent(
  type: string,
  target: EventTarget,
  options: {
    pointerId?: number;
    clientX?: number;
    clientY?: number;
    buttons?: number;
    button?: number;
    pointerType?: string;
  } = {},
): void {
  const EventCtor = typeof PointerEvent === 'function' ? PointerEvent : MouseEvent;
  const event = new EventCtor(type, {
    bubbles: true,
    button: options.button ?? 0,
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
  if (!('pointerType' in event)) {
    Object.defineProperty(event, 'pointerType', {
      configurable: true,
      value: options.pointerType ?? 'mouse',
    });
  }
  target.dispatchEvent(event);
}

function dispatchPointerDown(target: EventTarget): void {
  dispatchPointerEvent('pointerdown', target);
}

async function flushWorkbenchInteraction(): Promise<void> {
  await Promise.resolve();
  if (typeof requestAnimationFrame === 'function') {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
  await Promise.resolve();
}

function renderActivationProbe(
  onActivation: (activation: WorkbenchWidgetBodyActivation) => void,
  children: (props: WorkbenchWidgetBodyProps) => JSX.Element,
): WorkbenchWidgetDefinition<typeof FILES_WIDGET_TYPE> {
  return {
    ...filesWidgetDefinition,
    icon: () => <svg aria-hidden="true" />,
    body: (props) => {
      createEffect(() => {
        const activation = props.activation;
        if (activation) onActivation(activation);
      });

      return children(props);
    },
  };
}

function renderStatefulWidget(
  host: HTMLElement,
  definition: WorkbenchWidgetDefinition<typeof FILES_WIDGET_TYPE>,
  options: {
    layoutMode?: 'canvas_scaled' | 'projected_surface';
  } = {},
) {
  const [selected, setSelected] = createSignal(false);
  const [zIndex, setZIndex] = createSignal(7);

  return render(() => (
    <WorkbenchWidget
      definition={definition}
      widgetId="widget-files-1"
      widgetTitle="Files"
      widgetType={FILES_WIDGET_TYPE}
      x={0}
      y={0}
      width={480}
      height={320}
      renderLayer={zIndex()}
      itemSnapshot={() => ({ ...createWidgetSnapshot(), z_index: zIndex() })}
      selected={selected()}
      optimisticFront={false}
      topRenderLayer={zIndex() + 1}
      viewportScale={1}
      locked={false}
      filtered={false}
      layoutMode={options.layoutMode}
      projectedViewport={
        options.layoutMode === 'projected_surface'
          ? () => ({ x: 24, y: 16, scale: 1.1 })
          : undefined
      }
      surfaceReady={options.layoutMode === 'projected_surface' ? true : undefined}
      onSelect={() => setSelected(true)}
      onContextMenu={() => {}}
      onStartOptimisticFront={() => {}}
      onCommitFront={() => setZIndex((value) => value + 1)}
      onCommitMove={() => {}}
      onCommitResize={() => {}}
      onRequestOverview={() => {}}
      onRequestFit={() => {}}
      onRequestDelete={() => {}}
    />
  ), host);
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

  it('emits local body activation without stealing shell focus', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const outsideInput = document.createElement('input');
    document.body.appendChild(outsideInput);

    const onActivation = vi.fn();
    const definition = renderActivationProbe(onActivation, () => (
      <div data-testid="widget-activation-body">Body</div>
    ));

    dispose = render(() => (
      <WorkbenchWidget
        definition={definition}
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
        onSelect={() => {}}
        onContextMenu={() => {}}
        onStartOptimisticFront={() => {}}
        onCommitFront={() => {}}
        onCommitMove={() => {}}
        onCommitResize={() => {}}
        onRequestDelete={() => {}}
      />
    ), host);

    const widgetBody = host.querySelector('[data-testid="widget-activation-body"]') as HTMLElement | null;
    expect(widgetBody).toBeTruthy();

    outsideInput.focus();
    dispatchPointerDown(widgetBody!);
    await Promise.resolve();

    expect(document.activeElement).toBe(outsideInput);
    expect(onActivation).toHaveBeenCalledTimes(1);
    expect(onActivation).toHaveBeenLastCalledWith(
      expect.objectContaining({
        seq: 1,
        source: 'local_pointer',
        pointerType: 'mouse',
      })
    );

    dispatchPointerDown(widgetBody!);
    await Promise.resolve();

    expect(onActivation).toHaveBeenCalledTimes(2);
    expect(onActivation).toHaveBeenLastCalledWith(
      expect.objectContaining({
        seq: 2,
        source: 'local_pointer',
      })
    );
  });

  it('delivers first-click local activation after inactive widget selection settles', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const activations: Array<{ seq: number; selected: boolean }> = [];
    const definition = {
      ...filesWidgetDefinition,
      body: (props: WorkbenchWidgetBodyProps) => {
        let lastSeq = 0;
        createEffect(() => {
          const activation = props.activation;
          if (!activation || activation.seq === lastSeq) return;
          lastSeq = activation.seq;
          activations.push({ seq: activation.seq, selected: Boolean(props.selected) });
        });

        return <div data-testid="widget-activation-body">Body</div>;
      },
    } satisfies WorkbenchWidgetDefinition<typeof FILES_WIDGET_TYPE>;

    dispose = renderStatefulWidget(host, definition);

    const widgetBody = host.querySelector('[data-testid="widget-activation-body"]') as HTMLElement | null;
    expect(widgetBody).toBeTruthy();

    dispatchPointerDown(widgetBody!);
    await flushWorkbenchInteraction();

    expect(activations).toEqual([{ seq: 1, selected: true }]);
  });

  it.each([
    { name: 'canvas-scaled', layoutMode: 'canvas_scaled' as const },
    { name: 'projected-surface', layoutMode: 'projected_surface' as const },
  ])('restores first-click typing focus for inactive %s widgets', async ({ layoutMode }) => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const outsideInput = document.createElement('input');
    document.body.appendChild(outsideInput);

    const definition = {
      ...filesWidgetDefinition,
      body: () => <input aria-label="Workbench input" data-testid="widget-input" />,
    } satisfies WorkbenchWidgetDefinition<typeof FILES_WIDGET_TYPE>;

    dispose = renderStatefulWidget(host, definition, { layoutMode });

    const widgetInput = host.querySelector('[data-testid="widget-input"]') as HTMLInputElement | null;
    expect(widgetInput).toBeTruthy();
    const widgetRoot = host.querySelector('[data-floe-workbench-widget-id="widget-files-1"]') as HTMLElement | null;
    expect(
      resolveWorkbenchWidgetLocalTypingTarget({
        target: widgetInput,
        widgetRoot,
        interactiveSelector: '[data-floe-canvas-interactive="true"]',
        panSurfaceSelector: '[data-floe-canvas-pan-surface="true"]',
      })
    ).toBe(widgetInput);
    const nativeFocus = widgetInput!.focus.bind(widgetInput);
    const focusSpy = vi.fn((options?: FocusOptions) => nativeFocus(options));
    widgetInput!.focus = focusSpy as typeof widgetInput.focus;

    outsideInput.focus();
    expect(document.activeElement).toBe(outsideInput);

    dispatchPointerDown(widgetInput!);
    await flushWorkbenchInteraction();

    expect(focusSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(widgetInput);
  });

  it.each([
    { name: 'canvas-scaled', layoutMode: 'canvas_scaled' as const },
    { name: 'projected-surface', layoutMode: 'projected_surface' as const },
  ])('routes first-click helper typing targets inside activation surfaces through shared widget activation for inactive %s widgets', async ({ layoutMode }) => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const outsideInput = document.createElement('input');
    document.body.appendChild(outsideInput);

    const activations: number[] = [];
    let helperTextarea: HTMLTextAreaElement | undefined;
    const definition = renderActivationProbe((activation) => {
      activations.push(activation.seq);
    }, (props) => {
      let lastSeq = 0;
      createEffect(() => {
        const activation = props.activation;
        if (!activation || activation.seq === lastSeq) return;
        lastSeq = activation.seq;
        helperTextarea?.focus();
      });

      return (
        <div
          data-testid="widget-activation-surface"
          {...{ [WORKBENCH_WIDGET_ACTIVATION_SURFACE_ATTR]: 'true' }}
        >
          <textarea
            aria-label="Widget helper input"
            data-testid="widget-helper-textarea"
            ref={helperTextarea}
          />
        </div>
      );
    });

    dispose = renderStatefulWidget(host, definition, { layoutMode });

    const widgetRoot = host.querySelector('[data-floe-workbench-widget-id="widget-files-1"]') as HTMLElement | null;
    const helper = host.querySelector('[data-testid="widget-helper-textarea"]') as HTMLTextAreaElement | null;
    expect(widgetRoot).toBeTruthy();
    expect(helper).toBeTruthy();
    expect(
      resolveWorkbenchWidgetLocalTypingTarget({
        target: helper,
        widgetRoot,
        interactiveSelector: '[data-floe-canvas-interactive="true"]',
        panSurfaceSelector: '[data-floe-canvas-pan-surface="true"]',
      })
    ).toBeNull();

    outsideInput.focus();
    expect(document.activeElement).toBe(outsideInput);

    dispatchPointerDown(helper!);
    await flushWorkbenchInteraction();

    expect(activations).toEqual([1]);
    expect(document.activeElement).toBe(helper);
  });

  it('does not emit local activation from shell, native controls, local surfaces, or secondary presses', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const onActivation = vi.fn();
    const definition = renderActivationProbe(onActivation, () => (
      <div data-testid="widget-body-with-controls">
        <button type="button" data-testid="native-button">
          <span data-testid="native-button-label">Native button</span>
        </button>
        <input aria-label="Native input" data-testid="native-input" />
        <div data-floe-local-interaction-surface="true" data-testid="local-surface">
          Local surface
        </div>
        <div data-testid="secondary-target">Secondary target</div>
      </div>
    ));

    dispose = render(() => (
      <WorkbenchWidget
        definition={definition}
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
        onSelect={() => {}}
        onContextMenu={() => {}}
        onStartOptimisticFront={() => {}}
        onCommitFront={() => {}}
        onCommitMove={() => {}}
        onCommitResize={() => {}}
        onRequestDelete={() => {}}
      />
    ), host);

    const widgetHeader = host.querySelector('.workbench-widget__header') as HTMLElement | null;
    const nativeButtonLabel = host.querySelector('[data-testid="native-button-label"]') as HTMLElement | null;
    const nativeInput = host.querySelector('[data-testid="native-input"]') as HTMLElement | null;
    const localSurface = host.querySelector('[data-testid="local-surface"]') as HTMLElement | null;
    const secondaryTarget = host.querySelector('[data-testid="secondary-target"]') as HTMLElement | null;
    expect(widgetHeader).toBeTruthy();
    expect(nativeButtonLabel).toBeTruthy();
    expect(nativeInput).toBeTruthy();
    expect(localSurface).toBeTruthy();
    expect(secondaryTarget).toBeTruthy();

    dispatchPointerDown(widgetHeader!);
    dispatchPointerDown(nativeButtonLabel!);
    dispatchPointerDown(nativeInput!);
    dispatchPointerDown(localSurface!);
    dispatchPointerEvent('pointerdown', secondaryTarget!, { button: 2, buttons: 2 });
    await Promise.resolve();

    expect(onActivation).not.toHaveBeenCalled();
  });

  it('passes lifecycle, selection state, and requestActivate through the shared body contract', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const onSelect = vi.fn();
    const onCommitFront = vi.fn();
    const seen: Array<WorkbenchWidgetBodyProps> = [];

    dispose = render(() => (
      <WorkbenchWidget
        definition={{
          ...filesWidgetDefinition,
          body: (props) => {
            seen.push(props);
            return <div data-testid="widget-body">Body</div>;
          },
        }}
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

    expect(seen[0]).toMatchObject({
      lifecycle: 'warm',
      selected: false,
      filtered: false,
    });

    seen[0]!.requestActivate?.();
    await Promise.resolve();

    const widgetRoot = host.querySelector('[data-floe-workbench-widget-id="widget-files-1"]') as HTMLElement | null;
    expect(onSelect).toHaveBeenCalledWith('widget-files-1');
    expect(onCommitFront).toHaveBeenCalledWith('widget-files-1');
    expect(document.activeElement).toBe(widgetRoot);
  });

  it('commits widget drag once when release is only observable through a later buttons=0 move', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const onCommitMove = vi.fn();

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
        selected
        optimisticFront={false}
        topRenderLayer={2}
        viewportScale={1}
        locked={false}
        filtered={false}
        onSelect={() => {}}
        onContextMenu={() => {}}
        onStartOptimisticFront={() => {}}
        onCommitFront={() => {}}
        onCommitMove={onCommitMove}
        onCommitResize={() => {}}
        onRequestDelete={() => {}}
      />
    ), host);

    const dragButton = host.querySelector('.workbench-widget__drag') as HTMLElement | null;
    expect(dragButton).toBeTruthy();

    dispatchPointerEvent('pointerdown', dragButton!, {
      pointerId: 11,
      clientX: 10,
      clientY: 10,
      buttons: 1,
    });
    dispatchPointerEvent('pointermove', document, {
      pointerId: 11,
      clientX: 48,
      clientY: 34,
      buttons: 1,
    });
    dispatchPointerEvent('pointermove', document, {
      pointerId: 11,
      clientX: 160,
      clientY: 120,
      buttons: 0,
    });
    dispatchPointerEvent('pointermove', document, {
      pointerId: 11,
      clientX: 260,
      clientY: 220,
      buttons: 0,
    });
    await Promise.resolve();

    expect(onCommitMove).toHaveBeenCalledTimes(1);
    expect(onCommitMove).toHaveBeenCalledWith('widget-files-1', {
      x: 38,
      y: 24,
    });
  });

  it('commits widget resize once when release is only observable through a later buttons=0 move', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const onCommitResize = vi.fn();

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
        selected
        optimisticFront={false}
        topRenderLayer={2}
        viewportScale={1}
        locked={false}
        filtered={false}
        onSelect={() => {}}
        onContextMenu={() => {}}
        onStartOptimisticFront={() => {}}
        onCommitFront={() => {}}
        onCommitMove={() => {}}
        onCommitResize={onCommitResize}
        onRequestDelete={() => {}}
      />
    ), host);

    const resizeHandle = host.querySelector('.workbench-widget__resize') as HTMLElement | null;
    expect(resizeHandle).toBeTruthy();

    dispatchPointerEvent('pointerdown', resizeHandle!, {
      pointerId: 12,
      clientX: 10,
      clientY: 10,
      buttons: 1,
    });
    dispatchPointerEvent('pointermove', document, {
      pointerId: 12,
      clientX: 54,
      clientY: 42,
      buttons: 1,
    });
    dispatchPointerEvent('pointermove', document, {
      pointerId: 12,
      clientX: 180,
      clientY: 140,
      buttons: 0,
    });
    dispatchPointerEvent('pointermove', document, {
      pointerId: 12,
      clientX: 280,
      clientY: 240,
      buttons: 0,
    });
    await Promise.resolve();

    expect(onCommitResize).toHaveBeenCalledTimes(1);
    expect(onCommitResize).toHaveBeenCalledWith('widget-files-1', {
      width: 524,
      height: 352,
    });
  });
});
