// @vitest-environment jsdom

import { createRoot, createSignal, untrack } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';

import { useWorkbenchModel } from '../src/components/workbench/useWorkbenchModel';
import type { InfiniteCanvasContextMenuEvent } from '../src/ui';
import { createWorkbenchFilterState } from '../src/components/workbench/widgets/widgetRegistry';
import type { WorkbenchWidgetDefinition, WorkbenchWidgetItem } from '../src/components/workbench/types';

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
    type: 'custom.monitor',
    label: 'Monitor',
    icon: () => null,
    body: () => null,
    defaultTitle: 'Monitor',
    defaultSize: { width: 560, height: 320 },
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

function createWidget(id: string, type: 'custom.logs' | 'custom.monitor'): WorkbenchWidgetItem {
  return {
    id,
    type,
    title: id,
    x: 120,
    y: 84,
    width: type === 'custom.logs' ? 640 : 560,
    height: type === 'custom.logs' ? 360 : 320,
    z_index: 1,
    created_at_unix_ms: 1,
  };
}

function createWorkbenchState(widgets: readonly WorkbenchWidgetItem[]) {
  return {
    version: 1 as const,
    widgets: [...widgets],
    viewport: { x: 120, y: 84, scale: 1 },
    locked: false,
    filters: createWorkbenchFilterState(definitions),
    selectedWidgetId: null as string | null,
    theme: 'default' as const,
  };
}

function openCanvasMenu(model: ReturnType<typeof useWorkbenchModel>, worldX = 480, worldY = 320) {
  const event: InfiniteCanvasContextMenuEvent = {
    clientX: 16,
    clientY: 24,
    worldX,
    worldY,
  };
  model.canvas.openCanvasContextMenu(event);
}

describe('workbench canvas menu verbs', () => {
  it('uses Add for singleton widgets that do not yet exist', () => {
    createRoot((dispose) => {
      const [state, setState] = createSignal(createWorkbenchState([]));
      const model = useWorkbenchModel({
        state,
        setState,
        onClose: vi.fn(),
        widgetDefinitions: definitions,
      });

      openCanvasMenu(model);

      const labels = model.contextMenu.items()
        .filter((item) => item.kind === 'action')
        .map((item) => item.label);
      expect(labels).toContain('Add Logs');
      expect(labels).toContain('Add Monitor');
      expect(labels).toContain('Add Queue');

      dispose();
    });
  });

  it('uses Go to for singleton widgets that already exist while keeping multi-instance widgets additive', () => {
    createRoot((dispose) => {
      const [state, setState] = createSignal(createWorkbenchState([createWidget('logs-1', 'custom.logs')]));
      const model = useWorkbenchModel({
        state,
        setState,
        onClose: vi.fn(),
        widgetDefinitions: definitions,
      });

      openCanvasMenu(model);

      const labels = model.contextMenu.items()
        .filter((item) => item.kind === 'action')
        .map((item) => item.label);
      expect(labels).toContain('Go to Logs');
      expect(labels).toContain('Add Monitor');
      expect(labels).toContain('Add Queue');

      dispose();
    });
  });

  it('routes Go to through focus without creating a duplicate singleton widget', () => {
    createRoot((dispose) => {
      const [state, setState] = createSignal(createWorkbenchState([createWidget('logs-1', 'custom.logs')]));
      const model = useWorkbenchModel({
        state,
        setState,
        onClose: vi.fn(),
        widgetDefinitions: definitions,
      });

      openCanvasMenu(model);

      const action = model.contextMenu.items().find((item) => item.kind === 'action' && item.label === 'Go to Logs');
      expect(action).toBeTruthy();
      if (action?.kind === 'action') {
        action.onSelect();
      }

      expect(untrack(state).widgets).toHaveLength(1);
      expect(untrack(state).widgets[0]?.id).toBe('logs-1');
      expect(untrack(state).selectedWidgetId).toBe('logs-1');
      expect(model.contextMenu.state()).toBeNull();

      dispose();
    });
  });

  it('routes Add through widget creation for singleton widgets that are still absent', () => {
    createRoot((dispose) => {
      const [state, setState] = createSignal(createWorkbenchState([]));
      const model = useWorkbenchModel({
        state,
        setState,
        onClose: vi.fn(),
        widgetDefinitions: definitions,
      });

      openCanvasMenu(model, 520, 360);

      const action = model.contextMenu.items().find((item) => item.kind === 'action' && item.label === 'Add Logs');
      expect(action).toBeTruthy();
      if (action?.kind === 'action') {
        action.onSelect();
      }

      expect(untrack(state).widgets).toHaveLength(1);
      expect(untrack(state).widgets[0]?.type).toBe('custom.logs');
      expect(untrack(state).selectedWidgetId).toBe(untrack(state).widgets[0]?.id ?? null);
      expect(model.contextMenu.state()).toBeNull();

      dispose();
    });
  });
});
