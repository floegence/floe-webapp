import { describe, expect, it } from 'vitest';
import ELK from 'elkjs/lib/elk.bundled.js';
import { computeGraphLayout } from '../src/components/graph/layout';
import type { GraphInput, GraphLayoutOptions } from '../src/components/graph/types';

const pool = (count = 3): GraphInput => ({
  nodes: [
    { id: 'pool', label: 'Pool', kind: 'group', width: 320, height: 108 },
    ...Array.from({ length: count }, (_, i) => ({
      id: `member-${i}`,
      label: `Member ${i}`,
      parentId: 'pool',
      width: 280,
      height: 177 + i * 10,
    })),
  ],
  edges: Array.from({ length: count }, (_, i) => ({
    id: `peer-${i}`,
    label: 'Peer',
    source: `member-${i}`,
    target: `member-${(i + 1) % count}`,
  })),
});
const compute = (input: GraphInput, options: GraphLayoutOptions) =>
  computeGraphLayout(input, options, new ELK());

describe('explicit group member layout', () => {
  for (const direction of ['RIGHT', 'DOWN', 'LEFT', 'UP'] as const) {
    it.each(['row', 'column'] as const)(
      'keeps %s members independent of ' + direction,
      async (flow) => {
        const result = await compute(pool(), {
          direction,
          groupLayouts: { pool: { flow } },
          spacing: 32,
        });
        const members = result.nodes.filter((n) => n.parentId === 'pool');
        expect(new Set(members.map((n) => (flow === 'row' ? n.y : n.x))).size).toBe(1);
        for (let i = 1; i < members.length; i++) {
          const before = members[i - 1]!,
            next = members[i]!;
          expect(flow === 'row' ? next.x - before.x : next.y - before.y).toBe(
            flow === 'row' ? before.width + 32 : before.height + 32
          );
        }
        expect(result.edges).toHaveLength(3);
        expect(
          result.edges.every(
            (e) =>
              e.sections.length &&
              e.sections.flat().every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
          )
        ).toBe(true);
        expect(
          await compute(pool(), { direction, groupLayouts: { pool: { flow } }, spacing: 32 })
        ).toEqual(result);
      }
    );
  }

  it.each(['row', 'column'] as const)(
    'wraps eight unequal members into 3 + 3 + 2 in %s flow',
    async (flow) => {
      const result = await compute(pool(8), {
        groupLayouts: { pool: { flow, maxPerLine: 3 } },
        spacing: 24,
      });
      const members = result.nodes.filter((n) => n.parentId === 'pool');
      const lines = new Map<number, number>();
      for (const n of members) {
        const cross = flow === 'row' ? n.y : n.x;
        lines.set(cross, (lines.get(cross) ?? 0) + 1);
      }
      expect([...lines.values()]).toEqual([3, 3, 2]);
      for (const a of members)
        for (const b of members.filter((n) => n !== a))
          expect(
            a.x + a.width <= b.x ||
              b.x + b.width <= a.x ||
              a.y + a.height <= b.y ||
              b.y + b.height <= a.y
          ).toBe(true);
    }
  );

  it.each(['preferred', 'compact'] as const)(
    'preserves authored order against conflicting %s coordinates',
    async (positionMode) => {
      const graph = pool();
      const options: GraphLayoutOptions = {
        positionMode,
        groupLayouts: { pool: { flow: 'row' } },
        positions: [
          { nodeId: 'pool', x: 1000, y: 1000 },
          ...[2, 1, 0].map((i) => ({ nodeId: `member-${i}`, x: 6000, y: i * -2000 })),
        ],
      };
      const result = await compute(graph, options);
      const members = result.nodes.filter((n) => n.parentId === 'pool');
      expect(members.map((n) => n.id)).toEqual(['member-0', 'member-1', 'member-2']);
      expect(new Set(members.map((n) => n.y)).size).toBe(1);
      expect(members[0]!.x).toBeLessThan(members[1]!.x);
      expect(members[1]!.x).toBeLessThan(members[2]!.x);
      if (positionMode === 'preferred')
        expect(result.nodes.find((n) => n.id === 'pool')).toMatchObject({ x: 1000, y: 1000 });
    }
  );

  it('packs nested groups as complete rectangles without inheriting the parent rule', async () => {
    const graph: GraphInput = {
      nodes: [
        { id: 'outer', label: '', kind: 'group', width: 100, height: 80 },
        { id: 'inner', label: '', kind: 'group', parentId: 'outer', width: 100, height: 80 },
        { id: 'a', label: '', parentId: 'inner', width: 100, height: 70 },
        { id: 'b', label: '', parentId: 'inner', width: 160, height: 120 },
        { id: 'other', label: '', parentId: 'outer', width: 80, height: 80 },
      ],
      edges: [{ id: 'ab', label: '', source: 'a', target: 'b' }],
    };
    const result = await compute(graph, {
      direction: 'DOWN',
      groupLayouts: { outer: { flow: 'row' } },
      spacing: 20,
    });
    const get = (id: string) => result.nodes.find((n) => n.id === id)!;
    expect(get('inner').y).toBe(get('other').y);
    expect(get('inner').x + get('inner').width + 20).toBe(get('other').x);
    expect(get('a').y + get('a').height).toBeLessThan(get('b').y);
  });

  it('keeps compact selection anchors and excludes hidden members from group bounds', async () => {
    const graph = pool();
    const options: GraphLayoutOptions = {
      groupLayouts: { pool: { flow: 'row' } },
      positionMode: 'compact',
    };
    const full = await compute(graph, options);
    const member = full.nodes.find((n) => n.id === 'member-0')!;
    const sparse = await compute(
      { nodes: graph.nodes.slice(0, 2), edges: [] },
      { ...options, anchor: { nodeId: member.id, position: member } }
    );
    expect(sparse.nodes.find((n) => n.id === member.id)).toMatchObject({
      x: member.x,
      y: member.y,
    });
    expect(sparse.nodes[0]!.width).toBeLessThan(full.nodes[0]!.width);
  });

  it('rejects invalid rules and fixed descendant coordinates', async () => {
    for (const rule of [
      { flow: 'invalid' },
      { flow: 'row', maxPerLine: 0 },
      { flow: 'row', maxPerLine: 1.5 },
      { flow: 'row', maxPerLine: Infinity },
    ])
      await expect(
        compute(pool(), { groupLayouts: { pool: rule } } as GraphLayoutOptions)
      ).rejects.toThrow('group layout');
    for (const id of ['missing', 'member-0'])
      await expect(compute(pool(), { groupLayouts: { [id]: { flow: 'row' } } })).rejects.toThrow(
        'group layout'
      );
    await expect(
      compute(pool(), {
        groupLayouts: { pool: { flow: 'row' } },
        positions: [{ nodeId: 'member-0', x: 0, y: 0 }],
      })
    ).rejects.toThrow('Fixed positions');
  });
});
