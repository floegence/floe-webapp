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
