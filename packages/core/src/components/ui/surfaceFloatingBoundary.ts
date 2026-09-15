import { resolveMobileKeyboardViewportMetrics } from './mobileKeyboardViewport';
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
  if (typeof document === 'undefined') return { top: 0, right: 0, bottom: 0, left: 0 };
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px)';
  document.documentElement.append(probe);
  const style = getComputedStyle(probe);
  const inset = (value: string) => Math.max(0, Number.parseFloat(value) || 0);
  const result = {
    top: inset(style.paddingTop),
    right: inset(style.paddingRight),
    bottom: inset(style.paddingBottom),
    left: inset(style.paddingLeft),
  };
  probe.remove();
  return result;
}

export function resolveFloatingBoundary(
  host: ResolvedSurfacePortalHost,
  boundary?: SurfaceFloatingBoundary,
  safeArea: SurfaceSafeArea = { top: 0, right: 0, bottom: 0, left: 0 }
): SurfacePortalRect | null {
  if (boundary === null || typeof window === 'undefined') return null;
  if (host.mode === 'surface' && !isSurfacePortalMode(host)) return null;
  const viewport = resolveMobileKeyboardViewportMetrics(window);
  const top = window.innerHeight - viewport.bottomPx - viewport.heightPx;
  const visible = {
    left: viewport.leftPx + safeArea.left,
    top: top + safeArea.top,
    right: viewport.leftPx + viewport.widthPx - safeArea.right,
    bottom: top + viewport.heightPx - safeArea.bottom,
    width: viewport.widthPx,
    height: viewport.heightPx,
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
    resolveSurfacePortalBoundaryRect(host),
    ...(explicit ? [explicit] : [])
  );
}
