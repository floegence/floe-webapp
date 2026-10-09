import { AvoidLib } from 'libavoid-js';
import wasmUrl from 'libavoid-js/wasm?url&no-inline';
import type { GraphLayout, GraphLayoutNode, GraphPoint, GraphPort } from './types';

let loaded: Promise<void> | undefined;
const directions = { NORTH: 1, SOUTH: 2, WEST: 4, EAST: 8 };
const sides = ['NORTH', 'EAST', 'SOUTH', 'WEST'] as const;
const release = (value: unknown) => (value as { delete(): void }).delete();

/** Joint orthogonal routing through the final rectangular geometry. */
export async function routeGraphGeometry(layout: GraphLayout): Promise<GraphLayout> {
  if (!layout.nodes.length || !layout.edges.length) return layout;
  await (loaded ??= AvoidLib.load(import.meta.env.SSR ? undefined : wasmUrl).catch((error) => {
    loaded = undefined;
    throw error;
  }));
  const avoid = AvoidLib.getInstance();
  const nodes = new Map(layout.nodes.map((node) => [node.id, node]));
  const ancestors = (id: string) => {
    const ids: string[] = [];
    for (let parent = nodes.get(id)!.parentId; parent; parent = nodes.get(parent)!.parentId)
      ids.push(parent);
    return ids;
  };
  // Only endpoint ancestors are traversable. Other groups are opaque obstacles
  // so their border and complete subtree cannot be crossed by unrelated routes.
  const batches = new Map<string, { open: Set<string>; edges: (typeof layout.edges)[number][] }>();
  for (const edge of layout.edges) {
    const open = new Set([...ancestors(edge.source), ...ancestors(edge.target)]);
    const key = JSON.stringify([...open].sort());
    const batch = batches.get(key) ?? { open, edges: [] };
    batch.edges.push(edge);
    batches.set(key, batch);
  }
  const paths = new Map<string, GraphPoint[]>();
  for (const { open, edges } of batches.values()) {
    const router = new avoid.Router(2);
    try {
      router.setRoutingParameter(avoid.RoutingParameter.shapeBufferDistance, 4);
      router.setRoutingParameter(avoid.RoutingParameter.idealNudgingDistance, 8);
      router.setRoutingParameter(avoid.RoutingParameter.crossingPenalty, 80);
      router.setRoutingParameter(avoid.RoutingParameter.fixedSharedPathPenalty, 120);
      router.setRoutingParameter(avoid.RoutingParameter.portDirectionPenalty, 0);
      // Pins already provide separate border lanes. Moving their attached
      // segments would collapse self loops and invalidate fixed-port geometry.
      router.setRoutingOption(avoid.RoutingOption.nudgeOrthogonalSegmentsConnectedToShapes, false);
      router.setRoutingOption(avoid.RoutingOption.nudgeSharedPathsWithCommonEndPoint, true);
      const shapes = new Map(
        layout.nodes
          .filter((node) => !open.has(node.id) && ancestors(node.id).every((id) => open.has(id)))
          .map((node) => {
            const a = new avoid.Point(node.x, node.y),
              b = new avoid.Point(node.x + node.width, node.y + node.height);
            const rectangle = new avoid.Rectangle(a, b);
            const shape = new avoid.ShapeRef(router, rectangle);
            release(a);
            release(b);
            release(rectangle);
            return [node.id, shape] as const;
          })
      );
      for (const node of layout.nodes) {
        const shape = shapes.get(node.id);
        if (!shape) continue;
        const neighbors = edges.flatMap((edge) =>
          edge.source === node.id
            ? [nodes.get(edge.target)!]
            : edge.target === node.id
              ? [nodes.get(edge.source)!]
              : []
        );
        if (!neighbors.length) continue;
        const span = (start: number, size: number, other: number, otherSize: number) => {
          const low = Math.max(start, other),
            high = Math.min(start + size, other + otherSize);
          const inset = Math.min(8, size / 4);
          return low < high
            ? (low + high) / 2
            : Math.max(start + inset, Math.min(start + size - inset, other + otherSize / 2));
        };
        const offsets = (size: number, centers: number[]) => {
          const inset = Math.min(8, size / 4);
          return [
            ...new Set([
              size / 2,
              inset,
              size - inset,
              ...centers.flatMap((center) =>
                Array.from({ length: neighbors.length + 1 }, (_, i) =>
                  Math.max(inset, Math.min(size - inset, center + (i - neighbors.length / 2) * 8))
                )
              ),
            ]),
          ];
        };
        const xs = offsets(
          node.width,
          neighbors.map((other) => span(node.x, node.width, other.x, other.width) - node.x)
        );
        const ys = offsets(
          node.height,
          neighbors.map((other) => span(node.y, node.height, other.y, other.height) - node.y)
        );
        const fixed = (node.ports ?? []).map((port) => anchor(node, port.side));
        const loop = edges.some((edge) => edge.source === node.id && edge.target === node.id);
        const reserved = [
          ...fixed,
          ...(loop
            ? [
                { x: node.x + node.width, y: node.y + node.height / 3 },
                { x: node.x + node.width, y: node.y + (node.height * 2) / 3 },
              ]
            : []),
        ];
        const pin = (id: number, x: number, y: number, direction: number, exclusive: boolean) => {
          const value = new avoid.ShapeConnectionPin(
            shape,
            id,
            x / node.width,
            y / node.height,
            true,
            0,
            direction
          );
          value.setExclusive(exclusive);
          // Libavoid includes the center-to-pin distance in route cost. Equalize
          // it so anchor selection minimizes the visible border-to-border path.
          value.setConnectionCost(
            node.width / 2 +
              node.height / 2 -
              Math.abs(x - node.width / 2) -
              Math.abs(y - node.height / 2)
          );
        };
        const freePin = (x: number, y: number, direction: number) => {
          if (!reserved.some((point) => point.x === node.x + x && point.y === node.y + y))
            pin(1, x, y, direction, true);
        };
        for (const x of xs) {
          freePin(x, 0, 1);
          freePin(x, node.height, 2);
        }
        for (const y of ys) {
          freePin(0, y, 4);
          freePin(node.width, y, 8);
        }
        for (const side of new Set(node.ports?.map((port) => port.side))) {
          const { x, y } = anchor(node, side);
          pin(sides.indexOf(side) + 2, x - node.x, y - node.y, directions[side], false);
        }
        if (loop) {
          pin(6, node.width, node.height / 3, 8, false);
          pin(7, node.width, (node.height * 2) / 3, 8, false);
        }
      }
      const endpoint = (
        id: string,
        portId: string | undefined,
        otherId: string,
        target: boolean
      ) => {
        const node = nodes.get(id)!,
          shape = shapes.get(id);
        if (shape)
          return new avoid.ConnEnd(
            shape,
            portId
              ? sides.indexOf(node.ports!.find((port) => port.id === portId)!.side) + 2
              : id === otherId
                ? target
                  ? 7
                  : 6
                : 1
          );
        const other = nodes.get(otherId)!;
        const candidates = sides.map((side) => anchor(node, side));
        candidates.sort((a, b) => distance(a, other) - distance(b, other));
        const position = portId
          ? anchor(node, node.ports!.find((port) => port.id === portId)!.side)
          : candidates[0]!;
        const point = new avoid.Point(position.x, position.y);
        const end = new avoid.ConnEnd(point);
        release(point);
        return end;
      };
      const connections = edges.map((edge) => {
        const source = endpoint(edge.source, edge.sourcePort, edge.target, false),
          target = endpoint(edge.target, edge.targetPort, edge.source, true);
        const connection = new avoid.ConnRef(router, source, target);
        release(source);
        release(target);
        if (edge.source === edge.target) {
          const node = nodes.get(edge.source)!;
          const checkpoints = new avoid.CheckpointVector();
          for (const y of [node.y + node.height / 3, node.y + (node.height * 2) / 3]) {
            const point = new avoid.Point(node.x + node.width + 24, y);
            const checkpoint = new avoid.Checkpoint(point);
            checkpoints.push_back(checkpoint);
            release(point);
            release(checkpoint);
          }
          connection.setRoutingCheckpoints(checkpoints);
          release(checkpoints);
        }
        return { edge, connection };
      });
      router.processTransaction();
      for (const { edge, connection } of connections) {
        const route = connection.displayRoute();
        const path = Array.from({ length: route.size() }, (_, i) => {
          const point = route.at(i);
          const value = { x: point.x, y: point.y };
          release(point);
          return value;
        });
        release(route);
        if (
          !(connection as typeof connection & { hasValidRoute(): boolean }).hasValidRoute() ||
          path.length < 2 ||
          path.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y)) ||
          path.some((point, i) => i > 0 && point.x !== path[i - 1]!.x && point.y !== path[i - 1]!.y)
        )
          throw new Error(`Graph edge cannot be routed: ${edge.id}`);
        paths.set(edge.id, path);
      }
    } finally {
      router.delete();
    }
  }
  const edges = layout.edges.map((edge) => ({ ...edge, sections: [paths.get(edge.id)!] }));
  const points = [
    ...layout.nodes.flatMap((node) => [
      { x: node.x, y: node.y },
      { x: node.x + node.width, y: node.y + node.height },
    ]),
    ...edges.flatMap((edge) => edge.sections.flat()),
  ];
  const x = Math.min(...points.map((point) => point.x)),
    y = Math.min(...points.map((point) => point.y));
  return {
    nodes: layout.nodes,
    edges,
    bounds: {
      x,
      y,
      width: Math.max(...points.map((point) => point.x)) - x,
      height: Math.max(...points.map((point) => point.y)) - y,
    },
  };
}

function anchor(node: GraphLayoutNode, side: GraphPort['side']): GraphPoint {
  return {
    x: side === 'WEST' ? node.x : side === 'EAST' ? node.x + node.width : node.x + node.width / 2,
    y:
      side === 'NORTH'
        ? node.y
        : side === 'SOUTH'
          ? node.y + node.height
          : node.y + node.height / 2,
  };
}
function distance(point: GraphPoint, node: GraphLayoutNode): number {
  return (
    Math.max(node.x - point.x, 0, point.x - node.x - node.width) +
    Math.max(node.y - point.y, 0, point.y - node.y - node.height)
  );
}
