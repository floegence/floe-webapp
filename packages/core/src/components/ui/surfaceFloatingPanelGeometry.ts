export type SurfaceFloatingPanelPosition = Readonly<{
  x: number;
  y: number;
}>;

export type SurfaceFloatingPanelGeometry = Readonly<{
  left: number;
  top: number;
  width: number;
  height: number;
  panelWidth: number;
  panelHeight: number;
}>;

export type SurfaceFloatingPanelBoundaryInsets = Readonly<{
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}>;

export type SurfaceFloatingPanelAxis = Readonly<{
  min: number;
  max: number;
  room: number;
}>;

export type SurfaceFloatingPanelBounds = Readonly<{
  x: SurfaceFloatingPanelAxis;
  y: SurfaceFloatingPanelAxis;
}>;

export type SurfaceFloatingPanelSnapEdge = 'left' | 'right' | 'top' | 'bottom';

export type SurfaceFloatingPanelSnap = Readonly<{
  edge: SurfaceFloatingPanelSnapEdge;
  position: SurfaceFloatingPanelPosition;
}>;

export const DEFAULT_SURFACE_FLOATING_PANEL_INSET = 8;

function finiteNonNegative(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
}

export function insetSurfaceFloatingPanelGeometry(
  geometry: SurfaceFloatingPanelGeometry,
  insets: SurfaceFloatingPanelBoundaryInsets = {}
): SurfaceFloatingPanelGeometry {
  const width = Math.max(0, geometry.width);
  const height = Math.max(0, geometry.height);
  const left = Math.min(finiteNonNegative(insets.left, 0), width);
  const top = Math.min(finiteNonNegative(insets.top, 0), height);
  const right = Math.min(finiteNonNegative(insets.right, 0), Math.max(0, width - left));
  const bottom = Math.min(finiteNonNegative(insets.bottom, 0), Math.max(0, height - top));

  return {
    ...geometry,
    left: geometry.left + left,
    top: geometry.top + top,
    width: Math.max(0, width - left - right),
    height: Math.max(0, height - top - bottom),
  };
}

export function resolveSurfaceFloatingPanelInset(value: unknown): number {
  return finiteNonNegative(value, DEFAULT_SURFACE_FLOATING_PANEL_INSET);
}

export function resolveSurfaceFloatingPanelSnapThreshold(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : Infinity;
}

function resolveAxis(
  start: number,
  size: number,
  panelSize: number,
  inset: number
): SurfaceFloatingPanelAxis {
  const safeSize = Math.max(0, Number.isFinite(size) ? size : 0);
  const safePanelSize = Math.max(0, Number.isFinite(panelSize) ? panelSize : 0);
  const safeInset = Math.min(inset, safeSize / 2);
  const min = start + safeInset;
  const max = Math.max(min, start + safeSize - safePanelSize - safeInset);
  return { min, max, room: Math.max(0, max - min) };
}

export function resolveSurfaceFloatingPanelBounds(
  geometry: SurfaceFloatingPanelGeometry,
  inset = DEFAULT_SURFACE_FLOATING_PANEL_INSET
): SurfaceFloatingPanelBounds {
  const resolvedInset = resolveSurfaceFloatingPanelInset(inset);
  return {
    x: resolveAxis(geometry.left, geometry.width, geometry.panelWidth, resolvedInset),
    y: resolveAxis(geometry.top, geometry.height, geometry.panelHeight, resolvedInset),
  };
}

export function resolveSurfaceFloatingPanelPosition(
  bounds: SurfaceFloatingPanelBounds,
  placement: SurfaceFloatingPanelPosition
): SurfaceFloatingPanelPosition {
  return {
    x: bounds.x.min + placement.x * bounds.x.room,
    y: bounds.y.min + placement.y * bounds.y.room,
  };
}

function clampToAxis(value: number, axis: SurfaceFloatingPanelAxis): number {
  return Math.max(axis.min, Math.min(axis.max, value));
}

export function resolveSurfaceFloatingPanelSnap(
  position: SurfaceFloatingPanelPosition,
  bounds: SurfaceFloatingPanelBounds,
  threshold = Infinity,
  direction: SurfaceFloatingPanelPosition = { x: 0, y: 0 }
): SurfaceFloatingPanelSnap | null {
  const resolvedThreshold = resolveSurfaceFloatingPanelSnapThreshold(threshold);
  const candidates: Array<SurfaceFloatingPanelSnap & { distance: number }> = [
    {
      edge: 'left',
      distance: Math.max(0, position.x - bounds.x.min),
      position: { x: bounds.x.min, y: clampToAxis(position.y, bounds.y) },
    },
    {
      edge: 'right',
      distance: Math.max(0, bounds.x.max - position.x),
      position: { x: bounds.x.max, y: clampToAxis(position.y, bounds.y) },
    },
    {
      edge: 'top',
      distance: Math.max(0, position.y - bounds.y.min),
      position: { x: clampToAxis(position.x, bounds.x), y: bounds.y.min },
    },
    {
      edge: 'bottom',
      distance: Math.max(0, bounds.y.max - position.y),
      position: { x: clampToAxis(position.x, bounds.x), y: bounds.y.max },
    },
  ];
  const towards = { left: -direction.x, right: direction.x, top: -direction.y, bottom: direction.y };
  candidates.sort((left, right) => Math.abs(left.distance - right.distance) < 0.01
    ? towards[right.edge] - towards[left.edge]
    : left.distance - right.distance);
  const nearest = candidates[0];
  if (!nearest || nearest.distance > resolvedThreshold) return null;
  return { edge: nearest.edge, position: nearest.position };
}
