import { expect, it } from 'vitest';
import { routeGraphGeometry } from '../src/components/graph/routing';
import type { GraphLayout } from '../src/components/graph/types';
import layered from './fixtures/layered-border-geometry.json';

function overlaps(layout: GraphLayout) {
  const segments = layout.edges.flatMap((edge) =>
    edge.sections.flatMap((path) => path.slice(1).map((b, i) => ({ a: path[i]!, b, id: edge.id })))
  );
  const shared: unknown[] = [];
  for (let i = 0; i < segments.length; i++)
    for (const b of segments.slice(i + 1)) {
      const a = segments[i]!;
      if (a.id === b.id) continue;
      const horizontal = a.a.y === a.b.y;
      if (horizontal !== (b.a.y === b.b.y)) continue;
      const fixed = horizontal ? 'y' : 'x',
        axis = horizontal ? 'x' : 'y';
      if (Math.abs(a.a[fixed] - b.a[fixed]) > 0.01) continue;
      const overlap =
        Math.min(Math.max(a.a[axis], a.b[axis]), Math.max(b.a[axis], b.b[axis])) -
        Math.max(Math.min(a.a[axis], a.b[axis]), Math.min(b.a[axis], b.b[axis]));
      if (overlap > 0.01) shared.push({ a, b, overlap });
    }
  return shared;
}
const fanIn = (): GraphLayout => ({
  nodes: [
    { id: 'api', x: 0, y: 0, width: 320, height: 190 },
    { id: 'store', x: 0, y: 254, width: 1000, height: 320, kind: 'group' as const },
    { id: 'control', x: 0, y: 638, width: 320, height: 190 },
    { id: 'addons', x: 0, y: 892, width: 320, height: 190 },
    { id: 'workers', x: 0, y: 1146, width: 320, height: 190 },
  ].map((n) => ({ ...n, label: n.id })),
  edges: [
    ['api', 'store'],
    ['control', 'api'],
    ['addons', 'api'],
    ['workers', 'api'],
    ['api', 'control'],
  ].map(([source, target], i) => ({
    id: `edge-${i}`,
    source: source!,
    target: target!,
    label: '',
    sections: [],
  })),
  bounds: { x: 0, y: 0, width: 1000, height: 1336 },
});
it.each([0, 1, 2, 3])(
  'separates all fan-in and reverse approach segments with inset after %s rotations',
  async (turns) => {
    const input = fanIn();
    for (let i = 0; i < turns; i++)
      for (const n of input.nodes) {
        const { x, y, width, height } = n;
        Object.assign(n, { x: -y - height, y: x, width: height, height: width });
      }
    const output = await routeGraphGeometry(input, { edgeAnchorInset: 24, edgeClearance: 24 });
    expect(output.nodes).toEqual(input.nodes);
    expect(output.edges).toHaveLength(input.edges.length);
    expect(overlaps(output)).toEqual([]);
  }
);
it.each([{}, { edgeAnchorInset: 24, edgeClearance: 24 }])(
  'separates complete routes in layered geometry: %j',
  async (options) => {
    const output = await routeGraphGeometry(structuredClone(layered) as GraphLayout, options);
    expect(overlaps(output)).toEqual([]);
  }
);
it.each([3, 8, 24])('allocates independent pins for %s parallel relations', async (count) => {
  const input = fanIn();
  input.nodes = [input.nodes[0]!, { ...input.nodes[1]!, width: 320 }];
  input.edges = Array.from({ length: count }, (_, i) => ({
    id: `parallel-${i}`,
    source: i % 2 ? 'api' : 'store',
    target: i % 2 ? 'store' : 'api',
    label: '',
    sections: [],
  }));
  const output = await routeGraphGeometry(input, { edgeAnchorInset: 24, edgeClearance: 24 });
  expect(output.edges).toHaveLength(count);
  expect(overlaps(output)).toEqual([]);
  expect(await routeGraphGeometry(input, { edgeAnchorInset: 24, edgeClearance: 24 })).toEqual(
    output
  );
  for (const edge of output.edges) {
    const path = edge.sections[0]!;
    for (const [a, b] of [
      [path[0]!, path[1]!],
      [path.at(-1)!, path.at(-2)!],
    ])
      expect(Math.abs(a!.x - b!.x) + Math.abs(a!.y - b!.y)).toBeGreaterThanOrEqual(24 - 1e-5);
  }
});
it.each(['mixed', 'collapsed', 'expanded'])(
  'separates all routes in the %s control-plane geometry',
  async (state) => {
    const { default: input } = await import(`./fixtures/lane-${state}-geometry.json`);
    const output = await routeGraphGeometry(input, { edgeAnchorInset: 24, edgeClearance: 24 });
    expect(overlaps(output)).toEqual([]);
    expect(await routeGraphGeometry(input, { edgeAnchorInset: 24, edgeClearance: 24 })).toEqual(
      output
    );
    for (const edge of output.edges) {
      const path = edge.sections[0]!;
      for (const [a, b] of [
        [path[0]!, path[1]!],
        [path.at(-1)!, path.at(-2)!],
      ])
        expect(Math.abs(a!.x - b!.x) + Math.abs(a!.y - b!.y)).toBeGreaterThanOrEqual(24 - 1e-5);
    }
  }
);
it('uses a clear elbow between obstacles when a straight lane cannot move as a whole', async () => {
  const { separateRouteLanes } = await import('../src/components/graph/route-lanes');
  const nodes = [
    { id: 'source', x: -100, y: 20, width: 60, height: 80 },
    { id: 'target', x: 550, y: 200, width: 80, height: 80 },
    { id: 'lower', x: 0, y: 148, width: 200, height: 120 },
    { id: 'upper', x: 300, y: 0, width: 200, height: 140 },
  ].map((node) => ({ ...node, label: node.id }));
  const input: GraphLayout = {
    nodes,
    bounds: { x: -100, y: 0, width: 730, height: 280 },
    edges: [0, 1, 2].map((i) => ({
      id: `lane-${i}`,
      source: 'source',
      target: 'target',
      label: '',
      sections: [
        [
          { x: -90 + 15 * i, y: 100 },
          { x: -90 + 15 * i, y: 144 },
          { x: 560 + 15 * i, y: 144 },
          { x: 560 + 15 * i, y: 200 },
        ],
      ],
    })),
  };
  separateRouteLanes(input, new Map(input.edges.map((edge) => [edge.id, nodes])), 4, 8);
  expect(overlaps(input)).toEqual([]);
  expect(input.edges.some((edge) => edge.sections[0]!.length > 4)).toBe(true);
  for (const edge of input.edges)
    for (const path of edge.sections)
      for (let i = 1; i < path.length; i++) {
        const a = path[i - 1]!,
          b = path[i]!;
        expect(a.x === b.x || a.y === b.y).toBe(true);
        for (const n of nodes.slice(2))
          expect(
            Math.max(a.x, b.x) <= n.x - 4 ||
              Math.min(a.x, b.x) >= n.x + n.width + 4 ||
              Math.max(a.y, b.y) <= n.y - 4 ||
              Math.min(a.y, b.y) >= n.y + n.height + 4
          ).toBe(true);
      }
});
