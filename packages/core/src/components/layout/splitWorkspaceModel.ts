/** Serializable placement. Hosts retain item lifetime, authorization and persistence. */
export type SplitWorkspaceLayout =
  | Readonly<{ type: 'pane'; id: string }>
  | Readonly<{
      type: 'split';
      id: string;
      axis: 'x' | 'y';
      ratio: number;
      first: SplitWorkspaceLayout;
      second: SplitWorkspaceLayout;
    }>;
export type SplitWorkspaceEdge = 'left' | 'right' | 'top' | 'bottom';
export type SplitWorkspacePreset =
  'single' | 'columns' | 'rows' | 'three-columns' | 'main-left' | 'grid';
export interface SplitWorkspaceRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface SplitWorkspaceDivider extends SplitWorkspaceRect {
  id: string;
  axis: 'x' | 'y';
  ratio: number;
}
export const splitWorkspacePane = (id: string): SplitWorkspaceLayout => ({ type: 'pane', id });
export function splitWorkspaceItems(layout: SplitWorkspaceLayout | null): string[] {
  return !layout
    ? []
    : layout.type === 'pane'
      ? [layout.id]
      : [...splitWorkspaceItems(layout.first), ...splitWorkspaceItems(layout.second)];
}
export function isSplitWorkspaceLayout(value: unknown): value is SplitWorkspaceLayout {
  const ids = new Set<string>();
  let count = 0;
  const visit = (node: unknown, depth: number): boolean => {
    if (!node || typeof node !== 'object' || depth > 32 || ++count > 127) return false;
    const n = node as Record<string, unknown>;
    if (typeof n.id !== 'string' || !n.id.trim() || ids.has(n.id)) return false;
    ids.add(n.id);
    if (n.type === 'pane') return true;
    return (
      n.type === 'split' &&
      (n.axis === 'x' || n.axis === 'y') &&
      typeof n.ratio === 'number' &&
      Number.isFinite(n.ratio) &&
      n.ratio >= 0.15 &&
      n.ratio <= 0.85 &&
      visit(n.first, depth + 1) &&
      visit(n.second, depth + 1)
    );
  };
  return visit(value, 0);
}
export function mapSplitWorkspace(
  layout: SplitWorkspaceLayout,
  id: string,
  update: (node: SplitWorkspaceLayout) => SplitWorkspaceLayout
): SplitWorkspaceLayout {
  if (layout.id === id) return update(layout);
  if (layout.type === 'pane') return layout;
  const first = mapSplitWorkspace(layout.first, id, update);
  const second = mapSplitWorkspace(layout.second, id, update);
  return first === layout.first && second === layout.second ? layout : { ...layout, first, second };
}
export function removeSplitWorkspaceItem(
  layout: SplitWorkspaceLayout | null,
  id: string
): SplitWorkspaceLayout | null {
  if (!layout || layout.id === id) return null;
  if (layout.type === 'pane') return layout;
  const first = removeSplitWorkspaceItem(layout.first, id);
  const second = removeSplitWorkspaceItem(layout.second, id);
  return !first
    ? second
    : !second
      ? first
      : first === layout.first && second === layout.second
        ? layout
        : { ...layout, first, second };
}
export function reconcileSplitWorkspace(
  layout: SplitWorkspaceLayout | null,
  availableIds: readonly string[]
): SplitWorkspaceLayout | null {
  const available = new Set(availableIds);
  return splitWorkspaceItems(layout).reduce(
    (tree, id) => (available.has(id) ? tree : removeSplitWorkspaceItem(tree, id)),
    layout
  );
}
export function resizeSplitWorkspace(
  layout: SplitWorkspaceLayout,
  id: string,
  ratio: number
): SplitWorkspaceLayout {
  if (!Number.isFinite(ratio)) return layout;
  return mapSplitWorkspace(layout, id, (node) =>
    node.type === 'split' ? { ...node, ratio: Math.max(0.15, Math.min(0.85, ratio)) } : node
  );
}
export function dockSplitWorkspaceItem(
  layout: SplitWorkspaceLayout | null,
  sourceId: string,
  targetId: string,
  edge: SplitWorkspaceEdge | 'center',
  splitId: string
): SplitWorkspaceLayout | null {
  if (!layout || sourceId === targetId || !splitWorkspaceItems(layout).includes(targetId))
    return layout;
  const sourceExists = splitWorkspaceItems(layout).includes(sourceId);
  if (edge === 'center') {
    const swap = (node: SplitWorkspaceLayout): SplitWorkspaceLayout =>
      node.type === 'pane'
        ? node.id === targetId
          ? splitWorkspacePane(sourceId)
          : sourceExists && node.id === sourceId
            ? splitWorkspacePane(targetId)
            : node
        : { ...node, first: swap(node.first), second: swap(node.second) };
    return swap(layout);
  }
  const tree = removeSplitWorkspaceItem(layout, sourceId);
  if (!tree) return layout;
  return mapSplitWorkspace(tree, targetId, (target) => ({
    type: 'split',
    id: splitId,
    axis: edge === 'left' || edge === 'right' ? 'x' : 'y',
    ratio: 0.5,
    first: edge === 'left' || edge === 'top' ? splitWorkspacePane(sourceId) : target,
    second: edge === 'left' || edge === 'top' ? target : splitWorkspacePane(sourceId),
  }));
}
export function presetSplitWorkspace(
  preset: SplitWorkspacePreset,
  itemIds: readonly string[],
  id: () => string
): SplitWorkspaceLayout | null {
  const count =
    preset === 'single'
      ? 1
      : preset === 'grid'
        ? 4
        : preset === 'columns' || preset === 'rows'
          ? 2
          : 3;
  const items = [...new Set(itemIds)].slice(0, count).map(splitWorkspacePane);
  const split = (
    axis: 'x' | 'y',
    first: SplitWorkspaceLayout,
    second: SplitWorkspaceLayout,
    ratio = 0.5
  ): SplitWorkspaceLayout => ({ type: 'split', id: id(), axis, ratio, first, second });
  if (!items.length) return null;
  if (items.length === 1) return items[0];
  if (items.length === 2) return split(preset === 'rows' ? 'y' : 'x', items[0], items[1]);
  if (preset === 'grid' && items.length === 4)
    return split('x', split('y', items[0], items[2]), split('y', items[1], items[3]));
  return split(
    'x',
    items[0],
    split(preset === 'three-columns' ? 'x' : 'y', items[1], items[2]),
    preset === 'three-columns' ? 1 / 3 : 0.5
  );
}
export function measureSplitWorkspace(layout: SplitWorkspaceLayout | null): {
  panes: Map<string, SplitWorkspaceRect>;
  dividers: SplitWorkspaceDivider[];
} {
  const panes = new Map<string, SplitWorkspaceRect>();
  const dividers: SplitWorkspaceDivider[] = [];
  const visit = (node: SplitWorkspaceLayout, rect: SplitWorkspaceRect) => {
    if (node.type === 'pane') {
      panes.set(node.id, rect);
      return;
    }
    dividers.push({ ...rect, id: node.id, axis: node.axis, ratio: node.ratio });
    const { x, y, width, height } = rect;
    if (node.axis === 'x') {
      visit(node.first, { x, y, width: width * node.ratio, height });
      visit(node.second, { x: x + width * node.ratio, y, width: width * (1 - node.ratio), height });
    } else {
      visit(node.first, { x, y, width, height: height * node.ratio });
      visit(node.second, {
        x,
        y: y + height * node.ratio,
        width,
        height: height * (1 - node.ratio),
      });
    }
  };
  if (layout) visit(layout, { x: 0, y: 0, width: 100, height: 100 });
  return { panes, dividers };
}

export interface SplitWorkspaceArrangement {
  id: string;
  kind: 'rows' | 'columns' | 'grid' | 'main-left' | 'main-right' | 'main-top' | 'main-bottom';
  layout: SplitWorkspaceLayout;
}

/** Bounded alternatives that preserve every item in visual reading order. */
export function createSplitWorkspaceArrangements(
  itemIds: readonly string[],
  id: () => string
): SplitWorkspaceArrangement[] {
  const count = itemIds.length;
  if (
    count < 2 ||
    count > 32 ||
    new Set(itemIds).size !== count ||
    itemIds.some((item) => !item.trim())
  )
    return [];
  const split = (
    axis: 'x' | 'y',
    first: SplitWorkspaceLayout,
    second: SplitWorkspaceLayout,
    ratio: number
  ): SplitWorkspaceLayout => ({ type: 'split', id: id(), axis, ratio, first, second });
  // Balanced recursion keeps every divider inside the public ratio bounds,
  // even for long rows. A linear chain would create invalid tiny ratios.
  const strip = (nodes: SplitWorkspaceLayout[], axis: 'x' | 'y'): SplitWorkspaceLayout => {
    if (nodes.length === 1) return nodes[0];
    const middle = Math.ceil(nodes.length / 2);
    return split(
      axis,
      strip(nodes.slice(0, middle), axis),
      strip(nodes.slice(middle), axis),
      middle / nodes.length
    );
  };
  const grid = (items: readonly string[], bands: number, axis: 'x' | 'y'): SplitWorkspaceLayout => {
    let offset = 0;
    const groups = Array.from({ length: bands }, (_, index) => {
      const size = Math.floor(items.length / bands) + (index < items.length % bands ? 1 : 0);
      const nodes = items.slice(offset, offset + size).map(splitWorkspacePane);
      offset += size;
      return strip(nodes, axis === 'x' ? 'y' : 'x');
    });
    return strip(groups, axis);
  };
  const choices: SplitWorkspaceArrangement[] = [];
  const shapes = new Set<string>();
  const add = (
    key: string,
    kind: SplitWorkspaceArrangement['kind'],
    source: SplitWorkspaceLayout
  ) => {
    const panes = [...measureSplitWorkspace(source).panes.entries()].sort(
      ([, a], [, b]) => Math.round(a.y * 1e6) - Math.round(b.y * 1e6) || a.x - b.x
    );
    const signature = JSON.stringify(
      panes.map(([, rect]) =>
        [rect.x, rect.y, rect.width, rect.height].map((value) => Math.round(value * 1e6))
      )
    );
    if (shapes.has(signature)) return;
    shapes.add(signature);
    const names = new Map(panes.map(([key], index) => [key, itemIds[index]]));
    const assign = (node: SplitWorkspaceLayout): SplitWorkspaceLayout =>
      node.type === 'pane'
        ? splitWorkspacePane(names.get(node.id)!)
        : { ...node, first: assign(node.first), second: assign(node.second) };
    choices.push({ id: key, kind, layout: assign(source) });
  };
  const bands = [...new Set([Math.ceil(Math.sqrt(count)), 1, 2, 3, 4, count])].filter(
    (value) => value <= count
  );
  for (const size of bands) {
    add(
      'rows-' + size,
      size === 1 ? 'columns' : size === count ? 'rows' : 'grid',
      grid(itemIds, size, 'y')
    );
  }
  // Transposed grids add useful alternatives for uneven pane counts.
  for (const size of [2, 3])
    if (size < count) add('columns-' + size, 'grid', grid(itemIds, size, 'x'));
  for (const edge of ['left', 'right', 'top', 'bottom'] as const) {
    const horizontal = edge === 'left' || edge === 'right';
    const primary = splitWorkspacePane(itemIds[0]);
    const secondary = grid(
      itemIds.slice(1),
      Math.ceil(Math.sqrt((count - 1) / 2)),
      horizontal ? 'x' : 'y'
    );
    const first = edge === 'left' || edge === 'top';
    add(
      'main-' + edge,
      ('main-' + edge) as SplitWorkspaceArrangement['kind'],
      split(
        horizontal ? 'x' : 'y',
        first ? primary : secondary,
        first ? secondary : primary,
        first ? 0.62 : 0.38
      )
    );
  }
  return choices;
}
