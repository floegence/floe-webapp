import type {
  GraphLayout,
  GraphLayoutNode,
  GraphLayoutOptions,
  GraphNode,
  GraphPoint,
} from './types';
import { routeGraphGeometry } from './routing';
export { routeGraphGeometry } from './routing';

/** Apply explicit fixed or preferred positions, then route the resulting geometry once. */
export function applyGraphPositions(
  layout: GraphLayout,
  options: GraphLayoutOptions,
  input: readonly GraphNode[]
): GraphLayout | Promise<GraphLayout> {
  if (!options.positions?.length || options.positionMode === 'compact') return layout;
  const nodes = new Map(layout.nodes.map((node) => [node.id, { ...node }]));
  const pins = new Map<string, GraphPoint>();
  for (const pin of options.positions) {
    if (
      !nodes.has(pin.nodeId) ||
      pins.has(pin.nodeId) ||
      !Number.isFinite(pin.x) ||
      !Number.isFinite(pin.y)
    )
      throw new Error(`Invalid graph position: ${pin.nodeId}`);
    pins.set(pin.nodeId, pin);
  }
  const children = new Map<string, GraphLayoutNode[]>();
  for (const node of nodes.values())
    if (node.parentId) {
      const members = children.get(node.parentId) ?? [];
      members.push(node);
      children.set(node.parentId, members);
    }
  const padding = options.groupPadding ?? { top: 64, left: 28, right: 28, bottom: 28 };
  const preferred = options.positionMode === 'preferred';
  const minimums = new Map(input.map((node) => [node.id, node]));
  const move = (node: GraphLayoutNode, dx: number, dy: number) => {
    const old = { x: node.x, y: node.y },
      pin = pins.get(node.id);
    node.x = pin?.x ?? node.x + dx;
    node.y = pin?.y ?? node.y + dy;
    const members = children.get(node.id) ?? [];
    for (const child of members) move(child, node.x - old.x, node.y - old.y);
    if (!members.length) return;
    if (preferred) return;
    const left = Math.min(...members.map((n) => n.x)) - padding.left,
      top = Math.min(...members.map((n) => n.y)) - padding.top;
    if (pin && (left < node.x || top < node.y))
      throw new Error(`Pinned child lies outside group content: ${node.id}`);
    const right = Math.max(
      node.x + node.width,
      ...members.map((n) => n.x + n.width + padding.right)
    );
    const bottom = Math.max(
      node.y + node.height,
      ...members.map((n) => n.y + n.height + padding.bottom)
    );
    if (!pin) {
      node.x = Math.min(node.x, left);
      node.y = Math.min(node.y, top);
    }
    node.width = right - node.x;
    node.height = bottom - node.y;
  };
  for (const node of nodes.values()) if (!node.parentId) move(node, 0, 0);
  if (preferred) {
    // Sibling bounds include their whole subtree. Separating them therefore
    // protects descendants and keeps group borders clear of other objects.
    const gap = Math.max(16, options.spacing ?? 64);
    const translate = (node: GraphLayoutNode, dx: number, dy: number) => {
      node.x += dx;
      node.y += dy;
      for (const child of children.get(node.id) ?? []) translate(child, dx, dy);
    };
    const separate = (siblings: GraphLayoutNode[]) => {
      const placed: GraphLayoutNode[] = [];
      for (const node of [...siblings].sort(
        (a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id)
      )) {
        const horizontal = { x: node.x, y: node.y };
        for (const other of [...placed].sort((a, b) => a.x - b.x)) {
          if (
            node.y < other.y + other.height + gap &&
            node.y + node.height + gap > other.y &&
            horizontal.x < other.x + other.width + gap &&
            horizontal.x + node.width + gap > other.x
          )
            horizontal.x = other.x + other.width + gap;
        }
        const vertical = { x: node.x, y: node.y };
        for (const other of [...placed].sort((a, b) => a.y - b.y)) {
          if (
            node.x < other.x + other.width + gap &&
            node.x + node.width + gap > other.x &&
            vertical.y < other.y + other.height + gap &&
            vertical.y + node.height + gap > other.y
          )
            vertical.y = other.y + other.height + gap;
        }
        const next = horizontal.x - node.x < vertical.y - node.y ? horizontal : vertical;
        translate(node, next.x - node.x, next.y - node.y);
        placed.push(node);
      }
    };
    const arrange = (node: GraphLayoutNode) => {
      const members = children.get(node.id) ?? [];
      if (!members.length) return;
      for (const child of members) arrange(child);
      separate(members);
      // Preferred coordinates cannot pin a child outside its parent. Fit the
      // container around actual content rather than retaining ELK's old bounds.
      const left = Math.max(12, padding.left),
        top = Math.max(12, padding.top),
        right = Math.max(12, padding.right),
        bottom = Math.max(12, padding.bottom);
      const pin = pins.get(node.id);
      node.x = Math.min(pin?.x ?? Infinity, Math.min(...members.map((n) => n.x)) - left);
      node.y = Math.min(pin?.y ?? Infinity, Math.min(...members.map((n) => n.y)) - top);
      node.width = Math.max(
        minimums.get(node.id)!.width,
        Math.max(...members.map((n) => n.x + n.width)) + right - node.x
      );
      node.height = Math.max(
        minimums.get(node.id)!.height,
        Math.max(...members.map((n) => n.y + n.height)) + bottom - node.y
      );
    };
    const roots = [...nodes.values()].filter((node) => !node.parentId);
    for (const node of roots) arrange(node);
    separate(roots);
  }
  return routeGraphGeometry({ ...layout, nodes: [...nodes.values()] });
}
