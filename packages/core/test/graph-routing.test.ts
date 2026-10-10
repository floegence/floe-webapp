import { describe, expect, it } from 'vitest';
import { routeGraphGeometry } from '../src/components/graph/positions';
import type { GraphLayout, GraphLayoutNode, GraphPoint } from '../src/components/graph/types';
import compoundGeometry from './fixtures/compound-border-geometry.json';
import fanInGeometry from './fixtures/fan-in-border-geometry.json';

const node = (id: string, x: number, y: number, width = 100, height = 80): GraphLayoutNode => ({
  id,
  label: id,
  x,
  y,
  width,
  height,
});
const layout = (nodes: GraphLayoutNode[], pairs: [string, string][]): GraphLayout => ({
  nodes,
  edges: pairs.map(([source, target], i) => ({
    id: `edge-${i}`,
    label: '',
    source,
    target,
    sections: [],
  })),
  bounds: { x: 0, y: 0, width: 1, height: 1 },
});
const length = (path: readonly GraphPoint[]) =>
  path
    .slice(1)
    .reduce((sum, p, i) => sum + Math.abs(p.x - path[i]!.x) + Math.abs(p.y - path[i]!.y), 0);
const turns = (path: readonly GraphPoint[]) => {
  const axes = path
    .slice(1)
    .map((point, index) => (point.x === path[index]!.x ? 'vertical' : 'horizontal'));
  return axes.slice(1).filter((axis, index) => axis !== axes[index]).length;
};

describe('readable graph routing', () => {
  it.each([0, 1, 2, 3])(
    'avoids independent fan-in crossings after %s quarter turns',
    async (rotation) => {
      const input = structuredClone(fanInGeometry) as GraphLayout;
      for (let turn = 0; turn < rotation; turn++)
        for (const node of input.nodes) {
          const { x, y, width, height } = node;
          Object.assign(node, { x: -y - height, y: x, width: height, height: width });
        }
      const result = await routeGraphGeometry(input);
      const paths = [4, 5, 6, 9].map((index) => result.edges[index]!.sections[0]!);
      for (let i = 0; i < paths.length; i++)
        for (let j = i + 1; j < paths.length; j++)
          for (let a = 1; a < paths[i]!.length; a++)
            for (let b = 1; b < paths[j]!.length; b++) {
              const start = paths[i]![a - 1]!,
                end = paths[i]![a]!;
              const otherStart = paths[j]![b - 1]!,
                otherEnd = paths[j]![b]!;
              const vertical = start.x === end.x;
              if (vertical === (otherStart.x === otherEnd.x)) continue;
              const x = vertical ? start.x : otherStart.x;
              const y = vertical ? otherStart.y : start.y;
              expect(
                x > Math.min(start.x, end.x, otherStart.x, otherEnd.x) &&
                  y > Math.min(start.y, end.y, otherStart.y, otherEnd.y) &&
                  x < Math.max(start.x, end.x, otherStart.x, otherEnd.x) &&
                  y < Math.max(start.y, end.y, otherStart.y, otherEnd.y),
                JSON.stringify([paths[i], paths[j]])
              ).toBe(false);
            }
      expect(turns(paths[0]!)).toBe(0);
      expect(turns(paths[1]!)).toBe(0);
      expect(turns(paths[2]!)).toBeLessThanOrEqual(2);
      expect(turns(paths[3]!)).toBeLessThanOrEqual(1);
      expect(await routeGraphGeometry(input)).toEqual(result);
    }
  );
  it('routes fixed same-side ports with configurable clearance without moving endpoints', async () => {
    const nodes = [
      node('a', 0, 0, 260, 44),
      node('b', 0, 49, 260, 44),
      node('c', 0, 98, 260, 44),
    ].map((n) => ({ ...n, ports: [{ id: `port-${n.id}`, side: 'WEST' as const }] }));
    const input = layout(nodes, [['a', 'c']]);
    input.edges = input.edges.map((edge) => ({
      ...edge,
      sourcePort: 'port-a',
      targetPort: 'port-c',
    }));
    const result = await routeGraphGeometry(input, { edgeClearance: 20 });
    expect(result.nodes).toEqual(nodes);
    const route = result.edges[0]!.sections[0]!;
    expect(route[0]).toEqual({ x: 0, y: 22 });
    expect(route.at(-1)).toEqual({ x: 0, y: 120 });
    expect(Math.min(...route.map((p) => p.x))).toBeLessThanOrEqual(-20);
    expect(await routeGraphGeometry(input, { edgeClearance: 20 })).toEqual(result);
    const defaults = await routeGraphGeometry(input);
    expect(Math.min(...defaults.edges[0]!.sections[0]!.map((p) => p.x))).toBe(-4);
  });
  it.each([-1, Infinity, NaN])('rejects invalid edge clearance %s', async (edgeClearance) => {
    await expect(
      routeGraphGeometry(layout([node('a', 0, 0)], []), { edgeClearance })
    ).rejects.toThrow('Graph edge clearance must be finite and nonnegative');
  });
  it('retains a visible self loop beyond custom clearance', async () => {
    const result = await routeGraphGeometry(layout([node('a', 0, 0)], [['a', 'a']]), {
      edgeClearance: 32,
    });
    expect(Math.max(...result.edges[0]!.sections[0]!.map((p) => p.x))).toBeGreaterThan(132);
  });
  it('routes crowded compound borders and fractional coordinates without losing edges', async () => {
    const input = structuredClone(compoundGeometry) as GraphLayout;
    const result = await routeGraphGeometry(input);
    expect(result.edges).toHaveLength(input.edges.length);
    expect(await routeGraphGeometry(input)).toEqual(result);
  });
  it('clamps floating-point border fractions to the router domain', async () => {
    const result = await routeGraphGeometry(
      layout([node('a', 0, 0.1, 100, 0.2), node('b', 0, 20, 100, 80)], [['a', 'b']])
    );
    const path = result.edges[0]!.sections[0]!;
    expect(path[0]!.y).toBeCloseTo(0.3);
    expect(path.at(-1)!.y).toBe(20);
  });
  it('routes contained endpoints outward without crossing the member card', async () => {
    const member = { ...node('member', 20, 108, 280, 180), parentId: 'group' };
    const input = layout(
      [
        { ...node('group', 0, 0, 632, 308), kind: 'group' as const },
        member,
        { ...node('peer', 332, 108, 280, 180), parentId: 'group' },
      ],
      [
        ['member', 'group'],
        ['group', 'member'],
      ]
    );
    const result = await routeGraphGeometry(input);
    for (const edge of result.edges)
      for (const path of edge.sections)
        for (let i = 1; i < path.length; i++) {
          const a = path[i - 1]!,
            b = path[i]!;
          expect(
            Math.max(a.x, b.x) <= member.x ||
              Math.min(a.x, b.x) >= member.x + member.width ||
              Math.max(a.y, b.y) <= member.y ||
              Math.min(a.y, b.y) >= member.y + member.height,
            JSON.stringify(path)
          ).toBe(true);
        }
  });
  it('connects vertically adjacent boxes through their nearest facing borders', async () => {
    const result = await routeGraphGeometry(
      layout([node('a', 0, 0), node('b', 0, 180)], [['a', 'b']])
    );
    const path = result.edges[0]!.sections[0]!;
    expect(path[0]!.y).toBe(80);
    expect(path.at(-1)!.y).toBe(180);
    expect(length(path)).toBeCloseTo(100);
    expect(turns(path)).toBe(0);
  });

  it('uses the available border span instead of forcing side-center anchors', async () => {
    const result = await routeGraphGeometry(
      layout([node('a', 0, 0, 100, 200), node('b', 180, 130)], [['a', 'b']])
    );
    const path = result.edges[0]!.sections[0]!;
    expect(path[0]!.x).toBe(100);
    expect(path.at(-1)!.x).toBe(180);
    expect(length(path), JSON.stringify(path)).toBeCloseTo(80);
    expect(turns(path)).toBe(0);
  });

  it('connects diagonal neighbors near their facing corners', async () => {
    const path = (
      await routeGraphGeometry(layout([node('a', 0, 0), node('b', 180, 180)], [['a', 'b']]))
    ).edges[0]!.sections[0]!;
    // Allow the router's clearance and lane spacing near corners.
    expect(length(path)).toBeLessThanOrEqual(220);
    expect(turns(path)).toBeLessThanOrEqual(1);
  });

  it('separates reciprocal connections into distinct lanes and anchors', async () => {
    const result = await routeGraphGeometry(
      layout(
        [node('a', 0, 0), node('b', 180, 0)],
        [
          ['a', 'b'],
          ['b', 'a'],
        ]
      )
    );
    const first = result.edges[0]!.sections[0]!;
    const second = result.edges[1]!.sections[0]!;
    expect(first[0]).not.toEqual(second.at(-1));
    expect(first.at(-1)).not.toEqual(second[0]);
    expect(Math.abs(first[0]!.y - second.at(-1)!.y)).toBeGreaterThanOrEqual(6);
    expect(length(first)).toBeCloseTo(80);
    expect(length(second)).toBeCloseTo(80);
  });

  it('connects compound borders directly without crossing their child cards', async () => {
    const nodes = [
      { ...node('upper', 0, 0, 320, 240), kind: 'group' as const },
      { ...node('lower', 0, 280, 320, 240), kind: 'group' as const },
      { ...node('a', 20, 80, 280, 140), parentId: 'upper' },
      { ...node('b', 20, 360, 280, 140), parentId: 'lower' },
    ];
    const result = await routeGraphGeometry(layout(nodes, [['upper', 'lower']]));
    const path = result.edges[0]!.sections[0]!;
    expect(path[0]!.y).toBe(240);
    expect(path.at(-1)!.y).toBe(280);
    expect(length(path)).toBeCloseTo(40);
  });

  it('takes a short orthogonal path around an intervening group', async () => {
    const nodes = [
      node('a', 0, 0),
      node('b', 380, 0),
      { ...node('obstacle', 180, -40, 100, 160), kind: 'group' as const },
      { ...node('child', 190, -20, 80, 120), parentId: 'obstacle' },
    ];
    const path = (await routeGraphGeometry(layout(nodes, [['a', 'b']]))).edges[0]!.sections[0]!;
    const obstacle = nodes[2]!;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1]!,
        b = path[i]!;
      expect(a.x === b.x || a.y === b.y).toBe(true);
      expect(
        Math.max(a.x, b.x) <= obstacle.x ||
          Math.min(a.x, b.x) >= obstacle.x + obstacle.width ||
          Math.max(a.y, b.y) <= obstacle.y ||
          Math.min(a.y, b.y) >= obstacle.y + obstacle.height
      ).toBe(true);
    }
    expect(length(path)).toBeLessThan(520);
  });

  it('retains distinct orthogonal self-loop anchors and stable routes', async () => {
    const input = layout(
      [node('a', 0, 0), node('b', 180, 0)],
      [
        ['a', 'a'],
        ['a', 'b'],
        ['b', 'a'],
      ]
    );
    const result = await routeGraphGeometry(input);
    expect(await routeGraphGeometry(input)).toEqual(result);
    const path = result.edges[0]!.sections[0]!;
    expect(path[0]).not.toEqual(path.at(-1));
    expect(length(path)).toBeGreaterThan(30);
    for (const edge of result.edges)
      for (const section of edge.sections)
        for (let i = 1; i < section.length; i++)
          expect(section[i]!.x === section[i - 1]!.x || section[i]!.y === section[i - 1]!.y).toBe(
            true
          );
  });

  it.each(['NORTH', 'EAST', 'SOUTH', 'WEST'] as const)(
    'keeps a fixed %s port on its requested border',
    async (side) => {
      const a = { ...node('a', 0, 0), ports: [{ id: 'fixed', side }] };
      const input = layout([a, node('b', 200, 200)], [['a', 'b']]);
      input.edges = [{ ...input.edges[0]!, sourcePort: 'fixed' }];
      const path = (await routeGraphGeometry(input)).edges[0]!.sections[0]!;
      expect(path[0]).toEqual({
        x: side === 'WEST' ? 0 : side === 'EAST' ? 100 : 50,
        y: side === 'NORTH' ? 0 : side === 'SOUTH' ? 80 : 40,
      });
      const delta = { x: path[1]!.x - path[0]!.x, y: path[1]!.y - path[0]!.y };
      if (side === 'WEST' || side === 'EAST') {
        expect(delta.y).toBe(0);
        expect(delta.x * (side === 'WEST' ? -1 : 1)).toBeGreaterThan(0);
      } else {
        expect(delta.x).toBe(0);
        expect(delta.y * (side === 'NORTH' ? -1 : 1)).toBeGreaterThan(0);
      }
    }
  );

  it('shares same-side named ports without replacing them with node centers', async () => {
    const a = {
      ...node('a', 0, 0),
      ports: [
        { id: 'one', side: 'EAST' as const },
        { id: 'two', side: 'EAST' as const },
      ],
    };
    const input = layout(
      [a, node('b', 200, 0), node('c', 200, 180)],
      [
        ['a', 'b'],
        ['a', 'c'],
      ]
    );
    input.edges = input.edges.map((edge, index) => ({
      ...edge,
      sourcePort: index ? 'two' : 'one',
    }));
    for (const edge of (await routeGraphGeometry(input)).edges)
      expect(edge.sections[0]![0]).toEqual({ x: 100, y: 40 });
  });

  it('retains a visible self loop when both endpoints request the same fixed port', async () => {
    const a = { ...node('a', 0, 0), ports: [{ id: 'fixed', side: 'EAST' as const }] };
    const input = layout([a], [['a', 'a']]);
    input.edges = [{ ...input.edges[0]!, sourcePort: 'fixed', targetPort: 'fixed' }];
    const path = (await routeGraphGeometry(input)).edges[0]!.sections[0]!;
    expect(path[0]).toEqual({ x: 100, y: 40 });
    expect(path.at(-1)).toEqual(path[0]);
    expect(length(path)).toBeGreaterThan(40);
  });
});
