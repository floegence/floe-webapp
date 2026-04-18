import { createMemo, createSignal } from 'solid-js';
import type { InfiniteCanvasContextMenuEvent } from '../../ui';
import { ArrowUp, Copy, Trash } from '../../icons';
import {
  type WorkbenchWidgetDefinition,
  type WorkbenchContextMenuState,
  type WorkbenchState,
  type WorkbenchViewport,
  type WorkbenchWidgetItem,
  type WorkbenchWidgetType,
} from './types';
import {
  clampScale,
  createContextMenuPosition,
  createWorkbenchId,
  estimateContextMenuHeight,
  findNearestWidget,
  getTopZIndex,
  WORKBENCH_CANVAS_ZOOM_STEP,
  WORKBENCH_CONTEXT_MENU_WIDTH_PX,
} from './workbenchHelpers';
import {
  createWorkbenchFilterState,
  getWidgetEntry,
  resolveWorkbenchWidgetDefinitions,
} from './widgets/widgetRegistry';
import type { WorkbenchContextMenuItem } from './WorkbenchContextMenu';

export interface UseWorkbenchModelOptions {
  state: () => WorkbenchState;
  setState: (updater: (prev: WorkbenchState) => WorkbenchState) => void;
  onClose: () => void;
  widgetDefinitions?:
    | readonly WorkbenchWidgetDefinition[]
    | (() => readonly WorkbenchWidgetDefinition[] | undefined);
}

export function useWorkbenchModel(options: UseWorkbenchModelOptions) {
  const [contextMenu, setContextMenu] = createSignal<WorkbenchContextMenuState | null>(null);
  const [optimisticFrontWidgetId, setOptimisticFrontWidgetId] = createSignal<string | null>(null);
  const [canvasFrameSize, setCanvasFrameSize] = createSignal({ width: 0, height: 0 });

  const state = options.state;
  const widgets = createMemo(() => state().widgets);
  const viewport = createMemo(() => state().viewport);
  const locked = createMemo(() => state().locked);
  const filters = createMemo(() => state().filters);
  const selectedWidgetId = createMemo(() => state().selectedWidgetId);
  const topZIndex = createMemo(() => getTopZIndex(widgets()));
  const scaleLabel = createMemo(() => `${Math.round(viewport().scale * 100)}%`);
  const readWidgetDefinitions = () =>
    typeof options.widgetDefinitions === 'function'
      ? options.widgetDefinitions()
      : options.widgetDefinitions;
  const widgetDefinitions = createMemo(() =>
    resolveWorkbenchWidgetDefinitions(readWidgetDefinitions())
  );

  const setCanvasFrameRef = (el: HTMLDivElement | undefined) => {
    if (el) {
      setCanvasFrameSize({ width: el.clientWidth, height: el.clientHeight });
    }
  };

  // --- Context Menu ---
  const openCanvasContextMenu = (event: InfiniteCanvasContextMenuEvent) => {
    setContextMenu({
      clientX: event.clientX,
      clientY: event.clientY,
      worldX: event.worldX,
      worldY: event.worldY,
    });
  };

  const openWidgetContextMenu = (event: MouseEvent, item: WorkbenchWidgetItem) => {
    commitFront(item.id);
    setContextMenu({
      clientX: event.clientX,
      clientY: event.clientY,
      worldX: item.x,
      worldY: item.y,
      widgetId: item.id,
    });
  };

  const closeContextMenu = () => setContextMenu(null);
  const findWidgetById = (widgetId: string) => state().widgets.find((widget) => widget.id === widgetId) ?? null;
  const findWidgetByType = (type: WorkbenchWidgetType) => state().widgets.find((widget) => widget.type === type) ?? null;

  const contextMenuItems = createMemo<WorkbenchContextMenuItem[]>(() => {
    const menu = contextMenu();
    if (!menu) return [];

    if (menu.widgetId) {
      const widget = widgets().find((w) => w.id === menu.widgetId);
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
            addWidgetCentered(widget.type, widget.x + 32, widget.y + 32);
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
          if (menu.widgetId) {
            deleteWidget(menu.widgetId);
          }
          closeContextMenu();
        },
      });

      return items;
    }

    // Canvas context menu: add widget items (centered on cursor).
    return widgetDefinitions().map((entry) => ({
      id: `add-${entry.type}`,
      kind: 'action' as const,
      label: `Add ${entry.label}`,
      icon: entry.icon,
      onSelect: () => {
        addWidgetAtCursor(entry.type, menu.worldX, menu.worldY);
        closeContextMenu();
      },
    }));
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
  const addWidget = (type: WorkbenchWidgetType, worldX: number, worldY: number) => {
    const entry = getWidgetEntry(type, widgetDefinitions());
    const existing = entry.singleton ? findWidgetByType(type) : null;
    if (existing) {
      return focusWidget(existing, { centerViewport: true });
    }

    const dims = entry.defaultSize;
    const newWidget: WorkbenchWidgetItem = {
      id: createWorkbenchId(),
      type,
      title: entry.defaultTitle,
      x: worldX,
      y: worldY,
      width: dims.width,
      height: dims.height,
      z_index: topZIndex() + 1,
      created_at_unix_ms: Date.now(),
    };

    options.setState((prev) => ({
      ...prev,
      widgets: [...prev.widgets, newWidget],
      selectedWidgetId: newWidget.id,
    }));

    return newWidget;
  };

  const addWidgetAtCursor = (type: WorkbenchWidgetType, worldX: number, worldY: number) => {
    const dims = getWidgetEntry(type, widgetDefinitions()).defaultSize;
    return addWidget(type, worldX - dims.width / 2, worldY - dims.height / 2);
  };

  const addWidgetCentered = (type: WorkbenchWidgetType, worldX: number, worldY: number) => {
    return addWidget(type, worldX, worldY);
  };

  const deleteWidget = (widgetId: string) => {
    options.setState((prev) => ({
      ...prev,
      widgets: prev.widgets.filter((w) => w.id !== widgetId),
      selectedWidgetId: prev.selectedWidgetId === widgetId ? null : prev.selectedWidgetId,
    }));
  };

  // --- Front / Move ---
  const startOptimisticFront = (widgetId: string) => {
    setOptimisticFrontWidgetId(widgetId);
  };

  const commitFront = (widgetId: string) => {
    setOptimisticFrontWidgetId(widgetId);
    const top = topZIndex();
    const widget = widgets().find((w) => w.id === widgetId);
    if (widget && widget.z_index < top) {
      options.setState((prev) => ({
        ...prev,
        widgets: prev.widgets.map((w) =>
          w.id === widgetId ? { ...w, z_index: top + 1 } : w
        ),
      }));
    }
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

  // --- Viewport ---
  const commitViewport = (next: WorkbenchViewport) => {
    options.setState((prev) => ({ ...prev, viewport: next }));
  };

  const adjustZoom = (direction: 'in' | 'out') => {
    const vp = viewport();
    const frame = canvasFrameSize();
    const centerWorldX = (frame.width / 2 - vp.x) / vp.scale;
    const centerWorldY = (frame.height / 2 - vp.y) / vp.scale;
    const nextScale = clampScale(
      direction === 'in'
        ? vp.scale * WORKBENCH_CANVAS_ZOOM_STEP
        : vp.scale / WORKBENCH_CANVAS_ZOOM_STEP
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
  const toggleFilter = (type: WorkbenchWidgetType) => {
    options.setState((prev) => ({
      ...prev,
      filters: { ...prev.filters, [type]: !prev.filters[type] },
    }));
  };

  /**
   * Solo a single widget type: show only this type, hide all others.
   * If the type is already soloed, clicking again is a no-op (the "All"
   * pill is the escape hatch).
   */
  const soloFilter = (type: WorkbenchWidgetType) => {
    options.setState((prev) => {
      const next: Record<WorkbenchWidgetType, boolean> = { ...prev.filters };
      for (const key of Object.keys(next) as WorkbenchWidgetType[]) {
        next[key] = key === type;
      }
      return { ...prev, filters: next };
    });
  };

  const showAll = () => {
    const nextFilters = createWorkbenchFilterState(widgetDefinitions());
    options.setState((prev) => ({
      ...prev,
      filters: nextFilters,
    }));
  };

  // --- Selection / Navigation ---
  const selectWidget = (widgetId: string) => {
    options.setState((prev) => ({ ...prev, selectedWidgetId: widgetId }));
  };

  const viewportWorldCenter = () => {
    const frame = canvasFrameSize();
    const vp = viewport();
    return {
      worldX: frame.width > 0 ? (frame.width / 2 - vp.x) / vp.scale : 240,
      worldY: frame.height > 0 ? (frame.height / 2 - vp.y) / vp.scale : 180,
    };
  };

  let navigationAnimToken = 0;

  const animateViewportTo = (targetX: number, targetY: number, targetScale: number) => {
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
        x: startX + (targetX - startX) * e,
        y: startY + (targetY - startY) * e,
        scale: startScale + (targetScale - startScale) * e,
      });

      if (t < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  };

  const centerViewportOnWidget = (widget: WorkbenchWidgetItem) => {
    const frame = canvasFrameSize();
    if (frame.width === 0 || frame.height === 0) return;
    const vp = viewport();
    const targetX = frame.width / 2 - (widget.x + widget.width / 2) * vp.scale;
    const targetY = frame.height / 2 - (widget.y + widget.height / 2) * vp.scale;
    animateViewportTo(targetX, targetY, vp.scale);
  };

  const focusWidget = (
    widget: WorkbenchWidgetItem,
    options: { centerViewport?: boolean } = {}
  ) => {
    selectWidget(widget.id);
    commitFront(widget.id);
    if (options.centerViewport !== false) {
      centerViewportOnWidget(widget);
    }
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
    const widget = addWidgetAtCursor(
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
    const target = findNearestWidget(
      widgets(),
      selectedWidgetId(),
      direction,
      filters()
    );
    if (target) {
      focusWidget(target);
    }
  };

  const deleteSelected = () => {
    const id = selectedWidgetId();
    if (id) deleteWidget(id);
  };

  // --- Close ---
  const handleCloseRequest = () => {
    if (contextMenu()) {
      closeContextMenu();
      return;
    }
    options.onClose();
  };

  return {
    widgets,
    viewport,
    locked,
    filters,
    selectedWidgetId,
    topZIndex,
    scaleLabel,
    optimisticFrontWidgetId,
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
      selectWidget,
      startOptimisticFront,
      commitFront,
      commitMove,
      commitResize,
      commitViewport,
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
    },

    widgetActions: {
      deleteSelected,
      deleteWidget,
      addWidget,
      addWidgetAtCursor,
      addWidgetCentered,
      ensureWidget,
    },

    queries: {
      findWidgetByType,
      findWidgetById,
    },

    handleCloseRequest,
  };
}
