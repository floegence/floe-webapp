import { AvoidLib } from 'libavoid-js';
import wasmUrl from 'libavoid-js/wasm?url&no-inline';
import type {
  GraphLayout,
  GraphLayoutNode,
  GraphLayoutOptions,
  GraphPoint,
  GraphPort,
} from './types';

let loaded: Promise<void> | undefined;
const directions = { NORTH: 1, SOUTH: 2, WEST: 4, EAST: 8 };
const sides = ['NORTH', 'EAST', 'SOUTH', 'WEST'] as const;
const release = (value: unknown) => (value as { delete(): void }).delete();

/** Joint orthogonal routing through the final rectangular geometry. */
export async function routeGraphGeometry(
  layout: GraphLayout,
  options: Pick<GraphLayoutOptions, 'edgeClearance'> = {}
): Promise<GraphLayout> {
  const clearance = options.edgeClearance ?? 4;
  if (!Number.isFinite(clearance) || clearance < 0)
    throw new Error('Graph edge clearance must be finite and nonnegative');
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
      router.setRoutingParameter(avoid.RoutingParameter.shapeBufferDistance, clearance);
      router.setRoutingParameter(avoid.RoutingParameter.idealNudgingDistance, 8);
      router.setRoutingParameter(avoid.RoutingParameter.crossingPenalty, 80);
      router.setRoutingParameter(avoid.RoutingParameter.fixedSharedPathPenalty, 120);
      router.setRoutingParameter(avoid.RoutingParameter.portDirectionPenalty, 0);
      // Automatic anchors may move along a border to separate shared lanes.
      // Constrained ports and loops retain their exact endpoint geometry.
      router.setRoutingOption(
        avoid.RoutingOption.nudgeOrthogonalSegmentsConnectedToShapes,
        !edges.some((edge) => edge.sourcePort || edge.targetPort || edge.source === edge.target)
      );
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
      const pairOrdinals = new Map<string, number>();
      const offsets = new Map<string, number>();
      for (const edge of edges) {
        const key = [edge.source, edge.target].sort().join('\u0000');
        const ordinal = pairOrdinals.get(key) ?? 0;
        pairOrdinals.set(key, ordinal + 1);
        offsets.set(edge.id, ordinal % 2 === 0 ? -6 : 6);
      }
      let nextPinClass = sides.length + 2;
      const borderPinClasses = new Map<string, number>();
      const fraction = (value: number, size: number) => Math.max(0, Math.min(1, value / size));
      for (const node of layout.nodes) {
        const shape = shapes.get(node.id);
        if (!shape) continue;
        const pin = (id: number, x: number, y: number, direction: number, exclusive: boolean) => {
          const value = new avoid.ShapeConnectionPin(
            shape,
            id,
            fraction(x, node.width),
            fraction(y, node.height),
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
          const pinClass = sides.indexOf(side) + 2;
          pin(pinClass, x - node.x, y - node.y, directions[side], false);
          borderPinClasses.set(
            JSON.stringify([
              node.id,
              fraction(x - node.x, node.width),
              fraction(y - node.y, node.height),
              side,
            ]),
            pinClass
          );
        }
      }
      const obstacles = layout.nodes.filter((node) => shapes.has(node.id));
      const endpoint = (
        node: GraphLayoutNode,
        other: GraphLayoutNode,
        portId: string | undefined,
        offset: number,
        selfPosition?: GraphPoint,
        parallel = false
      ) => {
        // Distant obstacles cannot improve a nearby border-to-border route.
        // Keep every shape in libavoid, but derive anchor candidates only from
        // the endpoint corridor; otherwise pin counts grow quadratically.
        const margin = clearance + 8;
        const corridor = {
          left: Math.min(node.x, other.x) - margin,
          right: Math.max(node.x + node.width, other.x + other.width) + margin,
          top: Math.min(node.y, other.y) - margin,
          bottom: Math.max(node.y + node.height, other.y + other.height) + margin,
        };
        const nearby = obstacles.filter(
          (obstacle) =>
            obstacle.x <= corridor.right &&
            obstacle.x + obstacle.width >= corridor.left &&
            obstacle.y <= corridor.bottom &&
            obstacle.y + obstacle.height >= corridor.top
        );
        const shape = shapes.get(node.id);
        if (shape && portId)
          return new avoid.ConnEnd(
            shape,
            sides.indexOf(node.ports!.find((port) => port.id === portId)!.side) + 2
          );
        const candidates = portId
          ? [
              {
                side: node.ports!.find((port) => port.id === portId)!.side,
                position: anchor(node, node.ports!.find((port) => port.id === portId)!.side),
              },
            ]
          : selfPosition
            ? [{ side: 'EAST' as const, position: selfPosition }]
            : (parallel ? [facingSides(node, other).source] : sides).flatMap((side) => {
                const projected = projectedAnchor(node, side, other, offset);
                if (parallel) return [{ side, position: projected }];
                const horizontal = side === 'NORTH' || side === 'SOUTH';
                const start = horizontal ? node.x : node.y,
                  size = horizontal ? node.width : node.height;
                const low = start + Math.min(8, size / 4),
                  high = start + size - Math.min(8, size / 4);
                const coordinates = [
                  horizontal ? projected.x : projected.y,
                  low,
                  high,
                  ...nearby
                    .flatMap((obstacle) => {
                      const a = horizontal ? obstacle.x : obstacle.y,
                        b = a + (horizontal ? obstacle.width : obstacle.height);
                      return [a - clearance, b + clearance, a - clearance - 8, b + clearance + 8];
                    })
                    .filter((value) => value >= low && value <= high),
                ];
                return [...new Set(coordinates)].map((value) => ({
                  side,
                  position: horizontal
                    ? { x: value, y: projected.y }
                    : { x: projected.x, y: value },
                }));
              });
        if (shape) {
          // Each connection chooses from its own peer-facing border candidates.
          const location = (side: GraphPort['side'], position: GraphPoint) =>
            JSON.stringify([
              node.id,
              fraction(position.x - node.x, node.width),
              fraction(position.y - node.y, node.height),
              side,
            ]);
          const limited = Boolean(portId || selfPosition || parallel);
          const existing =
            limited ||
            candidates.every((candidate) =>
              borderPinClasses.has(location(candidate.side, candidate.position))
            )
              ? borderPinClasses.get(location(candidates[0]!.side, candidates[0]!.position))
              : undefined;
          if (existing !== undefined) return new avoid.ConnEnd(shape, existing);
          const pinClass = existing ?? nextPinClass++;
          for (const { side, position } of candidates) {
            const key = location(side, position);
            if (borderPinClasses.has(key)) continue;
            borderPinClasses.set(key, pinClass);
            const x = position.x - node.x,
              y = position.y - node.y;
            const pin = new avoid.ShapeConnectionPin(
              shape,
              pinClass,
              fraction(x, node.width),
              fraction(y, node.height),
              true,
              0,
              directions[side]
            );
            pin.setExclusive(false);
            pin.setConnectionCost(
              node.width / 2 +
                node.height / 2 -
                Math.abs(x - node.width / 2) -
                Math.abs(y - node.height / 2)
            );
          }
          return new avoid.ConnEnd(shape, pinClass);
        }
        // A traversable ancestor border is a free endpoint. Keep the side
        // nearest to its contained peer, which approaches it from the interior.
        const side = facingSides(node, other).source;
        const position =
          candidates.find((candidate) => candidate.side === side)?.position ??
          candidates[0]!.position;
        const point = new avoid.Point(position.x, position.y);
        const end = new avoid.ConnEnd(point);
        release(point);
        return end;
      };
      // Register constrained lanes first so automatic candidates never duplicate
      // their physical pins under another class (libavoid cannot route those).
      const limited = (edge: (typeof edges)[number]) =>
        Number(
          Boolean(
            edge.sourcePort ||
            edge.targetPort ||
            edge.source === edge.target ||
            pairOrdinals.get([edge.source, edge.target].sort().join('\u0000'))! > 1
          )
        );
      const connections = [...edges]
        .sort((a, b) => limited(b) - limited(a))
        .map((edge) => {
          const sourceNode = nodes.get(edge.source)!,
            targetNode = nodes.get(edge.target)!;
          const self = edge.source === edge.target;
          const parallel = pairOrdinals.get([edge.source, edge.target].sort().join('\u0000'))! > 1;
          const source = endpoint(
            sourceNode,
            targetNode,
            edge.sourcePort,
            offsets.get(edge.id)!,
            self
              ? { x: sourceNode.x + sourceNode.width, y: sourceNode.y + sourceNode.height / 3 }
              : undefined,
            parallel
          );
          const target = endpoint(
            targetNode,
            sourceNode,
            edge.targetPort,
            offsets.get(edge.id)!,
            self
              ? {
                  x: targetNode.x + targetNode.width,
                  y: targetNode.y + (targetNode.height * 2) / 3,
                }
              : undefined,
            parallel
          );
          const connection = new avoid.ConnRef(router, source, target);
          release(source);
          release(target);
          if (self) {
            const checkpoints = new avoid.CheckpointVector();
            for (const y of [
              sourceNode.y + sourceNode.height / 3,
              sourceNode.y + (sourceNode.height * 2) / 3,
            ]) {
              const point = new avoid.Point(
                sourceNode.x + sourceNode.width + Math.max(24, clearance + 4),
                y
              );
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
function facingSides(
  source: GraphLayoutNode,
  target: GraphLayoutNode
): { source: GraphPort['side']; target: GraphPort['side'] } {
  const contains = (outer: GraphLayoutNode, inner: GraphLayoutNode) =>
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height;
  const outer = contains(source, target) ? source : contains(target, source) ? target : undefined;
  if (outer) {
    const inner = outer === source ? target : source;
    const distances = {
      NORTH: inner.y - outer.y,
      EAST: outer.x + outer.width - inner.x - inner.width,
      SOUTH: outer.y + outer.height - inner.y - inner.height,
      WEST: inner.x - outer.x,
    };
    const side = [...sides].sort((a, b) => distances[a] - distances[b])[0]!;
    return { source: side, target: side };
  }
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
  return { source: sourceSide, target: sides[(sides.indexOf(sourceSide) + 2) % 4]! };
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
