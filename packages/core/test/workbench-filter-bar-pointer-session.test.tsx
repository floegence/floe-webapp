// @vitest-environment jsdom

import { createSignal, splitProps, type JSX } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, describe, expect, it, vi } from 'vitest';

type MotionSpanProps = JSX.IntrinsicElements['span'] & {
  animate?: unknown;
  transition?: unknown;
};

vi.mock('solid-motionone', () => ({
  Motion: {
    span: (props: MotionSpanProps) => {
      const [motionProps, domProps] = splitProps(props, ['animate', 'transition']);
      return <span data-motion-animate={JSON.stringify(motionProps.animate)} {...domProps} />;
    },
  },
}));

import { WorkbenchFilterBar } from '../src/components/workbench/WorkbenchFilterBar';
import type { WorkbenchWidgetDefinition } from '../src/components/workbench/types';

const widgetDefinitions: readonly WorkbenchWidgetDefinition[] = [
  {
    type: 'custom.files',
    label: 'Files',
    icon: () => <svg aria-hidden="true" />,
    body: () => null,
    defaultTitle: 'Files',
    defaultSize: { width: 320, height: 220 },
  },
];

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

function mockCanvasFrame(parent: HTMLElement): HTMLElement {
  const frame = document.createElement('div');
  frame.setAttribute('data-floe-workbench-canvas-frame', 'true');
  Object.defineProperty(frame, 'getBoundingClientRect', {
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
  });
  parent.appendChild(frame);
  return frame;
}

function createWorkbenchHost(): HTMLElement {
  const host = document.createElement('div');
  host.className = 'workbench-surface';
  document.body.appendChild(host);
  return host;
}

describe('WorkbenchFilterBar pointer session', () => {
  let dispose: (() => void) | undefined;

  afterEach(() => {
    dispose?.();
    dispose = undefined;
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  function mockAnimationFrames(): FrameRequestCallback[] {
    const callbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callbacks.push(callback);
      return callbacks.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    return callbacks;
  }

  it('commits a dragged widget pill once when release is only observable through a later buttons=0 move', async () => {
    const host = createWorkbenchHost();
    mockCanvasFrame(host);
    const onCreateAt = vi.fn();

    dispose = render(
      () => (
        <WorkbenchFilterBar
          widgetDefinitions={widgetDefinitions}
          widgets={[]}
          filters={{ 'custom.files': true }}
          onSoloFilter={() => {}}
          onShowAll={() => {}}
          onCreateAt={onCreateAt}
        />
      ),
      host
    );

    const filesButton = host.querySelector(
      'button[aria-label="Files — click to solo, drag to canvas to create"]'
    ) as HTMLButtonElement | null;
    expect(filesButton).toBeTruthy();

    dispatchPointerEvent('pointerdown', filesButton!, {
      pointerId: 13,
      clientX: 20,
      clientY: 20,
      buttons: 1,
    });
    dispatchPointerEvent('pointermove', document, {
      pointerId: 13,
      clientX: 120,
      clientY: 120,
      buttons: 1,
    });
    dispatchPointerEvent('pointermove', document, {
      pointerId: 13,
      clientX: 320,
      clientY: 320,
      buttons: 0,
    });
    dispatchPointerEvent('pointermove', document, {
      pointerId: 13,
      clientX: 420,
      clientY: 420,
      buttons: 0,
    });
    await Promise.resolve();

    expect(onCreateAt).toHaveBeenCalledTimes(1);
    expect(onCreateAt.mock.calls[0]?.slice(0, 3)).toEqual(['custom.files', 320, 320]);
    expect(onCreateAt.mock.calls[0]?.[3]).toMatchObject({
      dropAllowed: true,
      canvasFrame: {
        left: 0,
        top: 0,
        right: 800,
        bottom: 600,
      },
    });
  });

  it('auto-pans the canvas while a widget pill is dragged against an edge', async () => {
    const callbacks = mockAnimationFrames();
    const host = createWorkbenchHost();
    mockCanvasFrame(host);
    const onViewportCommit = vi.fn();

    dispose = render(
      () => (
        <WorkbenchFilterBar
          widgetDefinitions={widgetDefinitions}
          widgets={[]}
          filters={{ 'custom.files': true }}
          viewport={{ x: 0, y: 0, scale: 1 }}
          onSoloFilter={() => {}}
          onShowAll={() => {}}
          onViewportCommit={onViewportCommit}
        />
      ),
      host
    );

    const filesButton = host.querySelector(
      'button[aria-label="Files — click to solo, drag to canvas to create"]'
    ) as HTMLButtonElement | null;
    expect(filesButton).toBeTruthy();

    dispatchPointerEvent('pointerdown', filesButton!, {
      pointerId: 19,
      clientX: 20,
      clientY: 20,
      buttons: 1,
    });
    dispatchPointerEvent('pointermove', document, {
      pointerId: 19,
      clientX: 790,
      clientY: 300,
      buttons: 1,
    });
    callbacks.shift()?.(0);
    callbacks.shift()?.(120);
    await Promise.resolve();

    expect(onViewportCommit).toHaveBeenCalledTimes(1);
    expect(onViewportCommit.mock.calls[0]![0].x).toBeLessThan(0);
  });

  it('keeps auto-panning when a fast widget-pill drag crosses the canvas and ends outside the frame', async () => {
    const callbacks = mockAnimationFrames();
    const host = createWorkbenchHost();
    mockCanvasFrame(host);
    const onViewportCommit = vi.fn();

    dispose = render(
      () => (
        <WorkbenchFilterBar
          widgetDefinitions={widgetDefinitions}
          widgets={[]}
          filters={{ 'custom.files': true }}
          viewport={{ x: 0, y: 0, scale: 1 }}
          onSoloFilter={() => {}}
          onShowAll={() => {}}
          onViewportCommit={onViewportCommit}
        />
      ),
      host
    );

    const filesButton = host.querySelector(
      'button[aria-label="Files — click to solo, drag to canvas to create"]'
    ) as HTMLButtonElement | null;
    expect(filesButton).toBeTruthy();

    dispatchPointerEvent('pointerdown', filesButton!, {
      pointerId: 23,
      clientX: 20,
      clientY: 650,
      buttons: 1,
    });
    dispatchPointerEvent('pointermove', document, {
      pointerId: 23,
      clientX: 860,
      clientY: 300,
      buttons: 1,
    });
    callbacks.shift()?.(0);
    callbacks.shift()?.(80);
    callbacks.shift()?.(128);
    await Promise.resolve();

    expect(onViewportCommit).toHaveBeenCalledTimes(2);
    expect(onViewportCommit.mock.calls[0]![0].x).toBeLessThan(0);
    expect(onViewportCommit.mock.calls[1]![0].x).toBeLessThan(onViewportCommit.mock.calls[0]![0].x);
  });

  it('keeps composition tools visible and does not treat plain clicks as layer filtering', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const onSoloFilter = vi.fn();

    dispose = render(
      () => (
        <WorkbenchFilterBar
          widgetDefinitions={widgetDefinitions}
          widgets={[]}
          filters={{
            'background-region': false,
            text: false,
          }}
          mode="background"
          onSoloFilter={onSoloFilter}
          dockItems={[
            {
              id: 'host:leading',
              label: 'Leading host',
              icon: () => <svg aria-hidden="true" />,
            },
            {
              id: 'host:trailing',
              label: 'Trailing host',
              icon: () => <svg aria-hidden="true" />,
              dockPlacement: 'after-components',
            },
          ]}
        />
      ),
      host
    );

    const regionButton = host.querySelector(
      'button[aria-label="Region — drag to canvas to create"]'
    ) as HTMLButtonElement | null;
    const textButton = host.querySelector(
      'button[aria-label="Text — drag to canvas to create"]'
    ) as HTMLButtonElement | null;

    expect(regionButton).toBeTruthy();
    expect(textButton).toBeTruthy();
    expect(host.querySelector('[data-workbench-dock-item="host:leading"]')).toBeNull();
    expect(host.querySelector('[data-workbench-dock-item="host:trailing"]')).toBeNull();
    expect(host.querySelectorAll('.workbench-dock__divider')).toHaveLength(1);
    expect(regionButton!.classList.contains('is-filter-muted')).toBe(false);
    expect(textButton!.classList.contains('is-filter-muted')).toBe(false);

    dispatchPointerEvent('pointerdown', regionButton!, { pointerId: 31 });
    dispatchPointerEvent('pointerup', document, { pointerId: 31, buttons: 0 });
    dispatchPointerEvent('pointerdown', textButton!, { pointerId: 32 });
    dispatchPointerEvent('pointerup', document, { pointerId: 32, buttons: 0 });
    await Promise.resolve();

    expect(onSoloFilter).not.toHaveBeenCalled();
  });

  it('shares focus-cycle activation across pointer and keyboard without icon badges', async () => {
    const host = createWorkbenchHost();
    mockCanvasFrame(host);
    let consumed = true;
    const onItemClick = vi.fn(() => consumed);
    const onFocusCycleItem = vi.fn();

    dispose = render(
      () => (
        <WorkbenchFilterBar
          widgetDefinitions={widgetDefinitions}
          widgets={[]}
          filters={{ 'custom.files': false }}
          activationMode="focus-cycle"
          onSoloFilter={() => {}}
          onItemClick={onItemClick}
          onFocusCycleItem={onFocusCycleItem}
          resolveItemPresentation={() => ({ count: 3, currentIndex: 1, active: true })}
        />
      ),
      host
    );

    const filesButton = host.querySelector(
      'button[data-workbench-dock-component="custom.files"]'
    ) as HTMLButtonElement | null;
    expect(filesButton).toBeTruthy();
    expect(filesButton!.getAttribute('aria-label')).toBe('Files 2/3');
    expect(filesButton!.getAttribute('aria-pressed')).toBe('true');
    expect(filesButton!.classList.contains('is-active')).toBe(true);
    expect(filesButton!.classList.contains('is-filter-muted')).toBe(false);
    expect(filesButton!.querySelector('.workbench-dock__badge')).toBeNull();

    dispatchPointerEvent('pointerdown', filesButton!, { pointerId: 35 });
    dispatchPointerEvent('pointerup', document, { pointerId: 35, buttons: 0 });
    expect(onItemClick).toHaveBeenCalledTimes(1);
    expect(onFocusCycleItem).not.toHaveBeenCalled();

    consumed = false;
    filesButton!.click();
    expect(onItemClick).toHaveBeenCalledTimes(2);
    expect(onFocusCycleItem).toHaveBeenCalledTimes(1);

    dispatchPointerEvent('pointerdown', filesButton!, { pointerId: 36 });
    dispatchPointerEvent('pointerup', document, { pointerId: 36, buttons: 0 });
    filesButton!.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    expect(onFocusCycleItem).toHaveBeenCalledTimes(2);
  });

  it('keeps an empty focus-cycle component accessible without an icon badge or post-drag activation', async () => {
    const host = createWorkbenchHost();
    mockCanvasFrame(host);
    const onFocusCycleItem = vi.fn();
    const onCreateAt = vi.fn();

    dispose = render(
      () => (
        <WorkbenchFilterBar
          widgetDefinitions={widgetDefinitions}
          widgets={[]}
          filters={{ 'custom.files': true }}
          activationMode="focus-cycle"
          onSoloFilter={() => {}}
          onFocusCycleItem={onFocusCycleItem}
          onCreateAt={onCreateAt}
          resolveItemPresentation={() => ({ count: 0, currentIndex: null, active: false })}
        />
      ),
      host
    );

    const filesButton = host.querySelector(
      'button[data-workbench-dock-component="custom.files"]'
    ) as HTMLButtonElement | null;
    expect(filesButton?.getAttribute('aria-label')).toBe('Files +');
    expect(filesButton?.querySelector('.workbench-dock__badge')).toBeNull();

    dispatchPointerEvent('pointerdown', filesButton!, {
      pointerId: 37,
      clientX: 20,
      clientY: 20,
      buttons: 1,
    });
    dispatchPointerEvent('pointermove', document, {
      pointerId: 37,
      clientX: 320,
      clientY: 320,
      buttons: 1,
    });
    dispatchPointerEvent('pointerup', document, {
      pointerId: 37,
      clientX: 320,
      clientY: 320,
      buttons: 0,
    });
    await Promise.resolve();

    expect(onCreateAt).toHaveBeenCalledTimes(1);
    expect(onFocusCycleItem).not.toHaveBeenCalled();
  });

  it('shows the canvas placement preview as soon as a widget drag is armed', async () => {
    const host = createWorkbenchHost();
    mockCanvasFrame(host);
    const onDragPreviewChange = vi.fn();

    dispose = render(
      () => (
        <WorkbenchFilterBar
          widgetDefinitions={widgetDefinitions}
          widgets={[]}
          filters={{ 'custom.files': true }}
          onSoloFilter={() => {}}
          onDragPreviewChange={onDragPreviewChange}
        />
      ),
      host
    );

    const filesButton = host.querySelector(
      'button[aria-label="Files — click to solo, drag to canvas to create"]'
    ) as HTMLButtonElement | null;
    expect(filesButton).toBeTruthy();

    dispatchPointerEvent('pointerdown', filesButton!, {
      pointerId: 41,
      clientX: 820,
      clientY: 620,
      buttons: 1,
    });
    dispatchPointerEvent('pointermove', document, {
      pointerId: 41,
      clientX: 850,
      clientY: 640,
      buttons: 1,
    });
    await Promise.resolve();
    expect(onDragPreviewChange.mock.calls.at(-1)?.[0]).toMatchObject({
      kind: 'widget',
      id: 'custom.files',
      label: 'Files',
      clientX: 800,
      clientY: 600,
      dropAllowed: false,
    });
    expect(document.body.querySelector('.workbench-dock-ghost')).toBeNull();

    dispatchPointerEvent('pointermove', document, {
      pointerId: 41,
      clientX: 420,
      clientY: 260,
      buttons: 1,
    });
    await Promise.resolve();
    expect(onDragPreviewChange.mock.calls.at(-1)?.[0]).toMatchObject({
      kind: 'widget',
      id: 'custom.files',
      label: 'Files',
      clientX: 420,
      clientY: 260,
      dropAllowed: true,
    });
    expect(document.body.querySelector('.workbench-dock-ghost')).toBeNull();

    dispatchPointerEvent('pointerup', document, {
      pointerId: 41,
      clientX: 420,
      clientY: 260,
      buttons: 0,
    });
    await Promise.resolve();
    expect(onDragPreviewChange.mock.calls.at(-1)?.[0]).toBeNull();
  });

  it('keeps the widget placement preview visible above the dock without committing there', async () => {
    const host = createWorkbenchHost();
    mockCanvasFrame(host);
    const onCreateAt = vi.fn();
    const onDragPreviewChange = vi.fn();

    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn(() => {
        return host.querySelector(
          'button[aria-label="Files — click to solo, drag to canvas to create"]'
        );
      }),
    });

    dispose = render(
      () => (
        <WorkbenchFilterBar
          widgetDefinitions={widgetDefinitions}
          widgets={[]}
          filters={{ 'custom.files': true }}
          onSoloFilter={() => {}}
          onCreateAt={onCreateAt}
          onDragPreviewChange={onDragPreviewChange}
        />
      ),
      host
    );

    const filesButton = host.querySelector(
      'button[aria-label="Files — click to solo, drag to canvas to create"]'
    ) as HTMLButtonElement | null;
    expect(filesButton).toBeTruthy();

    dispatchPointerEvent('pointerdown', filesButton!, {
      pointerId: 43,
      clientX: 120,
      clientY: 560,
      buttons: 1,
    });
    dispatchPointerEvent('pointermove', document, {
      pointerId: 43,
      clientX: 180,
      clientY: 560,
      buttons: 1,
    });
    await Promise.resolve();

    expect(onDragPreviewChange.mock.calls.at(-1)?.[0]).toMatchObject({
      kind: 'widget',
      id: 'custom.files',
      label: 'Files',
      clientX: 180,
      clientY: 560,
      dropAllowed: false,
    });
    expect(document.body.querySelector('.workbench-dock-ghost')).toBeNull();

    dispatchPointerEvent('pointerup', document, {
      pointerId: 43,
      clientX: 180,
      clientY: 560,
      buttons: 0,
    });
    await Promise.resolve();

    expect(onCreateAt).not.toHaveBeenCalled();
    expect(onDragPreviewChange.mock.calls.at(-1)?.[0]).toBeNull();
  });

  it('shows a disallowed placement preview instead of a dock ghost while dragging over the dock', async () => {
    const host = createWorkbenchHost();
    mockCanvasFrame(host);
    const onDragPreviewChange = vi.fn();

    dispose = render(
      () => (
        <WorkbenchFilterBar
          widgetDefinitions={widgetDefinitions}
          widgets={[]}
          filters={{ 'custom.files': true }}
          onSoloFilter={() => {}}
          onDragPreviewChange={onDragPreviewChange}
        />
      ),
      host
    );

    const filesButton = host.querySelector(
      'button[aria-label="Files — click to solo, drag to canvas to create"]'
    ) as HTMLButtonElement | null;
    expect(filesButton).toBeTruthy();
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn(() => filesButton),
    });

    dispatchPointerEvent('pointerdown', filesButton!, {
      pointerId: 47,
      clientX: 120,
      clientY: 560,
      buttons: 1,
    });
    dispatchPointerEvent('pointermove', document, {
      pointerId: 47,
      clientX: 120,
      clientY: 568,
      buttons: 1,
    });
    await Promise.resolve();

    expect(onDragPreviewChange.mock.calls.at(-1)?.[0]).toMatchObject({
      kind: 'widget',
      id: 'custom.files',
      label: 'Files',
      clientX: 120,
      clientY: 568,
      dropAllowed: false,
    });
    expect(document.body.querySelector('.workbench-dock-ghost')).toBeNull();
  });

  it('keeps non-draggable mode and host actions dimensionally stable on hover and active state', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    dispose = render(
      () => (
        <WorkbenchFilterBar
          widgetDefinitions={widgetDefinitions}
          widgets={[]}
          filters={{ 'custom.files': true }}
          onSoloFilter={() => {}}
          dockActions={[
            {
              id: 'plugins',
              label: 'Plugins',
              icon: () => <svg aria-hidden="true" />,
              active: true,
              onActivate: () => {},
            },
          ]}
        />
      ),
      host
    );

    const mode = host.querySelector<HTMLButtonElement>('.workbench-dock__mode-trigger')!;
    const action = host.querySelector<HTMLButtonElement>('[data-workbench-dock-action="plugins"]')!;
    dispatchPointerEvent('pointerenter', mode);
    expect(mode.querySelector('.workbench-dock__tile')?.getAttribute('data-motion-animate')).toBe(
      JSON.stringify({ scale: 1, y: 0, x: 0 })
    );
    expect(
      host
        .querySelector(
          'button[aria-label="Files — click to solo, drag to canvas to create"] .workbench-dock__tile'
        )
        ?.getAttribute('data-motion-animate')
    ).toBe(JSON.stringify({ scale: 1, y: 0, x: 0 }));
    dispatchPointerEvent('pointerenter', action);
    expect(action.querySelector('.workbench-dock__tile')?.getAttribute('data-motion-animate')).toBe(
      JSON.stringify({ scale: 1, y: 0, x: 0 })
    );
    expect(action.draggable).toBe(false);
    expect(action.getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps a Dock action anchor connected when its active state changes', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    let activatedTrigger: HTMLButtonElement | undefined;

    function Harness() {
      const [active, setActive] = createSignal(false);
      return (
        <WorkbenchFilterBar
          widgetDefinitions={widgetDefinitions}
          widgets={[]}
          filters={{ 'custom.files': true }}
          onSoloFilter={() => {}}
          dockActions={[
            {
              id: 'plugins',
              label: 'Plugins',
              icon: () => <svg aria-hidden="true" />,
              active: active(),
              onActivate: (trigger) => {
                activatedTrigger = trigger;
                setActive(true);
              },
            },
          ]}
        />
      );
    }

    dispose = render(() => <Harness />, host);
    const trigger = host.querySelector<HTMLButtonElement>(
      '[data-workbench-dock-action="plugins"]'
    )!;

    trigger.click();
    await Promise.resolve();

    expect(activatedTrigger).toBe(trigger);
    expect(trigger.isConnected).toBe(true);
    expect(host.querySelector('[data-workbench-dock-action="plugins"]')).toBe(trigger);
    expect(trigger.getAttribute('aria-pressed')).toBe('true');
  });

  it('owns an external pointer source through the same threshold, ghost, Dock target, and Escape cancellation contract', async () => {
    const host = document.createElement('div');
    const source = document.createElement('button');
    document.body.append(host, source);
    const onExternalDrop = vi.fn();
    let externalDragController:
      | undefined
      | {
          begin: (
            event: PointerEvent,
            item: { id: string; label: string; icon: () => JSX.Element }
          ) => void;
        };

    dispose = render(
      () => (
        <WorkbenchFilterBar
          widgetDefinitions={widgetDefinitions}
          widgets={[]}
          filters={{ 'custom.files': true }}
          onSoloFilter={() => {}}
          registerExternalDockDragController={(controller) => {
            externalDragController = controller;
          }}
        />
      ),
      host
    );

    expect(externalDragController).toBeDefined();
    const capture = vi.fn();
    Object.defineProperty(source, 'setPointerCapture', { configurable: true, value: capture });
    source.addEventListener('pointerdown', (event) => {
      externalDragController!.begin(event, {
        id: 'plugin:containers',
        label: 'Containers',
        icon: () => <svg aria-hidden="true" />,
      });
    });
    dispatchPointerEvent('pointerdown', source, {
      pointerId: 73,
      clientX: 20,
      clientY: 20,
      buttons: 1,
    });
    expect(capture).toHaveBeenCalledWith(73);

    dispatchPointerEvent('pointermove', document, {
      pointerId: 73,
      clientX: 24,
      clientY: 20,
      buttons: 1,
    });
    expect(document.body.querySelector('.workbench-dock-ghost')).toBeNull();

    dispatchPointerEvent('pointermove', document, {
      pointerId: 73,
      clientX: 32,
      clientY: 20,
      buttons: 1,
    });
    expect(document.body.querySelector('.workbench-dock-ghost')).not.toBeNull();
    expect(host.querySelector('.workbench-dock__external-placeholder')).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.body.querySelector('.workbench-dock-ghost')).toBeNull();
    expect(host.querySelector('.workbench-dock__external-placeholder')).toBeNull();
    expect(onExternalDrop).not.toHaveBeenCalled();
  });

  it('commits an external item only over the Dock and suppresses the source click after dragging', async () => {
    const host = document.createElement('div');
    const source = document.createElement('button');
    document.body.append(host, source);
    const onExternalDrop = vi.fn();
    const onSourceClick = vi.fn();
    source.addEventListener('click', onSourceClick);
    let controller: Parameters<
      NonNullable<Parameters<typeof WorkbenchFilterBar>[0]['registerExternalDockDragController']>
    >[0];

    dispose = render(
      () => (
        <WorkbenchFilterBar
          widgetDefinitions={widgetDefinitions}
          widgets={[]}
          filters={{ 'custom.files': true }}
          onSoloFilter={() => {}}
          registerExternalDockDragController={(value) => {
            controller = value;
          }}
        />
      ),
      host
    );
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn(() => host.querySelector('.workbench-dock')),
    });
    source.addEventListener('pointerdown', (event) =>
      controller?.begin(event, {
        id: 'plugin:containers',
        label: 'Containers',
        icon: () => <svg aria-hidden="true" />,
        onDropToDock: onExternalDrop,
      })
    );

    dispatchPointerEvent('pointerdown', source, { pointerId: 81, clientX: 10, clientY: 10 });
    dispatchPointerEvent('pointermove', document, { pointerId: 81, clientX: 40, clientY: 20 });
    await Promise.resolve();
    expect(
      host.querySelector('.workbench-dock')?.classList.contains('is-external-drop-allowed')
    ).toBe(true);
    dispatchPointerEvent('pointerup', document, {
      pointerId: 81,
      clientX: 40,
      clientY: 20,
      buttons: 0,
    });
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    source.click();

    expect(onExternalDrop).toHaveBeenCalledTimes(1);
    expect(onExternalDrop).toHaveBeenCalledWith();
    expect(onSourceClick).not.toHaveBeenCalled();
    expect(
      host.querySelector('.workbench-dock')?.classList.contains('is-external-drop-allowed')
    ).toBe(false);
  });

  it('uses the shared widget preview and exact world point for an external canvas placement', async () => {
    const host = createWorkbenchHost();
    mockCanvasFrame(host);
    const source = document.createElement('button');
    document.body.append(source);
    const onDrop = vi.fn();
    const onDragPreviewChange = vi.fn();
    let controller: Parameters<
      NonNullable<Parameters<typeof WorkbenchFilterBar>[0]['registerExternalDockDragController']>
    >[0];

    dispose = render(
      () => (
        <WorkbenchFilterBar
          widgetDefinitions={widgetDefinitions}
          widgets={[]}
          filters={{ 'custom.files': true }}
          viewport={{ x: 10, y: 20, scale: 0.5 }}
          onSoloFilter={() => {}}
          onDragPreviewChange={onDragPreviewChange}
          registerExternalDockDragController={(value) => {
            controller = value;
          }}
        />
      ),
      host
    );
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn(() => document.querySelector('[data-floe-workbench-canvas-frame="true"]')),
    });
    source.addEventListener('pointerdown', (event) =>
      controller?.begin(event, {
        id: 'plugin:containers',
        label: 'Containers',
        icon: () => <svg aria-hidden="true" />,
        canvasPlacement: {
          widgetType: 'custom.files',
          onDrop,
        },
      })
    );

    dispatchPointerEvent('pointerdown', source, { pointerId: 82, clientX: 20, clientY: 20 });
    dispatchPointerEvent('pointermove', document, { pointerId: 82, clientX: 100, clientY: 100 });

    expect(onDragPreviewChange.mock.calls.at(-1)?.[0]).toMatchObject({
      kind: 'widget',
      id: 'custom.files',
      label: 'Containers',
      clientX: 100,
      clientY: 100,
      dropAllowed: true,
    });
    expect(document.body.querySelector('.workbench-dock-ghost')).toBeNull();

    dispatchPointerEvent('pointerup', document, {
      pointerId: 82,
      clientX: 140,
      clientY: 140,
      buttons: 0,
    });

    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDrop).toHaveBeenCalledWith({
      widgetType: 'custom.files',
      centerWorld: { worldX: 260, worldY: 240 },
      frame: { x: 100, y: 130, width: 320, height: 220 },
    });
    expect(onDragPreviewChange.mock.calls.at(-1)?.[0]).toBeNull();
  });

  it.each([
    [
      'pointer cancel',
      () =>
        dispatchPointerEvent('pointercancel', document, {
          pointerId: 91,
          clientX: 44,
          clientY: 20,
          buttons: 0,
        }),
    ],
    [
      'invalid drop',
      () =>
        dispatchPointerEvent('pointerup', document, {
          pointerId: 91,
          clientX: 44,
          clientY: 20,
          buttons: 0,
        }),
    ],
  ])('rolls back an external drag after %s', async (_name, finish) => {
    const host = document.createElement('div');
    const source = document.createElement('button');
    document.body.append(host, source);
    const onExternalDrop = vi.fn();
    const onSourceClick = vi.fn();
    source.addEventListener('click', onSourceClick);
    let controller: Parameters<
      NonNullable<Parameters<typeof WorkbenchFilterBar>[0]['registerExternalDockDragController']>
    >[0];
    dispose = render(
      () => (
        <WorkbenchFilterBar
          widgetDefinitions={widgetDefinitions}
          widgets={[]}
          filters={{ 'custom.files': true }}
          onSoloFilter={() => {}}
          registerExternalDockDragController={(value) => {
            controller = value;
          }}
        />
      ),
      host
    );
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn(() => null),
    });
    source.addEventListener('pointerdown', (event) =>
      controller?.begin(event, {
        id: 'plugin:containers',
        label: 'Containers',
        icon: () => <svg aria-hidden="true" />,
        onDropToDock: onExternalDrop,
      })
    );

    dispatchPointerEvent('pointerdown', source, { pointerId: 91, clientX: 10, clientY: 10 });
    dispatchPointerEvent('pointermove', document, { pointerId: 91, clientX: 44, clientY: 20 });
    finish();
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    source.click();

    expect(onExternalDrop).not.toHaveBeenCalled();
    expect(onSourceClick).not.toHaveBeenCalled();
    expect(document.body.querySelector('.workbench-dock-ghost')).toBeNull();
    expect(host.querySelector('.workbench-dock__external-placeholder')).toBeNull();

    source.click();
    expect(onSourceClick).toHaveBeenCalledTimes(1);
  });

  it('keeps legacy host items before components and appends trailing host items after components', () => {
    const host = document.createElement('div');
    document.body.append(host);

    dispose = render(
      () => (
        <WorkbenchFilterBar
          widgetDefinitions={widgetDefinitions}
          widgets={[]}
          filters={{ 'custom.files': true }}
          onSoloFilter={() => {}}
          dockItems={[
            {
              id: 'host:leading',
              label: 'Leading host',
              icon: () => <svg aria-hidden="true" />,
            },
            {
              id: 'host:trailing-first',
              label: 'Trailing first',
              icon: () => <svg aria-hidden="true" />,
              dockPlacement: 'after-components',
            },
            {
              id: 'host:trailing-second',
              label: 'Trailing second',
              icon: () => <svg aria-hidden="true" />,
              dockPlacement: 'after-components',
            },
          ]}
        />
      ),
      host
    );

    const dock = host.querySelector('.workbench-dock')!;
    const children = Array.from(dock.children);
    const leading = host.querySelector('[data-workbench-dock-item="host:leading"]')!;
    const component = host.querySelector('[aria-label^="Files —"]')!;
    const trailingFirst = host.querySelector('[data-workbench-dock-item="host:trailing-first"]')!;
    const trailingSecond = host.querySelector('[data-workbench-dock-item="host:trailing-second"]')!;

    expect(children.indexOf(leading)).toBeLessThan(children.indexOf(component));
    expect(children.indexOf(component)).toBeLessThan(children.indexOf(trailingFirst));
    expect(children.indexOf(trailingFirst)).toBeLessThan(children.indexOf(trailingSecond));
    expect(host.querySelectorAll('.workbench-dock__divider')).toHaveLength(2);
  });

  it('projects an after-components external Dock placeholder at the visual tail', () => {
    const host = document.createElement('div');
    const source = document.createElement('button');
    document.body.append(host, source);
    let controller: Parameters<
      NonNullable<Parameters<typeof WorkbenchFilterBar>[0]['registerExternalDockDragController']>
    >[0];

    dispose = render(
      () => (
        <WorkbenchFilterBar
          widgetDefinitions={widgetDefinitions}
          widgets={[]}
          filters={{ 'custom.files': true }}
          onSoloFilter={() => {}}
          dockItems={[
            {
              id: 'plugin:existing',
              label: 'Existing plugin',
              icon: () => <svg aria-hidden="true" />,
              dockPlacement: 'after-components',
            },
          ]}
          registerExternalDockDragController={(value) => {
            controller = value;
          }}
        />
      ),
      host
    );
    source.addEventListener('pointerdown', (event) =>
      controller?.begin(event, {
        id: 'plugin:new',
        label: 'New plugin',
        icon: () => <svg aria-hidden="true" />,
        dockPlacement: 'after-components',
      })
    );

    dispatchPointerEvent('pointerdown', source, { pointerId: 99, clientX: 10, clientY: 10 });
    dispatchPointerEvent('pointermove', document, { pointerId: 99, clientX: 40, clientY: 20 });

    const dock = host.querySelector('.workbench-dock')!;
    const placeholder = dock.querySelector('.workbench-dock__external-placeholder')!;
    const existing = dock.querySelector('[data-workbench-dock-item="plugin:existing"]')!;
    const children = Array.from(dock.children);
    expect(children.indexOf(existing)).toBeLessThan(children.indexOf(placeholder));
    expect(children.at(-1)).toBe(placeholder);
    expect(host.querySelectorAll('.workbench-dock__divider')).toHaveLength(2);
  });

  it('renders host Dock items as draggable items with click activation and canvas drop semantics', async () => {
    const host = createWorkbenchHost();
    mockCanvasFrame(host);
    const onActivate = vi.fn();
    const onContextMenu = vi.fn();
    const onDrop = vi.fn();
    const onDragPreviewChange = vi.fn();

    dispose = render(
      () => (
        <WorkbenchFilterBar
          widgetDefinitions={widgetDefinitions}
          widgets={[]}
          filters={{ 'custom.files': true }}
          viewport={{ x: 0, y: 0, scale: 1 }}
          onSoloFilter={() => {}}
          dockItems={[
            {
              id: 'plugin:containers',
              label: 'Containers',
              icon: () => <svg aria-hidden="true" />,
              dockPlacement: 'after-components',
              onActivate,
              onContextMenu,
              canvasPlacement: {
                widgetType: 'custom.files',
                onDrop,
              },
            },
          ]}
          onDragPreviewChange={onDragPreviewChange}
        />
      ),
      host
    );

    const item = host.querySelector<HTMLButtonElement>(
      '[data-workbench-dock-item="plugin:containers"]'
    );
    expect(item).not.toBeNull();
    expect(item?.draggable).toBe(false);
    expect(item?.getAttribute('aria-haspopup')).toBe('menu');
    Object.defineProperty(item, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 100, top: 200, width: 40, height: 20 }),
    });

    const pointerMenuRequest = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 321,
      clientY: 456,
    });
    item!.dispatchEvent(pointerMenuRequest);
    expect(pointerMenuRequest.defaultPrevented).toBe(true);
    expect(onContextMenu).toHaveBeenNthCalledWith(1, {
      trigger: item,
      clientX: 321,
      clientY: 456,
      source: 'pointer',
    });

    const keyboardMenuRequest = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'F10',
      shiftKey: true,
    });
    item!.dispatchEvent(keyboardMenuRequest);
    expect(keyboardMenuRequest.defaultPrevented).toBe(true);
    expect(onContextMenu).toHaveBeenNthCalledWith(2, {
      trigger: item,
      clientX: 120,
      clientY: 210,
      source: 'keyboard',
    });

    dispatchPointerEvent('pointerdown', item!, { pointerId: 101, clientX: 20, clientY: 20 });
    dispatchPointerEvent('pointerup', document, {
      pointerId: 101,
      clientX: 20,
      clientY: 20,
      buttons: 0,
    });
    expect(onActivate).toHaveBeenCalledTimes(1);

    dispatchPointerEvent('pointerdown', item!, { pointerId: 102, clientX: 20, clientY: 20 });
    dispatchPointerEvent('pointermove', document, { pointerId: 102, clientX: 100, clientY: 100 });
    expect(document.body.querySelector('.workbench-dock-ghost')).toBeNull();
    expect(onDragPreviewChange.mock.calls.at(-1)?.[0]).toMatchObject({
      kind: 'widget',
      id: 'custom.files',
      label: 'Containers',
      dropAllowed: true,
    });
    dispatchPointerEvent('pointerup', document, {
      pointerId: 102,
      clientX: 100,
      clientY: 100,
      buttons: 0,
    });

    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDrop).toHaveBeenCalledWith({
      widgetType: 'custom.files',
      centerWorld: { worldX: 100, worldY: 100 },
      frame: { x: -60, y: -10, width: 320, height: 220 },
    });
  });
});
