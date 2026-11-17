import { expect, it } from 'vitest';
import ELK from 'elkjs/lib/elk.bundled.js';
import { computeGraphLayout } from '../src/components/graph/layout';
import type { GraphInput, GraphLayoutOptions } from '../src/components/graph/types';

it.each(['x', 'y'] as const)(
  'compresses empty %s bands without rotating or reversing the spatial map',
  async (axis) => {
    const graph: GraphInput = {
      nodes: ['first', 'second', 'last'].map((id) => ({ id, label: id, width: 180, height: 100 })),
      edges: [{ id: 'reverse', label: '', source: 'last', target: 'first' }],
    };
    for (const sign of [-1, 1]) {
      const positions = graph.nodes.map((node, index) => ({
        nodeId: node.id,
        x: -200,
        y: -100,
        [axis]: sign * index * 2000,
      }));
      const options = {
        positions,
        positionMode: 'compressed',
        spacing: 64,
        aspectRatio: 1.6,
        routing: 'none',
      } as GraphLayoutOptions;
      const original = JSON.stringify({ graph, options });
      const result = await computeGraphLayout(graph, options, new ELK());
      const ordered = graph.nodes.map((node) =>
        result.nodes.find((value) => value.id === node.id)!
      );
      for (let i = 1; i < ordered.length; i++) {
        expect(sign * (ordered[i]![axis] - ordered[i - 1]![axis])).toBe(axis === 'x' ? 244 : 164);
        expect(ordered[i]![axis === 'x' ? 'y' : 'x']).toBe(ordered[0]![axis === 'x' ? 'y' : 'x']);
      }
      expect(result.edges).toHaveLength(1);
      expect(result.edges[0]!.sections).toEqual([]);
      expect(JSON.stringify({ graph, options })).toBe(original);
    }
  }
);

it('compresses complete sibling subtrees and retains containment and routing', async () => {
  const graph: GraphInput = {
    nodes: [
      { id: 'group', label: '', kind: 'group', width: 200, height: 100 },
      { id: 'a', label: '', parentId: 'group', width: 100, height: 80 },
      { id: 'b', label: '', parentId: 'group', width: 100, height: 80 },
      { id: 'outside', label: '', width: 100, height: 80 },
    ],
    edges: [{ id: 'edge', label: '', source: 'a', target: 'outside' }],
  };
  const positions = [
    { nodeId: 'a', x: 100, y: 100 },
    { nodeId: 'b', x: 100, y: 1800 },
    { nodeId: 'outside', x: 100, y: 5000 },
  ];
  const result = await computeGraphLayout(
    graph,
    { positions, positionMode: 'compressed', spacing: 64, aspectRatio: 1.6 },
    new ELK()
  );
  const get = (id: string) => result.nodes.find((node) => node.id === id)!;
  expect(get('b').y - get('a').y).toBe(144);
  expect(get('outside').y - get('group').y - get('group').height).toBe(64);
  expect(get('group').height).toBeLessThan(400);
  for (const id of ['a', 'b']) {
    expect(get(id).x).toBeGreaterThan(get('group').x);
    expect(get(id).y).toBeGreaterThan(get('group').y);
    expect(get(id).y + get(id).height).toBeLessThan(get('group').y + get('group').height);
  }
  expect(result.edges[0]!.sections.flat().length).toBeGreaterThan(1);
});
