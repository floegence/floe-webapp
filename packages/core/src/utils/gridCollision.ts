/**
 * Grid collision detection utilities for workspace layout
 */

export interface GridPosition {
  col: number; // 0-23 (column start in 24-column grid)
  row: number; // 0-N (row start)
  colSpan: number; // 1-24 (width in columns)
  rowSpan: number; // 1-N (height in rows)
}

/**
 * Check if two grid positions overlap using AABB collision detection
 */
export function checkCollision(a: GridPosition, b: GridPosition): boolean {
  return !(
    a.col + a.colSpan <= b.col ||
    a.col >= b.col + b.colSpan ||
    a.row + a.rowSpan <= b.row ||
    a.row >= b.row + b.rowSpan
  );
}

/**
 * Check if a position collides with any widget in the list (excluding self)
 */
export function hasCollision(
  position: GridPosition,
  widgets: Array<{ id: string; position: GridPosition }>,
  excludeId?: string
): boolean {
  return widgets.some((widget) => {
    if (excludeId && widget.id === excludeId) return false;
    return checkCollision(position, widget.position);
  });
}

/**
 * Find a valid position for a new widget by scanning the grid
 */
export function findFreePosition(
  widgets: Array<{ id: string; position: GridPosition }>,
  colSpan: number,
  rowSpan: number,
  maxCols = 24
): GridPosition {
  // Scan row by row, column by column
  for (let row = 0; row < 100; row++) {
    for (let col = 0; col <= maxCols - colSpan; col++) {
      const candidate: GridPosition = { col, row, colSpan, rowSpan };
      if (!hasCollision(candidate, widgets)) {
        return candidate;
      }
    }
  }
  // Fallback: place at bottom
  let maxRow = 0;
  for (const w of widgets) {
    const end = w.position.row + w.position.rowSpan;
    if (end > maxRow) maxRow = end;
  }
  return { col: 0, row: maxRow, colSpan, rowSpan };
}

/**
 * Constrain a position to valid grid bounds
 */
export function constrainPosition(
  position: GridPosition,
  minColSpan = 4,
  minRowSpan = 4,
  maxCols = 24
): GridPosition {
  const col = Math.max(0, Math.min(maxCols - 1, position.col));
  const row = Math.max(0, position.row);
  const colSpan = Math.max(minColSpan, Math.min(maxCols - col, position.colSpan));
  const rowSpan = Math.max(minRowSpan, position.rowSpan);

  return { col, row, colSpan, rowSpan };
}
