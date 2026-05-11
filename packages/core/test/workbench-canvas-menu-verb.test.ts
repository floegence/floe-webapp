// @vitest-environment jsdom

import { createRoot, createSignal, untrack } from 'solid-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useWorkbenchModel } from '../src/components/workbench/useWorkbenchModel';
import type { InfiniteCanvasContextMenuEvent } from '../src/ui';
import { createWorkbenchFilterState } from '../src/components/workbench/widgets/widgetRegistry';
import { Region, TextTool } from '../src/components/icons';
import type {
  WorkbenchBackgroundLayer,
  WorkbenchStickyNoteItem,
  WorkbenchWidgetDefinition,
  WorkbenchWidgetItem,
} from '../src/components/workbench/types';

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

beforeEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

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

function createStickyNote(): WorkbenchStickyNoteItem {
  return {
    id: 'sticky-1',
    kind: 'sticky_note',
    body: 'A dedicated note',
    color: 'amber',
    x: 240,
    y: 180,
    width: 260,
    height: 184,
    z_index: 2,
    created_at_unix_ms: 2,
    updated_at_unix_ms: 2,
  };
}

function createRegion(): WorkbenchBackgroundLayer {
  return {
    id: 'region-1',
    name: 'Focus area',
    fill: '#9da8a1',
    opacity: 0.72,
    material: 'dotted',
    x: 100,
    y: 80,
    width: 560,
    height: 360,
    z_index: 1,
    created_at_unix_ms: 1,
    updated_at_unix_ms: 1,
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

  it('opens work-mode canvas menu with sticky and widget actions', () => {
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
      expect(labels[0]).toBe('Add Sticky');
      expect(labels).toContain('Add Logs');
      expect(labels).not.toContain('Add Region');
      expect(labels).not.toContain('Add Text');

      dispose();
    });
  });

  it('opens background-mode canvas menu with region and text actions only', () => {
    createRoot((dispose) => {
      const [state, setState] = createSignal({
        ...createWorkbenchState([]),
        mode: 'background' as const,
      });
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
      expect(labels).toEqual(['Add Region', 'Add Text']);
      expect(
        model.contextMenu.items().find((item) => item.kind === 'action' && item.label === 'Add Region')
      ).toMatchObject({ icon: Region });
      expect(
        model.contextMenu.items().find((item) => item.kind === 'action' && item.label === 'Add Text')
      ).toMatchObject({ icon: TextTool });

      dispose();
    });
  });

  it('uses sticky-specific context menu actions instead of widget actions', () => {
    createRoot((dispose) => {
      const sticky = createStickyNote();
      const [state, setState] = createSignal({
        ...createWorkbenchState([]),
        stickyNotes: [sticky],
      });
      const model = useWorkbenchModel({
        state,
        setState,
        onClose: vi.fn(),
        widgetDefinitions: definitions,
      });

      model.canvas.openStickyNoteContextMenu(
        new MouseEvent('contextmenu', { clientX: 32, clientY: 40 }),
        sticky,
      );

      const labels = model.contextMenu.items()
        .filter((item) => item.kind === 'action')
        .map((item) => item.label);
      expect(labels).toEqual(['Bring to Front', 'Copy Content', 'Change Color', 'Delete']);

      const copy = model.contextMenu.items().find((item) => item.kind === 'action' && item.label === 'Copy Content');
      if (copy?.kind === 'action') {
        copy.onSelect();
      }

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('A dedicated note');
      expect(untrack(state).stickyNotes).toHaveLength(1);
      expect(model.contextMenu.state()).toBeNull();

      dispose();
    });
  });

  it('uses region-specific context menu actions in background mode', () => {
    createRoot((dispose) => {
      const region = createRegion();
      const [state, setState] = createSignal({
        ...createWorkbenchState([]),
        mode: 'background' as const,
        backgroundLayers: [region],
      });
      const model = useWorkbenchModel({
        state,
        setState,
        onClose: vi.fn(),
        widgetDefinitions: definitions,
      });

      model.canvas.openBackgroundLayerContextMenu(
        new MouseEvent('contextmenu', { clientX: 32, clientY: 40 }),
        region,
      );

      const labels = model.contextMenu.items()
        .filter((item) => item.kind === 'action')
        .map((item) => item.label);
      expect(labels).toEqual(['Duplicate Region', 'Change Material', 'Delete Region']);

      dispose();
    });
  });
});
