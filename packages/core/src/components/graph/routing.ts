import { AvoidLib } from 'libavoid-js';
import wasmUrl from 'libavoid-js/wasm?url&no-inline';
import type { GraphLayout, GraphLayoutNode, GraphPoint, GraphPort } from './types';

let loaded: Promise<void> | undefined;
const directions = { NORTH: 1, SOUTH: 2, WEST: 4, EAST: 8 };
const sides = ['NORTH', 'EAST', 'SOUTH', 'WEST'] as const;
const release = (value: unknown) => (value as { delete(): void }).delete();

/** Joint orthogonal routing through the final rectangular geometry. */
export async function routeGraphGeometry(layout: GraphLayout): Promise<GraphLayout> {
  if (!layout.nodes.length) return layout;
  if (!layout.edges.length) return withBounds(layout);
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
      const endpointPins = new Map<
        string,
        {
          sourceSide: GraphPort['side'];
          targetSide: GraphPort['side'];
          offset: number;
        }
      >();
      const pairOrdinals = new Map<string, number>();
      edges.forEach((edge) => {
        const source = nodes.get(edge.source)!,
          target = nodes.get(edge.target)!,
          pair = facingSides(source, target),
          sourceSide = edge.sourcePort
            ? source.ports!.find((port) => port.id === edge.sourcePort)!.side
            : edge.targetPort
              ? opposite(target.ports!.find((port) => port.id === edge.targetPort)!.side)
              : pair.source,
          targetSide = edge.targetPort
            ? target.ports!.find((port) => port.id === edge.targetPort)!.side
            : edge.sourcePort
              ? opposite(source.ports!.find((port) => port.id === edge.sourcePort)!.side)
              : pair.target;
        const key = [edge.source, edge.target].sort().join('\u0000');
        const ordinal = pairOrdinals.get(key) ?? 0;
        pairOrdinals.set(key, ordinal + 1);
        endpointPins.set(edge.id, {
          sourceSide,
          targetSide,
          offset: ordinal % 2 === 0 ? -6 : 6,
        });
      });
      for (const node of layout.nodes) {
        const shape = shapes.get(node.id);
        if (!shape) continue;
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
        for (const side of new Set(node.ports?.map((port) => port.side))) {
          const { x, y } = anchor(node, side);
          pin(sides.indexOf(side) + 2, x - node.x, y - node.y, directions[side], false);
        }
      }
      const endpoint = (id: string, portId: string | undefined, position: GraphPoint) => {
        const node = nodes.get(id)!,
          shape = shapes.get(id);
        if (shape && portId)
          return new avoid.ConnEnd(
            shape,
            sides.indexOf(node.ports!.find((port) => port.id === portId)!.side) + 2
          );
        const endpointPosition = portId
          ? anchor(node, node.ports!.find((port) => port.id === portId)!.side)
          : position;
        const libavoidPoint = new avoid.Point(endpointPosition.x, endpointPosition.y);
        const end = new avoid.ConnEnd(libavoidPoint);
        release(libavoidPoint);
        return end;
      };
      const connections = edges.map((edge) => {
        const sourceNode = nodes.get(edge.source)!,
          targetNode = nodes.get(edge.target)!,
          pins = endpointPins.get(edge.id)!;
        const source = endpoint(
            edge.source,
            edge.sourcePort,
            edge.source === edge.target
              ? { x: sourceNode.x + sourceNode.width, y: sourceNode.y + sourceNode.height / 3 }
              : projectedAnchor(sourceNode, pins.sourceSide, targetNode, pins.offset)
          ),
          target = endpoint(
            edge.target,
            edge.targetPort,
            edge.source === edge.target
              ? {
                  x: targetNode.x + targetNode.width,
                  y: targetNode.y + (targetNode.height * 2) / 3,
                }
              : projectedAnchor(targetNode, pins.targetSide, sourceNode, pins.offset)
          );
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
  return withBounds({
    nodes: layout.nodes,
    edges,
    bounds: layout.bounds,
  });
}

function withBounds(layout: GraphLayout): GraphLayout {
  const points = [
    ...layout.nodes.flatMap((node) => [
      { x: node.x, y: node.y },
      { x: node.x + node.width, y: node.y + node.height },
    ]),
    ...layout.edges.flatMap((edge) => edge.sections.flat()),
  ];
  const x = Math.min(...points.map((point) => point.x)),
    y = Math.min(...points.map((point) => point.y));
  return {
    nodes: layout.nodes,
    edges: layout.edges,
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
function opposite(side: GraphPort['side']): GraphPort['side'] {
  const oppositeSide: Record<GraphPort['side'], GraphPort['side']> = {
    NORTH: 'SOUTH',
    EAST: 'WEST',
    SOUTH: 'NORTH',
    WEST: 'EAST',
  };
  return oppositeSide[side];
}
function facingSides(
  source: GraphLayoutNode,
  target: GraphLayoutNode
): { source: GraphPort['side']; target: GraphPort['side'] } {
  const dx = target.x + target.width / 2 - (source.x + source.width / 2),
    dy = target.y + target.height / 2 - (source.y + source.height / 2),
    gapX = Math.max(source.x - (target.x + target.width), target.x - (source.x + source.width), 0),
    gapY = Math.max(
      source.y - (target.y + target.height),
      target.y - (source.y + source.height),
      0
    );
  const horizontal =
    gapY === 0 && gapX > 0
      ? true
      : gapX === 0 && gapY > 0
        ? false
        : gapX === 0 && gapY === 0
          ? Math.abs(dx) >= Math.abs(dy)
          : gapX <= gapY;
  const sourceSide: GraphPort['side'] = horizontal
    ? dx >= 0
      ? 'EAST'
      : 'WEST'
    : dy >= 0
      ? 'SOUTH'
      : 'NORTH';
  return { source: sourceSide, target: opposite(sourceSide) };
}
function projectedAnchor(
  node: GraphLayoutNode,
  side: GraphPort['side'],
  other: GraphLayoutNode,
  offset = 0
): GraphPoint {
  const inset = (size: number) => Math.min(8, size / 4);
  const clamp = (value: number, start: number, size: number) =>
    Math.max(start + inset(size), Math.min(start + size - inset(size), value));
  const overlap = (start: number, size: number, otherStart: number, otherSize: number) => {
    const low = Math.max(start, otherStart),
      high = Math.min(start + size, otherStart + otherSize);
    return low < high ? (low + high) / 2 + offset : undefined;
  };
  const centerX = other.x + other.width / 2,
    centerY = other.y + other.height / 2;
  switch (side) {
    case 'NORTH':
      return {
        x: clamp(
          overlap(node.x, node.width, other.x, other.width) ?? centerX + offset,
          node.x,
          node.width
        ),
        y: node.y,
      };
    case 'EAST':
      return {
        x: node.x + node.width,
        y: clamp(
          overlap(node.y, node.height, other.y, other.height) ?? centerY + offset,
          node.y,
          node.height
        ),
      };
    case 'SOUTH':
      return {
        x: clamp(
          overlap(node.x, node.width, other.x, other.width) ?? centerX + offset,
          node.x,
          node.width
        ),
        y: node.y + node.height,
      };
    case 'WEST':
      return {
        x: node.x,
        y: clamp(
          overlap(node.y, node.height, other.y, other.height) ?? centerY + offset,
          node.y,
          node.height
        ),
      };
  }
}
