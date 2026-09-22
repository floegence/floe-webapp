import { readViewportSnapshot } from '../../viewport';
import {
  isSurfacePortalMode,
  resolveSurfacePortalBoundaryRect,
  type ResolvedSurfacePortalHost,
  type SurfacePortalRect,
} from './surfacePortalScope';

/** A collision boundary in client coordinates; null means explicitly unavailable. */
export type SurfaceFloatingBoundary = HTMLElement | SurfacePortalRect | null;

export function intersectSurfaceRects(...rects: readonly SurfacePortalRect[]): SurfacePortalRect {
  const left = Math.max(...rects.map((rect) => rect.left));
  const top = Math.max(...rects.map((rect) => rect.top));
  const right = Math.max(left, Math.min(...rects.map((rect) => rect.right)));
  const bottom = Math.max(top, Math.min(...rects.map((rect) => rect.bottom)));
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

export type SurfaceSafeArea = Readonly<{
  top: number;
  right: number;
  bottom: number;
  left: number;
}>;

export function readSurfaceSafeArea(): SurfaceSafeArea {
  return typeof window === 'undefined' ? { top: 0, right: 0, bottom: 0, left: 0 } : readViewportSnapshot(window).safeArea;
}

export function resolveFloatingBoundary(
  host: ResolvedSurfacePortalHost,
  boundary?: SurfaceFloatingBoundary,
  safeArea: SurfaceSafeArea = { top: 0, right: 0, bottom: 0, left: 0 }
): SurfacePortalRect | null {
  if (boundary === null || typeof window === 'undefined') return null;
  if (host.mode === 'surface' && !isSurfacePortalMode(host)) return null;
  const { visible: viewport } = readViewportSnapshot(window);
  const visible = {
    left: viewport.left + safeArea.left,
    top: viewport.top + safeArea.top,
    right: viewport.right - safeArea.right,
    bottom: viewport.bottom - safeArea.bottom,
    width: viewport.width,
    height: viewport.height,
  };
  let explicit: SurfacePortalRect | undefined;
  if (boundary instanceof HTMLElement) {
    if (!boundary.isConnected || boundary.closest('[inert], [hidden], [aria-hidden="true"]'))
      return null;
    explicit = boundary.getBoundingClientRect();
  } else {
    explicit = boundary;
  }
  if (
    explicit &&
    ![
      explicit.left,
      explicit.top,
      explicit.right,
      explicit.bottom,
      explicit.width,
      explicit.height,
    ].every(Number.isFinite)
  )
    return null;
  return intersectSurfaceRects(
    visible,
    ...(isSurfacePortalMode(host) ? [resolveSurfacePortalBoundaryRect(host)] : []),
    ...(explicit ? [explicit] : [])
  );
}
