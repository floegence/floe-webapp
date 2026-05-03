export type FloatingWindowResizeHandle =
  | 'n'
  | 's'
  | 'e'
  | 'w'
  | 'ne'
  | 'nw'
  | 'se'
  | 'sw';

export interface FloatingWindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FloatingWindowViewportInsets {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface FloatingWindowViewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PointerPosition {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface ResolveFloatingWindowRectOptions {
  mode: 'drag' | 'resize';
  pointer: PointerPosition;
  dragStartPos: PointerPosition;
  dragStartRect: FloatingWindowRect;
  resizeStartPos: PointerPosition;
  resizeStartRect: FloatingWindowRect;
  resizeHandle: FloatingWindowResizeHandle;
  minSize: Size;
  maxSize: Size;
  viewport: Size;
  viewportInsets?: FloatingWindowViewportInsets;
  mobile: boolean;
  mobilePadding: number;
}

interface NormalizeFloatingWindowRectOptions {
  rect: FloatingWindowRect;
  minSize: Size;
  maxSize: Size;
  viewport: Size;
  viewportInsets?: FloatingWindowViewportInsets;
  mobile: boolean;
  mobilePadding: number;
  center?: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function resolveBounds(min: number, max: number, available: number): { min: number; max: number } {
  const safeAvailable = Math.max(0, available);
  const nextMin = Math.min(min, safeAvailable);
  const nextMax = Math.max(nextMin, Math.min(max, safeAvailable));
  return { min: nextMin, max: nextMax };
}

function normalizeInset(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

export function resolveFloatingWindowViewport(
  viewport: Size,
  insets: FloatingWindowViewportInsets = {},
): FloatingWindowViewport {
  const viewportWidth = Math.max(0, viewport.width);
  const viewportHeight = Math.max(0, viewport.height);
  const left = Math.min(normalizeInset(insets.left), viewportWidth);
  const top = Math.min(normalizeInset(insets.top), viewportHeight);
  const right = Math.min(normalizeInset(insets.right), Math.max(0, viewportWidth - left));
  const bottom = Math.min(normalizeInset(insets.bottom), Math.max(0, viewportHeight - top));

  return {
    x: left,
    y: top,
    width: Math.max(0, viewportWidth - left - right),
    height: Math.max(0, viewportHeight - top - bottom),
  };
}

function viewportRight(viewport: FloatingWindowViewport): number {
  return viewport.x + viewport.width;
}

function viewportBottom(viewport: FloatingWindowViewport): number {
  return viewport.y + viewport.height;
}

export function resolveFloatingWindowRect(options: ResolveFloatingWindowRectOptions): FloatingWindowRect {
  const {
    mode,
    pointer,
    dragStartPos,
    dragStartRect,
    resizeStartPos,
    resizeStartRect,
    resizeHandle,
    minSize,
    maxSize,
    viewport,
    viewportInsets,
    mobile,
    mobilePadding,
  } = options;
  const safeViewport = resolveFloatingWindowViewport(viewport, viewportInsets);
  const safeRight = viewportRight(safeViewport);
  const safeBottom = viewportBottom(safeViewport);

  const deltaX = pointer.x - (mode === 'drag' ? dragStartPos.x : resizeStartPos.x);
  const deltaY = pointer.y - (mode === 'drag' ? dragStartPos.y : resizeStartPos.y);

  if (mode === 'drag') {
    const xMax = Math.max(safeViewport.x, safeRight - dragStartRect.width);
    const yMax = Math.max(safeViewport.y, safeBottom - dragStartRect.height);
    return {
      ...dragStartRect,
      x: mobile
        ? clamp(safeViewport.x + mobilePadding, safeViewport.x, xMax)
        : clamp(dragStartRect.x + deltaX, safeViewport.x, xMax),
      y: clamp(dragStartRect.y + deltaY, safeViewport.y, yMax),
    };
  }

  let newWidth = resizeStartRect.width;
  let newHeight = resizeStartRect.height;
  let newX = resizeStartRect.x;
  let newY = resizeStartRect.y;

  if (!mobile && resizeHandle.includes('e')) {
    const widthBounds = resolveBounds(minSize.width, maxSize.width, safeRight - resizeStartRect.x);
    newWidth = clamp(resizeStartRect.width + deltaX, widthBounds.min, widthBounds.max);
  }
  if (!mobile && resizeHandle.includes('w')) {
    const oppositeRight = resizeStartRect.x + resizeStartRect.width;
    const widthBounds = resolveBounds(minSize.width, maxSize.width, oppositeRight - safeViewport.x);
    const minX = oppositeRight - widthBounds.max;
    const maxX = Math.max(minX, oppositeRight - widthBounds.min);
    newX = clamp(resizeStartRect.x + deltaX, minX, maxX);
    newWidth = Math.max(0, oppositeRight - newX);
  }
  if (resizeHandle.includes('s')) {
    const heightBounds = resolveBounds(minSize.height, maxSize.height, safeBottom - resizeStartRect.y);
    newHeight = clamp(resizeStartRect.height + deltaY, heightBounds.min, heightBounds.max);
  }
  if (resizeHandle.includes('n')) {
    const oppositeBottom = resizeStartRect.y + resizeStartRect.height;
    const heightBounds = resolveBounds(minSize.height, maxSize.height, oppositeBottom - safeViewport.y);
    const minY = oppositeBottom - heightBounds.max;
    const maxY = Math.max(minY, oppositeBottom - heightBounds.min);
    newY = clamp(resizeStartRect.y + deltaY, minY, maxY);
    newHeight = Math.max(0, oppositeBottom - newY);
  }

  return {
    x: clamp(newX, safeViewport.x, Math.max(safeViewport.x, safeRight - newWidth)),
    y: clamp(newY, safeViewport.y, Math.max(safeViewport.y, safeBottom - newHeight)),
    width: newWidth,
    height: newHeight,
  };
}

export function normalizeFloatingWindowRect(options: NormalizeFloatingWindowRectOptions): FloatingWindowRect {
  const {
    rect,
    minSize,
    maxSize,
    viewport,
    viewportInsets,
    mobile,
    mobilePadding,
    center = false,
  } = options;

  const safeViewport = resolveFloatingWindowViewport(viewport, viewportInsets);
  const safeRight = viewportRight(safeViewport);
  const safeBottom = viewportBottom(safeViewport);
  const availableWidth = mobile ? Math.max(0, safeViewport.width - mobilePadding * 2) : safeViewport.width;
  const widthBounds = resolveBounds(minSize.width, maxSize.width, availableWidth);
  const heightBounds = resolveBounds(minSize.height, maxSize.height, safeViewport.height);

  const width = mobile ? widthBounds.max : clamp(rect.width, widthBounds.min, widthBounds.max);
  const height = clamp(rect.height, heightBounds.min, heightBounds.max);
  const xMax = Math.max(safeViewport.x, safeRight - width);
  const yMax = Math.max(safeViewport.y, safeBottom - height);

  return {
    x: mobile
      ? clamp(safeViewport.x + mobilePadding, safeViewport.x, xMax)
      : center
        ? Math.max(safeViewport.x, Math.round(safeViewport.x + (safeViewport.width - width) / 2))
        : clamp(rect.x, safeViewport.x, xMax),
    y: center
      ? Math.max(safeViewport.y, Math.round(safeViewport.y + (safeViewport.height - height) / 2))
      : clamp(rect.y, safeViewport.y, yMax),
    width,
    height,
  };
}
