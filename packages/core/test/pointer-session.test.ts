// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  startPointerSession,
  type PointerSessionEndEvent,
} from '../src/components/ui/pointerSession';

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

function createPointerDown(target: EventTarget, options: {
  pointerId?: number;
  clientX?: number;
  clientY?: number;
  buttons?: number;
} = {}): PointerEvent {
  const EventCtor = typeof PointerEvent === 'function' ? PointerEvent : MouseEvent;
  const event = new EventCtor('pointerdown', {
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
  return event as PointerEvent;
}

describe('startPointerSession', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('continues move delivery when the pointer crosses element bounds with the button pressed', () => {
    const target = document.createElement('button');
    document.body.appendChild(target);
    const onMove = vi.fn();
    const onEnd = vi.fn();

    const pointerDown = createPointerDown(target, { pointerId: 7, clientX: 10, clientY: 10 });
    startPointerSession({
      pointerEvent: pointerDown,
      captureEl: target,
      onMove,
      onEnd,
    });

    dispatchPointerEvent('pointermove', document, {
      pointerId: 7,
      clientX: 120,
      clientY: 80,
      buttons: 1,
    });

    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onEnd).not.toHaveBeenCalled();
  });

  it('ends once when a re-entered pointer reports that the button is already released', () => {
    const target = document.createElement('button');
    document.body.appendChild(target);
    const onMove = vi.fn();
    const onEnd = vi.fn<(event: PointerSessionEndEvent) => void>();

    const pointerDown = createPointerDown(target, { pointerId: 8, clientX: 10, clientY: 10 });
    startPointerSession({
      pointerEvent: pointerDown,
      captureEl: target,
      onMove,
      onEnd,
    });

    dispatchPointerEvent('pointermove', document, {
      pointerId: 8,
      clientX: 40,
      clientY: 32,
      buttons: 0,
    });
    dispatchPointerEvent('pointermove', document, {
      pointerId: 8,
      clientX: 100,
      clientY: 96,
      buttons: 0,
    });

    expect(onMove).not.toHaveBeenCalled();
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onEnd.mock.calls[0]?.[0]).toMatchObject({
      reason: 'buttons_released',
      commit: true,
      snapshot: {
        pointerId: 8,
        latestClientX: 40,
        latestClientY: 32,
        latestButtons: 0,
        active: false,
      },
    });
  });

  it('treats lost pointer capture as a commit-oriented teardown signal', () => {
    const target = document.createElement('button');
    document.body.appendChild(target);
    const onEnd = vi.fn<(event: PointerSessionEndEvent) => void>();

    const pointerDown = createPointerDown(target, { pointerId: 9 });
    startPointerSession({
      pointerEvent: pointerDown,
      captureEl: target,
      onEnd,
    });

    target.dispatchEvent(new Event('lostpointercapture'));

    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onEnd.mock.calls[0]?.[0]).toMatchObject({
      reason: 'lost_pointer_capture',
      commit: true,
      snapshot: {
        pointerId: 9,
        active: false,
      },
    });
  });
});
