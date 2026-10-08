import { applyGraphPositions } from './positions';
import type { ELK, ElkNode } from 'elkjs/lib/elk-api';
import type {
  GraphInput,
  GraphLayout,
  GraphLayoutEdge,
  GraphLayoutNode,
  GraphLayoutOptions,
} from './types';

export function validateGraphInput(input: GraphInput): void {
  const ids = new Set<string>();
  const claim = (id: string) => {
    if (!id || ids.has(id)) throw new Error(`Duplicate or empty graph ID: ${id}`);
    ids.add(id);
  };
  const nodes = new Map(input.nodes.map((node) => [node.id, node]));
  for (const node of input.nodes) {
    claim(node.id);
    if (![node.width, node.height].every((n) => Number.isFinite(n) && n > 0)) {
      throw new Error(`Invalid dimensions for graph node: ${node.id}`);
    }
    for (const port of node.ports ?? []) claim(port.id);
    const ancestors = new Set([node.id]);
    let parent = node.parentId;
    while (parent !== undefined) {
      const group = nodes.get(parent);
      if (!group || group.kind !== 'group')
        throw new Error(`Invalid parent for graph node: ${node.id}`);
      if (ancestors.has(parent)) throw new Error(`Cyclic graph containment: ${node.id}`);
      ancestors.add(parent);
      parent = group.parentId;
    }
  }
  for (const edge of input.edges) {
    claim(edge.id);
    for (const [id, port] of [
      [edge.source, edge.sourcePort],
      [edge.target, edge.targetPort],
    ]) {
      const node = nodes.get(id!);
      if (!node || (port !== undefined && !node.ports?.some((p) => p.id === port))) {
        throw new Error(`Invalid endpoint for graph edge: ${edge.id}`);
      }
    }
  }
}

/** Normalizes geometry around the supplied ELK engine; browser layout runs in its worker. */
export async function computeGraphLayout(
  input: GraphInput,
  options: GraphLayoutOptions,
  engine: Pick<ELK, 'layout'>
): Promise<GraphLayout> {
  validateGraphInput(input);
  const padding = options.groupPadding ?? { top: 64, right: 28, bottom: 28, left: 28 };
  if (
    ![...Object.values(padding), options.spacing ?? 64].every((n) => Number.isFinite(n) && n >= 0)
  ) {
    throw new Error('Graph layout spacing must be finite and nonnegative');
  }
  const nodes = new Map<string, ElkNode>();
  for (const node of input.nodes) {
    nodes.set(node.id, {
      id: node.id,
      width: node.width,
      height: node.height,
      ...(node.kind === 'group' ? { children: [] } : {}),
      ports: node.ports?.map((port) => ({
        id: port.id,
        width: 1,
        height: 1,
        layoutOptions: { 'elk.port.side': port.side },
      })),
      layoutOptions: {
        'elk.portConstraints': 'FIXED_ORDER',
        'elk.padding': `[top=${padding.top},left=${padding.left},bottom=${padding.bottom},right=${padding.right}]`,
      },
    });
  }
  const children: ElkNode[] = [];
  for (const node of input.nodes) {
    (node.parentId ? nodes.get(node.parentId)!.children! : children).push(nodes.get(node.id)!);
  }
  // This ID must not collide with any consumer-owned ID, including ports and edges.
  const used = new Set([
    ...input.nodes.flatMap((n) => [n.id, ...(n.ports ?? []).map((p) => p.id)]),
    ...input.edges.map((e) => e.id),
  ]);
  let rootId = '$graph';
  while (used.has(rootId)) rootId += '$';
  const graph: ElkNode = await engine.layout({
    id: rootId,
    children,
    edges: input.edges.map((edge) => ({
      id: edge.id,
      sources: [edge.sourcePort ?? edge.source],
      targets: [edge.targetPort ?? edge.target],
    })),
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': options.direction ?? 'RIGHT',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.spacing.nodeNode': String(options.spacing ?? 64),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(options.spacing ?? 64),
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      'elk.randomSeed': '1',
    },
  });
  const positions = new Map<string, { x: number; y: number; width: number; height: number }>();
  const routes = new Map<string, GraphLayoutEdge['sections']>();
  const recordEdges = (node: ElkNode) => {
    for (const edge of node.edges ?? []) {
      // ELK keeps cross-hierarchy edges in the submitted array but expresses their
      // sections relative to the returned container, not that array's owner.
      const container = edge.container ?? node.id;
      const offset = positions.get(container) ?? { x: 0, y: 0 };
      routes.set(
        edge.id,
        (edge.sections ?? []).map((section) =>
          [section.startPoint, ...(section.bendPoints ?? []), section.endPoint].map((p) => ({
            x: p.x + offset.x,
            y: p.y + offset.y,
          }))
        )
      );
    }
    for (const child of node.children ?? []) recordEdges(child);
  };
  const visit = (node: ElkNode, x: number, y: number) => {
    const px = x + (node.x ?? 0),
      py = y + (node.y ?? 0);
    positions.set(node.id, { x: px, y: py, width: node.width ?? 0, height: node.height ?? 0 });
    for (const child of node.children ?? []) visit(child, px, py);
  };
  for (const child of graph.children ?? []) visit(child, 0, 0);
  recordEdges(graph);
  const anchor =
    !options.positions?.length && options.anchor && positions.get(options.anchor.nodeId);
  const dx = anchor ? options.anchor!.position.x - anchor.x : 0;
  const dy = anchor ? options.anchor!.position.y - anchor.y : 0;
  const outputNodes: GraphLayoutNode[] = input.nodes.map((node) => {
    const position = positions.get(node.id)!;
    return { ...node, ...position, x: position.x + dx, y: position.y + dy };
  });
  return applyGraphPositions(
    {
      nodes: outputNodes,
      edges: input.edges.map((edge) => ({
        ...edge,
        sections: (routes.get(edge.id) ?? []).map((s) =>
          s.map((p) => ({ x: p.x + dx, y: p.y + dy }))
        ),
      })),
      bounds: { x: dx, y: dy, width: graph.width ?? 0, height: graph.height ?? 0 },
    },
    options,
    input.nodes
  );
}
