import type { GraphBounds, GraphLayout, GraphPoint, GraphViewport } from './types';

export function graphSectionPath(points: readonly GraphPoint[]): string {
  return points.map((p, index) => `${index ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
}

export function fitGraphViewport(
  bounds: GraphBounds,
  size: { width: number; height: number },
  padding = 48
): GraphViewport {
  const scale = Math.max(
    0.1,
    Math.min(
      1,
      (size.width - padding * 2) / Math.max(1, bounds.width),
      (size.height - padding * 2) / Math.max(1, bounds.height)
    )
  );
  return {
    x: (size.width - bounds.width * scale) / 2 - bounds.x * scale,
    y: (size.height - bounds.height * scale) / 2 - bounds.y * scale,
    scale,
  };
}

/** Includes descendants so highlighting a group traces all of its direct routes. */
export function graphRelatedEdges(layout: GraphLayout, nodeId: string): ReadonlySet<string> {
  const members = new Set([nodeId]);
  const children = new Map<string, string[]>();
  for (const node of layout.nodes)
    if (node.parentId)
      children.set(node.parentId, [...(children.get(node.parentId) ?? []), node.id]);
  const visit = (id: string) => {
    for (const child of children.get(id) ?? [])
      if (!members.has(child)) {
        members.add(child);
        visit(child);
      }
  };
  visit(nodeId);
  return new Set(
    layout.edges
      .filter((edge) => members.has(edge.source) || members.has(edge.target))
      .map((edge) => edge.id)
  );
}

/** Put the short edge label on its longest routed segment, away from arrowheads. */
export function graphEdgeLabelPosition(
  sections: readonly (readonly GraphPoint[])[]
): GraphPoint | null {
  let best: GraphPoint | null = null,
    length = 0;
  for (const section of sections)
    for (let index = 1; index < section.length; index++) {
      const a = section[index - 1]!,
        b = section[index]!;
      const distance = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
      if (distance > length) {
        length = distance;
        best = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      }
    }
  return best;
}
