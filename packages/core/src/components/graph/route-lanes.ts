import type { GraphLayout, GraphLayoutEdge, GraphLayoutNode, GraphPoint } from './types';

type Segment = {
  edge: GraphLayoutEdge;
  path: readonly GraphPoint[];
  index: number;
  horizontal: boolean;
};
const epsilon = 1e-5;
const laneGap = 8;
// Dense fixed corridors can compress the preferred spacing down to the route stroke.
const minimumLaneGap = 1.5;
const fixedAxis = (s: Segment) => (s.horizontal ? 'y' : 'x');
const travelAxis = (s: Segment) => (s.horizontal ? 'x' : 'y');
const coordinate = (s: Segment) => s.path[s.index]![fixedAxis(s)];
const sharedSpan = (a: Segment, b: Segment) => {
  const axis = travelAxis(a);
  return (
    Math.min(
      Math.max(a.path[a.index]![axis], a.path[a.index + 1]![axis]),
      Math.max(b.path[b.index]![axis], b.path[b.index + 1]![axis])
    ) -
    Math.max(
      Math.min(a.path[a.index]![axis], a.path[a.index + 1]![axis]),
      Math.min(b.path[b.index]![axis], b.path[b.index + 1]![axis])
    )
  );
};

/** Separate shared tracks across the independently opaque compound routing scopes. */
export function separateRouteLanes(
  layout: GraphLayout,
  obstacles: ReadonlyMap<string, readonly GraphLayoutNode[]>,
  clearance: number,
  inset: number
): void {
  const nodes = new Map(layout.nodes.map((node) => [node.id, node]));
  const collectSegments = (): Segment[] =>
    layout.edges.flatMap((edge) =>
      edge.sections.flatMap((path) =>
        path
          .slice(1)
          .map((point, index) => ({ edge, path, index, horizontal: point.y === path[index]!.y }))
      )
    );
  let segments = collectSegments();
  const onBorder = (
    point: GraphPoint,
    original: GraphPoint,
    node: GraphLayoutNode,
    port?: string
  ) => {
    if (point.x === original.x && point.y === original.y) return true;
    if (port) return false;
    const horizontal =
      Math.abs(original.y - node.y) < epsilon ||
      Math.abs(original.y - node.y - node.height) < epsilon;
    const axis = horizontal ? 'x' : 'y',
      fixed = horizontal ? 'y' : 'x';
    const size = horizontal ? node.width : node.height;
    const padding = Math.min(inset, size / 4);
    return (
      point[fixed] === original[fixed] &&
      point[axis] >= node[axis] + padding - epsilon &&
      point[axis] <= node[axis] + size - padding + epsilon
    );
  };
  const move = (segment: Segment, next: number) => {
    const { path, index, edge } = segment,
      fixed = fixedAxis(segment);
    const original = path.map((point) => ({ ...point }));
    path[index]![fixed] = next;
    path[index + 1]![fixed] = next;
    let valid =
      onBorder(
        path[0]!,
        original[0]!,
        nodes.get(edge.source)!,
        edge.source === edge.target ? 'loop' : edge.sourcePort
      ) &&
      onBorder(
        path.at(-1)!,
        original.at(-1)!,
        nodes.get(edge.target)!,
        edge.source === edge.target ? 'loop' : edge.targetPort
      );
    for (let i = Math.max(0, index - 1); valid && i <= Math.min(path.length - 2, index + 1); i++) {
      const a = path[i]!,
        b = path[i + 1]!,
        oldA = original[i]!,
        oldB = original[i + 1]!;
      const axis = oldA.x === oldB.x ? 'y' : 'x';
      const distance = Math.abs(b[axis] - a[axis]);
      const minimum =
        i === 0 || i === path.length - 2
          ? Math.min(clearance, Math.abs(oldB[axis] - oldA[axis]))
          : epsilon;
      if ((b[axis] - a[axis]) * (oldB[axis] - oldA[axis]) <= 0 || distance < minimum - epsilon) {
        valid = false;
        break;
      }
      for (const node of obstacles.get(edge.id)!) {
        if (
          (i === 0 && node.id === edge.source) ||
          (i === path.length - 2 && node.id === edge.target)
        )
          continue;
        if (
          Math.max(a.x, b.x) > node.x - clearance + epsilon &&
          Math.min(a.x, b.x) < node.x + node.width + clearance - epsilon &&
          Math.max(a.y, b.y) > node.y - clearance + epsilon &&
          Math.min(a.y, b.y) < node.y + node.height + clearance - epsilon
        ) {
          valid = false;
          break;
        }
      }
      if (!valid) break;
      const changed: Segment = { ...segment, index: i, horizontal: a.y === b.y };
      for (const other of segments) {
        if (other.edge.id === edge.id || other.horizontal !== changed.horizontal) continue;
        const span = sharedSpan(changed, other);
        if (
          span <= epsilon ||
          Math.abs(coordinate(changed) - coordinate(other)) >= minimumLaneGap - epsilon
        )
          continue;
        // Existing neighboring conflicts are resolved independently. A move may
        // neither introduce a new collision nor shorten an existing lane gap.
        const previous: Segment = { ...changed, path: original };
        if (
          i === index ||
          sharedSpan(previous, other) <= epsilon ||
          Math.abs(coordinate(previous) - coordinate(other)) >
            Math.abs(coordinate(changed) - coordinate(other)) + epsilon
        ) {
          valid = false;
          break;
        }
      }
    }
    if (!valid) for (let i = 0; i < path.length; i++) Object.assign(path[i]!, original[i]);
    return valid;
  };
  const detour = (segment: Segment): boolean => {
    const { edge, path, index } = segment;
    if (edge.source === edge.target) return false;
    const axis = travelAxis(segment),
      fixed = fixedAxis(segment);
    const a = path[index]!,
      b = path[index + 1]!;
    const low = Math.min(a[axis], b[axis]),
      high = Math.max(a[axis], b[axis]);
    const splits = new Set<number>([(low + high) / 2]);
    const nearbyObstacles = obstacles
      .get(edge.id)!
      .filter(
        (node) =>
          node[fixed] - clearance <= a[fixed] + 2 * laneGap &&
          node[fixed] + (segment.horizontal ? node.height : node.width) + clearance >=
            a[fixed] - 2 * laneGap
      );
    const nearbySegments = segments.filter((other) => {
      const p = other.path[other.index]!,
        q = other.path[other.index + 1]!;
      return (
        Math.min(p[fixed], q[fixed]) <= a[fixed] + 2 * laneGap &&
        Math.max(p[fixed], q[fixed]) >= a[fixed] - 2 * laneGap
      );
    });
    for (const node of nearbyObstacles) {
      const size = segment.horizontal ? node.width : node.height;
      splits.add(node[axis] - clearance - laneGap);
      splits.add(node[axis] + size + clearance + laneGap);
    }
    for (const other of nearbySegments)
      if (other.horizontal !== segment.horizontal) {
        splits.add(coordinate(other) - laneGap);
        splits.add(coordinate(other) + laneGap);
      }
    const offsetSet = new Set([
      -laneGap,
      laneGap,
      -2 * laneGap,
      2 * laneGap,
      -minimumLaneGap,
      minimumLaneGap,
    ]);
    for (const other of nearbySegments)
      if (other.horizontal === segment.horizontal) {
        const delta = coordinate(other) - a[fixed];
        offsetSet.add(delta - minimumLaneGap);
        offsetSet.add(delta + minimumLaneGap);
      }
    const offsets = [...offsetSet]
      .filter(
        (value) => Math.abs(value) >= minimumLaneGap - epsilon && Math.abs(value) <= 2 * laneGap
      )
      .sort((a, b) => Math.abs(a) - Math.abs(b));
    const tested = new Map<string, boolean>();
    const validPart = (p: GraphPoint, q: GraphPoint, first: boolean, last: boolean): boolean => {
      const key = JSON.stringify([p.x, p.y, q.x, q.y, first, last]);
      const known = tested.get(key);
      if (known !== undefined) return known;
      const check = () => {
        if ((p.x === q.x) === (p.y === q.y)) return false;
        if (first || last) {
          const oldA = first ? path[0]! : path.at(-2)!,
            oldB = first ? path[1]! : path.at(-1)!;
          const along = oldA.x === oldB.x ? 'y' : 'x';
          if (
            (q[along] - p[along]) * (oldB[along] - oldA[along]) <= 0 ||
            Math.abs(q[along] - p[along]) <
              Math.min(clearance, Math.abs(oldB[along] - oldA[along])) - epsilon
          )
            return false;
        }
        for (const node of obstacles.get(edge.id)!) {
          if ((first && node.id === edge.source) || (last && node.id === edge.target)) continue;
          if (
            Math.max(p.x, q.x) > node.x - clearance + epsilon &&
            Math.min(p.x, q.x) < node.x + node.width + clearance - epsilon &&
            Math.max(p.y, q.y) > node.y - clearance + epsilon &&
            Math.min(p.y, q.y) < node.y + node.height + clearance - epsilon
          )
            return false;
        }
        const changed: Segment = { edge, path: [p, q], index: 0, horizontal: p.y === q.y };
        return !segments.some(
          (other) =>
            other.edge.id !== edge.id &&
            other.horizontal === changed.horizontal &&
            Math.abs(coordinate(changed) - coordinate(other)) < minimumLaneGap - epsilon &&
            sharedSpan(changed, other) > epsilon
        );
      };
      const result = check();
      tested.set(key, result);
      return result;
    };
    for (const split of [...splits]
      .filter((value) => value > low + laneGap && value < high - laneGap)
      .sort((x, y) => Math.abs(x - (low + high) / 2) - Math.abs(y - (low + high) / 2))) {
      for (const first of offsets)
        for (const second of offsets) {
          if (first === second) continue;
          const start = { ...a, [fixed]: a[fixed] + first };
          const end = { ...b, [fixed]: b[fixed] + second };
          const next = [
            ...path.slice(0, index),
            start,
            { ...start, [axis]: split },
            { ...end, [axis]: split },
            end,
            ...path.slice(index + 2),
          ];
          if (
            !onBorder(
              next[0]!,
              path[0]!,
              nodes.get(edge.source)!,
              edge.source === edge.target ? 'loop' : edge.sourcePort
            ) ||
            !onBorder(
              next.at(-1)!,
              path.at(-1)!,
              nodes.get(edge.target)!,
              edge.source === edge.target ? 'loop' : edge.targetPort
            )
          )
            continue;
          let valid = true;
          for (
            let i = Math.max(0, index - 1);
            valid && i <= Math.min(next.length - 2, index + 3);
            i++
          )
            valid = validPart(next[i]!, next[i + 1]!, i === 0, i === next.length - 2);
          if (valid) {
            edge.sections = edge.sections.map((section) => (section === path ? next : section));
            segments = collectSegments();
            return true;
          }
        }
    }
    return false;
  };
  for (let pass = 0; pass < segments.length; pass++) {
    let changed = false,
      shared = false;
    scan: for (let i = 0; i < segments.length; i++)
      for (let j = i + 1; j < segments.length; j++) {
        const a = segments[i]!,
          b = segments[j]!;
        if (
          a.edge.id === b.edge.id ||
          a.horizontal !== b.horizontal ||
          Math.abs(coordinate(a) - coordinate(b)) > epsilon ||
          sharedSpan(a, b) <= epsilon
        )
          continue;
        shared = true;
        let separated = false;
        for (const segment of [b, a]) {
          const start = coordinate(segment);
          const candidates = new Set<number>();
          for (const other of segments)
            if (other.horizontal === segment.horizontal && sharedSpan(segment, other) > epsilon) {
              candidates.add(coordinate(other) - laneGap);
              candidates.add(coordinate(other) + laneGap);
              candidates.add(coordinate(other) - minimumLaneGap);
              candidates.add(coordinate(other) + minimumLaneGap);
            }
          const moved = [...candidates]
            .sort((a, b) => {
              const cost = (value: number) =>
                Math.abs(value - start) +
                (Math.abs(value - start) < laneGap - epsilon ? laneGap : 0);
              return cost(a) - cost(b) || a - b;
            })
            .some((next) => move(segment, next));
          if (moved) {
            changed = true;
            separated = true;
            break;
          }
        }
        if (!separated && (detour(b) || detour(a))) {
          changed = true;
          break scan;
        }
      }
    if (!shared || !changed) break;
  }
  // Exact caller-owned ports (including loop pins) can deliberately share a
  // terminal. Automatic routes must never silently return an ambiguous track.
  for (let i = 0; i < segments.length; i++)
    for (const b of segments.slice(i + 1)) {
      const a = segments[i]!;
      if (
        a.edge.id === b.edge.id ||
        a.horizontal !== b.horizontal ||
        Math.abs(coordinate(a) - coordinate(b)) > epsilon ||
        sharedSpan(a, b) <= epsilon
      )
        continue;
      const constrained = (s: Segment) =>
        s.edge.sourcePort || s.edge.targetPort || s.edge.source === s.edge.target;
      if (!constrained(a) && !constrained(b))
        throw new Error(
          `Graph edges cannot be separated within fixed geometry: ${a.edge.id}, ${b.edge.id}`
        );
    }
}
