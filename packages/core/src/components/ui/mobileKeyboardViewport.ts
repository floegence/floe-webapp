export interface MobileKeyboardViewportSource {
  innerWidth: number;
  innerHeight: number;
  visualViewport?: {
    width?: number;
    height?: number;
    offsetLeft?: number;
    offsetTop?: number;
  } | null;
}

export interface MobileKeyboardViewportMetrics {
  leftPx: number;
  bottomPx: number;
  widthPx: number;
  heightPx: number;
}

const VIEWPORT_PX_PRECISION = 1000;

function roundViewportPx(value: number): number {
  return Math.round(value * VIEWPORT_PX_PRECISION) / VIEWPORT_PX_PRECISION;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toFiniteNumber(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function resolvePositiveDimension(value: number | undefined, fallback: number): number {
  const next = toFiniteNumber(value, fallback);
  if (next <= 0) return Math.max(0, roundViewportPx(fallback));
  return roundViewportPx(next);
}

export function resolveMobileKeyboardViewportMetrics(
  source: MobileKeyboardViewportSource,
): MobileKeyboardViewportMetrics {
  const layoutWidth = Math.max(0, resolvePositiveDimension(source.innerWidth, 0));
  const layoutHeight = Math.max(0, resolvePositiveDimension(source.innerHeight, 0));
  const visualViewport = source.visualViewport ?? null;

  const widthPx = clamp(
    resolvePositiveDimension(visualViewport?.width, layoutWidth),
    0,
    layoutWidth || Number.POSITIVE_INFINITY,
  );
  const heightPx = clamp(
    resolvePositiveDimension(visualViewport?.height, layoutHeight),
    0,
    layoutHeight || Number.POSITIVE_INFINITY,
  );
  const maxLeft = Math.max(0, layoutWidth - widthPx);
  const maxTop = Math.max(0, layoutHeight - heightPx);
  const leftPx = clamp(roundViewportPx(toFiniteNumber(visualViewport?.offsetLeft, 0)), 0, maxLeft);
  const topPx = clamp(roundViewportPx(toFiniteNumber(visualViewport?.offsetTop, 0)), 0, maxTop);
  const bottomPx = clamp(roundViewportPx(layoutHeight - (topPx + heightPx)), 0, layoutHeight);

  return {
    leftPx,
    bottomPx,
    widthPx,
    heightPx,
  };
}

export function buildMobileKeyboardViewportStyle(
  metrics: MobileKeyboardViewportMetrics,
): Record<string, string> {
  return {
    '--mobile-keyboard-viewport-left': `${metrics.leftPx}px`,
    '--mobile-keyboard-viewport-bottom': `${metrics.bottomPx}px`,
    '--mobile-keyboard-viewport-width': `${metrics.widthPx}px`,
    '--mobile-keyboard-viewport-height': `${metrics.heightPx}px`,
  };
}
