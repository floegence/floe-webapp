import { startHotInteraction, type HotInteractionKind } from '../../utils/hotInteraction';
import { measureDeckGrid } from './deckGridMetrics';

export interface DeckPointerSessionSnapshot {
  pointerId: number;
  kind: HotInteractionKind;
  widgetId: string;
  gridEl: HTMLElement;
  gridRect: DOMRect;
  gridPaddingLeft: number;
  gridPaddingRight: number;
  startClientX: number;
  startClientY: number;
  startScrollTop: number;
  lastClientX: number;
  lastClientY: number;
  lastAppliedClientX: number;
  lastAppliedClientY: number;
  lastAppliedScrollTop: number;
  rafId: number | null;
  stopHotInteraction: (() => void) | null;
}

export interface DeckPointerSessionFrame {
  snapshot: DeckPointerSessionSnapshot;
  deltaX: number;
  deltaY: number;
  cols: number;
  rowHeight: number;
  gap: number;
  cellWidth: number;
  cellHeight: number;
  colPitch: number;
  rowPitch: number;
}

export interface StartDeckPointerSessionOptions {
  kind: HotInteractionKind;
  widgetId: string;
  gridEl: HTMLElement;
  captureEl?: HTMLElement | null;
  pointerEvent: PointerEvent;
  cursor: string;
  onMove: (frame: DeckPointerSessionFrame) => void;
  onEnd: (options: {
    commit: boolean;
    snapshot: DeckPointerSessionSnapshot;
  }) => void;
}

export interface DeckPointerSessionController {
  snapshot: () => DeckPointerSessionSnapshot;
  updatePointer: (event: Pick<PointerEvent, 'pointerId' | 'clientX' | 'clientY'>) => void;
  stop: (options?: {
    commit?: boolean;
    event?: Pick<PointerEvent, 'pointerId' | 'clientX' | 'clientY'>;
  }) => void;
}

function maybeAutoScroll(snapshot: DeckPointerSessionSnapshot): boolean {
  const threshold = 48;
  const maxSpeed = 24;

  const distTop = snapshot.lastClientY - snapshot.gridRect.top;
  const distBottom = snapshot.gridRect.bottom - snapshot.lastClientY;

  let delta = 0;
  if (distTop < threshold) {
    delta = -Math.ceil(((threshold - distTop) / threshold) * maxSpeed);
  } else if (distBottom < threshold) {
    delta = Math.ceil(((threshold - distBottom) / threshold) * maxSpeed);
  }

  if (delta === 0) return false;

  const prev = snapshot.gridEl.scrollTop;
  const next = Math.max(0, Math.min(prev + delta, snapshot.gridEl.scrollHeight - snapshot.gridEl.clientHeight));
  if (next === prev) return false;
  snapshot.gridEl.scrollTop = next;
  return true;
}

function readFrame(snapshot: DeckPointerSessionSnapshot): DeckPointerSessionFrame | null {
  const scrollTop = snapshot.gridEl.scrollTop;
  if (
    snapshot.lastClientX === snapshot.lastAppliedClientX &&
    snapshot.lastClientY === snapshot.lastAppliedClientY &&
    scrollTop === snapshot.lastAppliedScrollTop
  ) {
    return null;
  }

  snapshot.lastAppliedClientX = snapshot.lastClientX;
  snapshot.lastAppliedClientY = snapshot.lastClientY;
  snapshot.lastAppliedScrollTop = scrollTop;

  const measurements = measureDeckGrid(snapshot.gridEl, {
    paddingLeft: snapshot.gridPaddingLeft,
    paddingRight: snapshot.gridPaddingRight,
  });
  if (!measurements) return null;

  return {
    snapshot,
    deltaX: snapshot.lastClientX - snapshot.startClientX,
    deltaY: (snapshot.lastClientY - snapshot.startClientY) + (scrollTop - snapshot.startScrollTop),
    cols: measurements.cols,
    rowHeight: measurements.rowHeight,
    gap: measurements.gap,
    cellWidth: measurements.cellWidth,
    cellHeight: measurements.cellHeight,
    colPitch: measurements.cellWidth + measurements.gap,
    rowPitch: measurements.cellHeight,
  };
}

export function startDeckPointerSession(options: StartDeckPointerSessionOptions): DeckPointerSessionController {
  const ownerDocument = options.gridEl.ownerDocument;
  const ownerWindow = ownerDocument.defaultView ?? window;
  const styles = ownerWindow.getComputedStyle(options.gridEl);

  const snapshot: DeckPointerSessionSnapshot = {
    pointerId: options.pointerEvent.pointerId,
    kind: options.kind,
    widgetId: options.widgetId,
    gridEl: options.gridEl,
    gridRect: options.gridEl.getBoundingClientRect(),
    gridPaddingLeft: parseFloat(styles.paddingLeft) || 0,
    gridPaddingRight: parseFloat(styles.paddingRight) || 0,
    startClientX: options.pointerEvent.clientX,
    startClientY: options.pointerEvent.clientY,
    startScrollTop: options.gridEl.scrollTop,
    lastClientX: options.pointerEvent.clientX,
    lastClientY: options.pointerEvent.clientY,
    lastAppliedClientX: options.pointerEvent.clientX,
    lastAppliedClientY: options.pointerEvent.clientY,
    lastAppliedScrollTop: options.gridEl.scrollTop,
    rafId: null,
    stopHotInteraction: startHotInteraction({
      kind: options.kind,
      cursor: options.cursor,
      lockUserSelect: true,
    }),
  };

  let active = true;

  const flush = () => {
    snapshot.rafId = null;
    if (!active) return;

    const didAutoScroll = maybeAutoScroll(snapshot);
    const frame = readFrame(snapshot);
    if (frame) {
      options.onMove(frame);
    }

    if (active && didAutoScroll) {
      scheduleFlush();
    }
  };

  const scheduleFlush = () => {
    if (!active || snapshot.rafId !== null) return;
    if (typeof ownerWindow.requestAnimationFrame !== 'function') {
      flush();
      return;
    }
    snapshot.rafId = ownerWindow.requestAnimationFrame(flush);
  };

  const releasePointerCapture = () => {
    if (!options.captureEl || typeof options.captureEl.releasePointerCapture !== 'function') return;
    try {
      options.captureEl.releasePointerCapture(snapshot.pointerId);
    } catch {
      // Ignore already released captures.
    }
  };

  const cleanupListeners = () => {
    ownerDocument.removeEventListener('pointermove', handlePointerMove, true);
    ownerDocument.removeEventListener('pointerup', handlePointerUp, true);
    ownerDocument.removeEventListener('pointercancel', handlePointerCancel, true);
    options.captureEl?.removeEventListener('lostpointercapture', handleLostPointerCapture);
  };

  const stop = (stopOptions?: {
    commit?: boolean;
    event?: Pick<PointerEvent, 'pointerId' | 'clientX' | 'clientY'>;
  }) => {
    if (!active) return;
    const event = stopOptions?.event;
    if (event && event.pointerId !== snapshot.pointerId) return;

    if (event) {
      snapshot.lastClientX = event.clientX;
      snapshot.lastClientY = event.clientY;
    }

    active = false;
    if (snapshot.rafId !== null && typeof ownerWindow.cancelAnimationFrame === 'function') {
      ownerWindow.cancelAnimationFrame(snapshot.rafId);
      snapshot.rafId = null;
    }

    if (stopOptions?.commit !== false) {
      maybeAutoScroll(snapshot);
      const frame = readFrame(snapshot);
      if (frame) {
        options.onMove(frame);
      }
    }

    cleanupListeners();
    releasePointerCapture();
    try {
      options.onEnd({
        commit: stopOptions?.commit !== false,
        snapshot,
      });
    } finally {
      snapshot.stopHotInteraction?.();
      snapshot.stopHotInteraction = null;
    }
  };

  const updatePointer = (event: Pick<PointerEvent, 'pointerId' | 'clientX' | 'clientY'>) => {
    if (!active || event.pointerId !== snapshot.pointerId) return;
    snapshot.lastClientX = event.clientX;
    snapshot.lastClientY = event.clientY;
    scheduleFlush();
  };

  const handlePointerMove = (event: PointerEvent) => {
    updatePointer(event);
  };

  const handlePointerUp = (event: PointerEvent) => {
    stop({ event });
  };

  const handlePointerCancel = (event: PointerEvent) => {
    stop({ event, commit: false });
  };

  const handleLostPointerCapture = () => {
    stop();
  };

  ownerDocument.addEventListener('pointermove', handlePointerMove, true);
  ownerDocument.addEventListener('pointerup', handlePointerUp, true);
  ownerDocument.addEventListener('pointercancel', handlePointerCancel, true);
  options.captureEl?.addEventListener('lostpointercapture', handleLostPointerCapture);

  if (options.captureEl && typeof options.captureEl.setPointerCapture === 'function') {
    try {
      options.captureEl.setPointerCapture(snapshot.pointerId);
    } catch {
      // Pointer capture is only an enhancement; correctness comes from document listeners.
    }
  }

  return {
    snapshot: () => snapshot,
    updatePointer,
    stop,
  };
}
