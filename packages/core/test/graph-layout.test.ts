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
  it('keeps two independent short members side by side in a landscape group', async () => {
    const graph: GraphInput = {
      nodes: [
        { id: 'group', label: 'Group', kind: 'group', width: 320, height: 100 },
        { id: 'first', label: 'First', parentId: 'group', width: 280, height: 214 },
        { id: 'second', label: 'Second', parentId: 'group', width: 280, height: 214 },
      ],
      edges: [],
    };
    const result = await computeGraphLayout(graph, { aspectRatio: 1.6, spacing: 32 });
    const first = result.nodes.find((node) => node.id === 'first')!;
    const second = result.nodes.find((node) => node.id === 'second')!;
    expect(second.y).toBe(first.y);
    expect(second.x).toBeGreaterThanOrEqual(first.x + first.width + 32);
    expect(result.nodes.find((node) => node.id === 'group')!.width).toBeGreaterThan(550);
  });
  it('packs independent compound members and disconnected components into a readable aspect ratio', async () => {
    const nodes: GraphInput['nodes'][number][] = [];
    for (let g = 0; g < 5; g++) {
      nodes.push({ id: `group-${g}`, label: `Group ${g}`, kind: 'group', width: 320, height: 100 });
      for (let n = 0; n < 3; n++)
        nodes.push({
          id: `node-${g}-${n}`,
          label: 'Node',
          parentId: `group-${g}`,
          width: 280,
          height: 300,
        });
    }
    const graph: GraphInput = {
      nodes,
      edges: [{ id: 'relation', label: 'Relationship', source: 'group-0', target: 'group-1' }],
    };
    const result = await computeGraphLayout(graph, { aspectRatio: 1.6, spacing: 32 });
    expect(result.bounds.width / result.bounds.height).toBeGreaterThan(0.8);
    expect(result.bounds.width / result.bounds.height).toBeLessThan(3);
    const group = result.nodes.find((node) => node.id === 'group-0')!;
    expect(group.width).toBeGreaterThan(550);
    expect(group.height).toBeLessThan(1000);
    for (const node of result.nodes) {
      for (const other of result.nodes.filter(
        (other) => other.id !== node.id && other.parentId === node.parentId
      )) {
        expect(
          node.x + node.width <= other.x ||
            other.x + other.width <= node.x ||
            node.y + node.height <= other.y ||
            other.y + other.height <= node.y
        ).toBe(true);
      }
    }
    expect(result.edges[0]!.sections.length).toBeGreaterThan(0);
    expect(await computeGraphLayout(graph, { aspectRatio: 1.6, spacing: 32 })).toEqual(result);
  });
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

  it('retains packed cross-hierarchy routes, ports, cycles and the inspected anchor', async () => {
    const options = { aspectRatio: 1.6, anchor: { nodeId: 'a', position: { x: 150, y: -200 } } };
    const result = await computeGraphLayout(input, options);
    const anchored = result.nodes.find((node) => node.id === 'a')!;
    expect(anchored.x).toBeCloseTo(options.anchor.position.x);
    expect(anchored.y).toBeCloseTo(options.anchor.position.y);
    expect(result.edges.map((edge) => edge.id)).toEqual(input.edges.map((edge) => edge.id));
    for (const edge of result.edges) {
      const source = result.nodes.find((node) => node.id === edge.source)!;
      const target = result.nodes.find((node) => node.id === edge.target)!;
      const path = edge.sections[0]!;
      const a = path[0]!,
        b = path.at(-1)!;
      for (const [point, node] of [
        [a, source],
        [b, target],
      ] as const) {
        expect(point.x).toBeGreaterThanOrEqual(node.x);
        expect(point.x).toBeLessThanOrEqual(node.x + node.width);
        expect(point.y).toBeGreaterThanOrEqual(node.y);
        expect(point.y).toBeLessThanOrEqual(node.y + node.height);
      }
      for (let n = 1; n < path.length; n++)
        expect(path[n]!.x === path[n - 1]!.x || path[n]!.y === path[n - 1]!.y).toBe(true);
      if (edge.sourcePort === 'http') expect(a.x).toBe(source.x + source.width);
    }
    const pinned = await computeGraphLayout(input, {
      aspectRatio: 1.6,
      positionMode: 'preferred',
      positions: [{ nodeId: 'a', x: 500, y: 600 }],
    });
    expect(pinned.nodes.find((node) => node.id === 'a')).toMatchObject({ x: 500, y: 600 });
    expect(pinned.edges.every((edge) => edge.sections.length)).toBe(true);
  });

  it('packs nested groups without changing containment, dimensions or consumer input', async () => {
    const nested: GraphInput = {
      nodes: [
        { id: 'root', label: 'Root', kind: 'group', width: 300, height: 100 },
        { id: 'inner', label: 'Inner', kind: 'group', parentId: 'root', width: 300, height: 100 },
        { id: 'leaf', label: 'Leaf', parentId: 'inner', width: 230, height: 250 },
        { id: 'outside', label: 'Outside', width: 230, height: 250 },
      ],
      edges: [{ id: 'cross', label: 'Cross', source: 'leaf', target: 'outside' }],
    };
    const original = structuredClone(nested);
    const result = await computeGraphLayout(nested, { aspectRatio: 1.6 });
    expect(nested).toEqual(original);
    for (const node of result.nodes) {
      const parent = result.nodes.find((n) => n.id === node.parentId);
      if (parent) {
        expect(node.x).toBeGreaterThanOrEqual(parent.x + 28);
        expect(node.y).toBeGreaterThanOrEqual(parent.y + 64);
        expect(node.x + node.width).toBeLessThanOrEqual(parent.x + parent.width - 28);
        expect(node.y + node.height).toBeLessThanOrEqual(parent.y + parent.height - 28);
      }
    }
  });

  it.each([0, -1, NaN, Infinity])(
    'rejects an invalid packing aspect ratio %s',
    async (aspectRatio) => {
      await expect(computeGraphLayout(input, { aspectRatio })).rejects.toThrow('aspect ratio');
    }
  );

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

describe('persisted graph positions', () => {
  it('repairs overlapping preferred positions without dropping nodes or relationships', async () => {
    const graph: GraphInput = {
      nodes: [
        { id: 'masters', label: 'Masters', kind: 'group', width: 320, height: 100 },
        { id: 'master', label: 'Master', parentId: 'masters', width: 280, height: 312 },
        { id: 'workers', label: 'Workers', kind: 'group', width: 320, height: 100 },
        { id: 'worker', label: 'Worker', parentId: 'workers', width: 280, height: 312 },
        { id: 'database', label: 'Database', width: 220, height: 158 },
      ],
      edges: [
        { id: 'mw', label: 'Schedules', source: 'master', target: 'worker' },
        { id: 'wm', label: 'Reports', source: 'worker', target: 'masters' },
        { id: 'db', label: 'Stores', source: 'workers', target: 'database' },
        { id: 'loop', label: 'Replicates', source: 'workers', target: 'workers' },
      ],
    };
    const options: GraphLayoutOptions = {
      positionMode: 'preferred',
      groupPadding: { top: 108, right: 20, bottom: 20, left: 20 },
      positions: [
        { nodeId: 'master', x: 0, y: -420 },
        { nodeId: 'worker', x: 0, y: -140 },
        { nodeId: 'database', x: 0, y: 180 },
      ],
    };
    const layout = await computeGraphLayout(graph, options);
    expect(layout.nodes).toHaveLength(graph.nodes.length);
    expect(layout.edges.map((e) => e.id)).toEqual(graph.edges.map((e) => e.id));
    expect(layout.nodes.find((n) => n.id === 'master')).toMatchObject({ x: 0, y: -420 });
    for (const node of layout.nodes) {
      const parent = layout.nodes.find((n) => n.id === node.parentId);
      if (parent) {
        expect(node.x).toBeGreaterThanOrEqual(parent.x + 20);
        expect(node.y).toBeGreaterThanOrEqual(parent.y + 108);
        expect(node.x + node.width).toBeLessThanOrEqual(parent.x + parent.width - 20);
        expect(node.y + node.height).toBeLessThanOrEqual(parent.y + parent.height - 20);
      }
      for (const other of layout.nodes.filter(
        (n) => n.id !== node.id && n.parentId === node.parentId
      )) {
        expect(
          node.x + node.width <= other.x ||
            other.x + other.width <= node.x ||
            node.y + node.height <= other.y ||
            other.y + other.height <= node.y
        ).toBe(true);
      }
    }
    for (const edge of layout.edges) {
      expect(edge.sections[0]!.length).toBeGreaterThan(2);
      for (const section of edge.sections)
        for (let i = 1; i < section.length; i++) {
          const a = section[i - 1]!,
            b = section[i]!;
          expect(a.x === b.x || a.y === b.y).toBe(true);
          for (const node of layout.nodes.filter(
            (n) => n.kind !== 'group' && n.id !== edge.source && n.id !== edge.target
          )) {
            expect(
              a.x === b.x
                ? a.x > node.x &&
                    a.x < node.x + node.width &&
                    Math.max(a.y, b.y) > node.y &&
                    Math.min(a.y, b.y) < node.y + node.height
                : a.y > node.y &&
                    a.y < node.y + node.height &&
                    Math.max(a.x, b.x) > node.x &&
                    Math.min(a.x, b.x) < node.x + node.width
            ).toBe(false);
          }
        }
    }
    expect(await computeGraphLayout(graph, options)).toEqual(layout);
  });

  it('keeps clear preferred coordinates and rejects malformed preferred positions', async () => {
    const graph = { nodes: [{ id: 'a', label: 'A', width: 100, height: 80 }], edges: [] };
    expect(
      (
        await computeGraphLayout(graph, {
          positionMode: 'preferred',
          positions: [{ nodeId: 'a', x: -20, y: 30 }],
        })
      ).nodes[0]
    ).toMatchObject({ x: -20, y: 30 });
    for (const positions of [
      [{ nodeId: 'missing', x: 0, y: 0 }],
      [{ nodeId: 'a', x: NaN, y: 0 }],
      [
        { nodeId: 'a', x: 0, y: 0 },
        { nodeId: 'a', x: 1, y: 1 },
      ],
    ])
      await expect(
        computeGraphLayout(graph, { positionMode: 'preferred', positions })
      ).rejects.toThrow('Invalid graph position');
  });

  it('repairs nested preferred containment and separates unpositioned siblings', async () => {
    const graph: GraphInput = {
      nodes: [
        { id: 'outer', label: 'Outer', kind: 'group', width: 320, height: 100 },
        { id: 'inner', label: 'Inner', kind: 'group', parentId: 'outer', width: 200, height: 80 },
        { id: 'a', label: 'A', parentId: 'inner', width: 100, height: 80 },
        { id: 'b', label: 'B', parentId: 'inner', width: 100, height: 80 },
      ],
      edges: [{ id: 'ab', label: 'Calls', source: 'a', target: 'b' }],
    };
    const before = await computeGraphLayout(graph);
    const b = before.nodes.find((n) => n.id === 'b')!;
    const after = await computeGraphLayout(graph, {
      positionMode: 'preferred',
      spacing: 0,
      groupPadding: { top: 0, right: 0, bottom: 0, left: 0 },
      positions: [
        { nodeId: 'outer', x: 500, y: 500 },
        { nodeId: 'inner', x: 200, y: 200 },
        { nodeId: 'a', x: b.x, y: b.y },
      ],
    });
    for (const node of after.nodes) {
      const parent = after.nodes.find((n) => n.id === node.parentId);
      if (parent) {
        expect(node.x).toBeGreaterThanOrEqual(parent.x + 12);
        expect(node.y).toBeGreaterThanOrEqual(parent.y + 12);
        expect(node.x + node.width).toBeLessThanOrEqual(parent.x + parent.width - 12);
        expect(node.y + node.height).toBeLessThanOrEqual(parent.y + parent.height - 12);
      }
    }
    expect(after.edges[0]!.sections[0]!.length).toBeGreaterThan(2);
  });

  it('keeps exact positions and routes around intervening nodes', async () => {
    const nodes = ['a', 'block', 'b'].map((id) => ({ id, label: id, width: 100, height: 80 }));
    const layout = await computeGraphLayout(
      { nodes, edges: [{ id: 'edge', label: '2', source: 'a', target: 'b' }] },
      {
        positions: [
          { nodeId: 'a', x: 0, y: 0 },
          { nodeId: 'block', x: 180, y: -20 },
          { nodeId: 'b', x: 380, y: 0 },
        ],
      }
    );
    expect(layout.nodes.find((n) => n.id === 'b')).toMatchObject({ x: 380, y: 0 });
    const path = layout.edges[0]!.sections[0]!;
    expect(path.length).toBeGreaterThan(4);
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1]!,
        b = path[i]!;
      expect(a.x === b.x || a.y === b.y).toBe(true);
      const crosses =
        a.x === b.x
          ? a.x > 180 && a.x < 280 && Math.max(a.y, b.y) > -20 && Math.min(a.y, b.y) < 60
          : a.y > -20 && a.y < 60 && Math.max(a.x, b.x) > 180 && Math.min(a.x, b.x) < 280;
      expect(crosses).toBe(false);
    }
  });
  it('moves descendants with their group and retains self loops', async () => {
    const before = await computeGraphLayout(input);
    const group = before.nodes.find((n) => n.id === 'group')!;
    const after = await computeGraphLayout(input, {
      positions: [{ nodeId: 'group', x: group.x, y: group.y + 1000 }],
    });
    for (const child of before.nodes.filter((n) => n.parentId === 'group'))
      expect(after.nodes.find((n) => n.id === child.id)).toMatchObject({
        x: child.x,
        y: child.y + 1000,
      });
    expect(after.edges.find((e) => e.id === 'loop')!.sections[0]!.length).toBeGreaterThan(3);
  });
  it('rejects unknown positions and impossible pinned containment', async () => {
    await expect(
      computeGraphLayout(input, { positions: [{ nodeId: 'absent', x: 0, y: 0 }] })
    ).rejects.toThrow('Invalid graph position');
    await expect(
      computeGraphLayout(input, {
        positions: [
          { nodeId: 'group', x: 100, y: 100 },
          { nodeId: 'a', x: 0, y: 0 },
        ],
      })
    ).rejects.toThrow('outside group');
  });
});
