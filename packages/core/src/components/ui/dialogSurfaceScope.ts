export const DIALOG_SURFACE_HOST_ATTR = 'data-floe-dialog-surface-host';
export const DIALOG_SURFACE_BOUNDARY_ATTR = 'data-floe-dialog-surface-boundary';

const DIALOG_SURFACE_INTERACTION_TTL_MS = 1600;

export type DialogSurfaceInteractionSnapshot = Readonly<{
  target: Element | null;
  activeElement: Element | null;
  recordedAt: number;
}>;

export type ResolvedDialogSurfaceHost = Readonly<{
  host: HTMLElement | null;
  mode: 'global' | 'surface';
}>;

let lastInteractionSnapshot: DialogSurfaceInteractionSnapshot | null = null;
let trackedDocument: Document | null = null;

function resolveElement(target: EventTarget | null): Element | null {
  if (typeof Element !== 'undefined' && target instanceof Element) {
    return target;
  }
  if (typeof Node !== 'undefined' && target instanceof Node) {
    return target.parentElement;
  }
  return null;
}

function readActiveElement(doc: Document | null): Element | null {
  const activeElement = doc?.activeElement;
  return activeElement instanceof Element ? activeElement : null;
}

function captureInteractionTarget(target: EventTarget | null): void {
  const doc = typeof document !== 'undefined' ? document : null;
  lastInteractionSnapshot = {
    target: resolveElement(target),
    activeElement: readActiveElement(doc),
    recordedAt: Date.now(),
  };
}

function handlePointerDownCapture(event: PointerEvent): void {
  captureInteractionTarget(event.target);
}

function handleFocusInCapture(event: FocusEvent): void {
  captureInteractionTarget(event.target);
}

export function ensureDialogSurfaceInteractionTracking(): void {
  if (typeof document === 'undefined') return;
  if (trackedDocument === document) return;

  if (trackedDocument) {
    trackedDocument.removeEventListener('pointerdown', handlePointerDownCapture, true);
    trackedDocument.removeEventListener('focusin', handleFocusInCapture, true);
  }

  document.addEventListener('pointerdown', handlePointerDownCapture, true);
  document.addEventListener('focusin', handleFocusInCapture, true);
  trackedDocument = document;
}

function readFreshInteractionSnapshot(): DialogSurfaceInteractionSnapshot | null {
  if (!lastInteractionSnapshot) return null;
  if (Date.now() - lastInteractionSnapshot.recordedAt > DIALOG_SURFACE_INTERACTION_TTL_MS) {
    return null;
  }
  return lastInteractionSnapshot;
}

function findSurfaceHostFromElement(element: Element | null): HTMLElement | null {
  const host = element?.closest(`[${DIALOG_SURFACE_HOST_ATTR}="true"]`);
  return host instanceof HTMLElement && host.isConnected ? host : null;
}

export function resolveDialogSurfaceHost(): ResolvedDialogSurfaceHost {
  ensureDialogSurfaceInteractionTracking();

  const snapshot = readFreshInteractionSnapshot();
  const host =
    findSurfaceHostFromElement(snapshot?.target ?? null)
    ?? findSurfaceHostFromElement(snapshot?.activeElement ?? null);

  if (!host) {
    return { host: null, mode: 'global' };
  }

  return { host, mode: 'surface' };
}

export function __resetDialogSurfaceScopeForTests(): void {
  lastInteractionSnapshot = null;
}

if (typeof document !== 'undefined') {
  ensureDialogSurfaceInteractionTracking();
}
