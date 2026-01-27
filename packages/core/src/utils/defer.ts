/**
 * Defer work to the next macrotask so the browser can paint first.
 * Use this for "close UI first, then run potentially expensive logic" patterns.
 */
export function deferNonBlocking(fn: () => void, delay = 0): void {
  setTimeout(fn, delay);
}

/**
 * Defer work until after the next paint when possible.
 *
 * This is a stricter variant of deferNonBlocking for UI-first flows:
 * update/close UI synchronously, then run heavier logic after a paint.
 */
export function deferAfterPaint(fn: () => void): void {
  if (typeof requestAnimationFrame === 'undefined') {
    deferNonBlocking(fn);
    return;
  }
  requestAnimationFrame(() => deferNonBlocking(fn));
}
