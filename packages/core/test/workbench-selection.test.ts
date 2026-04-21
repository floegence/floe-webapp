// @vitest-environment jsdom

import { createRoot, createSignal, untrack } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';

import { useWorkbenchModel } from '../src/components/workbench/useWorkbenchModel';
import type { WorkbenchState, WorkbenchWidgetDefinition } from '../src/components/workbench/types';
import { createWorkbenchFilterState } from '../src/components/workbench/widgets/widgetRegistry';

const definitions: readonly WorkbenchWidgetDefinition[] = [
  {
    type: 'custom.panel',
    label: 'Panel',
    icon: () => null,
    body: () => null,
    defaultTitle: 'Panel',
    defaultSize: { width: 200, height: 120 },
  },
];

function createWorkbenchState(selectedWidgetId: string | null): WorkbenchState {
  return {
    version: 1,
    widgets: [
      {
        id: 'widget-1',
        type: 'custom.panel',
        title: 'Widget',
        x: 0,
        y: 0,
        width: 200,
        height: 120,
        z_index: 1,
        created_at_unix_ms: 1,
      },
    ],
    viewport: { x: 0, y: 0, scale: 1 },
    locked: false,
    filters: createWorkbenchFilterState(definitions),
    selectedWidgetId,
  };
}

describe('workbench selection helpers', () => {
  it('clears selection without mutating unrelated workbench state', () => {
    createRoot((dispose) => {
      const [state, setState] = createSignal(createWorkbenchState('widget-1'));
      const model = useWorkbenchModel({
        state,
        setState,
        onClose: vi.fn(),
        widgetDefinitions: definitions,
      });

      model.selection.clear();

      expect(untrack(state)).toEqual({
        ...createWorkbenchState(null),
      });

      dispose();
    });
  });
});
