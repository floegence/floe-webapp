import { createRoot, createSignal, untrack } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import { useWorkbenchModel } from '../src/components/workbench/useWorkbenchModel';
import {
  createWorkbenchFilterState,
  sanitizeWorkbenchState,
} from '../src/components/workbench';
import type { WorkbenchWidgetDefinition } from '../src/components/workbench';

const definitions: readonly WorkbenchWidgetDefinition[] = [
  {
    type: 'custom.logs',
    label: 'Logs',
    icon: () => null,
    body: () => null,
    defaultTitle: 'Logs',
    defaultSize: { width: 640, height: 360 },
    singleton: true,
  },
  {
    type: 'custom.queue',
    label: 'Queue',
    icon: () => null,
    body: () => null,
    defaultTitle: 'Queue',
    defaultSize: { width: 520, height: 320 },
  },
];

describe('custom workbench widget contract', () => {
  it('derives filters and sanitizes persisted state from injected widget definitions', () => {
    const state = sanitizeWorkbenchState(
      {
        version: 1,
        widgets: [
          {
            id: 'custom-logs-1',
            type: 'custom.logs',
            title: 'Logs',
            x: 120,
            y: 84,
            width: 0,
            height: 0,
            z_index: 3,
            created_at_unix_ms: 10,
          },
          {
            id: 'invalid',
            type: 'unknown.type',
            title: 'Unknown',
            x: 0,
            y: 0,
            width: 120,
            height: 80,
            z_index: 1,
            created_at_unix_ms: 10,
          },
        ],
        filters: {
          'custom.logs': false,
        },
        viewport: { x: 12, y: 8, scale: 1.1 },
        selectedWidgetId: 'custom-logs-1',
      },
      { widgetDefinitions: definitions }
    );

    expect(state.widgets).toHaveLength(1);
    expect(state.widgets[0]?.type).toBe('custom.logs');
    expect(state.widgets[0]?.width).toBe(640);
    expect(state.widgets[0]?.height).toBe(360);
    expect(state.filters).toEqual({
      'custom.logs': false,
      'custom.queue': true,
    });
    expect(createWorkbenchFilterState(definitions)).toEqual({
      'custom.logs': true,
      'custom.queue': true,
    });
  });

  it('reuses singleton widgets when ensureWidget is called with injected definitions', () => {
    createRoot((dispose) => {
      const [state, setState] = createSignal({
        version: 1 as const,
        widgets: [],
        viewport: { x: 120, y: 84, scale: 1 },
        locked: false,
        filters: createWorkbenchFilterState(definitions),
        selectedWidgetId: null as string | null,
      });

      const model = useWorkbenchModel({
        state,
        setState,
        onClose: vi.fn(),
        widgetDefinitions: definitions,
      });

      const first = model.widgetActions.ensureWidget('custom.logs', { centerViewport: false });
      expect(first).toBeTruthy();
      expect(untrack(state).widgets).toHaveLength(1);

      const second = model.widgetActions.ensureWidget('custom.logs', { centerViewport: false });
      expect(second?.id).toBe(first?.id);
      expect(untrack(state).widgets).toHaveLength(1);
      expect(untrack(state).selectedWidgetId).toBe(first?.id);

      dispose();
    });
  });
});
