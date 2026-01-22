/**
 * Grid layout utilities for workspace
 */

import type { GridPosition } from './gridCollision';

/**
 * Convert grid position to CSS grid-area value
 * Format: row-start / col-start / row-end / col-end
 */
export function positionToGridArea(position: GridPosition): string {
  const rowStart = position.row + 1; // CSS grid is 1-based
  const colStart = position.col + 1;
  const rowEnd = rowStart + position.rowSpan;
  const colEnd = colStart + position.colSpan;
  return `${rowStart} / ${colStart} / ${rowEnd} / ${colEnd}`;
}

/**
 * Snap a pixel position to grid coordinates
 */
export function snapToGrid(
  clientX: number,
  clientY: number,
  gridRect: DOMRect,
  cellWidth: number,
  cellHeight: number,
  maxCols = 24
): { col: number; row: number } {
  const col = Math.round((clientX - gridRect.left) / cellWidth);
  const row = Math.round((clientY - gridRect.top) / cellHeight);
  return {
    col: Math.max(0, Math.min(maxCols - 1, col)),
    row: Math.max(0, row),
  };
}

/**
 * Calculate grid cell dimensions from container
 */
export function getGridCellSize(
  gridRect: DOMRect,
  gap = 4,
  cols = 24
): { cellWidth: number; cellHeight: number } {
  const totalGap = gap * (cols - 1);
  const cellWidth = (gridRect.width - totalGap) / cols;
  // Default row height for 24-column grid
  const cellHeight = 40;
  return { cellWidth, cellHeight };
}

/**
 * Calculate drag delta in grid units
 */
export function pixelDeltaToGridDelta(
  deltaX: number,
  deltaY: number,
  cellWidth: number,
  cellHeight: number
): { colDelta: number; rowDelta: number } {
  return {
    colDelta: Math.round(deltaX / cellWidth),
    rowDelta: Math.round(deltaY / cellHeight),
  };
}

/**
 * Calculate new position from drag offset
 */
export function applyDragDelta(
  original: GridPosition,
  colDelta: number,
  rowDelta: number,
  maxCols = 24
): GridPosition {
  const newCol = Math.max(0, Math.min(maxCols - original.colSpan, original.col + colDelta));
  const newRow = Math.max(0, original.row + rowDelta);
  return {
    ...original,
    col: newCol,
    row: newRow,
  };
}

/**
 * Calculate new size from resize delta
 */
export function applyResizeDelta(
  original: GridPosition,
  edge: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw',
  colDelta: number,
  rowDelta: number,
  minColSpan = 4,
  minRowSpan = 4,
  maxCols = 24
): GridPosition {
  let { col, row, colSpan, rowSpan } = original;

  // Handle horizontal resize
  if (edge.includes('e')) {
    colSpan = Math.max(minColSpan, Math.min(maxCols - col, colSpan + colDelta));
  }
  if (edge.includes('w')) {
    const newCol = Math.max(0, col + colDelta);
    const colChange = col - newCol;
    const newColSpan = colSpan + colChange;
    if (newColSpan >= minColSpan) {
      col = newCol;
      colSpan = newColSpan;
    }
  }

  // Handle vertical resize
  if (edge.includes('s')) {
    rowSpan = Math.max(minRowSpan, rowSpan + rowDelta);
  }
  if (edge.includes('n')) {
    const newRow = Math.max(0, row + rowDelta);
    const rowChange = row - newRow;
    const newRowSpan = rowSpan + rowChange;
    if (newRowSpan >= minRowSpan) {
      row = newRow;
      rowSpan = newRowSpan;
    }
  }

  return { col, row, colSpan, rowSpan };
}
