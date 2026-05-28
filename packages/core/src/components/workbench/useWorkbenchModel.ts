import { batch, createEffect, createMemo, createSignal, onCleanup } from 'solid-js';
import type { InfiniteCanvasContextMenuEvent } from '../../ui';
import { clientToCanvasWorld } from '../ui/canvasGeometry';
import { ArrowUp, Copy, MessageSquare, Region, TextTool, Trash } from '../../icons';
import {
  type WorkbenchWidgetDefinition,
  type WorkbenchContextMenuState,
  type WorkbenchContextMenuTarget,
  type WorkbenchSelection,
  type WorkbenchState,
  type WorkbenchAnnotationItem,
  type WorkbenchBackgroundLayerDefaults,
  type WorkbenchBackgroundLayerPatch,
  type WorkbenchStickyNoteItem,
  type WorkbenchStickyNotePatch,
  type WorkbenchViewport,
  type WorkbenchWidgetItem,
  type WorkbenchWidgetType,
  type WorkbenchBackgroundMaterial,
  type WorkbenchBackgroundLayer,
  type WorkbenchDockToolId,
  type WorkbenchInteractionMode,
  type WorkbenchStickyNoteColor,
  type WorkbenchTextAnnotationDefaults,
  type WorkbenchTextAnnotationItem,
  type WorkbenchTextAnnotationPatch,
  WORKBENCH_STICKY_FILTER_ID,
} from './types';
import {
  WORKBENCH_BACKGROUND_MATERIALS,
  WORKBENCH_DEFAULT_BACKGROUND_MATERIAL,
  WORKBENCH_DEFAULT_REGION_FILL,
  WORKBENCH_DEFAULT_STICKY_NOTE_COLOR,
  WORKBENCH_DEFAULT_TEXT_COLOR,
  WORKBENCH_DEFAULT_TEXT_FONT,
  WORKBENCH_REGION_FILL_OPTIONS,
  WORKBENCH_STICKY_NOTE_COLORS,
} from './workbenchOptions';
import type { WorkbenchThemeId } from './workbenchThemes';
import {
  clampScale,
  createContextMenuPosition,
  createWorkbenchId,
  createWorkbenchViewportAtScale,
  createWorkbenchViewportCenteredOnWidget,
  createWorkbenchViewportFitForWidget,
  createWorkbenchWidgetFrame,
  estimateContextMenuHeight,
  findNearestWidget,
  compareWorkbenchLayerRenderOrder,
  normalizeWorkbenchInteractionMode,
  resolveWorkbenchLayerFront,
  resolveWorkbenchModeStrategy,
  sanitizeFilters,
  WORKBENCH_CANVAS_ZOOM_STEP,
  WORKBENCH_CONTEXT_MENU_WIDTH_PX,
  WORKBENCH_WORK_MIN_SCALE,
  WORKBENCH_MAX_SCALE,
  type WorkbenchWidgetPlacement,
} from './workbenchHelpers';
import { getWidgetEntry, resolveWorkbenchWidgetDefinitions } from './widgets/widgetRegistry';
import {
  resolveBackgroundLayerDefaultSize,
  resolveStickyNoteDefaultSize,
  resolveTextAnnotationDefaultSize,
} from './workbenchPlacement';
import type {
  WorkbenchContextMenuItem,
  WorkbenchContextMenuSelectEvent,
} from './WorkbenchContextMenu';

type WorkbenchCanvasMenuVerb = 'add' | 'go_to';

type WorkbenchCanvasMenuAction = Readonly<{
  id: string;
  kind: 'action';
  verb: WorkbenchCanvasMenuVerb;
  widgetType: WorkbenchWidgetType;
  label: string;
  icon: WorkbenchWidgetDefinition['icon'];
  existingWidgetId?: string;
  onSelect: (event?: WorkbenchContextMenuSelectEvent) => void;
}>;

export interface UseWorkbenchModelOptions {
  state: () => WorkbenchState;
  setState: (updater: (prev: WorkbenchState) => WorkbenchState) => void;
  onClose: () => void;
  widgetDefinitions?:
    | readonly WorkbenchWidgetDefinition[]
    | (() => readonly WorkbenchWidgetDefinition[] | undefined);
  textAnnotationDefaults?:
    | WorkbenchTextAnnotationDefaults
    | (() => WorkbenchTextAnnotationDefaults | undefined);
  backgroundLayerDefaults?:
    | WorkbenchBackgroundLayerDefaults
    | (() => WorkbenchBackgroundLayerDefaults | undefined);
}

type WorkbenchWorkItem = WorkbenchWidgetItem | WorkbenchStickyNoteItem;

function nextValue<T>(values: readonly T[], current: T): T {
  const index = values.findIndex((value) => value === current);
  return values[(index + 1) % values.length] ?? values[0]!;
}

function stringOption<T extends string>(values: readonly T[], value: unknown, fallback: T): T {
  const normalized = String(value ?? '').trim();
  return values.includes(normalized as T) ? (normalized as T) : fallback;
}

function opacityValue(value: unknown, fallback: number): number {
  const next = Number(value);
  return Number.isFinite(next) ? Math.max(0.08, Math.min(1, next)) : fallback;
}

function nextStickyNoteColor(current: WorkbenchStickyNoteColor): WorkbenchStickyNoteColor {
  return nextValue<WorkbenchStickyNoteColor>(WORKBENCH_STICKY_NOTE_COLORS, current);
}

function nextBackgroundMaterial(current: WorkbenchBackgroundMaterial): WorkbenchBackgroundMaterial {
  return nextValue(WORKBENCH_BACKGROUND_MATERIALS, current);
}

function isWidgetWorkItem(item: WorkbenchWorkItem): item is WorkbenchWidgetItem {
  return !('kind' in item);
}

function getTopLayerIndex(items: readonly { z_index: number }[]): number {
  return items.reduce((max, item) => Math.max(max, item.z_index), 1);
}

function getTopWorkZIndex(
  widgets: readonly WorkbenchWidgetItem[],
  stickyNotes: readonly WorkbenchStickyNoteItem[]
): number {
  return getTopLayerIndex([...widgets, ...stickyNotes]);
}

function stickyNoteAsNavigationWidget(item: WorkbenchStickyNoteItem): WorkbenchWidgetItem {
  return {
    id: item.id,
    type: 'sticky_note',
    title: 'Sticky note',
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
    z_index: item.z_index,
    created_at_unix_ms: item.created_at_unix_ms,
  };
}

function createStickyNoteAt(
  worldX: number,
  worldY: number,
  zIndex: number
): WorkbenchStickyNoteItem {
  const now = Date.now();
  const { width, height } = resolveStickyNoteDefaultSize();
  return {
    id: createWorkbenchId(),
    kind: 'sticky_note',
    body: 'Capture the thought, decision, or next step here.',
    color: WORKBENCH_DEFAULT_STICKY_NOTE_COLOR,
    x: worldX - width / 2,
    y: worldY - height / 2,
    width,
    height,
    z_index: zIndex,
    created_at_unix_ms: now,
    updated_at_unix_ms: now,
  };
}

function createTextAnnotationAt(
  worldX: number,
  worldY: number,
  zIndex: number,
  defaults: WorkbenchTextAnnotationDefaults | undefined
): WorkbenchTextAnnotationItem {
  const now = Date.now();
  const { width, height } = resolveTextAnnotationDefaultSize(defaults);
  return {
    id: createWorkbenchId(),
    kind: 'text',
    text: 'Label this area',
    font_family: defaults?.font_family ?? WORKBENCH_DEFAULT_TEXT_FONT.fontFamily,
    font_size: defaults?.font_size ?? 30,
    font_weight: defaults?.font_weight ?? WORKBENCH_DEFAULT_TEXT_FONT.fontWeight,
    color: defaults?.color ?? WORKBENCH_DEFAULT_TEXT_COLOR,
    align: defaults?.align ?? 'left',
    x: worldX - width / 2,
    y: worldY - height / 2,
    width,
    height,
    z_index: zIndex,
    created_at_unix_ms: now,
    updated_at_unix_ms: now,
  };
}

function duplicateTextAnnotation(item: WorkbenchTextAnnotationItem): WorkbenchTextAnnotationItem {
  const now = Date.now();
  return {
    ...item,
    id: createWorkbenchId(),
    x: item.x + 28,
    y: item.y + 28,
    z_index: item.z_index + 1,
    created_at_unix_ms: now,
    updated_at_unix_ms: now,
  };
}

function createBackgroundLayerAt(
  worldX: number,
  worldY: number,
  zIndex: number,
  defaults: WorkbenchBackgroundLayerDefaults | undefined
): WorkbenchBackgroundLayer {
  const now = Date.now();
  const { width, height } = resolveBackgroundLayerDefaultSize(defaults);
  const name = String(defaults?.name ?? '').trim() || 'Focus area';
  return {
    id: createWorkbenchId(),
    name,
    fill: stringOption(
      WORKBENCH_REGION_FILL_OPTIONS,
      defaults?.fill,
      WORKBENCH_DEFAULT_REGION_FILL
    ),
    opacity: opacityValue(defaults?.opacity, 0.72),
    material: stringOption(
      WORKBENCH_BACKGROUND_MATERIALS,
      defaults?.material,
      WORKBENCH_DEFAULT_BACKGROUND_MATERIAL
    ),
    x: worldX - width / 2,
    y: worldY - height / 2,
    width,
    height,
    z_index: zIndex,
    created_at_unix_ms: now,
    updated_at_unix_ms: now,
  };
}

function duplicateBackgroundLayer(item: WorkbenchBackgroundLayer): WorkbenchBackgroundLayer {
  const now = Date.now();
  return {
    ...item,
    id: createWorkbenchId(),
    name: item.name,
    x: item.x + 36,
    y: item.y + 36,
    z_index: item.z_index + 1,
    created_at_unix_ms: now,
    updated_at_unix_ms: now,
  };
}

export function useWorkbenchModel(options: UseWorkbenchModelOptions) {
  const [contextMenu, setContextMenu] = createSignal<WorkbenchContextMenuState | null>(null);
  const [visualFrontOwnerId, setVisualFrontOwnerId] = createSignal<string | null>(null);
  const [canvasFrameSize, setCanvasFrameSize] = createSignal({ width: 0, height: 0 });
  let canvasFrameEl: HTMLDivElement | null = null;
  let canvasFrameObserver: ResizeObserver | null = null;

  const state = options.state;
  const widgets = createMemo(() => state().widgets);
  const stickyNotes = createMemo(() => state().stickyNotes ?? []);
  const annotations = createMemo(() => state().annotations ?? []);
  const backgroundLayers = createMemo(() => state().backgroundLayers ?? []);
  const viewport = createMemo(() => state().viewport);
  const locked = createMemo(() => state().locked);
  const filters = createMemo(() => state().filters);
  const selectedWidgetId = createMemo(() => state().selectedWidgetId);
  const selectedObject = createMemo<WorkbenchSelection | null>(
    () =>
      state().selectedObject ??
      (state().selectedWidgetId ? { kind: 'widget', id: state().selectedWidgetId! } : null)
  );
  const mode = createMemo(() => state().mode ?? 'work');
  const modeStrategy = createMemo(() => resolveWorkbenchModeStrategy(mode()));
  const activeTool = createMemo(() => state().activeTool ?? 'select');
  const theme = createMemo(() => state().theme);
  const topZIndex = createMemo(() => getTopWorkZIndex(widgets(), stickyNotes()));
  const topLayerItemId = createMemo(() => {
    const ordered = [...widgets(), ...stickyNotes()].sort(compareWorkbenchLayerRenderOrder);
    return ordered.at(-1)?.id ?? null;
  });
  const scaleLabel = createMemo(() => `${Math.round(viewport().scale * 100)}%`);

  createEffect(() => {
    const ownerId = visualFrontOwnerId();
    if (ownerId && ownerId !== topLayerItemId()) {
      setVisualFrontOwnerId(null);
    }
  });

  const claimVisualFrontOwner = (itemId: string) => {
    setVisualFrontOwnerId(itemId);
  };
  const readWidgetDefinitions = () =>
    typeof options.widgetDefinitions === 'function'
      ? options.widgetDefinitions()
      : options.widgetDefinitions;
  const readTextAnnotationDefaults = () =>
    typeof options.textAnnotationDefaults === 'function'
      ? options.textAnnotationDefaults()
      : options.textAnnotationDefaults;
  const readBackgroundLayerDefaults = () =>
    typeof options.backgroundLayerDefaults === 'function'
      ? options.backgroundLayerDefaults()
      : options.backgroundLayerDefaults;
  const widgetDefinitions = createMemo(() =>
    resolveWorkbenchWidgetDefinitions(readWidgetDefinitions())
  );

  const setMeasuredCanvasFrameSize = (width: number, height: number) => {
    const nextWidth = Number.isFinite(width) && width > 0 ? width : 0;
    const nextHeight = Number.isFinite(height) && height > 0 ? height : 0;
    const nextSize = { width: nextWidth, height: nextHeight };
    const currentSize = canvasFrameSize();

    if (currentSize.width === nextWidth && currentSize.height === nextHeight) {
      return currentSize;
    }

    setCanvasFrameSize(nextSize);

    return nextSize;
  };

  const disconnectCanvasFrameObserver = () => {
    canvasFrameObserver?.disconnect();
    canvasFrameObserver = null;
  };

  const readCanvasFrameSize = () => {
    if (!canvasFrameEl) {
      return setMeasuredCanvasFrameSize(0, 0);
    }

    return setMeasuredCanvasFrameSize(canvasFrameEl.clientWidth, canvasFrameEl.clientHeight);
  };

  const setCanvasFrameRef = (el: HTMLDivElement | undefined) => {
    if (canvasFrameEl === (el ?? null)) {
      readCanvasFrameSize();
      return;
    }

    disconnectCanvasFrameObserver();
    canvasFrameEl = el ?? null;
    readCanvasFrameSize();

    if (!canvasFrameEl || typeof ResizeObserver === 'undefined') return;

    canvasFrameObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      setMeasuredCanvasFrameSize(
        entry?.contentRect.width ?? canvasFrameEl?.clientWidth ?? 0,
        entry?.contentRect.height ?? canvasFrameEl?.clientHeight ?? 0
      );
    });
    canvasFrameObserver.observe(canvasFrameEl);
  };

  onCleanup(() => {
    disconnectCanvasFrameObserver();
    canvasFrameEl = null;
  });

  // --- Context Menu ---
  const openCanvasContextMenu = (event: InfiniteCanvasContextMenuEvent) => {
    setContextMenu({
      clientX: event.clientX,
      clientY: event.clientY,
      worldX: event.worldX,
      worldY: event.worldY,
      target: { kind: 'canvas', mode: mode() },
    });
  };

  const openWidgetContextMenu = (event: MouseEvent, item: WorkbenchWidgetItem) => {
    commitFront(item.id);
    setContextMenu({
      clientX: event.clientX,
      clientY: event.clientY,
      worldX: item.x,
      worldY: item.y,
      target: { kind: 'widget', id: item.id },
      widgetId: item.id,
    });
  };

  const openStickyNoteContextMenu = (event: MouseEvent, item: WorkbenchStickyNoteItem) => {
    commitStickyFront(item.id);
    setContextMenu({
      clientX: event.clientX,
      clientY: event.clientY,
      worldX: item.x,
      worldY: item.y,
      target: { kind: 'sticky_note', id: item.id },
      widgetId: item.id,
    });
  };

  const openAnnotationContextMenu = (event: MouseEvent, item: WorkbenchAnnotationItem) => {
    setContextMenu({
      clientX: event.clientX,
      clientY: event.clientY,
      worldX: item.x,
      worldY: item.y,
      target: { kind: 'annotation', id: item.id },
    });
  };

  const openBackgroundLayerContextMenu = (event: MouseEvent, item: WorkbenchBackgroundLayer) => {
    setContextMenu({
      clientX: event.clientX,
      clientY: event.clientY,
      worldX: item.x,
      worldY: item.y,
      target: { kind: 'background_layer', id: item.id },
    });
  };

  const closeContextMenu = () => setContextMenu(null);
  const findWidgetById = (widgetId: string) =>
    state().widgets.find((widget) => widget.id === widgetId) ?? null;
  const findWidgetByType = (type: WorkbenchWidgetType) =>
    state().widgets.find((widget) => widget.type === type) ?? null;
  const findStickyNoteById = (noteId: string) =>
    state().stickyNotes?.find((item) => item.id === noteId) ?? null;
  const findAnnotationById = (annotationId: string) =>
    state().annotations?.find((item) => item.id === annotationId) ?? null;
  const findBackgroundLayerById = (layerId: string) =>
    state().backgroundLayers?.find((item) => item.id === layerId) ?? null;
  const resolveContextMenuTarget = (
    menu: WorkbenchContextMenuState
  ): WorkbenchContextMenuTarget => {
    if (menu.target) return menu.target;
    if (menu.widgetId) {
      return findStickyNoteById(menu.widgetId)
        ? { kind: 'sticky_note', id: menu.widgetId }
        : { kind: 'widget', id: menu.widgetId };
    }
    return { kind: 'canvas', mode: mode() };
  };
  const resolveCanvasMenuCreationPoint = (
    menu: WorkbenchContextMenuState,
    activation?: WorkbenchContextMenuSelectEvent
  ) => {
    if (activation?.source === 'pointer') {
      const rect = canvasFrameEl?.getBoundingClientRect();
      const point = rect
        ? clientToCanvasWorld(rect, viewport(), {
            clientX: activation.clientX,
            clientY: activation.clientY,
          })
        : null;
      if (point) {
        return point;
      }
    }

    return {
      worldX: menu.worldX,
      worldY: menu.worldY,
    };
  };

  const buildCanvasContextMenuAction = (
    entry: WorkbenchWidgetDefinition,
    menu: WorkbenchContextMenuState
  ): WorkbenchCanvasMenuAction => {
    const existing = entry.singleton ? findWidgetByType(entry.type) : null;
    if (existing) {
      return {
        id: `goto-${entry.type}`,
        kind: 'action',
        verb: 'go_to',
        widgetType: entry.type,
        label: `Go to ${entry.label}`,
        icon: entry.icon,
        existingWidgetId: existing.id,
        onSelect: () => {
          focusWidget(existing, { centerViewport: true });
          closeContextMenu();
        },
      };
    }

    return {
      id: `add-${entry.type}`,
      kind: 'action',
      verb: 'add',
      widgetType: entry.type,
      label: `Add ${entry.label}`,
      icon: entry.icon,
      onSelect: (activation) => {
        const point = resolveCanvasMenuCreationPoint(menu, activation);
        addWidgetAtWorldCenter(entry.type, point.worldX, point.worldY);
        closeContextMenu();
      },
    };
  };

  const contextMenuItems = createMemo<WorkbenchContextMenuItem[]>(() => {
    const menu = contextMenu();
    if (!menu) return [];

    const target = resolveContextMenuTarget(menu);

    if (target.kind === 'widget') {
      const widget = widgets().find((w) => w.id === target.id);
      const items: WorkbenchContextMenuItem[] = [];

      if (widget) {
        items.push({
          id: 'bring-to-front',
          kind: 'action',
          label: 'Bring to Front',
          icon: ArrowUp,
          onSelect: () => {
            commitFront(widget.id);
            closeContextMenu();
          },
        });
        items.push({
          id: 'duplicate',
          kind: 'action',
          label: 'Duplicate',
          icon: Copy,
          onSelect: () => {
            addWidgetAtWorldTopLeft(widget.type, widget.x + 32, widget.y + 32);
            closeContextMenu();
          },
        });
      }

      items.push({ id: 'separator-delete', kind: 'separator' });
      items.push({
        id: 'delete',
        kind: 'action',
        label: 'Delete',
        icon: Trash,
        destructive: true,
        onSelect: () => {
          deleteWidget(target.id);
          closeContextMenu();
        },
      });

      return items;
    }

    if (target.kind === 'sticky_note') {
      const note = findStickyNoteById(target.id);
      const items: WorkbenchContextMenuItem[] = [];

      if (note) {
        items.push({
          id: 'bring-to-front',
          kind: 'action',
          label: 'Bring to Front',
          icon: ArrowUp,
          onSelect: () => {
            commitStickyFront(note.id);
            closeContextMenu();
          },
        });
        items.push({
          id: 'copy-content',
          kind: 'action',
          label: 'Copy Content',
          icon: Copy,
          onSelect: () => {
            if (typeof navigator !== 'undefined') {
              void navigator.clipboard?.writeText(note.body);
            }
            closeContextMenu();
          },
        });
        items.push({
          id: 'change-color',
          kind: 'action',
          label: 'Change Color',
          icon: MessageSquare,
          onSelect: () => {
            updateStickyNote(note.id, { color: nextStickyNoteColor(note.color) });
            closeContextMenu();
          },
        });
      }

      items.push({ id: 'separator-delete', kind: 'separator' });
      items.push({
        id: 'delete',
        kind: 'action',
        label: 'Delete',
        icon: Trash,
        destructive: true,
        onSelect: () => {
          deleteStickyNote(target.id);
          closeContextMenu();
        },
      });

      return items;
    }

    if (target.kind === 'annotation') {
      const annotation = findAnnotationById(target.id);
      const items: WorkbenchContextMenuItem[] = [];

      if (annotation?.kind === 'text') {
        items.push({
          id: 'duplicate',
          kind: 'action',
          label: 'Duplicate Text',
          icon: Copy,
          onSelect: () => {
            duplicateTextAnnotationFrom(annotation);
            closeContextMenu();
          },
        });
      }

      items.push({ id: 'separator-delete', kind: 'separator' });
      items.push({
        id: 'delete',
        kind: 'action',
        label: 'Delete Text',
        icon: Trash,
        destructive: true,
        onSelect: () => {
          deleteAnnotation(target.id);
          closeContextMenu();
        },
      });

      return items;
    }

    if (target.kind === 'background_layer') {
      const layer = findBackgroundLayerById(target.id);
      const items: WorkbenchContextMenuItem[] = [];

      if (layer) {
        items.push({
          id: 'duplicate',
          kind: 'action',
          label: 'Duplicate Region',
          icon: Copy,
          onSelect: () => {
            duplicateBackgroundLayerFrom(layer);
            closeContextMenu();
          },
        });
        items.push({
          id: 'change-material',
          kind: 'action',
          label: 'Change Material',
          icon: Region,
          onSelect: () => {
            updateBackgroundLayer(layer.id, { material: nextBackgroundMaterial(layer.material) });
            closeContextMenu();
          },
        });
      }

      items.push({ id: 'separator-delete', kind: 'separator' });
      items.push({
        id: 'delete',
        kind: 'action',
        label: 'Delete Region',
        icon: Trash,
        destructive: true,
        onSelect: () => {
          deleteBackgroundLayer(target.id);
          closeContextMenu();
        },
      });

      return items;
    }

    if (target.mode === 'background') {
      return [
        {
          id: 'create-background-region',
          kind: 'action',
          label: 'Add Region',
          icon: Region,
          onSelect: (activation) => {
            const point = resolveCanvasMenuCreationPoint(menu, activation);
            addBackgroundLayerAtCursor(point.worldX, point.worldY);
            closeContextMenu();
          },
        },
        {
          id: 'create-text',
          kind: 'action',
          label: 'Add Text',
          icon: TextTool,
          onSelect: (activation) => {
            const point = resolveCanvasMenuCreationPoint(menu, activation);
            addTextAnnotationAtCursor(point.worldX, point.worldY);
            closeContextMenu();
          },
        },
      ];
    }

    return [
      {
        id: 'create-sticky-note',
        kind: 'action',
        label: 'Add Sticky',
        icon: MessageSquare,
        onSelect: (activation) => {
          const point = resolveCanvasMenuCreationPoint(menu, activation);
          addStickyNoteAtCursor(point.worldX, point.worldY);
          closeContextMenu();
        },
      },
      ...widgetDefinitions().map((entry) => buildCanvasContextMenuAction(entry, menu)),
    ];
  });

  const contextMenuPosition = createMemo(() => {
    const menu = contextMenu();
    if (!menu) return undefined;

    const items = contextMenuItems();
    const actionCount = items.filter((i) => i.kind === 'action').length;
    const separatorCount = items.filter((i) => i.kind === 'separator').length;

    return createContextMenuPosition({
      clientX: menu.clientX,
      clientY: menu.clientY,
      menuWidth: WORKBENCH_CONTEXT_MENU_WIDTH_PX,
      menuHeight: estimateContextMenuHeight(actionCount, separatorCount),
    });
  });

  // --- Widget CRUD ---
  const addWidgetFromPlacement = (
    type: WorkbenchWidgetType,
    placement: WorkbenchWidgetPlacement
  ) => {
    const entry = getWidgetEntry(type, widgetDefinitions());
    const existing = entry.singleton ? findWidgetByType(type) : null;
    if (existing) {
      return focusWidget(existing, { centerViewport: true });
    }

    const frame = createWorkbenchWidgetFrame(entry, placement);
    const newWidget: WorkbenchWidgetItem = {
      id: createWorkbenchId(),
      type,
      title: entry.defaultTitle,
      x: frame.x,
      y: frame.y,
      width: frame.width,
      height: frame.height,
      z_index: topZIndex() + 1,
      created_at_unix_ms: Date.now(),
    };

    batch(() => {
      options.setState((prev) => ({
        ...prev,
        widgets: [...prev.widgets, newWidget],
        selectedWidgetId: newWidget.id,
        selectedObject: { kind: 'widget', id: newWidget.id },
        mode: 'work',
        activeTool: 'select',
      }));
      claimVisualFrontOwner(newWidget.id);
    });

    return newWidget;
  };

  const addWidget = (type: WorkbenchWidgetType, worldX: number, worldY: number) => {
    return addWidgetFromPlacement(type, {
      anchor: 'top_left',
      worldX,
      worldY,
    });
  };

  const addWidgetAtWorldTopLeft = (type: WorkbenchWidgetType, worldX: number, worldY: number) => {
    return addWidgetFromPlacement(type, {
      anchor: 'top_left',
      worldX,
      worldY,
    });
  };

  const addWidgetAtWorldCenter = (type: WorkbenchWidgetType, worldX: number, worldY: number) => {
    return addWidgetFromPlacement(type, {
      anchor: 'center',
      worldX,
      worldY,
    });
  };

  const deleteWidget = (widgetId: string) => {
    options.setState((prev) => ({
      ...prev,
      widgets: prev.widgets.filter((w) => w.id !== widgetId),
      selectedWidgetId: prev.selectedWidgetId === widgetId ? null : prev.selectedWidgetId,
      selectedObject:
        prev.selectedObject?.kind === 'widget' && prev.selectedObject.id === widgetId
          ? null
          : (prev.selectedObject ?? null),
    }));
  };

  const addStickyNoteAtCursor = (worldX: number, worldY: number) => {
    const stickyNote = createStickyNoteAt(worldX, worldY, topZIndex() + 1);
    batch(() => {
      options.setState((prev) => ({
        ...prev,
        stickyNotes: [...(prev.stickyNotes ?? []), stickyNote],
        selectedWidgetId: null,
        selectedObject: { kind: 'sticky_note', id: stickyNote.id },
        mode: 'work',
        activeTool: 'select',
      }));
      claimVisualFrontOwner(stickyNote.id);
    });
    return stickyNote;
  };

  const addTextAnnotationAtCursor = (worldX: number, worldY: number) => {
    const annotation = createTextAnnotationAt(
      worldX,
      worldY,
      getTopLayerIndex(annotations()) + 1,
      readTextAnnotationDefaults()
    );
    options.setState((prev) => ({
      ...prev,
      annotations: [...(prev.annotations ?? []), annotation],
      selectedWidgetId: null,
      selectedObject: { kind: 'annotation', id: annotation.id },
      mode: 'background',
      activeTool: 'select',
    }));
    return annotation;
  };

  const duplicateTextAnnotationFrom = (item: WorkbenchTextAnnotationItem) => {
    const annotation = duplicateTextAnnotation(item);
    options.setState((prev) => ({
      ...prev,
      annotations: [...(prev.annotations ?? []), annotation],
      selectedWidgetId: null,
      selectedObject: { kind: 'annotation', id: annotation.id },
      mode: 'background',
      activeTool: 'select',
    }));
    return annotation;
  };

  const addBackgroundLayerAtCursor = (worldX: number, worldY: number) => {
    const layer = createBackgroundLayerAt(
      worldX,
      worldY,
      getTopLayerIndex(backgroundLayers()) + 1,
      readBackgroundLayerDefaults()
    );
    options.setState((prev) => ({
      ...prev,
      backgroundLayers: [...(prev.backgroundLayers ?? []), layer],
      selectedWidgetId: null,
      selectedObject: { kind: 'background_layer', id: layer.id },
      mode: 'background',
      activeTool: 'select',
    }));
    return layer;
  };

  const duplicateBackgroundLayerFrom = (item: WorkbenchBackgroundLayer) => {
    const layer = duplicateBackgroundLayer(item);
    options.setState((prev) => ({
      ...prev,
      backgroundLayers: [...(prev.backgroundLayers ?? []), layer],
      selectedWidgetId: null,
      selectedObject: { kind: 'background_layer', id: layer.id },
      mode: 'background',
      activeTool: 'select',
    }));
    return layer;
  };

  // --- Front / Move ---
  const commitFront = (widgetId: string) => {
    const resolution = resolveWorkbenchLayerFront([...widgets(), ...stickyNotes()], widgetId);
    if (!resolution) {
      return;
    }
    batch(() => {
      if (!resolution.isTop) {
        options.setState((prev) => ({
          ...prev,
          widgets: prev.widgets.map((w) =>
            w.id === widgetId ? { ...w, z_index: resolution.nextZIndex } : w
          ),
        }));
      }
      claimVisualFrontOwner(widgetId);
    });
  };

  const commitStickyFront = (noteId: string) => {
    const resolution = resolveWorkbenchLayerFront([...widgets(), ...stickyNotes()], noteId);
    if (!resolution) {
      return;
    }
    batch(() => {
      if (!resolution.isTop) {
        options.setState((prev) => ({
          ...prev,
          stickyNotes: (prev.stickyNotes ?? []).map((item) =>
            item.id === noteId
              ? { ...item, z_index: resolution.nextZIndex, updated_at_unix_ms: Date.now() }
              : item
          ),
        }));
      }
      claimVisualFrontOwner(noteId);
    });
  };

  const commitMove = (widgetId: string, position: { x: number; y: number }) => {
    options.setState((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w) =>
        w.id === widgetId ? { ...w, x: position.x, y: position.y } : w
      ),
    }));
  };

  const commitResize = (widgetId: string, size: { width: number; height: number }) => {
    options.setState((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w) =>
        w.id === widgetId ? { ...w, width: size.width, height: size.height } : w
      ),
    }));
  };

  const commitStickyMove = (noteId: string, position: { x: number; y: number }) => {
    options.setState((prev) => ({
      ...prev,
      stickyNotes: (prev.stickyNotes ?? []).map((item) =>
        item.id === noteId
          ? { ...item, x: position.x, y: position.y, updated_at_unix_ms: Date.now() }
          : item
      ),
    }));
  };

  const commitStickyResize = (noteId: string, size: { width: number; height: number }) => {
    options.setState((prev) => ({
      ...prev,
      stickyNotes: (prev.stickyNotes ?? []).map((item) =>
        item.id === noteId
          ? { ...item, width: size.width, height: size.height, updated_at_unix_ms: Date.now() }
          : item
      ),
    }));
  };

  const updateStickyNote = (noteId: string, patch: WorkbenchStickyNotePatch) => {
    options.setState((prev) => ({
      ...prev,
      stickyNotes: (prev.stickyNotes ?? []).map((item) =>
        item.id === noteId
          ? {
              ...item,
              ...(typeof patch.body === 'string' ? { body: patch.body } : {}),
              ...(patch.color ? { color: patch.color } : {}),
              updated_at_unix_ms: Date.now(),
            }
          : item
      ),
    }));
  };

  const deleteStickyNote = (noteId: string) => {
    options.setState((prev) => ({
      ...prev,
      stickyNotes: (prev.stickyNotes ?? []).filter((item) => item.id !== noteId),
      selectedObject:
        prev.selectedObject?.kind === 'sticky_note' && prev.selectedObject.id === noteId
          ? null
          : (prev.selectedObject ?? null),
    }));
  };

  const commitAnnotationMove = (annotationId: string, position: { x: number; y: number }) => {
    options.setState((prev) => ({
      ...prev,
      annotations: (prev.annotations ?? []).map((item) =>
        item.id === annotationId
          ? { ...item, x: position.x, y: position.y, updated_at_unix_ms: Date.now() }
          : item
      ),
    }));
  };

  const commitAnnotationResize = (
    annotationId: string,
    size: { width: number; height: number }
  ) => {
    options.setState((prev) => ({
      ...prev,
      annotations: (prev.annotations ?? []).map((item) =>
        item.id === annotationId
          ? { ...item, width: size.width, height: size.height, updated_at_unix_ms: Date.now() }
          : item
      ),
    }));
  };

  const updateTextAnnotation = (annotationId: string, patch: WorkbenchTextAnnotationPatch) => {
    options.setState((prev) => ({
      ...prev,
      annotations: (prev.annotations ?? []).map((item) =>
        item.id === annotationId && item.kind === 'text'
          ? {
              ...item,
              ...(typeof patch.text === 'string' ? { text: patch.text } : {}),
              ...(typeof patch.font_family === 'string' ? { font_family: patch.font_family } : {}),
              ...(typeof patch.font_size === 'number' ? { font_size: patch.font_size } : {}),
              ...(typeof patch.font_weight === 'number' ? { font_weight: patch.font_weight } : {}),
              ...(typeof patch.color === 'string' ? { color: patch.color } : {}),
              ...(patch.align ? { align: patch.align } : {}),
              updated_at_unix_ms: Date.now(),
            }
          : item
      ),
    }));
  };

  const deleteAnnotation = (annotationId: string) => {
    options.setState((prev) => ({
      ...prev,
      annotations: (prev.annotations ?? []).filter((item) => item.id !== annotationId),
      selectedObject:
        prev.selectedObject?.kind === 'annotation' && prev.selectedObject.id === annotationId
          ? null
          : (prev.selectedObject ?? null),
    }));
  };

  const commitBackgroundMove = (layerId: string, position: { x: number; y: number }) => {
    options.setState((prev) => ({
      ...prev,
      backgroundLayers: (prev.backgroundLayers ?? []).map((item) =>
        item.id === layerId
          ? { ...item, x: position.x, y: position.y, updated_at_unix_ms: Date.now() }
          : item
      ),
    }));
  };

  const commitBackgroundResize = (layerId: string, size: { width: number; height: number }) => {
    options.setState((prev) => ({
      ...prev,
      backgroundLayers: (prev.backgroundLayers ?? []).map((item) =>
        item.id === layerId
          ? { ...item, width: size.width, height: size.height, updated_at_unix_ms: Date.now() }
          : item
      ),
    }));
  };

  const updateBackgroundLayer = (layerId: string, patch: WorkbenchBackgroundLayerPatch) => {
    options.setState((prev) => ({
      ...prev,
      backgroundLayers: (prev.backgroundLayers ?? []).map((item) =>
        item.id === layerId
          ? {
              ...item,
              ...(typeof patch.fill === 'string' ? { fill: patch.fill } : {}),
              ...(typeof patch.opacity === 'number' ? { opacity: patch.opacity } : {}),
              ...(typeof patch.material === 'string' ? { material: patch.material } : {}),
              ...(typeof patch.name === 'string' ? { name: patch.name } : {}),
              updated_at_unix_ms: Date.now(),
            }
          : item
      ),
    }));
  };

  const deleteBackgroundLayer = (layerId: string) => {
    options.setState((prev) => ({
      ...prev,
      backgroundLayers: (prev.backgroundLayers ?? []).filter((item) => item.id !== layerId),
      selectedObject:
        prev.selectedObject?.kind === 'background_layer' && prev.selectedObject.id === layerId
          ? null
          : (prev.selectedObject ?? null),
    }));
  };

  // --- Viewport ---
  let navigationAnimToken = 0;

  const commitViewport = (next: WorkbenchViewport) => {
    options.setState((prev) => ({ ...prev, viewport: next }));
  };

  const cancelViewportNavigation = () => {
    navigationAnimToken += 1;
  };

  const animateViewportTo = (target: WorkbenchViewport) => {
    const vp = viewport();
    const startX = vp.x;
    const startY = vp.y;
    const startScale = vp.scale;
    const startTime = performance.now();
    const animDuration = 360;
    const token = ++navigationAnimToken;

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      if (token !== navigationAnimToken) return;
      const elapsed = now - startTime;
      const t = Math.min(Math.max(elapsed / animDuration, 0), 1);
      const e = easeOutCubic(t);

      commitViewport({
        x: startX + (target.x - startX) * e,
        y: startY + (target.y - startY) * e,
        scale: startScale + (target.scale - startScale) * e,
      });

      if (t < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  };

  const transitionViewportToMode = (nextMode: WorkbenchInteractionMode) => {
    const strategy = resolveWorkbenchModeStrategy(nextMode);
    const currentViewport = viewport();
    if (currentViewport.scale >= strategy.minScale) return;

    const frame = readCanvasFrameSize();
    animateViewportTo(
      createWorkbenchViewportAtScale({
        viewport: currentViewport,
        scale: strategy.minScale,
        minScale: strategy.minScale,
        frameWidth: frame.width,
        frameHeight: frame.height,
      })
    );
  };

  const adjustZoom = (direction: 'in' | 'out') => {
    const vp = viewport();
    const frame = readCanvasFrameSize();
    const centerWorldX = (frame.width / 2 - vp.x) / vp.scale;
    const centerWorldY = (frame.height / 2 - vp.y) / vp.scale;
    const nextScale = clampScale(
      direction === 'in'
        ? vp.scale * WORKBENCH_CANVAS_ZOOM_STEP
        : vp.scale / WORKBENCH_CANVAS_ZOOM_STEP,
      modeStrategy().minScale,
      WORKBENCH_MAX_SCALE
    );

    const next: WorkbenchViewport = {
      x: frame.width / 2 - centerWorldX * nextScale,
      y: frame.height / 2 - centerWorldY * nextScale,
      scale: nextScale,
    };

    commitViewport(next);
  };

  // --- Lock ---
  const toggleLock = () => {
    options.setState((prev) => ({ ...prev, locked: !prev.locked }));
  };

  // --- Filters ---
  const toggleFilter = (type: string) => {
    options.setState((prev) => ({
      ...prev,
      filters: { ...prev.filters, [type]: !prev.filters[type] },
    }));
  };

  /**
   * Solo a single dock component inside the active mode scope. If the same
   * component is already soloed, restore all components in that scope.
   */
  const soloFilter = (type: string, scope: readonly string[]) => {
    options.setState((prev) => {
      const next: Record<string, boolean> = { ...prev.filters };
      const scopedKeys = [...new Set(scope.map((key) => String(key)).filter(Boolean))];
      const alreadySoloed =
        scopedKeys.length > 1 &&
        scopedKeys.every((key) => (next[key] !== false) === (key === type));
      for (const key of scopedKeys) {
        next[key] = alreadySoloed ? true : key === type;
      }
      return { ...prev, filters: next };
    });
  };

  const showAll = () => {
    const definitions = widgetDefinitions();
    options.setState((prev) => ({
      ...prev,
      filters: sanitizeFilters(undefined, definitions),
    }));
  };

  // --- Selection / Navigation ---
  const selectWidget = (widgetId: string) => {
    options.setState((prev) => ({
      ...prev,
      selectedWidgetId: widgetId,
      selectedObject: { kind: 'widget', id: widgetId },
      mode: prev.mode === 'background' ? 'work' : prev.mode,
      activeTool: 'select',
    }));
  };

  const clearSelection = () => {
    options.setState((prev) =>
      prev.selectedWidgetId === null && !prev.selectedObject
        ? prev
        : { ...prev, selectedWidgetId: null, selectedObject: null }
    );
  };

  const selectObject = (selection: WorkbenchSelection | null) => {
    options.setState((prev) => ({
      ...prev,
      selectedObject: selection,
      selectedWidgetId: selection?.kind === 'widget' ? selection.id : null,
      activeTool: 'select',
    }));
  };

  const selectStickyNote = (noteId: string) => {
    options.setState((prev) => ({
      ...prev,
      selectedWidgetId: null,
      selectedObject: { kind: 'sticky_note', id: noteId },
      mode: 'work',
      activeTool: 'select',
    }));
    commitStickyFront(noteId);
  };

  const selectAnnotation = (annotationId: string) => {
    options.setState((prev) => ({
      ...prev,
      selectedWidgetId: null,
      selectedObject: { kind: 'annotation', id: annotationId },
      mode: 'background',
      activeTool: 'select',
    }));
  };

  const selectBackgroundLayer = (layerId: string) => {
    options.setState((prev) => ({
      ...prev,
      selectedWidgetId: null,
      selectedObject: { kind: 'background_layer', id: layerId },
      mode: 'background',
      activeTool: 'select',
    }));
  };

  const setMode = (nextMode: WorkbenchInteractionMode) => {
    const normalizedMode = normalizeWorkbenchInteractionMode(nextMode);
    options.setState((prev) => ({
      ...prev,
      mode: normalizedMode,
      activeTool: 'select',
      selectedWidgetId:
        normalizedMode === 'work'
          ? prev.selectedObject?.kind === 'widget'
            ? prev.selectedObject.id
            : prev.selectedWidgetId
          : null,
      selectedObject:
        normalizedMode === 'work'
          ? prev.selectedObject?.kind === 'widget' || prev.selectedObject?.kind === 'sticky_note'
            ? prev.selectedObject
            : prev.selectedWidgetId
              ? { kind: 'widget', id: prev.selectedWidgetId }
              : null
          : prev.selectedObject?.kind === 'background_layer' ||
              prev.selectedObject?.kind === 'annotation'
            ? prev.selectedObject
            : null,
    }));
    transitionViewportToMode(normalizedMode);
  };

  const setActiveTool = (tool: WorkbenchDockToolId) => {
    options.setState((prev) => ({
      ...prev,
      activeTool: tool,
      mode:
        tool === 'text'
          ? 'background'
          : tool === 'background-region'
            ? 'background'
            : tool === 'sticky-note'
              ? 'work'
              : (prev.mode ?? 'work'),
    }));
  };

  const createActiveToolAt = (worldX: number, worldY: number) => {
    const tool = activeTool();
    if (tool === 'sticky-note') return addStickyNoteAtCursor(worldX, worldY);
    if (tool === 'text') return addTextAnnotationAtCursor(worldX, worldY);
    if (tool === 'background-region') return addBackgroundLayerAtCursor(worldX, worldY);
    return null;
  };

  const viewportWorldCenter = () => {
    const frame = readCanvasFrameSize();
    const vp = viewport();
    return {
      worldX: frame.width > 0 ? (frame.width / 2 - vp.x) / vp.scale : 240,
      worldY: frame.height > 0 ? (frame.height / 2 - vp.y) / vp.scale : 180,
    };
  };

  const centerViewportOnWidget = (widget: WorkbenchWidgetItem) => {
    const frame = readCanvasFrameSize();
    if (frame.width === 0 || frame.height === 0) return;
    animateViewportTo(
      createWorkbenchViewportCenteredOnWidget({
        widget,
        scale: viewport().scale,
        frameWidth: frame.width,
        frameHeight: frame.height,
      })
    );
  };

  const fitViewportOnWidget = (widget: WorkbenchWidgetItem) => {
    const frame = readCanvasFrameSize();
    if (frame.width === 0 || frame.height === 0) return;
    animateViewportTo(
      createWorkbenchViewportFitForWidget({
        widget,
        frameWidth: frame.width,
        frameHeight: frame.height,
      })
    );
  };

  const overviewViewportOnWidget = (widget: WorkbenchWidgetItem) => {
    const frame = readCanvasFrameSize();
    if (frame.width === 0 || frame.height === 0) return;
    animateViewportTo(
      createWorkbenchViewportCenteredOnWidget({
        widget,
        scale: WORKBENCH_WORK_MIN_SCALE,
        frameWidth: frame.width,
        frameHeight: frame.height,
      })
    );
  };

  const focusWidget = (widget: WorkbenchWidgetItem, options: { centerViewport?: boolean } = {}) => {
    selectWidget(widget.id);
    commitFront(widget.id);
    if (options.centerViewport !== false) {
      centerViewportOnWidget(widget);
    }
    return widget;
  };

  const fitWidget = (widget: WorkbenchWidgetItem) => {
    selectWidget(widget.id);
    commitFront(widget.id);
    fitViewportOnWidget(widget);
    return widget;
  };

  const overviewWidget = (widget: WorkbenchWidgetItem) => {
    selectWidget(widget.id);
    commitFront(widget.id);
    overviewViewportOnWidget(widget);
    return widget;
  };

  const ensureWidget = (
    type: WorkbenchWidgetType,
    ensureOptions?: { centerViewport?: boolean; worldX?: number; worldY?: number }
  ) => {
    const existing = findWidgetByType(type);
    if (existing) {
      return focusWidget(existing, { centerViewport: ensureOptions?.centerViewport ?? true });
    }

    const center = viewportWorldCenter();
    const widget = addWidgetAtWorldCenter(
      type,
      ensureOptions?.worldX ?? center.worldX,
      ensureOptions?.worldY ?? center.worldY
    );
    if ((ensureOptions?.centerViewport ?? true) && widget) {
      centerViewportOnWidget(widget);
    }
    return widget;
  };

  const handleArrowNavigation = (direction: 'up' | 'down' | 'left' | 'right') => {
    const current = selectedObject();
    const workItems = [
      ...widgets(),
      ...stickyNotes().map((item) => stickyNoteAsNavigationWidget(item)),
    ].sort(compareWorkbenchLayerRenderOrder);
    const target = findNearestWidget(
      workItems,
      current?.kind === 'widget' || current?.kind === 'sticky_note' ? current.id : null,
      direction,
      Object.fromEntries(
        workItems.map((item) => [
          isWidgetWorkItem(item) ? item.type : 'sticky_note',
          isWidgetWorkItem(item)
            ? filters()[item.type] !== false
            : filters()[WORKBENCH_STICKY_FILTER_ID] !== false,
        ])
      )
    );
    if (target) {
      if (widgets().some((widget) => widget.id === target.id)) {
        focusWidget(target);
      } else {
        selectStickyNote(target.id);
      }
    }
  };

  const deleteSelected = () => {
    const selected = selectedObject();
    if (!selected) return;
    if (selected.kind === 'widget') deleteWidget(selected.id);
    if (selected.kind === 'sticky_note') deleteStickyNote(selected.id);
    if (selected.kind === 'annotation') deleteAnnotation(selected.id);
    if (selected.kind === 'background_layer') deleteBackgroundLayer(selected.id);
  };

  // --- Close ---
  const handleCloseRequest = () => {
    if (contextMenu()) {
      closeContextMenu();
      return;
    }
    options.onClose();
  };

  // --- Appearance ---
  const setTheme = (next: WorkbenchThemeId) => {
    if (state().theme === next) return;
    options.setState((prev) => ({ ...prev, theme: next }));
  };

  return {
    widgets,
    stickyNotes,
    annotations,
    backgroundLayers,
    viewport,
    canvasFrameSize,
    locked,
    filters,
    selectedWidgetId,
    selectedObject,
    mode,
    activeTool,
    theme,
    topZIndex,
    scaleLabel,
    visualFrontOwnerId,
    widgetDefinitions,
    setCanvasFrameRef,

    contextMenu: {
      state: contextMenu,
      items: contextMenuItems,
      position: contextMenuPosition,
      close: closeContextMenu,
      retarget: (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setContextMenu({
          clientX: event.clientX,
          clientY: event.clientY,
          worldX: 0,
          worldY: 0,
        });
      },
    },

    canvas: {
      openCanvasContextMenu,
      openWidgetContextMenu,
      openStickyNoteContextMenu,
      openAnnotationContextMenu,
      openBackgroundLayerContextMenu,
      selectWidget,
      selectObject,
      selectStickyNote,
      selectAnnotation,
      selectBackgroundLayer,
      clearSelection,
      claimVisualFrontOwner,
      commitFront,
      commitMove,
      commitResize,
      commitStickyFront,
      commitStickyMove,
      commitStickyResize,
      commitAnnotationMove,
      commitAnnotationResize,
      commitBackgroundMove,
      commitBackgroundResize,
      commitViewport,
      cancelViewportNavigation,
    },

    hud: {
      zoomIn: () => adjustZoom('in'),
      zoomOut: () => adjustZoom('out'),
    },

    lock: {
      toggle: toggleLock,
    },

    filter: {
      toggle: toggleFilter,
      solo: soloFilter,
      showAll,
    },

    navigation: {
      handleArrowNavigation,
      centerOnWidget: centerViewportOnWidget,
      focusWidget,
      fitWidget,
      overviewWidget,
    },

    selection: {
      clear: clearSelection,
    },

    widgetActions: {
      deleteSelected,
      deleteWidget,
      deleteStickyNote,
      deleteAnnotation,
      deleteBackgroundLayer,
      addWidget,
      addWidgetAtWorldTopLeft,
      addWidgetAtWorldCenter,
      addStickyNoteAtCursor,
      addTextAnnotationAtCursor,
      duplicateTextAnnotationFrom,
      addBackgroundLayerAtCursor,
      duplicateBackgroundLayerFrom,
      createActiveToolAt,
      ensureWidget,
      updateStickyNote,
      updateTextAnnotation,
      updateBackgroundLayer,
    },

    queries: {
      findWidgetByType,
      findWidgetById,
      findStickyNoteById,
      findAnnotationById,
      findBackgroundLayerById,
    },

    appearance: {
      setTheme,
    },

    modes: {
      setMode,
      setActiveTool,
    },

    handleCloseRequest,
  };
}
