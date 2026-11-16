import { describe, expect, it } from 'vitest';
import { createGraphLayoutTransition } from '../src/components/graph/layout-motion';
import type { GraphLayout } from '../src/components/graph/types';

const before: GraphLayout = {
  nodes: [
    { id: 'a', label: 'A', x: 0, y: 0, width: 100, height: 80 },
    { id: 'b', label: 'B', x: 200, y: 0, width: 100, height: 80 },
  ],
  edges: [
    {
      id: 'ab',
      label: 'Call',
      source: 'a',
      target: 'b',
      sections: [
        [
          { x: 100, y: 40 },
          { x: 200, y: 40 },
        ],
      ],
    },
  ],
  bounds: { x: 0, y: 0, width: 300, height: 80 },
};
const after: GraphLayout = {
  nodes: [
    { ...before.nodes[0]!, width: 240, height: 200 },
    { ...before.nodes[1]!, x: 400, y: 150 },
  ],
  edges: [
    {
      ...before.edges[0]!,
      sections: [
        [
          { x: 240, y: 100 },
          { x: 320, y: 100 },
          { x: 320, y: 190 },
          { x: 400, y: 190 },
        ],
      ],
    },
  ],
  bounds: { x: 0, y: 0, width: 500, height: 250 },
};
describe('graph layout presentation', () => {
  it('keeps both endpoints attached when routing point counts change and settles to the exact authoritative layout', () => {
    const original = structuredClone(before),
      sample = createGraphLayoutTransition(before, after);
    for (const t of [0, 0.1, 0.4, 0.8, 1]) {
      const value = sample(t),
        [a, b] = value.nodes;
      const points = value.edges[0]!.sections[0]!;
      expect(points[0]!.x).toBeCloseTo(a!.x + a!.width);
      expect(points.at(-1)!.x).toBeCloseTo(b!.x);
      expect(points[0]!.y).toBeCloseTo(a!.y + a!.height / 2);
      expect(points.at(-1)!.y).toBeCloseTo(b!.y + b!.height / 2);
    }
    expect(sample(1)).toBe(after);
    expect(before).toEqual(original);
  });
  it('retargets from the actual interrupted frame without position or opacity jumps', () => {
    const midway = createGraphLayoutTransition(before, after)(0.43);
    const reverse = createGraphLayoutTransition(midway, before);
    expect(reverse(0).nodes).toEqual(midway.nodes);
    expect(reverse(1)).toBe(before);
  });
  it('introduces children near their parent without scaling text or mutating target geometry', () => {
    const expanded = {
      ...after,
      nodes: [
        ...after.nodes,
        { id: 'child', label: 'Child', parentId: 'a', x: 20, y: 60, width: 160, height: 100 },
      ],
    };
    const sample = createGraphLayoutTransition(before, expanded);
    expect(sample(0).nodes.at(-1)).toMatchObject({ width: 160, height: 100, opacity: 0 });
    expect(sample(0.5).nodes.at(-1)?.opacity).toBe(0.5);
    expect(sample(1)).toBe(expanded);
  });
  it('attaches a newly routed child edge to its entering node from the first frame', () => {
    const child = {
      id: 'child',
      label: 'Child',
      parentId: 'a',
      x: 20,
      y: 60,
      width: 160,
      height: 100,
    };
    const target = {
      ...after,
      nodes: [...after.nodes, child],
      edges: [
        {
          id: 'new',
          label: 'New',
          source: 'child',
          target: 'b',
          sections: [
            [
              { x: 180, y: 110 },
              { x: 400, y: 190 },
            ],
          ],
        },
      ],
    };
    const sample = createGraphLayoutTransition(before, target);
    for (const t of [0, 0.2, 0.6, 1]) {
      const value = sample(t),
        entered = value.nodes.find((node) => node.id === 'child')!;
      const route = value.edges[0]!.sections[0]!;
      expect(route[0]!.x).toBeCloseTo(entered.x + entered.width);
      expect(route[0]!.y).toBeCloseTo(entered.y + entered.height / 2);
    }
  });
});
