import { describe, expect, it } from 'vitest';
import ELK from 'elkjs/lib/elk.bundled.js';
import { computeGraphLayout, computeGraphRoutes } from '../src/components/graph/layout';
import type { GraphInput } from '../src/components/graph/types';

const input: GraphInput = {
  nodes: [
    { id: 'pool', kind: 'group', label: 'Pool', width: 220, height: 90 },
    { id: 'a', parentId: 'pool', label: 'A', width: 120, height: 80 },
    { id: 'b', parentId: 'pool', label: 'B', width: 120, height: 80 },
    { id: 'outside', label: 'Outside', width: 120, height: 80 },
  ],
  edges: [
    { id: 'ab', source: 'a', target: 'b', label: '' },
    { id: 'bo', source: 'b', target: 'outside', label: '' },
  ],
};

describe('independent graph geometry and routing', () => {
  it('returns finite empty geometry without allocating routes', async () => {
    const geometry = await computeGraphLayout(
      { nodes: [], edges: [] },
      { routing: 'none', aspectRatio: 1.6 },
      new ELK()
    );
    expect(geometry.bounds).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    expect(await computeGraphRoutes(geometry, [])).toEqual([]);
  });
  it.each([
    { aspectRatio: 1.6 },
    { layers: [['pool'], ['outside']] },
    { groupLayouts: { pool: { flow: 'row' as const } } },
    { positions: [{ nodeId: 'outside', x: 900, y: 200 }], positionMode: 'preferred' as const },
    { positionMode: 'compact' as const, aspectRatio: 1.6 },
  ])('retains topology geometry without routing hidden paths: %j', async (options) => {
    const full = await computeGraphLayout(input, options, new ELK());
    const geometry = await computeGraphLayout(input, { ...options, routing: 'none' }, new ELK());
    expect(geometry.nodes).toEqual(full.nodes);
    expect(geometry.edges.map((edge) => edge.sections)).toEqual([[], []]);
    const before = structuredClone(geometry);
    const overview = [{ id: 'overview', source: 'pool', target: 'outside', label: '' }];
    const routes = await computeGraphRoutes(geometry, overview);
    expect(routes.map((edge) => edge.id)).toEqual(['overview']);
    expect(routes[0]!.sections[0]!.length).toBeGreaterThanOrEqual(2);
    expect(geometry).toEqual(before);
    expect(await computeGraphRoutes(geometry, overview)).toEqual(routes);
    expect(await computeGraphRoutes(geometry, input.edges.slice(0, 1))).toHaveLength(1);
  });
  it('rejects unknown route endpoints and nonfinite fixed geometry', async () => {
    const geometry = await computeGraphLayout(input, { routing: 'none' }, new ELK());
    await expect(
      computeGraphRoutes(geometry, [{ id: 'bad', source: 'missing', target: 'a', label: '' }])
    ).rejects.toThrow('Invalid endpoint');
    await expect(
      computeGraphRoutes(
        { ...geometry, nodes: geometry.nodes.map((node) => ({ ...node, x: NaN })) },
        []
      )
    ).rejects.toThrow('Invalid geometry');
  });
});
