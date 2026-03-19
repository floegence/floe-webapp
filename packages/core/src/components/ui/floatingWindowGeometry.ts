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
  mobile: boolean;
  mobilePadding: number;
}

interface NormalizeFloatingWindowRectOptions {
  rect: FloatingWindowRect;
  minSize: Size;
  maxSize: Size;
  viewport: Size;
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
    mobile,
    mobilePadding,
  } = options;

  const deltaX = pointer.x - (mode === 'drag' ? dragStartPos.x : resizeStartPos.x);
  const deltaY = pointer.y - (mode === 'drag' ? dragStartPos.y : resizeStartPos.y);

  if (mode === 'drag') {
    return {
      ...dragStartRect,
      x: mobile
        ? mobilePadding
        : Math.max(0, Math.min(viewport.width - dragStartRect.width, dragStartRect.x + deltaX)),
      y: Math.max(0, Math.min(viewport.height - dragStartRect.height, dragStartRect.y + deltaY)),
    };
  }

  let newWidth = resizeStartRect.width;
  let newHeight = resizeStartRect.height;
  let newX = resizeStartRect.x;
  let newY = resizeStartRect.y;

  if (!mobile && resizeHandle.includes('e')) {
    newWidth = Math.max(minSize.width, Math.min(maxSize.width, resizeStartRect.width + deltaX));
  }
  if (!mobile && resizeHandle.includes('w')) {
    const possibleWidth = resizeStartRect.width - deltaX;
    if (possibleWidth >= minSize.width && possibleWidth <= maxSize.width) {
      newWidth = possibleWidth;
      newX = resizeStartRect.x + deltaX;
    }
  }
  if (resizeHandle.includes('s')) {
    newHeight = Math.max(minSize.height, Math.min(maxSize.height, resizeStartRect.height + deltaY));
  }
  if (resizeHandle.includes('n')) {
    const possibleHeight = resizeStartRect.height - deltaY;
    if (possibleHeight >= minSize.height && possibleHeight <= maxSize.height) {
      newHeight = possibleHeight;
      newY = resizeStartRect.y + deltaY;
    }
  }

  return {
    x: Math.max(0, Math.min(viewport.width - newWidth, newX)),
    y: Math.max(0, Math.min(viewport.height - newHeight, newY)),
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
    mobile,
    mobilePadding,
    center = false,
  } = options;

  const availableWidth = mobile ? Math.max(0, viewport.width - mobilePadding * 2) : viewport.width;
  const widthBounds = resolveBounds(minSize.width, maxSize.width, availableWidth);
  const heightBounds = resolveBounds(minSize.height, maxSize.height, viewport.height);

  const width = mobile ? widthBounds.max : clamp(rect.width, widthBounds.min, widthBounds.max);
  const height = clamp(rect.height, heightBounds.min, heightBounds.max);
  const xMax = Math.max(0, viewport.width - width);
  const yMax = Math.max(0, viewport.height - height);

  return {
    x: mobile
      ? clamp(mobilePadding, 0, xMax)
      : center
        ? Math.max(0, Math.round((viewport.width - width) / 2))
        : clamp(rect.x, 0, xMax),
    y: center
      ? Math.max(0, Math.round((viewport.height - height) / 2))
      : clamp(rect.y, 0, yMax),
    width,
    height,
  };
}
