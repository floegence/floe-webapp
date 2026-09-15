// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveFloatingBoundary } from '../src/components/ui/surfaceFloatingBoundary';
import type { ResolvedSurfacePortalHost } from '../src/components/ui/surfacePortalScope';
const globalHost: ResolvedSurfacePortalHost = {
  host: null,
  boundaryHost: null,
  mountHost: null,
  mode: 'global',
};
afterEach(() => {
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});
describe('floating collision boundary', () => {
  it('intersects visible viewport, safe areas, owner surface, and caller rectangle', () => {
    vi.stubGlobal('innerWidth', 390);
    vi.stubGlobal('innerHeight', 844);
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: { width: 390, height: 420, offsetTop: 30, offsetLeft: 0 },
    });
    const host = document.createElement('div');
    document.body.append(host);
    host.getBoundingClientRect = () => new DOMRect(10, 40, 370, 760);
    expect(
      resolveFloatingBoundary(
        { host, mountHost: host, boundaryHost: host, mode: 'surface' },
        new DOMRect(0, 20, 390, 400),
        { top: 20, right: 12, bottom: 20, left: 12 }
      )
    ).toEqual({ left: 12, top: 50, right: 378, bottom: 420, width: 366, height: 370 });
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: null });
  });
  it('rejects unavailable explicit boundaries without a viewport fallback', () => {
    expect(resolveFloatingBoundary(globalHost, null)).toBeNull();
    expect(resolveFloatingBoundary(globalHost, document.createElement('div'))).toBeNull();
    expect(resolveFloatingBoundary(globalHost, new DOMRect(NaN, 0, 200, 200))).toBeNull();
  });
  it('returns an empty intersection when the caller is outside the viewport', () => {
    const rect = resolveFloatingBoundary(globalHost, new DOMRect(2000, 2000, 100, 100));
    expect(rect?.width).toBe(0);
    expect(rect?.height).toBe(0);
  });
});
