import type {
  GraphBounds,
  GraphLayout,
  GraphLayoutNode,
  GraphLayoutOptions,
  GraphPoint,
} from './types';

type Rect = { left: number; top: number; right: number; bottom: number };
const rectangle = (node: GraphBounds, margin = 0): Rect => ({
  left: node.x - margin,
  top: node.y - margin,
  right: node.x + node.width + margin,
  bottom: node.y + node.height + margin,
});
const inside = (p: GraphPoint, box: Rect) =>
  p.x > box.left && p.x < box.right && p.y > box.top && p.y < box.bottom;
const clear = (a: GraphPoint, b: GraphPoint, obstacles: readonly Rect[]) =>
  !obstacles.some((box) =>
    a.x === b.x
      ? a.x > box.left &&
        a.x < box.right &&
        Math.max(a.y, b.y) > box.top &&
        Math.min(a.y, b.y) < box.bottom
      : a.y > box.top &&
        a.y < box.bottom &&
        Math.max(a.x, b.x) > box.left &&
        Math.min(a.x, b.x) < box.right
  );

/** A bounded orthogonal visibility search. It fails explicitly rather than drawing through a node. */
function route(start: GraphPoint, end: GraphPoint, obstacles: readonly Rect[]): GraphPoint[] {
  if (obstacles.some((box) => inside(start, box) || inside(end, box)))
    throw new Error('Pinned graph positions obstruct an edge endpoint');
  const xs = [
    ...new Set([start.x, end.x, ...obstacles.flatMap((box) => [box.left, box.right])]),
  ].sort((a, b) => a - b);
  const ys = [
    ...new Set([start.y, end.y, ...obstacles.flatMap((box) => [box.top, box.bottom])]),
  ].sort((a, b) => a - b);
  const point = (id: number) => ({ x: xs[id % xs.length]!, y: ys[Math.floor(id / xs.length)]! });
  const source = ys.indexOf(start.y) * xs.length + xs.indexOf(start.x),
    target = ys.indexOf(end.y) * xs.length + xs.indexOf(end.x);
  const costs = new Map([[source, 0]]),
    previous = new Map<number, number>();
  const heap: { id: number; score: number; cost: number }[] = [];
  const push = (entry: (typeof heap)[number]) => {
    let index = heap.length;
    heap.push(entry);
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (heap[parent]!.score <= entry.score) break;
      heap[index] = heap[parent]!;
      index = parent;
    }
    heap[index] = entry;
  };
  const pop = () => {
    const first = heap[0]!,
      last = heap.pop()!;
    if (heap.length) {
      let index = 0;
      while (index * 2 + 1 < heap.length) {
        let child = index * 2 + 1;
        if (child + 1 < heap.length && heap[child + 1]!.score < heap[child]!.score) child++;
        if (heap[child]!.score >= last.score) break;
        heap[index] = heap[child]!;
        index = child;
      }
      heap[index] = last;
    }
    return first;
  };
  push({ id: source, score: 0, cost: 0 });
  let visited = 0;
  while (heap.length && visited++ < 50000) {
    const entry = pop();
    if (entry.cost !== costs.get(entry.id)) continue;
    if (entry.id === target) {
      const path = [point(target)];
      let cursor = target;
      while (cursor !== source) {
        cursor = previous.get(cursor)!;
        path.push(point(cursor));
      }
      path.reverse();
      return path.filter((p, index) => {
        const a = path[index - 1],
          b = path[index + 1];
        return !a || !b || !((a.x === p.x && p.x === b.x) || (a.y === p.y && p.y === b.y));
      });
    }
    const a = point(entry.id),
      column = entry.id % xs.length,
      row = Math.floor(entry.id / xs.length);
    const neighbors = [
      column ? entry.id - 1 : -1,
      column + 1 < xs.length ? entry.id + 1 : -1,
      row ? entry.id - xs.length : -1,
      row + 1 < ys.length ? entry.id + xs.length : -1,
    ];
    for (const id of neighbors) {
      if (id < 0) continue;
      const b = point(id),
        cost = entry.cost + Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
      if (cost >= (costs.get(id) ?? Infinity) || !clear(a, b, obstacles)) continue;
      costs.set(id, cost);
      previous.set(id, entry.id);
      push({ id, cost, score: cost + Math.abs(b.x - end.x) + Math.abs(b.y - end.y) });
    }
  }
  throw new Error('Pinned graph positions cannot be routed within the layout budget');
}

/** Apply optional absolute world positions, retaining unpinned ELK geometry and group containment. */
export function applyGraphPositions(layout: GraphLayout, options: GraphLayoutOptions): GraphLayout {
  if (!options.positions?.length) return layout;
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
  const move = (node: GraphLayoutNode, dx: number, dy: number) => {
    const old = { x: node.x, y: node.y },
      pin = pins.get(node.id);
    node.x = pin?.x ?? node.x + dx;
    node.y = pin?.y ?? node.y + dy;
    const members = children.get(node.id) ?? [];
    for (const child of members) move(child, node.x - old.x, node.y - old.y);
    if (!members.length) return;
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
  const edges = layout.edges.map((edge) => {
    const source = nodes.get(edge.source)!,
      target = nodes.get(edge.target)!;
    const sides = (node: GraphLayoutNode, port: string | undefined, fallback: string) =>
      node.ports?.find((p) => p.id === port)?.side ?? fallback;
    const forward = source.x + source.width / 2 <= target.x + target.width / 2;
    const endpoint = (node: GraphLayoutNode, side: string): [GraphPoint, GraphPoint] => {
      const center = { x: node.x + node.width / 2, y: node.y + node.height / 2 };
      if (side === 'NORTH')
        return [
          { x: center.x, y: node.y },
          { x: center.x, y: node.y - 8 },
        ];
      if (side === 'SOUTH')
        return [
          { x: center.x, y: node.y + node.height },
          { x: center.x, y: node.y + node.height + 8 },
        ];
      if (side === 'WEST')
        return [
          { x: node.x, y: center.y },
          { x: node.x - 8, y: center.y },
        ];
      return [
        { x: node.x + node.width, y: center.y },
        { x: node.x + node.width + 8, y: center.y },
      ];
    };
    const [a, start] = endpoint(source, sides(source, edge.sourcePort, forward ? 'EAST' : 'WEST'));
    const [b, end] = endpoint(
      target,
      sides(target, edge.targetPort, source === target ? 'NORTH' : forward ? 'WEST' : 'EAST')
    );
    const obstacles = [...nodes.values()]
      .filter((n) => n.kind !== 'group')
      .map((n) => rectangle(n, 4));
    return { ...edge, sections: [[a, ...route(start, end, obstacles), b]] };
  });
  const output = [...nodes.values()],
    points = edges.flatMap((edge) => edge.sections.flat());
  const x = Math.min(...output.map((n) => n.x), ...points.map((p) => p.x)),
    y = Math.min(...output.map((n) => n.y), ...points.map((p) => p.y));
  return {
    nodes: output,
    edges,
    bounds: {
      x,
      y,
      width: Math.max(...output.map((n) => n.x + n.width), ...points.map((p) => p.x)) - x,
      height: Math.max(...output.map((n) => n.y + n.height), ...points.map((p) => p.y)) - y,
    },
  };
}
