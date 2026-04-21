import type { SurfacePortalRect } from './surfacePortalTypes';

export const DIALOG_SURFACE_HOST_ATTR = 'data-floe-dialog-surface-host';
export const SURFACE_PORTAL_HOST_ATTR = DIALOG_SURFACE_HOST_ATTR;
export const SURFACE_PORTAL_LAYER_ATTR = 'data-floe-surface-portal-layer';
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
  boundaryHost: HTMLElement | null;
  mountHost: HTMLElement | null;
  mode: SurfacePortalMode;
}>;
export type ResolvedSurfacePortalHost = ResolvedDialogSurfaceHost;
export type SurfacePortalBoundaryRect = SurfacePortalRect;
export type { SurfacePortalRect };

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

function findSurfacePortalLayerFromHost(host: HTMLElement | null): HTMLElement | null {
  if (!host) return null;
  const layer = host.closest(`[${SURFACE_PORTAL_LAYER_ATTR}="true"]`);
  if (typeof HTMLElement === 'undefined') return null;
  return layer instanceof HTMLElement && layer.isConnected ? layer : null;
}

export function resolveDialogSurfaceHost(): ResolvedDialogSurfaceHost {
  return resolveSurfacePortalHost();
}

export function resolveSurfacePortalHost(): ResolvedSurfacePortalHost {
  ensureDialogSurfaceInteractionTracking();

  const snapshot = readFreshInteractionSnapshot();
  const boundaryHost =
    findSurfaceHostFromElement(snapshot?.target ?? null) ??
    findSurfaceHostFromElement(snapshot?.activeElement ?? null);

  if (!boundaryHost) {
    return { host: null, boundaryHost: null, mountHost: null, mode: 'global' };
  }

  return {
    host: boundaryHost,
    boundaryHost,
    mountHost: findSurfacePortalLayerFromHost(boundaryHost) ?? boundaryHost,
    mode: 'surface',
  };
}

export function isSurfacePortalMode(surfaceHost: ResolvedSurfacePortalHost): boolean {
  return surfaceHost.mode === 'surface' && Boolean(surfaceHost.boundaryHost?.isConnected);
}

export function resolveSurfacePortalMount(
  surfaceHost: ResolvedSurfacePortalHost
): HTMLElement | undefined {
  if (!isSurfacePortalMode(surfaceHost)) {
    return undefined;
  }

  return surfaceHost.mountHost ?? surfaceHost.boundaryHost ?? undefined;
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
  if (!isSurfacePortalMode(surfaceHost) || !surfaceHost.boundaryHost) {
    return resolveViewportBoundaryRect();
  }

  const rect = surfaceHost.boundaryHost.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

export function resolveSurfacePortalMountRect(
  surfaceHost: ResolvedSurfacePortalHost
): SurfacePortalBoundaryRect {
  const mount = resolveSurfacePortalMount(surfaceHost);
  if (!mount) {
    return resolveViewportBoundaryRect();
  }

  const rect = mount.getBoundingClientRect();
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

  const mountRect = resolveSurfacePortalMountRect(surfaceHost);
  return {
    x: position.x - mountRect.left,
    y: position.y - mountRect.top,
  };
}

export function projectSurfacePortalRect(
  rect: SurfacePortalBoundaryRect,
  surfaceHost: ResolvedSurfacePortalHost
): SurfacePortalBoundaryRect {
  if (!isSurfacePortalMode(surfaceHost)) {
    return rect;
  }

  const mountRect = resolveSurfacePortalMountRect(surfaceHost);
  return {
    left: rect.left - mountRect.left,
    top: rect.top - mountRect.top,
    right: rect.right - mountRect.left,
    bottom: rect.bottom - mountRect.top,
    width: rect.width,
    height: rect.height,
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
