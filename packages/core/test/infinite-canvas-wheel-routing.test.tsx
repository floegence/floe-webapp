// @vitest-environment jsdom

import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InfiniteCanvas } from '../src/components/ui/InfiniteCanvas';
import { CANVAS_WHEEL_INTERACTIVE_ATTR } from '../src/components/ui/localInteractionSurface';

const INITIAL_VIEWPORT = { x: 220, y: 140, scale: 1 };
const WHEEL_CLIENT_X = 320;
const WHEEL_CLIENT_Y = 260;

type HarnessMode = 'interactive' | 'wheel_interactive';

const disposers: Array<() => void> = [];

function mount(view: () => unknown, host: HTMLElement): void {
  disposers.push(render(view, host));
}

function readViewportSnapshot(host: HTMLElement) {
  const output = host.querySelector('[data-testid="viewport-snapshot"]');
  return JSON.parse(output?.textContent ?? 'null');
}

function mockCanvasRect(canvas: HTMLElement): void {
  Object.defineProperty(canvas, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      left: 0,
      top: 0,
      right: 640,
      bottom: 480,
      width: 640,
      height: 480,
      x: 0,
      y: 0,
      toJSON: () => undefined,
    }),
  });
}

function dispatchWheel(target: EventTarget, deltaY: number): WheelEvent {
  const event = new WheelEvent('wheel', {
    bubbles: true,
    cancelable: true,
    clientX: WHEEL_CLIENT_X,
    clientY: WHEEL_CLIENT_Y,
    deltaY,
  });
  target.dispatchEvent(event);
  return event;
}

function CanvasWheelHarness(props: { mode: HarnessMode }) {
  const [viewport, setViewport] = createSignal(INITIAL_VIEWPORT);

  return (
    <>
      <InfiniteCanvas viewport={viewport()} onViewportChange={setViewport} ariaLabel="Wheel routing harness">
        <div style={{ position: 'relative', width: '480px', height: '320px' }}>
          <div
            {...(props.mode === 'interactive'
              ? { 'data-floe-canvas-interactive': 'true' }
              : { [CANVAS_WHEEL_INTERACTIVE_ATTR]: 'true' })}
          >
            <button type="button" data-testid="wheel-target">
              Wheel target
            </button>
          </div>
        </div>
      </InfiniteCanvas>

      <output data-testid="viewport-snapshot">{JSON.stringify(viewport())}</output>
    </>
  );
}

describe('InfiniteCanvas wheel routing', () => {
  afterEach(() => {
    while (disposers.length) {
      disposers.pop()?.();
    }
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('keeps cursor-centered zoom active over ordinary interactive widget regions', () => {
    vi.useFakeTimers();

    const host = document.createElement('div');
    document.body.appendChild(host);
    mount(() => <CanvasWheelHarness mode="interactive" />, host);

    const canvas = host.querySelector('.floe-infinite-canvas') as HTMLElement | null;
    const target = host.querySelector('[data-testid="wheel-target"]') as HTMLButtonElement | null;
    expect(canvas).toBeTruthy();
    expect(target).toBeTruthy();

    mockCanvasRect(canvas!);

    const event = dispatchWheel(target!, -120);
    expect(event.defaultPrevented).toBe(true);

    vi.advanceTimersByTime(100);

    const nextViewport = readViewportSnapshot(host);
    const anchoredWorldX = (WHEEL_CLIENT_X - nextViewport.x) / nextViewport.scale;
    const anchoredWorldY = (WHEEL_CLIENT_Y - nextViewport.y) / nextViewport.scale;

    expect(nextViewport.scale).toBeGreaterThan(INITIAL_VIEWPORT.scale);
    expect(anchoredWorldX).toBeCloseTo(
      (WHEEL_CLIENT_X - INITIAL_VIEWPORT.x) / INITIAL_VIEWPORT.scale,
      6
    );
    expect(anchoredWorldY).toBeCloseTo(
      (WHEEL_CLIENT_Y - INITIAL_VIEWPORT.y) / INITIAL_VIEWPORT.scale,
      6
    );
  });

  it('yields wheel ownership to explicit local wheel consumers', () => {
    vi.useFakeTimers();

    const host = document.createElement('div');
    document.body.appendChild(host);
    mount(() => <CanvasWheelHarness mode="wheel_interactive" />, host);

    const canvas = host.querySelector('.floe-infinite-canvas') as HTMLElement | null;
    const target = host.querySelector('[data-testid="wheel-target"]') as HTMLButtonElement | null;
    expect(canvas).toBeTruthy();
    expect(target).toBeTruthy();

    mockCanvasRect(canvas!);

    const event = dispatchWheel(target!, -120);
    expect(event.defaultPrevented).toBe(false);

    vi.advanceTimersByTime(100);

    expect(readViewportSnapshot(host)).toEqual(INITIAL_VIEWPORT);
  });
});
