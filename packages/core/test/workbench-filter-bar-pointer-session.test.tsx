// @vitest-environment jsdom

import { splitProps, type JSX } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, describe, expect, it, vi } from 'vitest';

type MotionSpanProps = JSX.IntrinsicElements['span'] & {
  animate?: unknown;
  transition?: unknown;
};

vi.mock('solid-motionone', () => ({
  Motion: {
    span: (props: MotionSpanProps) => {
      const [, domProps] = splitProps(props, ['animate', 'transition']);
      return <span {...domProps} />;
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

function mockCanvasFrame(): HTMLElement {
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
  document.body.appendChild(frame);
  return frame;
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
    mockCanvasFrame();
    const host = document.createElement('div');
    document.body.appendChild(host);
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
    expect(onCreateAt.mock.calls[0]?.slice(0, 3)).toEqual(['custom.files', 120, 120]);
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
    mockCanvasFrame();
    const callbacks = mockAnimationFrames();
    const host = document.createElement('div');
    document.body.appendChild(host);
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
    mockCanvasFrame();
    const callbacks = mockAnimationFrames();
    const host = document.createElement('div');
    document.body.appendChild(host);
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
    expect(regionButton!.classList.contains('is-filter-muted')).toBe(false);
    expect(textButton!.classList.contains('is-filter-muted')).toBe(false);

    dispatchPointerEvent('pointerdown', regionButton!, { pointerId: 31 });
    dispatchPointerEvent('pointerup', document, { pointerId: 31, buttons: 0 });
    dispatchPointerEvent('pointerdown', textButton!, { pointerId: 32 });
    dispatchPointerEvent('pointerup', document, { pointerId: 32, buttons: 0 });
    await Promise.resolve();

    expect(onSoloFilter).not.toHaveBeenCalled();
  });

  it('shows the canvas placement preview as soon as a widget drag is armed', async () => {
    mockCanvasFrame();
    const host = document.createElement('div');
    document.body.appendChild(host);
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
    mockCanvasFrame();
    const host = document.createElement('div');
    document.body.appendChild(host);
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
    mockCanvasFrame();
    const host = document.createElement('div');
    document.body.appendChild(host);
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
});
