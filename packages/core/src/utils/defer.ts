/**
 * Defer work to the next macrotask so the browser can paint first.
 * Use this for "close UI first, then run potentially expensive logic" patterns.
 */
export function deferNonBlocking(fn: () => void, delay = 0): void {
  setTimeout(fn, delay);
}

