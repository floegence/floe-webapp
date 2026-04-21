export const DIALOG_SURFACE_HOST_ATTR = 'data-floe-dialog-surface-host';
export const SURFACE_PORTAL_HOST_ATTR = DIALOG_SURFACE_HOST_ATTR;
export const DIALOG_SURFACE_BOUNDARY_ATTR = 'data-floe-dialog-surface-boundary';

const SURFACE_PORTAL_INTERACTION_TTL_MS = 1600;

export type DialogSurfaceInteractionSnapshot = Readonly<{
  target: Element | null;
  activeElement: Element | null;
  recordedAt: number;
}>;
export type SurfacePortalInteractionSnapshot = DialogSurfaceInteractionSnapshot;

export type SurfacePortalMode = 'global' | 'surface';

export type ResolvedDialogSurfaceHost = Readonly<{
  host: HTMLElement | null;
  mode: SurfacePortalMode;
}>;
export type ResolvedSurfacePortalHost = ResolvedDialogSurfaceHost;
export type SurfacePortalBoundaryRect = Readonly<{
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
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
  ensureSurfacePortalInteractionTracking();
}

export function ensureSurfacePortalInteractionTracking(): void {
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
  if (Date.now() - lastInteractionSnapshot.recordedAt > SURFACE_PORTAL_INTERACTION_TTL_MS) {
    return null;
  }
  return lastInteractionSnapshot;
}

function findSurfaceHostFromElement(element: Element | null): HTMLElement | null {
  const host = element?.closest(`[${DIALOG_SURFACE_HOST_ATTR}="true"]`);
  if (typeof HTMLElement === 'undefined') return null;
  return host instanceof HTMLElement && host.isConnected ? host : null;
}

export function resolveDialogSurfaceHost(): ResolvedDialogSurfaceHost {
  return resolveSurfacePortalHost();
}

export function resolveSurfacePortalHost(): ResolvedSurfacePortalHost {
  ensureDialogSurfaceInteractionTracking();

  const snapshot = readFreshInteractionSnapshot();
  const host =
    findSurfaceHostFromElement(snapshot?.target ?? null) ??
    findSurfaceHostFromElement(snapshot?.activeElement ?? null);

  if (!host) {
    return { host: null, mode: 'global' };
  }

  return { host, mode: 'surface' };
}

export function isSurfacePortalMode(surfaceHost: ResolvedSurfacePortalHost): boolean {
  return surfaceHost.mode === 'surface' && Boolean(surfaceHost.host?.isConnected);
}

export function resolveSurfacePortalMount(
  surfaceHost: ResolvedSurfacePortalHost
): HTMLElement | undefined {
  return isSurfacePortalMode(surfaceHost) ? (surfaceHost.host ?? undefined) : undefined;
}

function resolveViewportBoundaryRect(): SurfacePortalBoundaryRect {
  if (typeof window === 'undefined') {
    return {
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
    };
  }

  return {
    left: 0,
    top: 0,
    right: window.innerWidth,
    bottom: window.innerHeight,
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

export function resolveSurfacePortalBoundaryRect(
  surfaceHost: ResolvedSurfacePortalHost
): SurfacePortalBoundaryRect {
  if (!isSurfacePortalMode(surfaceHost) || !surfaceHost.host) {
    return resolveViewportBoundaryRect();
  }

  const rect = surfaceHost.host.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

export function projectSurfacePortalPosition(
  position: Readonly<{ x: number; y: number }>,
  surfaceHost: ResolvedSurfacePortalHost
): Readonly<{ x: number; y: number }> {
  if (!isSurfacePortalMode(surfaceHost)) {
    return position;
  }

  const boundaryRect = resolveSurfacePortalBoundaryRect(surfaceHost);
  return {
    x: position.x - boundaryRect.left,
    y: position.y - boundaryRect.top,
  };
}

export function __resetDialogSurfaceScopeForTests(): void {
  __resetSurfacePortalScopeForTests();
}

export function __resetSurfacePortalScopeForTests(): void {
  lastInteractionSnapshot = null;
}

if (typeof document !== 'undefined') {
  ensureDialogSurfaceInteractionTracking();
}
