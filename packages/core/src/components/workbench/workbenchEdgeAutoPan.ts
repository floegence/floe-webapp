import type { WorkbenchViewport } from './types';

export const WORKBENCH_EDGE_AUTO_PAN_FRAME_SELECTOR = '[data-floe-workbench-canvas-frame="true"]';

const DEFAULT_EDGE_THRESHOLD_PX = 36;
const DEFAULT_OUTSIDE_TOLERANCE_PX = 10;
const DEFAULT_ACTIVATION_DELAY_MS = 100;
const DEFAULT_MAX_SPEED_PX_PER_SECOND = 480;
const MAX_FRAME_DELTA_MS = 48;
const MIN_SCALE = 0.001;

export interface WorkbenchEdgeAutoPanFrame {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface WorkbenchEdgeAutoPanVelocityOptions {
  frame: WorkbenchEdgeAutoPanFrame;
  clientX: number;
  clientY: number;
  thresholdPx?: number;
  outsideTolerancePx?: number;
  maxSpeedPxPerSecond?: number;
}

export interface WorkbenchEdgeAutoPanVelocity {
  viewportVelocityX: number;
  viewportVelocityY: number;
}

export interface WorkbenchEdgeAutoPanStep {
  viewportDeltaX: number;
  viewportDeltaY: number;
  worldDeltaX: number;
  worldDeltaY: number;
  viewport: WorkbenchViewport;
}

export interface WorkbenchEdgeAutoPanControllerOptions {
  readFrame: () => WorkbenchEdgeAutoPanFrame | null;
  readViewport: () => WorkbenchViewport | null;
  commitViewport: (viewport: WorkbenchViewport) => void;
  onPan?: (step: WorkbenchEdgeAutoPanStep) => void;
  onPanStart?: () => void;
  shouldPan?: () => boolean;
  thresholdPx?: number;
  outsideTolerancePx?: number;
  activationDelayMs?: number;
  maxSpeedPxPerSecond?: number;
}

export interface WorkbenchEdgeAutoPanController {
  updatePointer: (clientX: number, clientY: number) => void;
  stop: () => void;
}

function positiveFinite(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : fallback;
}

function isPointNearFrame(args: {
  frame: WorkbenchEdgeAutoPanFrame;
  clientX: number;
  clientY: number;
  outsideTolerancePx: number;
}): boolean {
  const { frame, clientX, clientY, outsideTolerancePx } = args;
  return (
    clientX >= frame.left - outsideTolerancePx
    && clientX <= frame.right + outsideTolerancePx
    && clientY >= frame.top - outsideTolerancePx
    && clientY <= frame.bottom + outsideTolerancePx
  );
}

function edgeFactor(distancePx: number, thresholdPx: number): number {
  const raw = (thresholdPx - Math.max(0, distancePx)) / thresholdPx;
  const clamped = Math.max(0, Math.min(1, raw));
  return clamped * clamped;
}

export function resolveWorkbenchEdgeAutoPanVelocity(
  options: WorkbenchEdgeAutoPanVelocityOptions,
): WorkbenchEdgeAutoPanVelocity {
  const thresholdPx = positiveFinite(options.thresholdPx, DEFAULT_EDGE_THRESHOLD_PX);
  const outsideTolerancePx = Math.max(0, positiveFinite(
    options.outsideTolerancePx,
    DEFAULT_OUTSIDE_TOLERANCE_PX,
  ));
  const maxSpeedPxPerSecond = positiveFinite(
    options.maxSpeedPxPerSecond,
    DEFAULT_MAX_SPEED_PX_PER_SECOND,
  );
  const frame = options.frame;
  if (
    !Number.isFinite(frame.width)
    || frame.width <= 0
    || !Number.isFinite(frame.height)
    || frame.height <= 0
    || !isPointNearFrame({
      frame,
      clientX: options.clientX,
      clientY: options.clientY,
      outsideTolerancePx,
    })
  ) {
    return { viewportVelocityX: 0, viewportVelocityY: 0 };
  }

  const pxPerMs = maxSpeedPxPerSecond / 1000;
  const left = edgeFactor(options.clientX - frame.left, thresholdPx);
  const right = edgeFactor(frame.right - options.clientX, thresholdPx);
  const top = edgeFactor(options.clientY - frame.top, thresholdPx);
  const bottom = edgeFactor(frame.bottom - options.clientY, thresholdPx);

  return {
    viewportVelocityX: (left - right) * pxPerMs,
    viewportVelocityY: (top - bottom) * pxPerMs,
  };
}

export function frameFromElement(element: HTMLElement | null | undefined): WorkbenchEdgeAutoPanFrame | null {
  const rect = element?.getBoundingClientRect();
  if (!rect) return null;
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

function scheduleFrame(callback: FrameRequestCallback): number | null {
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
    return null;
  }
  return window.requestAnimationFrame(callback);
}

function cancelFrame(frameId: number | null): void {
  if (
    frameId === null
    || typeof window === 'undefined'
    || typeof window.cancelAnimationFrame !== 'function'
  ) {
    return;
  }
  window.cancelAnimationFrame(frameId);
}

export function createWorkbenchEdgeAutoPanController(
  options: WorkbenchEdgeAutoPanControllerOptions,
): WorkbenchEdgeAutoPanController {
  let pointer: { clientX: number; clientY: number } | null = null;
  let frameId: number | null = null;
  let lastFrameTime: number | null = null;
  let hotSince: number | null = null;
  let stopped = false;
  let started = false;

  const thresholdPx = () => positiveFinite(options.thresholdPx, DEFAULT_EDGE_THRESHOLD_PX);
  const outsideTolerancePx = () => Math.max(0, positiveFinite(
    options.outsideTolerancePx,
    DEFAULT_OUTSIDE_TOLERANCE_PX,
  ));
  const activationDelayMs = () => Math.max(0, positiveFinite(
    options.activationDelayMs,
    DEFAULT_ACTIVATION_DELAY_MS,
  ));
  const maxSpeedPxPerSecond = () => positiveFinite(
    options.maxSpeedPxPerSecond,
    DEFAULT_MAX_SPEED_PX_PER_SECOND,
  );

  const clearHotState = () => {
    hotSince = null;
    lastFrameTime = null;
  };

  const schedule = () => {
    if (stopped || frameId !== null || !pointer) return;
    frameId = scheduleFrame(tick);
  };

  const tick = (now: number) => {
    frameId = null;
    if (stopped || !pointer) return;
    if (options.shouldPan && !options.shouldPan()) {
      clearHotState();
      return;
    }

    const frame = options.readFrame();
    const viewport = options.readViewport();
    if (!frame || !viewport) {
      clearHotState();
      return;
    }

    const velocity = resolveWorkbenchEdgeAutoPanVelocity({
      frame,
      clientX: pointer.clientX,
      clientY: pointer.clientY,
      thresholdPx: thresholdPx(),
      outsideTolerancePx: outsideTolerancePx(),
      maxSpeedPxPerSecond: maxSpeedPxPerSecond(),
    });
    if (velocity.viewportVelocityX === 0 && velocity.viewportVelocityY === 0) {
      clearHotState();
      return;
    }

    if (hotSince === null) {
      hotSince = now;
      lastFrameTime = now;
      schedule();
      return;
    }

    if (now - hotSince < activationDelayMs()) {
      lastFrameTime = now;
      schedule();
      return;
    }

    const elapsedMs = Math.max(0, Math.min(MAX_FRAME_DELTA_MS, now - (lastFrameTime ?? now)));
    lastFrameTime = now;
    if (elapsedMs <= 0) {
      schedule();
      return;
    }

    const viewportDeltaX = velocity.viewportVelocityX * elapsedMs;
    const viewportDeltaY = velocity.viewportVelocityY * elapsedMs;
    if (Math.abs(viewportDeltaX) < 0.01 && Math.abs(viewportDeltaY) < 0.01) {
      schedule();
      return;
    }

    const scale = Math.max(Math.abs(Number(viewport.scale)), MIN_SCALE);
    const nextViewport = {
      ...viewport,
      x: viewport.x + viewportDeltaX,
      y: viewport.y + viewportDeltaY,
    };
    if (!started) {
      started = true;
      options.onPanStart?.();
    }
    options.commitViewport(nextViewport);
    options.onPan?.({
      viewportDeltaX,
      viewportDeltaY,
      worldDeltaX: -viewportDeltaX / scale,
      worldDeltaY: -viewportDeltaY / scale,
      viewport: nextViewport,
    });
    schedule();
  };

  return {
    updatePointer: (clientX, clientY) => {
      pointer = { clientX, clientY };
      schedule();
    },
    stop: () => {
      stopped = true;
      cancelFrame(frameId);
      frameId = null;
      pointer = null;
      clearHotState();
    },
  };
}
