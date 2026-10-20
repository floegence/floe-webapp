export interface VirtualItem {
  index: number;
  start: number;
  size: number;
  key: string;
}

export interface VirtualListAnchor {
  key: string;
  offset: number;
}

/** Geometry only: the host remains the sole owner of scroll writes. */
export function createVirtualListLayout(defaultItemHeight: number) {
  const fallback = Number.isFinite(defaultItemHeight) && defaultItemHeight > 0
    ? Math.max(1, Math.round(defaultItemHeight)) : 80;
  let keys: string[] = [];
  let sizes: number[] = [];
  let tree: number[] = [0];
  let positions = new Map<string, number>();
  const measured = new Map<string, number>();
  const normalize = (height: number) => Number.isFinite(height) && height > 0
    ? Math.max(1, Math.round(height)) : fallback;

  function prefix(end: number): number {
    let sum = 0;
    const limit = Number.isFinite(end) ? Math.trunc(end) : end === Infinity ? keys.length : 0;
    for (let i = Math.max(0, Math.min(keys.length, limit)); i > 0; i -= i & -i) sum += tree[i]!;
    return sum;
  }

  function locate(offset: number): number {
    if (!keys.length || offset <= 0) return 0;
    let index = 0;
    let sum = 0;
    let step = 1;
    while (step * 2 <= keys.length) step *= 2;
    for (; step > 0; step = Math.floor(step / 2)) {
      const next = index + step;
      if (next <= keys.length && sum + tree[next]! <= offset) {
        sum += tree[next]!;
        index = next;
      }
    }
    return Math.min(keys.length - 1, index);
  }

  function reset(nextKeys: readonly string[], estimate: (index: number) => number): void {
    const nextPositions = new Map<string, number>();
    for (let i = 0; i < nextKeys.length; i++) {
      const key = nextKeys[i]!;
      if (nextPositions.has(key)) throw new Error('Virtual list keys must be unique');
      nextPositions.set(key, i);
    }
    const nextSizes = nextKeys.map((key, i) => measured.get(key) ?? normalize(estimate(i)));
    const nextTree = [0, ...nextSizes];
    for (let i = 1; i < nextTree.length; i++) {
      const parent = i + (i & -i);
      if (parent < nextTree.length) nextTree[parent]! += nextTree[i]!;
    }
    keys = [...nextKeys];
    sizes = nextSizes;
    tree = nextTree;
    positions = nextPositions;
    for (const key of measured.keys()) if (!positions.has(key)) measured.delete(key);
  }

  function measure(key: string, height: number): boolean {
    const index = positions.get(key);
    if (index === undefined) return false;
    const next = normalize(height);
    measured.set(key, next);
    const previous = sizes[index]!;
    if (next === previous) return false;
    sizes[index] = next;
    for (let i = index + 1; i < tree.length; i += i & -i) tree[i]! += next - previous;
    return true;
  }

  function item(index: number): VirtualItem | undefined {
    if (index < 0 || index >= keys.length || !Number.isInteger(index)) return undefined;
    return { index, key: keys[index]!, start: prefix(index), size: sizes[index]! };
  }

  function range(scrollTop: number, viewportHeight: number, overscan = 0) {
    if (!keys.length) return { start: 0, end: 0 };
    const top = Number.isFinite(scrollTop) ? Math.max(0, scrollTop) : 0;
    const height = Number.isFinite(viewportHeight) ? Math.max(0, viewportHeight) : 0;
    const extra = Number.isFinite(overscan) ? Math.max(0, Math.trunc(overscan)) : 0;
    return { start: Math.max(0, locate(top) - extra), end: Math.min(keys.length, locate(top + height) + 1 + extra) };
  }

  function anchor(scrollTop: number): VirtualListAnchor | undefined {
    if (!keys.length) return undefined;
    const top = Number.isFinite(scrollTop) ? Math.max(0, scrollTop) : 0;
    const index = locate(top);
    return { key: keys[index]!, offset: Math.max(0, Math.min(sizes[index]!, top - prefix(index))) };
  }

  function offset(anchor: VirtualListAnchor): number | undefined {
    const index = positions.get(anchor.key);
    if (index === undefined) return undefined;
    const delta = Number.isFinite(anchor.offset) ? anchor.offset : 0;
    return prefix(index) + Math.max(0, Math.min(sizes[index]!, delta));
  }

  return { reset, measure, item, range, anchor, offset, prefix, total: () => prefix(keys.length),
    count: () => keys.length, measuredCount: () => measured.size };
}

export type VirtualListLayout = ReturnType<typeof createVirtualListLayout>;
