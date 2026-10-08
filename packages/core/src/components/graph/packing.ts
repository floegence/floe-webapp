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
    const siblings = children.get(parentId) ?? [];
    for (const node of siblings) {
      if (!children.has(node.id)) continue;
      const size = await arrange(node.id);
      node.width = Math.max(node.width, size.width);
      node.height = Math.max(node.height, size.height);
    }
    if (!siblings.length) return { width: 0, height: 0 };
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
        'elk.direction': options.direction ?? 'RIGHT',
        'elk.edgeRouting': 'ORTHOGONAL',
        'elk.separateConnectedComponents': 'true',
        'elk.aspectRatio': String(options.aspectRatio),
        'elk.spacing.componentComponent': String(options.spacing ?? 64),
        'elk.spacing.nodeNode': String(options.spacing ?? 64),
        'elk.layered.spacing.nodeNodeBetweenLayers': String(options.spacing ?? 64),
        'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
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
  const anchor = !options.positions?.length && options.anchor && nodes.get(options.anchor.nodeId);
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
  return options.positions?.length
    ? applyGraphPositions(layout, options, input.nodes)
    : routeGraphGeometry(layout);
}
