import type { GridPosition } from '../../utils/gridCollision';

export const DECK_GRID_COLS = 24;
export const DECK_DEFAULT_ROWS = 24;
export const DECK_GAP = 4;
export const DECK_MIN_ROW_HEIGHT = 20;
export const DECK_PADDING = 4;

export interface DeckGridConfig {
  cols: number;
  rowHeight: number;
  gap: number;
  defaultRows: number;
}

export interface DeckGridMeasurements extends DeckGridConfig {
  cellWidth: number;
  cellHeight: number;
}

export interface DeckGridSurfaceMeasurements extends DeckGridMeasurements {
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
}

export interface DeckGridPixelRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export const DECK_GRID_CONFIG = {
  cols: DECK_GRID_COLS,
  defaultRows: DECK_DEFAULT_ROWS,
  gap: DECK_GAP,
  rowHeight: DECK_MIN_ROW_HEIGHT,
} as const satisfies DeckGridConfig;

export function getGridConfigFromElement(gridEl: HTMLElement): DeckGridConfig {
  return {
    cols: parseInt(gridEl.dataset.gridCols || String(DECK_GRID_COLS), 10),
    rowHeight: parseFloat(gridEl.dataset.rowHeight || String(DECK_MIN_ROW_HEIGHT)),
    gap: parseInt(gridEl.dataset.gap || String(DECK_GAP), 10),
    defaultRows: parseInt(gridEl.dataset.defaultRows || String(DECK_DEFAULT_ROWS), 10),
  };
}

export function measureDeckGrid(gridEl: HTMLElement, options?: {
  paddingLeft?: number;
  paddingRight?: number;
}): DeckGridMeasurements | null {
  const config = getGridConfigFromElement(gridEl);
  const paddingLeft = options?.paddingLeft ?? 0;
  const paddingRight = options?.paddingRight ?? 0;
  const innerWidth = gridEl.clientWidth - paddingLeft - paddingRight;
  const totalGapWidth = config.gap * (config.cols - 1);
  const cellWidth = (innerWidth - totalGapWidth) / config.cols;
  if (!Number.isFinite(cellWidth) || cellWidth <= 0) return null;

  return {
    ...config,
    cellWidth,
    cellHeight: config.rowHeight + config.gap,
  };
}

export function measureDeckGridSurface(gridEl: HTMLElement): DeckGridSurfaceMeasurements | null {
  const styles = gridEl.ownerDocument.defaultView?.getComputedStyle(gridEl) ?? getComputedStyle(gridEl);
  const paddingLeft = parseFloat(styles.paddingLeft) || 0;
  const paddingRight = parseFloat(styles.paddingRight) || 0;
  const paddingTop = parseFloat(styles.paddingTop) || 0;
  const paddingBottom = parseFloat(styles.paddingBottom) || 0;
  const measurements = measureDeckGrid(gridEl, { paddingLeft, paddingRight });
  if (!measurements) return null;
  return {
    ...measurements,
    paddingLeft,
    paddingRight,
    paddingTop,
    paddingBottom,
  };
}

export function positionToDeckPixelRect(
  position: GridPosition,
  measurements: DeckGridSurfaceMeasurements
): DeckGridPixelRect {
  return {
    left: measurements.paddingLeft + position.col * (measurements.cellWidth + measurements.gap),
    top: measurements.paddingTop + position.row * (measurements.rowHeight + measurements.gap),
    width: position.colSpan * measurements.cellWidth + Math.max(0, position.colSpan - 1) * measurements.gap,
    height: position.rowSpan * measurements.rowHeight + Math.max(0, position.rowSpan - 1) * measurements.gap,
  };
}
