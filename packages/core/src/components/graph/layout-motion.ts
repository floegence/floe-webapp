import type { GraphLayout, GraphLayoutNode, GraphPoint } from './types';

export type MotionNode = GraphLayoutNode & { opacity?: number; exiting?: boolean };
export type MotionLayout = Omit<GraphLayout, 'nodes'> & { nodes: readonly MotionNode[] };
const mix = (a: number, b: number, progress: number) => a + (b - a) * progress;
const point = (a: GraphPoint, b: GraphPoint, progress: number) => ({
  x: mix(a.x, b.x, progress),
  y: mix(a.y, b.y, progress),
});

function parameterize(section: readonly GraphPoint[]) {
  const lengths = section.map((value, index) =>
    index ? Math.hypot(value.x - section[index - 1]!.x, value.y - section[index - 1]!.y) : 0
  );
  let total = 0;
  const distances = lengths.map((length) => (total += length));
  return {
    stops: distances.map((value) => (total ? value / total : 0)),
    at(fraction: number): GraphPoint {
      const distance = fraction * total;
      const index = distances.findIndex((value) => value >= distance);
      if (index <= 0) return section[0]!;
      const previous = distances[index - 1]!;
      return point(
        section[index - 1]!,
        section[index]!,
        lengths[index] ? (distance - previous) / lengths[index]! : 0
      );
    },
  };
}

/** Presentation only: one clock moves boxes and routes; final worker geometry stays exact. */
export function createGraphLayoutTransition(from: MotionLayout, to: GraphLayout) {
  const previous = new Map(from.nodes.map((node) => [node.id, node]));
  const targets = new Map(to.nodes.map((node) => [node.id, node]));
  const nodes = to.nodes.map((node) => {
    const existing = previous.get(node.id);
    const parent = node.parentId ? previous.get(node.parentId) : undefined;
    const targetParent = node.parentId ? targets.get(node.parentId) : undefined;
    const start: MotionNode = existing ?? {
      ...node,
      x: parent && targetParent ? node.x + parent.x - targetParent.x : node.x,
      y: parent && targetParent ? node.y + parent.y - targetParent.y + 12 : node.y + 12,
      opacity: 0,
    };
    return { node, start };
  });
  const starts = new Map(nodes.map(({ node, start }) => [node.id, start]));
  const leaving = from.nodes.filter((node) => !targets.has(node.id));
  const previousEdges = new Map(from.edges.map((edge) => [edge.id, edge]));
  const edges = to.edges.map((edge) => {
    const old = previousEdges.get(edge.id);
    const sections = edge.sections.map((section, index) => {
      let before =
        old?.source === edge.source && old.target === edge.target ? old.sections[index] : undefined;
      if (!section.length) return () => section;
      if (!before?.length) {
        const source = targets.get(edge.source),
          target = targets.get(edge.target);
        const sourceStart = starts.get(edge.source),
          targetStart = starts.get(edge.target);
        if (!source || !target || !sourceStart || !targetStart) return () => section;
        const offset = (value: GraphPoint, end: GraphLayoutNode, start: GraphLayoutNode) => ({
          x: start.x - end.x + ((value.x - end.x) / end.width) * (start.width - end.width),
          y: start.y - end.y + ((value.y - end.y) / end.height) * (start.height - end.height),
        });
        const first = offset(section[0]!, source, sourceStart);
        const last = offset(section[section.length - 1]!, target, targetStart);
        const fractions = parameterize(section).stops;
        before = section.map((value, i) => ({
          x: value.x + mix(first.x, last.x, fractions[i]!),
          y: value.y + mix(first.y, last.y, fractions[i]!),
        }));
      }
      const a = parameterize(before),
        b = parameterize(section);
      // Keep every bend from both routes; differing router point counts never detach endpoints.
      const stops = [...new Set([...a.stops, ...b.stops, 1])].sort((x, y) => x - y);
      const pairs = stops.map((stop) => [a.at(stop), b.at(stop)] as const);
      return (progress: number) => pairs.map(([start, end]) => point(start, end, progress));
    });
    return { edge, sections };
  });
  return (progress: number): MotionLayout => {
    if (progress >= 1) return to;
    const t = Math.max(0, progress);
    return {
      bounds: {
        ...point(from.bounds, to.bounds, t),
        width: mix(from.bounds.width, to.bounds.width, t),
        height: mix(from.bounds.height, to.bounds.height, t),
      },
      nodes: [
        ...nodes.map(({ node, start }) => ({
          ...node,
          ...point(start, node, t),
          width: mix(start.width, node.width, t),
          height: mix(start.height, node.height, t),
          opacity: mix(start.opacity ?? 1, 1, t),
          exiting: false,
        })),
        ...leaving.map((node) => ({
          ...node,
          exiting: true,
          opacity: (node.opacity ?? 1) * Math.max(0, 1 - t * 2.5),
        })),
      ],
      edges: edges.map(({ edge, sections }) => ({
        ...edge,
        sections: sections.map((section) => section(t)),
      })),
    };
  };
}
