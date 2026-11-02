import { describe, expect, it } from 'vitest';
import {
  createSplitWorkspaceArrangements,
  isSplitWorkspaceLayout,
  measureSplitWorkspace,
  splitWorkspaceItems,
} from '../src/components/layout/splitWorkspaceModel';

describe('adaptive split workspace arrangements', () => {
  it.each(Array.from({ length: 31 }, (_, index) => index + 2))(
    'offers distinct arrangements preserving all %i items and reading order',
    (count) => {
      const items = Array.from({ length: count }, (_, index) => 'item-' + index);
      let sequence = 0;
      const choices = createSplitWorkspaceArrangements(items, () => 'split-' + ++sequence);
      expect(choices.length).toBeGreaterThanOrEqual(6);
      expect(choices.length).toBeLessThanOrEqual(12);
      const shapes = new Set<string>();
      for (const choice of choices) {
        expect(isSplitWorkspaceLayout(choice.layout)).toBe(true);
        expect(new Set(splitWorkspaceItems(choice.layout))).toEqual(new Set(items));
        const panes = [...measureSplitWorkspace(choice.layout).panes.entries()].sort(
          ([, a], [, b]) => Math.round(a.y * 1e6) - Math.round(b.y * 1e6) || a.x - b.x
        );
        expect(panes.map(([id]) => id)).toEqual(items);
        expect(panes.reduce((sum, [, rect]) => sum + rect.width * rect.height, 0)).toBeCloseTo(
          10000
        );
        shapes.add(
          JSON.stringify(
            panes.map(([, rect]) => Object.values(rect).map((value) => Math.round(value * 1e6)))
          )
        );
      }
      expect(shapes.size).toBe(choices.length);
    }
  );
  it('rejects empty, duplicate or oversized item sets instead of truncating', () => {
    const id = () => 'split';
    for (const items of [
      [],
      ['a'],
      ['a', 'a'],
      ['a', ''],
      Array.from({ length: 33 }, (_, index) => String(index)),
    ]) {
      expect(createSplitWorkspaceArrangements(items, id)).toEqual([]);
    }
  });
});
