import { describe, expect, it } from 'vitest';
import {
  dockSplitWorkspaceItem,
  isSplitWorkspaceLayout,
  measureSplitWorkspace,
  presetSplitWorkspace,
  reconcileSplitWorkspace,
  removeSplitWorkspaceItem,
  resizeSplitWorkspace,
  splitWorkspaceItems,
  splitWorkspacePane,
} from '../src/components/layout/splitWorkspaceModel';
let sequence = 0;
const id = () => 'split-' + ++sequence;
describe('split workspace placement', () => {
  it('builds every preset without duplicating items or leaving geometry gaps', () => {
    for (const preset of [
      'single',
      'columns',
      'rows',
      'three-columns',
      'main-left',
      'grid',
    ] as const) {
      const tree = presetSplitWorkspace(preset, ['a', 'b', 'c', 'd'], id);
      expect(isSplitWorkspaceLayout(tree)).toBe(true);
      expect(new Set(splitWorkspaceItems(tree)).size).toBe(splitWorkspaceItems(tree).length);
      expect(
        [...measureSplitWorkspace(tree).panes.values()].reduce(
          (sum, r) => sum + r.width * r.height,
          0
        )
      ).toBeCloseTo(10000);
    }
  });
  it('docks all four edges, swaps centers and collapses empty splits', () => {
    for (const edge of ['left', 'right', 'top', 'bottom'] as const) {
      const tree = dockSplitWorkspaceItem(splitWorkspacePane('a'), 'b', 'a', edge, id());
      expect(isSplitWorkspaceLayout(tree)).toBe(true);
      expect(new Set(splitWorkspaceItems(tree))).toEqual(new Set(['a', 'b']));
      const moved = dockSplitWorkspaceItem(tree, 'a', 'b', 'center', id());
      expect(splitWorkspaceItems(moved)).toEqual(splitWorkspaceItems(tree).reverse());
      expect(removeSplitWorkspaceItem(moved, 'a')).toEqual(splitWorkspacePane('b'));
    }
  });
  it('preserves surviving placements and ignores self docking', () => {
    const tree = presetSplitWorkspace('grid', ['a', 'b', 'c', 'd'], id);
    expect(dockSplitWorkspaceItem(tree, 'a', 'a', 'left', id())).toBe(tree);
    const next = reconcileSplitWorkspace(tree, ['b', 'd']);
    expect(splitWorkspaceItems(next)).toEqual(['b', 'd']);
    expect(isSplitWorkspaceLayout(next)).toBe(true);
    expect(reconcileSplitWorkspace(tree, [])).toBeNull();
  });
  it('rejects malformed persistence and clamps resizing', () => {
    const tree = presetSplitWorkspace('columns', ['a', 'b'], id)!;
    expect(isSplitWorkspaceLayout({ ...tree, ratio: NaN })).toBe(false);
    expect(isSplitWorkspaceLayout({ ...tree, first: tree })).toBe(false);
    expect(isSplitWorkspaceLayout({ ...tree, second: splitWorkspacePane('a') })).toBe(false);
    expect(resizeSplitWorkspace(tree, tree.id, 5)).toMatchObject({ ratio: 0.85 });
    expect(resizeSplitWorkspace(tree, tree.id, NaN)).toBe(tree);
  });
});
