import { describe, expect, it } from 'vitest';
import ELK from 'elkjs/lib/elk.bundled.js';
import { computeGraphLayout as compute } from '../src/components/graph/layout';
import { fitGraphViewport, graphRelatedEdges } from '../src/components/graph/geometry';
import type { GraphInput, GraphLayoutOptions } from '../src/components/graph/types';

const computeGraphLayout = (input: GraphInput, options: GraphLayoutOptions = {}) =>
  compute(input, options, new ELK());

const input: GraphInput = {
  nodes: [
    { id: 'group', label: 'Group', kind: 'group', width: 260, height: 80 },
    {
      id: 'a',
      label: 'Node A',
      parentId: 'group',
      width: 220,
      height: 120,
      ports: [{ id: 'http', side: 'EAST' }],
    },
    { id: 'b', label: 'Node B', parentId: 'group', width: 220, height: 160 },
    { id: 'db', label: 'Database', width: 180, height: 110 },
  ],
  edges: [
    { id: 'ab', label: 'A calls B', source: 'a', target: 'b', sourcePort: 'http' },
    { id: 'ba', label: 'B calls A', source: 'b', target: 'a' },
    { id: 'read', label: 'B reads database', source: 'b', target: 'db' },
    { id: 'loop', label: 'Self relation', source: 'db', target: 'db' },
  ],
};

describe('graph layout contract', () => {
  it('routes cycles, self loops, and compound edges orthogonally with absolute geometry', async () => {
    const layout = await computeGraphLayout(input);
    const group = layout.nodes.find((n) => n.id === 'group')!;
    for (const child of layout.nodes.filter((n) => n.parentId === 'group')) {
      expect(child.x).toBeGreaterThan(group.x);
      expect(child.y).toBeGreaterThan(group.y);
      expect(child.x + child.width).toBeLessThan(group.x + group.width);
      expect(child.y + child.height).toBeLessThan(group.y + group.height);
    }
    for (const edge of layout.edges) {
      expect(edge.sections.length).toBeGreaterThan(0);
      for (const section of edge.sections) {
        for (let i = 1; i < section.length; i++) {
          expect(section[i]!.x === section[i - 1]!.x || section[i]!.y === section[i - 1]!.y).toBe(
            true
          );
        }
      }
      const source = layout.nodes.find((n) => n.id === edge.source)!;
      const target = layout.nodes.find((n) => n.id === edge.target)!;
      const start = edge.sections[0]![0]!;
      const end = edge.sections.at(-1)!.at(-1)!;
      for (const [point, node] of [
        [start, source],
        [end, target],
      ] as const) {
        expect(point.x).toBeGreaterThanOrEqual(node.x - 1);
        expect(point.x).toBeLessThanOrEqual(node.x + node.width + 1);
        expect(point.y).toBeGreaterThanOrEqual(node.y - 1);
        expect(point.y).toBeLessThanOrEqual(node.y + node.height + 1);
      }
    }
    expect([...graphRelatedEdges(layout, 'group')].sort()).toEqual(['ab', 'ba', 'read']);
  });

  it('retains the inspected node anchor when expansion changes layout dimensions', async () => {
    const before = await computeGraphLayout(input);
    const node = before.nodes.find((n) => n.id === 'b')!;
    const after = await computeGraphLayout(
      { ...input, nodes: input.nodes.map((n) => (n.id === 'a' ? { ...n, height: 400 } : n)) },
      { anchor: { nodeId: 'b', position: node } }
    );
    expect(after.nodes.find((n) => n.id === 'b')).toMatchObject({ x: node.x, y: node.y });
    const view = fitGraphViewport(after.bounds, { width: 1200, height: 800 });
    expect(after.bounds.x * view.scale + view.x).toBeGreaterThanOrEqual(47);
    expect(after.bounds.y * view.scale + view.y).toBeGreaterThanOrEqual(47);
  });

  it.each([
    { ...input, nodes: [...input.nodes, input.nodes[0]!] },
    { ...input, nodes: input.nodes.map((n) => (n.id === 'a' ? { ...n, parentId: 'missing' } : n)) },
    {
      ...input,
      nodes: input.nodes.map((n) => (n.id === 'group' ? { ...n, parentId: 'group' } : n)),
    },
    {
      ...input,
      edges: [
        { id: 'bad', label: 'Missing port', source: 'a', target: 'db', sourcePort: 'unknown' },
      ],
    },
    { ...input, nodes: input.nodes.map((n) => ({ ...n, width: NaN })) },
  ])('rejects malformed graphs before handing them to the layout engine', async (malformed) => {
    await expect(computeGraphLayout(malformed)).rejects.toThrow();
  });

  it('preserves every node in a large disconnected graph', async () => {
    const nodes = Array.from({ length: 500 }, (_, i) => ({
      id: `node-${i}`,
      label: `Node ${i}`,
      width: 220,
      height: 120,
    }));
    const result = await computeGraphLayout({ nodes, edges: [] });
    expect(result.nodes).toHaveLength(500);
    expect(new Set(result.nodes.map((n) => `${n.x},${n.y}`)).size).toBe(500);
  });
});
