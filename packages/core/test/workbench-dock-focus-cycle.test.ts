import { describe, expect, it } from 'vitest';

import {
  resolveWorkbenchDockFocusCycle,
  sortWorkbenchDockFocusCandidates,
  type WorkbenchDockFocusCandidate,
} from '../src/components/workbench/workbenchDockFocusCycle';

function candidate(
  id: string,
  x: number,
  y: number,
  createdAtUnixMs: number
): WorkbenchDockFocusCandidate {
  return {
    kind: 'widget',
    id,
    x,
    y,
    width: 200,
    height: 120,
    createdAtUnixMs,
  };
}

describe('Workbench Dock focus cycle', () => {
  it('orders candidates top-to-bottom, then left-to-right, creation time, and id', () => {
    const ordered = sortWorkbenchDockFocusCandidates([
      candidate('late-id', 20, 100, 4),
      candidate('right', 200, 20, 1),
      candidate('left-new', 20, 20, 3),
      candidate('left-old-z', 20, 20, 2),
      candidate('left-old-a', 20, 20, 2),
    ]);

    expect(ordered.map((item) => item.id)).toEqual([
      'left-old-a',
      'left-old-z',
      'left-new',
      'right',
      'late-id',
    ]);
  });

  it('reactivates a current same-type selection, advances, wraps, and resets without a timer', () => {
    const candidates = [candidate('first', 0, 0, 1), candidate('second', 0, 200, 2)];
    const firstClick = resolveWorkbenchDockFocusCycle({
      dockItemKey: 'widget:files',
      candidates,
      selectedObject: { kind: 'widget', id: 'second' },
      session: null,
    });
    expect(firstClick.target?.id).toBe('second');

    const secondClick = resolveWorkbenchDockFocusCycle({
      dockItemKey: 'widget:files',
      candidates,
      selectedObject: { kind: 'widget', id: 'second' },
      session: firstClick.session,
    });
    expect(secondClick.target?.id).toBe('first');

    const wrapped = resolveWorkbenchDockFocusCycle({
      dockItemKey: 'widget:files',
      candidates,
      selectedObject: { kind: 'widget', id: 'first' },
      session: secondClick.session,
    });
    expect(wrapped.target?.id).toBe('second');

    const afterManualSelection = resolveWorkbenchDockFocusCycle({
      dockItemKey: 'widget:files',
      candidates,
      selectedObject: { kind: 'widget', id: 'first' },
      session: wrapped.session,
    });
    expect(afterManualSelection.target?.id).toBe('first');

    const afterDifferentDockItem = resolveWorkbenchDockFocusCycle({
      dockItemKey: 'widget:terminal',
      candidates,
      selectedObject: null,
      session: afterManualSelection.session,
    });
    expect(afterDifferentDockItem.target?.id).toBe('first');
  });

  it('resets when candidates are added, removed, or spatially reordered', () => {
    const initial = [candidate('first', 0, 0, 1), candidate('second', 0, 200, 2)];
    const cycle = resolveWorkbenchDockFocusCycle({
      dockItemKey: 'widget:files',
      candidates: initial,
      selectedObject: { kind: 'widget', id: 'first' },
      session: null,
    });

    const added = resolveWorkbenchDockFocusCycle({
      dockItemKey: 'widget:files',
      candidates: [...initial, candidate('third', 0, 300, 3)],
      selectedObject: { kind: 'widget', id: 'first' },
      session: cycle.session,
    });
    expect(added.target?.id).toBe('first');

    const removed = resolveWorkbenchDockFocusCycle({
      dockItemKey: 'widget:files',
      candidates: [initial[0]!],
      selectedObject: { kind: 'widget', id: 'first' },
      session: added.session,
    });
    expect(removed.target?.id).toBe('first');

    const reordered = resolveWorkbenchDockFocusCycle({
      dockItemKey: 'widget:files',
      candidates: [candidate('first', 0, 400, 1), candidate('second', 0, 0, 2)],
      selectedObject: { kind: 'widget', id: 'first' },
      session: cycle.session,
    });
    expect(reordered.target?.id).toBe('first');
    expect(reordered.orderedCandidates.map((item) => item.id)).toEqual(['second', 'first']);
  });
});
