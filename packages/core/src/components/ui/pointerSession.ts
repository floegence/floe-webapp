export type PointerSessionEndReason =
  | 'pointer_up'
  | 'pointer_cancel'
  | 'buttons_released'
  | 'lost_pointer_capture'
  | 'window_blur'
  | 'document_hidden'
  | 'manual_stop';

export interface PointerSessionSnapshot {
  pointerId: number;
  latestClientX: number;
  latestClientY: number;
  latestButtons: number;
  active: boolean;
  captureActive: boolean;
}

export interface PointerSessionEndEvent {
  reason: PointerSessionEndReason;
  commit: boolean;
  snapshot: PointerSessionSnapshot;
  event?: Pick<PointerEvent, 'pointerId' | 'clientX' | 'clientY' | 'buttons'>;
}

export interface StartPointerSessionOptions {
  pointerEvent: PointerEvent;
  captureEl?: HTMLElement | null;
  ownerDocument?: Document;
  buttonMask?: number;
  capturePointer?: boolean;
  onMove?: (event: PointerEvent, snapshot: PointerSessionSnapshot) => void;
  onEnd: (event: PointerSessionEndEvent) => void;
}

export interface PointerSessionController {
  snapshot: () => PointerSessionSnapshot;
  updatePointer: (event: Pick<PointerEvent, 'pointerId' | 'clientX' | 'clientY' | 'buttons'>) => void;
  capturePointer: () => void;
  stop: (options?: {
    reason?: PointerSessionEndReason;
    commit?: boolean;
    event?: Pick<PointerEvent, 'pointerId' | 'clientX' | 'clientY' | 'buttons'>;
  }) => void;
}

function resolveOwnerDocument(options: StartPointerSessionOptions): Document {
  if (options.ownerDocument) return options.ownerDocument;
  if (options.captureEl?.ownerDocument) return options.captureEl.ownerDocument;

  const target = options.pointerEvent.target;
  if (
    target &&
    typeof target === 'object' &&
    'ownerDocument' in target &&
    target.ownerDocument instanceof Document
  ) {
    return target.ownerDocument;
  }

  return document;
}

function readButtons(event: Pick<PointerEvent, 'buttons'> | PointerEvent, fallback: number): number {
  return typeof event.buttons === 'number' ? event.buttons : fallback;
}

function eventMatchesPointer(
  event: Pick<PointerEvent, 'pointerId'> | undefined,
  pointerId: number,
): boolean {
  return !event || event.pointerId === pointerId;
}

export function startPointerSession(options: StartPointerSessionOptions): PointerSessionController {
  const ownerDocument = resolveOwnerDocument(options);
  const ownerWindow = ownerDocument.defaultView ?? window;
  const buttonMask = options.buttonMask ?? 1;
  const initialButtons = readButtons(options.pointerEvent, buttonMask);
  const snapshot: PointerSessionSnapshot = {
    pointerId: options.pointerEvent.pointerId,
    latestClientX: options.pointerEvent.clientX,
    latestClientY: options.pointerEvent.clientY,
    latestButtons: initialButtons,
    active: true,
    captureActive: false,
  };

  const updatePointer = (
    event: Pick<PointerEvent, 'pointerId' | 'clientX' | 'clientY' | 'buttons'>,
  ) => {
    if (!snapshot.active || event.pointerId !== snapshot.pointerId) return;
    snapshot.latestClientX = event.clientX;
    snapshot.latestClientY = event.clientY;
    snapshot.latestButtons = readButtons(event, snapshot.latestButtons);
  };

  const capturePointer = () => {
    if (!snapshot.active) return;
    if (!options.captureEl || typeof options.captureEl.setPointerCapture !== 'function') return;

    try {
      options.captureEl.setPointerCapture(snapshot.pointerId);
      snapshot.captureActive = true;
    } catch {
      // Pointer capture is an enhancement. Document-level listeners remain
      // the correctness boundary when capture is unavailable or rejected.
    }
  };

  const releasePointerCapture = () => {
    if (!options.captureEl || typeof options.captureEl.releasePointerCapture !== 'function') {
      snapshot.captureActive = false;
      return;
    }

    try {
      if (
        typeof options.captureEl.hasPointerCapture !== 'function' ||
        options.captureEl.hasPointerCapture(snapshot.pointerId)
      ) {
        options.captureEl.releasePointerCapture(snapshot.pointerId);
      }
    } catch {
      // Ignore already released captures.
    } finally {
      snapshot.captureActive = false;
    }
  };

  const cleanupListeners = () => {
    ownerDocument.removeEventListener('pointermove', handlePointerMove, true);
    ownerDocument.removeEventListener('pointerup', handlePointerUp, true);
    ownerDocument.removeEventListener('pointercancel', handlePointerCancel, true);
    ownerDocument.removeEventListener('visibilitychange', handleVisibilityChange);
    ownerWindow.removeEventListener('blur', handleWindowBlur);
    options.captureEl?.removeEventListener('lostpointercapture', handleLostPointerCapture);
  };

  const stop: PointerSessionController['stop'] = (stopOptions = {}) => {
    if (!snapshot.active) return;
    const event = stopOptions.event;
    if (!eventMatchesPointer(event, snapshot.pointerId)) return;

    if (event) {
      updatePointer(event);
    }

    snapshot.active = false;
    cleanupListeners();
    releasePointerCapture();
    options.onEnd({
      reason: stopOptions.reason ?? 'manual_stop',
      commit: stopOptions.commit ?? false,
      snapshot,
      ...(event ? { event } : {}),
    });
  };

  function handlePointerMove(event: PointerEvent) {
    if (!snapshot.active || event.pointerId !== snapshot.pointerId) return;
    updatePointer(event);

    if (buttonMask > 0 && (readButtons(event, snapshot.latestButtons) & buttonMask) !== buttonMask) {
      stop({ reason: 'buttons_released', commit: true, event });
      return;
    }

    options.onMove?.(event, snapshot);
  }

  function handlePointerUp(event: PointerEvent) {
    stop({ reason: 'pointer_up', commit: true, event });
  }

  function handlePointerCancel(event: PointerEvent) {
    stop({ reason: 'pointer_cancel', commit: false, event });
  }

  function handleLostPointerCapture() {
    stop({ reason: 'lost_pointer_capture', commit: true });
  }

  function handleWindowBlur() {
    stop({ reason: 'window_blur', commit: true });
  }

  function handleVisibilityChange() {
    if (!ownerDocument.hidden) return;
    stop({ reason: 'document_hidden', commit: true });
  }

  ownerDocument.addEventListener('pointermove', handlePointerMove, true);
  ownerDocument.addEventListener('pointerup', handlePointerUp, true);
  ownerDocument.addEventListener('pointercancel', handlePointerCancel, true);
  ownerDocument.addEventListener('visibilitychange', handleVisibilityChange);
  ownerWindow.addEventListener('blur', handleWindowBlur);
  options.captureEl?.addEventListener('lostpointercapture', handleLostPointerCapture);

  if (options.capturePointer !== false) {
    capturePointer();
  }

  return {
    snapshot: () => snapshot,
    updatePointer,
    capturePointer,
    stop,
  };
}
