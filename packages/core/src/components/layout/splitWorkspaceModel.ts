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
