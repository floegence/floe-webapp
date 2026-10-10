import type { ELK, ElkNode } from 'elkjs/lib/elk-api';
import { applyGraphPositions, routeGraphGeometry } from './positions';
import type { GraphInput, GraphLayout, GraphLayoutNode, GraphLayoutOptions } from './types';

/** Lay out each containment level as peers, then route the complete compound graph. */
export async function computePackedGraphLayout(
  input: GraphInput,
  options: GraphLayoutOptions,
  engine: Pick<ELK, 'layout'>
): Promise<GraphLayout> {
  const nodes = new Map(input.nodes.map((node) => [node.id, { ...node, x: 0, y: 0 }]));
  const siblingOrder = new Map(input.nodes.map((node, index) => [node.id, index]));
  const children = new Map<string | undefined, GraphLayoutNode[]>();
  for (const node of nodes.values()) {
    const siblings = children.get(node.parentId) ?? [];
    siblings.push(node);
    children.set(node.parentId, siblings);
  }
  // The submitted root must stay outside the consumer's node/port/edge namespace.
  const ids = new Set([
    ...input.nodes.flatMap((node) => [node.id, ...(node.ports ?? []).map((port) => port.id)]),
    ...input.edges.map((edge) => edge.id),
  ]);
  let rootId = '$packed';
  while (ids.has(rootId)) rootId += '$';
  const padding = options.groupPadding ?? { top: 64, right: 28, bottom: 28, left: 28 };
  const direction = options.direction ?? 'RIGHT';
  const positionHints = new Map(
    (options.positions ?? []).map((position) => [
      position.nodeId,
      direction === 'RIGHT' || direction === 'LEFT' ? position.y : position.x,
    ])
  );
  const translate = (node: GraphLayoutNode, dx: number, dy: number) => {
    node.x += dx;
    node.y += dy;
    for (const child of children.get(node.id) ?? []) translate(child, dx, dy);
  };
  const peer = (id: string, parentId: string | undefined) => {
    let node = nodes.get(id);
    while (node && node.parentId !== parentId)
      node = node.parentId ? nodes.get(node.parentId) : undefined;
    return node;
  };
  const arrange = async (parentId?: string): Promise<{ width: number; height: number }> => {
    const siblings = [...(children.get(parentId) ?? [])];
    if (parentId !== undefined || !options.layers)
      siblings.sort(
        (a, b) =>
          (positionHints.get(a.id) ?? Infinity) - (positionHints.get(b.id) ?? Infinity) ||
          siblingOrder.get(a.id)! - siblingOrder.get(b.id)!
      );
    for (const node of siblings) {
      if (!children.has(node.id)) continue;
      const size = await arrange(node.id);
      node.width = Math.max(node.width, size.width);
      node.height = Math.max(node.height, size.height);
    }
    if (!siblings.length) return { width: 0, height: 0 };
    if (parentId === undefined && options.layers)
      return arrangeRootLayers(siblings, input, options, peer, translate);
    const projected = new Map<string, { id: string; sources: string[]; targets: string[] }>();
    for (const edge of input.edges) {
      const source = peer(edge.source, parentId),
        target = peer(edge.target, parentId);
      if (!source || !target || source.id === target.id) continue;
      const key = JSON.stringify([source.id, target.id]);
      if (!projected.has(key))
        projected.set(key, { id: edge.id, sources: [source.id], targets: [target.id] });
    }
    const result: ElkNode = await engine.layout({
      id: parentId ?? rootId,
      children: siblings.map((node) => ({ id: node.id, width: node.width, height: node.height })),
      edges: [...projected.values()],
      layoutOptions: {
        'elk.algorithm': projected.size ? 'layered' : 'rectpacking',
        'elk.direction': direction,
        'elk.edgeRouting': 'ORTHOGONAL',
        'elk.separateConnectedComponents': 'true',
        ...(options.aspectRatio !== undefined
          ? { 'elk.aspectRatio': String(options.aspectRatio) }
          : {}),
        'elk.spacing.componentComponent': String(options.spacing ?? 64),
        'elk.spacing.nodeNode': String(options.spacing ?? 64),
        'elk.layered.spacing.nodeNodeBetweenLayers': String(options.spacing ?? 64),
        'elk.layered.considerModelOrder.strategy': 'NODES',
        'elk.padding': parentId
          ? `[top=${padding.top},left=${padding.left},bottom=${padding.bottom},right=${padding.right}]`
          : '[top=12,left=12,bottom=12,right=12]',
        'elk.randomSeed': '1',
      },
    });
    for (const child of result.children ?? []) {
      const node = nodes.get(child.id)!;
      translate(node, (child.x ?? 0) - node.x, (child.y ?? 0) - node.y);
    }
    return { width: result.width ?? 0, height: result.height ?? 0 };
  };
  const size = await arrange();
  const anchor =
    (!options.positions?.length || options.positionMode === 'compact' || options.layers) &&
    options.anchor &&
    nodes.get(options.anchor.nodeId);
  if (anchor) {
    const dx = options.anchor!.position.x - anchor.x,
      dy = options.anchor!.position.y - anchor.y;
    for (const node of children.get(undefined) ?? []) translate(node, dx, dy);
  }
  const layout: GraphLayout = {
    nodes: [...nodes.values()],
    edges: input.edges.map((edge) => ({ ...edge, sections: [] })),
    bounds: { x: 0, y: 0, ...size },
  };
  return options.positions?.length && options.positionMode !== 'compact' && !options.layers
    ? applyGraphPositions(layout, options, input.nodes)
    : routeGraphGeometry(layout, options);
}

function arrangeRootLayers(
  roots: GraphLayoutNode[],
  input: GraphInput,
  options: GraphLayoutOptions,
  peer: (id: string, parentId: string | undefined) => GraphLayoutNode | undefined,
  translate: (node: GraphLayoutNode, dx: number, dy: number) => void
): { width: number; height: number } {
  const direction = options.direction ?? 'RIGHT';
  const horizontal = direction === 'RIGHT' || direction === 'LEFT';
  const forward = direction === 'RIGHT' || direction === 'DOWN';
  const inputOrder = new Map(roots.map((node, index) => [node.id, index]));
  const preferred = new Map(
    (options.positions ?? [])
      .filter((position) => inputOrder.has(position.nodeId))
      .map((position) => [position.nodeId, horizontal ? position.y : position.x])
  );
  const stableCompare = (a: string, b: string) =>
    inputOrder.get(a)! - inputOrder.get(b)! || a.localeCompare(b);
  const preferredCompare = (a: string, b: string) =>
    (preferred.get(a) ?? Infinity) - (preferred.get(b) ?? Infinity) || stableCompare(a, b);
  const adjacency = new Map(roots.map((node) => [node.id, new Set<string>()]));
  for (const edge of input.edges) {
    const source = peer(edge.source, undefined)?.id;
    const target = peer(edge.target, undefined)?.id;
    if (source && target && source !== target) {
      adjacency.get(source)?.add(target);
      adjacency.get(target)?.add(source);
    }
  }

  const layers = options.layers ?? [];
  const rank = new Map<string, number>();
  layers.forEach((layer, index) => layer.forEach((id) => rank.set(id, index)));
  const unvisited = new Set(roots.map((node) => node.id));
  const components: string[][] = [];
  for (const first of [...unvisited].sort(stableCompare)) {
    if (!unvisited.has(first)) continue;
    const component: string[] = [],
      queue = [first];
    unvisited.delete(first);
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const id = queue[cursor]!;
      component.push(id);
      for (const next of [...adjacency.get(id)!].sort(stableCompare))
        if (unvisited.delete(next)) queue.push(next);
    }
    components.push(component);
  }

  let appendedRank = layers.length;
  for (const component of components) {
    const seeds = component.filter((id) => rank.has(id));
    if (!seeds.length) {
      component.sort(stableCompare).forEach((id) => rank.set(id, appendedRank));
      appendedRank++;
      continue;
    }
    const distance = new Map<string, number>();
    const queue = [...seeds].sort((a, b) => rank.get(a)! - rank.get(b)! || stableCompare(a, b));
    for (const id of queue) distance.set(id, 0);
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const id = queue[cursor]!;
      for (const next of [...adjacency.get(id)!].sort(stableCompare)) {
        if (distance.has(next)) continue;
        distance.set(next, distance.get(id)! + 1);
        rank.set(next, rank.get(id)!);
        queue.push(next);
      }
    }
  }

  const rankCount = Math.max(layers.length, appendedRank);
  const byRank = Array.from({ length: rankCount }, () => [] as GraphLayoutNode[]);
  for (const node of roots) byRank[rank.get(node.id)!]!.push(node);
  for (const group of byRank) group.sort((a, b) => preferredCompare(a.id, b.id));

  const sortByAdjacentRank = (index: number, adjacent: number) => {
    const neighborPositions = new Map(byRank[adjacent]!.map((node, i) => [node.id, i]));
    const currentPositions = new Map(byRank[index]!.map((node, i) => [node.id, i]));
    const score = (id: string) => {
      const values = [...(adjacency.get(id) ?? [])].flatMap((other) => {
        const position = neighborPositions.get(other);
        return rank.get(other) === adjacent && position !== undefined ? [position] : [];
      });
      return values.length
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : currentPositions.get(id)!;
    };
    byRank[index]!.sort((a, b) => score(a.id) - score(b.id) || preferredCompare(a.id, b.id));
  };
  for (let index = 1; index < byRank.length; index++) sortByAdjacentRank(index, index - 1);
  for (let index = byRank.length - 2; index >= 0; index--) sortByAdjacentRank(index, index + 1);

  const gap = options.spacing ?? 64;
  let axis = 0,
    crossExtent = 0;
  const rankStart: number[] = [],
    rankExtent: number[] = [];
  for (const group of byRank) {
    let cross = 0;
    const axisExtent = Math.max(0, ...group.map((node) => (horizontal ? node.width : node.height)));
    rankStart.push(axis);
    rankExtent.push(axisExtent);
    for (const node of group) {
      const along = axis + (axisExtent - (horizontal ? node.width : node.height)) / 2;
      const x = horizontal ? along : cross;
      const y = horizontal ? cross : along;
      translate(node, x - node.x, y - node.y);
      cross += (horizontal ? node.height : node.width) + gap;
    }
    crossExtent = Math.max(crossExtent, Math.max(0, cross - gap));
    axis += axisExtent + gap;
  }
  axis = Math.max(0, axis - gap);
  if (!forward) {
    for (const node of roots) {
      const index = rank.get(node.id)!;
      const aligned = axis - rankStart[index]! - rankExtent[index]!;
      const centered = aligned + (rankExtent[index]! - (horizontal ? node.width : node.height)) / 2;
      translate(node, horizontal ? centered - node.x : 0, horizontal ? 0 : centered - node.y);
    }
  }
  return horizontal ? { width: axis, height: crossExtent } : { width: crossExtent, height: axis };
}
