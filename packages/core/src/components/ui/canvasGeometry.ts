export interface CanvasViewportLike {
  x: number;
  y: number;
  scale: number;
}

export interface CanvasClientPoint {
  clientX: number;
  clientY: number;
}

export interface CanvasLocalPoint {
  localX: number;
  localY: number;
}

export interface CanvasWorldPoint {
  worldX: number;
  worldY: number;
}

export interface CanvasViewportRectLike {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function isPointInsideCanvasRect(
  rect: CanvasViewportRectLike,
  point: CanvasClientPoint,
): boolean {
  return (
    point.clientX >= rect.left &&
    point.clientX <= rect.right &&
    point.clientY >= rect.top &&
    point.clientY <= rect.bottom
  );
}

export function clientToCanvasLocal(
  rect: Pick<CanvasViewportRectLike, 'left' | 'top'>,
  point: CanvasClientPoint,
): CanvasLocalPoint {
  return {
    localX: point.clientX - rect.left,
    localY: point.clientY - rect.top,
  };
}

export function localToCanvasWorld(
  viewport: CanvasViewportLike,
  point: CanvasLocalPoint,
): CanvasWorldPoint {
  return {
    worldX: (point.localX - viewport.x) / viewport.scale,
    worldY: (point.localY - viewport.y) / viewport.scale,
  };
}

export function clientToCanvasWorld(
  rect: CanvasViewportRectLike,
  viewport: CanvasViewportLike,
  point: CanvasClientPoint,
): CanvasWorldPoint | null {
  if (!isPointInsideCanvasRect(rect, point)) {
    return null;
  }

  return localToCanvasWorld(viewport, clientToCanvasLocal(rect, point));
}

export function createViewportFromZoomAnchor(options: {
  viewport: CanvasViewportLike;
  localPoint: CanvasLocalPoint;
  nextScale: number;
}): CanvasViewportLike {
  const worldPoint = localToCanvasWorld(options.viewport, options.localPoint);
  return {
    x: options.localPoint.localX - worldPoint.worldX * options.nextScale,
    y: options.localPoint.localY - worldPoint.worldY * options.nextScale,
    scale: options.nextScale,
  };
}
