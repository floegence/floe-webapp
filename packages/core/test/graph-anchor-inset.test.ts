import ELK from 'elkjs/lib/elk.bundled.js';
import { computeGraphLayout } from '../src/components/graph/layout';
import { computeGraphRoutes } from '../src/components/graph/layout';
import type { GraphInput, GraphLayoutOptions } from '../src/components/graph/types';
import { expect, it } from 'vitest';
import { routeGraphGeometry } from '../src/components/graph/routing';
import layered from './fixtures/layered-border-geometry.json';
import type { GraphLayout, GraphPoint } from '../src/components/graph/types';

const distance = (a: GraphPoint, b: GraphPoint) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
it.each([0, 1, 2, 3])(
  'keeps automatic anchors clear of rounded corners after %s rotations',
  async (rotation) => {
    const input = structuredClone(layered) as GraphLayout;
    for (let i = 0; i < rotation; i++)
      for (const n of input.nodes) {
        const { x, y, width, height } = n;
        Object.assign(n, { x: -y - height, y: x, width: height, height: width });
      }
    const result = await routeGraphGeometry(input, { edgeAnchorInset: 24 });
    expect(result.nodes).toEqual(input.nodes);
    for (const edge of result.edges) {
      for (const [id, point] of [
        [edge.source, edge.sections[0]![0]!],
        [edge.target, edge.sections[0]!.at(-1)!],
      ] as const) {
        const n = result.nodes.find((n) => n.id === id)!;
        const corners = [
          { x: n.x, y: n.y },
          { x: n.x + n.width, y: n.y },
          { x: n.x, y: n.y + n.height },
          { x: n.x + n.width, y: n.y + n.height },
        ];
        expect(
          Math.min(...corners.map((corner) => distance(corner, point))),
          edge.id
        ).toBeGreaterThanOrEqual(
          Math.min(24, (point.x === n.x || point.x === n.x + n.width ? n.height : n.width) / 4) -
            1e-5
        );
      }
    }
    expect(await routeGraphGeometry(input, { edgeAnchorInset: 24 })).toEqual(result);
  }
);
it.each([-1, Infinity, NaN])(
  'rejects invalid anchor inset %s before routing',
  async (edgeAnchorInset) => {
    await expect(
      routeGraphGeometry(
        { nodes: [], edges: [], bounds: { x: 0, y: 0, width: 0, height: 0 } },
        { edgeAnchorInset }
      )
    ).rejects.toThrow('Graph edge anchor inset must be finite and nonnegative');
  }
);

it.each([
  {},
  { aspectRatio: 1.6 },
  { positionMode: 'compact' },
  { positionMode: 'preferred' },
  { positionMode: 'fixed' },
])('retains corner-safe anchors through layout and route-only operations: %j', async (options) => {
  const graph: GraphInput = {
    nodes: [
      { id: 'a', label: 'A', width: 280, height: 180 },
      { id: 'b', label: 'B', width: 280, height: 180 },
    ],
    edges: [{ id: 'ab', source: 'a', target: 'b', label: '' }],
  };
  const settings: GraphLayoutOptions = {
    ...(options as GraphLayoutOptions),
    spacing: 64,
    edgeClearance: 24,
    edgeAnchorInset: 24,
    ...(options.positionMode
      ? {
          positions: [
            { nodeId: 'a', x: 0, y: 0 },
            { nodeId: 'b', x: 344, y: 244 },
          ],
        }
      : {}),
  };
  const result = await computeGraphLayout(graph, settings, new ELK());
  const routed = await computeGraphRoutes(result, graph.edges, settings);
  for (const edge of [...result.edges, ...routed]) {
    const path = edge.sections[0]!;
    for (const [id, point, next] of [
      [edge.source, path[0]!, path[1]!],
      [edge.target, path.at(-1)!, path.at(-2)!],
    ] as const) {
      const n = result.nodes.find((n) => n.id === id)!;
      const corners = [
        { x: n.x, y: n.y },
        { x: n.x + n.width, y: n.y },
        { x: n.x, y: n.y + n.height },
        { x: n.x + n.width, y: n.y + n.height },
      ];
      expect(Math.min(...corners.map((c) => distance(c, point)))).toBeGreaterThanOrEqual(24 - 1e-5);
      expect(distance(point, next)).toBeGreaterThanOrEqual(24 - 1e-5);
    }
  }
});
it('preserves exact named ports and scales the inset for tiny cards', async () => {
  const graph: GraphInput = {
    nodes: [
      { id: 'a', label: 'A', width: 10, height: 8, ports: [{ id: 'out', side: 'WEST' }] },
      { id: 'b', label: 'B', width: 10, height: 8, ports: [{ id: 'in', side: 'WEST' }] },
    ],
    edges: [{ id: 'ab', source: 'a', target: 'b', sourcePort: 'out', targetPort: 'in', label: '' }],
  };
  const result = await computeGraphLayout(
    graph,
    { edgeAnchorInset: 24, edgeClearance: 24 },
    new ELK()
  );
  const path = result.edges[0]!.sections[0]!;
  expect(path[0]).toEqual({ x: result.nodes[0]!.x, y: result.nodes[0]!.y + 4 });
  expect(path.at(-1)).toEqual({ x: result.nodes[1]!.x, y: result.nodes[1]!.y + 4 });
});
it.each([-1, Infinity, NaN])(
  'rejects invalid inset %s before ELK runs',
  async (edgeAnchorInset) => {
    let called = false;
    await expect(
      computeGraphLayout(
        { nodes: [], edges: [] },
        { edgeAnchorInset },
        {
          layout: () => {
            called = true;
            throw new Error('Unexpected ELK call');
          },
        }
      )
    ).rejects.toThrow('Graph edge anchor inset must be finite and nonnegative');
    expect(called).toBe(false);
  }
);
