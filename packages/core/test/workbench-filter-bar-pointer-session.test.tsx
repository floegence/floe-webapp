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
  } = {},
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

    dispose = render(() => (
      <WorkbenchFilterBar
        widgetDefinitions={widgetDefinitions}
        widgets={[]}
        filters={{ 'custom.files': true }}
        onSoloFilter={() => {}}
        onShowAll={() => {}}
        onCreateAt={onCreateAt}
      />
    ), host);

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
    expect(onCreateAt).toHaveBeenCalledWith('custom.files', 120, 120);
  });

  it('auto-pans the canvas while a widget pill is dragged against an edge', async () => {
    mockCanvasFrame();
    const callbacks = mockAnimationFrames();
    const host = document.createElement('div');
    document.body.appendChild(host);
    const onViewportCommit = vi.fn();

    dispose = render(() => (
      <WorkbenchFilterBar
        widgetDefinitions={widgetDefinitions}
        widgets={[]}
        filters={{ 'custom.files': true }}
        viewport={{ x: 0, y: 0, scale: 1 }}
        onSoloFilter={() => {}}
        onShowAll={() => {}}
        onViewportCommit={onViewportCommit}
      />
    ), host);

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
});
