import { createEffect, createMemo, createSignal, onCleanup, Show, untrack } from 'solid-js';
import { Portal } from 'solid-js/web';
import { clientToCanvasWorld } from '../ui/canvasGeometry';
import { DIALOG_SURFACE_HOST_ATTR, SURFACE_PORTAL_LAYER_ATTR } from '../ui/surfacePortalScope';
import { createUIFirstSelection, type UIFirstSelectionEvent } from '../../utils/uiFirstSelection';
import { WorkbenchCanvas } from './WorkbenchCanvas';
import { WorkbenchContextMenu, type WorkbenchContextMenuItem } from './WorkbenchContextMenu';
import {
  WorkbenchDock,
  type WorkbenchDockDragPreview,
  type WorkbenchDockDropContext,
  type WorkbenchDockItemActivation,
  type WorkbenchDockItemActivationMode,
  type WorkbenchDockItemPresentation,
  type WorkbenchDockAction,
  type WorkbenchExternalDockDragController,
  type WorkbenchHostDockItem,
} from './WorkbenchFilterBar';
import { WorkbenchHud } from './WorkbenchHud';
import { WorkbenchLockButton } from './WorkbenchLockButton';
import { installWorkbenchContextMenuDismissListeners } from './workbenchContextMenuDismiss';
import {
  createContextMenuPosition,
  estimateContextMenuHeight,
  WORKBENCH_CONTEXT_MENU_WIDTH_PX,
} from './workbenchHelpers';
import {
  resolveWorkbenchToolPlacementPreview,
  resolveWorkbenchWidgetPlacementPreview,
} from './workbenchPlacement';
import { useWorkbenchModel, type UseWorkbenchModelOptions } from './useWorkbenchModel';
import {
  resolveWorkbenchDockFocusCycle,
  sortWorkbenchDockFocusCandidates,
  workbenchDockFocusCandidateKey,
  type WorkbenchDockFocusCandidate,
  type WorkbenchDockFocusCycleSession,
} from './workbenchDockFocusCycle';
import {
  resolveWorkbenchInteractionAdapter,
  type ResolvedWorkbenchInteractionAdapter,
} from './workbenchInteractionAdapter';
import type {
  WorkbenchState,
  WorkbenchAnnotationItem,
  WorkbenchBackgroundLayer,
  WorkbenchBackgroundLayerDefaults,
  WorkbenchBackgroundLayerPatch,
  WorkbenchContextMenuState,
  WorkbenchDockToolId,
  WorkbenchInputOwner,
  WorkbenchInteractionAdapter,
  WorkbenchSelection,
  WorkbenchStickyNoteItem,
  WorkbenchStickyNotePatch,
  WorkbenchTextAnnotationDefaults,
  WorkbenchTextAnnotationPatch,
  WorkbenchWidgetDefinition,
  WorkbenchWidgetItem,
  WorkbenchWidgetType,
} from './types';

export interface WorkbenchCreateAtOptions {
  worldX?: number;
  worldY?: number;
}

export interface WorkbenchCreateWidgetOptions extends WorkbenchCreateAtOptions {
  centerViewport?: boolean;
}

export type WorkbenchContextMenuItemsResolver = (
  context: Readonly<{
    menu: WorkbenchContextMenuState;
    items: readonly WorkbenchContextMenuItem[];
    widgets: readonly WorkbenchWidgetItem[];
    widget: WorkbenchWidgetItem | null;
    closeMenu: () => void;
  }>
) => readonly WorkbenchContextMenuItem[];

export interface WorkbenchSurfaceApi {
  ensureWidget: (
    type: WorkbenchWidgetType,
    options?: WorkbenchCreateWidgetOptions
  ) => WorkbenchWidgetItem | null;
  createWidget: (
    type: WorkbenchWidgetType,
    options?: WorkbenchCreateWidgetOptions
  ) => WorkbenchWidgetItem | null;
  clearSelection: () => void;
  focusWidget: (
    widget: WorkbenchWidgetItem,
    options?: { centerViewport?: boolean }
  ) => WorkbenchWidgetItem;
  fitWidget: (widget: WorkbenchWidgetItem) => WorkbenchWidgetItem;
  overviewWidget: (widget: WorkbenchWidgetItem) => WorkbenchWidgetItem;
  findWidgetByType: (type: WorkbenchWidgetType) => WorkbenchWidgetItem | null;
  findWidgetById: (widgetId: string) => WorkbenchWidgetItem | null;
  updateWidgetTitle: (widgetId: string, title: string) => void;
  createStickyNote: (options?: WorkbenchCreateAtOptions) => WorkbenchStickyNoteItem | null;
  findStickyNoteById: (noteId: string) => WorkbenchStickyNoteItem | null;
  updateStickyNote: (noteId: string, patch: WorkbenchStickyNotePatch) => void;
  deleteStickyNote: (noteId: string) => void;
  createTextAnnotation: (options?: WorkbenchCreateAtOptions) => WorkbenchAnnotationItem | null;
  findAnnotationById: (annotationId: string) => WorkbenchAnnotationItem | null;
  updateTextAnnotation: (annotationId: string, patch: WorkbenchTextAnnotationPatch) => void;
  deleteAnnotation: (annotationId: string) => void;
  createBackgroundLayer: (options?: WorkbenchCreateAtOptions) => WorkbenchBackgroundLayer | null;
  findBackgroundLayerById: (layerId: string) => WorkbenchBackgroundLayer | null;
  updateBackgroundLayer: (layerId: string, patch: WorkbenchBackgroundLayerPatch) => void;
  deleteBackgroundLayer: (layerId: string) => void;
}

export interface WorkbenchSurfaceProps {
  state: () => WorkbenchState;
  setState: (updater: (prev: WorkbenchState) => WorkbenchState) => void;
  /**
   * Keyboard shortcut key for toggling lock mode. Matches `KeyboardEvent.key`.
   * Defaults to "F1". Pass `null` to disable the shortcut entirely.
   */
  lockShortcut?: string | null;
  /**
   * If true, owns global keyboard handlers (arrows, lock, delete). Set to
   * false when the surface is embedded in a parent that drives those keys
   * itself. Defaults to true.
   */
  enableKeyboard?: boolean;
  /**
   * Optional class added to the surface root for layout integration.
   */
  class?: string;
  widgetDefinitions?: readonly WorkbenchWidgetDefinition[];
  launcherWidgetTypes?: readonly WorkbenchWidgetType[];
  textAnnotationDefaults?: WorkbenchTextAnnotationDefaults;
  backgroundLayerDefaults?: WorkbenchBackgroundLayerDefaults;
  interactionAdapter?: WorkbenchInteractionAdapter;
  resolveContextMenuItems?: WorkbenchContextMenuItemsResolver;
  onApiReady?: (api: WorkbenchSurfaceApi | null) => void;
  onRequestDelete?: (widgetId: string) => void;
  /**
   * Controls built-in Dock click behavior. Defaults to `solo-filter` for
   * backward compatibility. Drag-to-create and host Dock items are unchanged.
   */
  dockItemActivationMode?: WorkbenchDockItemActivationMode;
  onDockItemClick?: (item: WorkbenchDockItemActivation) => boolean | void;
  dockActions?: readonly WorkbenchDockAction[];
  dockItems?: readonly WorkbenchHostDockItem[];
  registerExternalDockDragController?: (
    controller: WorkbenchExternalDockDragController | null
  ) => void;
  onLayoutInteractionStart?: () => void;
  onLayoutInteractionEnd?: () => void;
  /** Defer pointer/focus widget activation until the visual selection has painted. */
  widgetActivationMode?: 'sync' | 'after-paint';
  onWidgetActivationEvent?: (
    event: UIFirstSelectionEvent<string | null, { bringToFront: boolean }>
  ) => void;
}

const DEFAULT_LOCK_SHORTCUT = 'F1';

function focusWorkbenchSurfaceRoot(root: HTMLElement | null): void {
  if (!root) return;

  try {
    root.focus({ preventScroll: true });
  } catch {
    root.focus();
  }
}

export function WorkbenchSurface(props: WorkbenchSurfaceProps) {
  const modelOptions: UseWorkbenchModelOptions = {
    state: () => props.state(),
    setState: (updater) => props.setState(updater),
    widgetDefinitions: () => props.widgetDefinitions,
    textAnnotationDefaults: () => props.textAnnotationDefaults,
    backgroundLayerDefaults: () => props.backgroundLayerDefaults,
    onClose: () => {
      // Page mode has no "close" — surface is a permanent display, not a modal.
    },
  };

  const model = useWorkbenchModel(modelOptions);
  const widgetSelection = createUIFirstSelection<string | null, { bringToFront: boolean }>({
    committed: model.selectedWidgetId,
    commitEqualRequests: true,
    commit: (widgetId, metadata) => {
      if (!widgetId) {
        model.canvas.clearSelection();
        return;
      }
      model.canvas.selectWidget(widgetId);
      if (metadata?.bringToFront) model.canvas.commitFront(widgetId);
    },
    onEvent: (event) => props.onWidgetActivationEvent?.(event),
  });
  const selectedWidgetId = () =>
    props.widgetActivationMode === 'after-paint'
      ? widgetSelection.visual()
      : model.selectedWidgetId();
  const selectedObject = () => {
    if (props.widgetActivationMode !== 'after-paint' || !widgetSelection.pending()) {
      return model.selectedObject();
    }
    const widgetId = widgetSelection.visual();
    return widgetId ? { kind: 'widget' as const, id: widgetId } : null;
  };
  const selectWidget = (widgetId: string) => {
    if (props.widgetActivationMode === 'after-paint') {
      if (widgetSelection.pending() && widgetSelection.visual() === widgetId) return;
      widgetSelection.request(widgetId, { bringToFront: false });
      return;
    }
    model.canvas.selectWidget(widgetId);
  };
  const activateWidget = (widgetId: string) => {
    if (props.widgetActivationMode === 'after-paint') {
      if (widgetSelection.pending() && widgetSelection.visual() === widgetId) return;
      widgetSelection.request(widgetId, { bringToFront: true });
      return;
    }
    model.canvas.selectWidget(widgetId);
    model.canvas.commitFront(widgetId);
  };
  const [surfaceRootEl, setSurfaceRootEl] = createSignal<HTMLDivElement | null>(null);
  const [dockDragPreview, setDockDragPreview] = createSignal<WorkbenchDockDragPreview | null>(null);
  const interactionAdapter = createMemo<ResolvedWorkbenchInteractionAdapter>(() =>
    resolveWorkbenchInteractionAdapter(props.interactionAdapter)
  );
  const [inputOwner, setInputOwner] = createSignal<WorkbenchInputOwner>(
    untrack(() => interactionAdapter().createInitialInputOwner())
  );
  const manuallyAddableWidgetTypes = createMemo(() => {
    const allowedTypes = props.launcherWidgetTypes;
    if (!allowedTypes || allowedTypes.length <= 0) {
      return null;
    }
    return new Set<WorkbenchWidgetType>(allowedTypes);
  });
  const filterBarWidgetDefinitions = createMemo(() => {
    const definitions = model.widgetDefinitions();
    const allowed = manuallyAddableWidgetTypes();
    if (!allowed) {
      return definitions;
    }
    return definitions.filter((entry) => allowed.has(entry.type));
  });
  const contextMenuItems = createMemo<readonly WorkbenchContextMenuItem[]>(() => {
    const menu = model.contextMenu.state();
    const modelItems = model.contextMenu.items();
    const allowed = manuallyAddableWidgetTypes();
    const filteredItems = !allowed
      ? modelItems
      : modelItems.filter((item) => {
          if (item.kind !== 'action') {
            return true;
          }
          const addMatch = /^add-(.+)$/.exec(String(item.id ?? ''));
          if (!addMatch) {
            return true;
          }
          return allowed.has(addMatch[1] as WorkbenchWidgetType);
        });

    if (!menu || !props.resolveContextMenuItems) {
      return filteredItems;
    }

    const widgetTargetId =
      menu.target?.kind === 'widget'
        ? menu.target.id
        : !menu.target && menu.widgetId
          ? menu.widgetId
          : null;
    const widget = widgetTargetId ? model.queries.findWidgetById(widgetTargetId) : null;
    return props.resolveContextMenuItems({
      menu,
      items: filteredItems,
      widgets: model.widgets(),
      widget,
      closeMenu: model.contextMenu.close,
    });
  });
  const contextMenuPosition = createMemo(() => {
    const menu = model.contextMenu.state();
    if (!menu) return undefined;

    const items = contextMenuItems();
    const actionCount = items.filter((item) => item.kind === 'action').length;
    const separatorCount = items.filter((item) => item.kind === 'separator').length;
    return createContextMenuPosition({
      clientX: menu.clientX,
      clientY: menu.clientY,
      menuWidth: WORKBENCH_CONTEXT_MENU_WIDTH_PX,
      menuHeight: estimateContextMenuHeight(actionCount, separatorCount),
    });
  });

  const updateInputOwnerFromTarget = (
    target: EventTarget | null,
    widgetReason: 'pointer' | 'focus' | 'activation',
    canvasReason: 'background_pointer' | 'background_focus'
  ): void => {
    const adapter = interactionAdapter();
    const widgetRoot = adapter.findWidgetRoot(target);
    const widgetId = adapter.readWidgetId(widgetRoot);
    if (widgetId) {
      if (model.queries.findStickyNoteById(widgetId)) {
        setInputOwner(
          adapter.createCanvasInputOwner(
            widgetReason === 'focus' ? 'background_focus' : 'background_pointer'
          )
        );
        return;
      }
      setInputOwner(adapter.createWidgetInputOwner(widgetId, widgetReason));
      return;
    }

    const root = surfaceRootEl();
    if (root && target instanceof Node && root.contains(target)) {
      setInputOwner(adapter.createCanvasInputOwner(canvasReason));
    }
  };

  const handoffCanvasAuthority = (
    reason: 'background_pointer' | 'selection_cleared' = 'selection_cleared'
  ) => {
    const adapter = interactionAdapter();
    const root = surfaceRootEl();

    model.selection.clear();
    setInputOwner(adapter.createCanvasInputOwner(reason));

    queueMicrotask(() => {
      if (!root || typeof document === 'undefined') return;

      const activeElement = document.activeElement;
      if (!(activeElement instanceof HTMLElement) || !root.contains(activeElement)) {
        focusWorkbenchSurfaceRoot(root);
        return;
      }

      const activeWidgetRoot = adapter.findWidgetRoot(activeElement);
      focusWorkbenchSurfaceRoot(root);
      if (
        activeWidgetRoot &&
        document.activeElement === activeElement &&
        activeElement.isConnected
      ) {
        activeElement.blur();
      }
    });
  };

  const viewportWorldCenter = () => {
    const frameEl = surfaceRootEl()?.querySelector(
      '[data-floe-workbench-canvas-frame="true"]'
    ) as HTMLElement | null;
    const vp = model.viewport();
    const rect = frameEl?.getBoundingClientRect();
    const width = rect?.width ?? 0;
    const height = rect?.height ?? 0;

    return {
      worldX: width > 0 ? (width / 2 - vp.x) / vp.scale : 240,
      worldY: height > 0 ? (height / 2 - vp.y) / vp.scale : 180,
    };
  };

  const activateWidgetRoot = (widgetId: string) => {
    const adapter = untrack(interactionAdapter);
    const root = untrack(surfaceRootEl);
    queueMicrotask(() => {
      adapter.focusWidgetElement(root, widgetId);
      setInputOwner(adapter.createWidgetInputOwner(widgetId, 'activation'));
    });
  };

  let dockFocusCycleSession: WorkbenchDockFocusCycleSession | null = null;

  const dockItemKey = (item: Pick<WorkbenchDockItemActivation, 'kind' | 'id'>): string =>
    `${item.kind}:${String(item.id)}`;

  const toDockFocusCandidate = (
    kind: WorkbenchSelection['kind'],
    item: Readonly<{
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      created_at_unix_ms: number;
    }>
  ): WorkbenchDockFocusCandidate => ({
    kind,
    id: item.id,
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
    createdAtUnixMs: item.created_at_unix_ms,
  });

  const dockFocusCandidatesFor = (
    item: Pick<WorkbenchDockItemActivation, 'kind' | 'id'>
  ): readonly WorkbenchDockFocusCandidate[] => {
    if (item.kind === 'widget') {
      return model
        .widgets()
        .filter((widget) => widget.type === item.id)
        .map((widget) => toDockFocusCandidate('widget', widget));
    }
    if (item.id === 'sticky-note') {
      return model.stickyNotes().map((note) => toDockFocusCandidate('sticky_note', note));
    }
    if (item.id === 'text') {
      return model
        .annotations()
        .map((annotation) => toDockFocusCandidate('annotation', annotation));
    }
    if (item.id === 'background-region') {
      return model
        .backgroundLayers()
        .map((layer) => toDockFocusCandidate('background_layer', layer));
    }
    return [];
  };

  const focusLayerObject = (candidate: WorkbenchDockFocusCandidate) => {
    const root = untrack(surfaceRootEl);
    queueMicrotask(() => {
      if (!root) return;
      const objectKind =
        candidate.kind === 'sticky_note'
          ? 'sticky'
          : candidate.kind === 'annotation'
            ? 'text'
            : candidate.kind === 'background_layer'
              ? 'region'
              : null;
      if (!objectKind) return;
      const objectRoot = [...root.querySelectorAll('[data-wb-object-id]')].find(
        (element) =>
          element.getAttribute('data-wb-object-kind') === objectKind &&
          element.getAttribute('data-wb-object-id') === candidate.id
      );
      if (!(objectRoot instanceof HTMLElement)) return;

      const content = objectRoot.querySelector('[data-wb-part="content"]');
      const contentEditable =
        content instanceof HTMLElement &&
        content.getAttribute('contenteditable') !== null &&
        content.getAttribute('contenteditable') !== 'false';
      const focusTarget = contentEditable ? content : objectRoot;
      if (!focusTarget.hasAttribute('tabindex')) focusTarget.tabIndex = -1;
      try {
        focusTarget.focus({ preventScroll: true });
      } catch {
        focusTarget.focus();
      }
      setInputOwner(interactionAdapter().createCanvasInputOwner('background_focus'));
    });
  };

  const centerDockFocusCandidate = (candidate: WorkbenchDockFocusCandidate) => {
    model.navigation.centerOnWidget({
      id: candidate.id,
      type: 'dock-focus-target',
      title: '',
      x: candidate.x,
      y: candidate.y,
      width: candidate.width,
      height: candidate.height,
      z_index: 0,
      created_at_unix_ms: candidate.createdAtUnixMs,
    });
  };

  const activateDockFocusCandidate = (candidate: WorkbenchDockFocusCandidate) => {
    if (candidate.kind === 'widget') {
      const widget = model.queries.findWidgetById(candidate.id);
      if (!widget) return;
      activateWidget(widget.id);
      model.navigation.centerOnWidget(widget);
      activateWidgetRoot(widget.id);
      return;
    }
    if (candidate.kind === 'sticky_note') {
      model.canvas.selectStickyNote(candidate.id);
    } else if (candidate.kind === 'annotation') {
      model.canvas.selectAnnotation(candidate.id);
    } else {
      model.canvas.selectBackgroundLayer(candidate.id);
    }
    centerDockFocusCandidate(candidate);
    focusLayerObject(candidate);
  };

  const createDockFocusCandidate = (
    item: Pick<WorkbenchDockItemActivation, 'kind' | 'id'>
  ): WorkbenchDockFocusCandidate | null => {
    const center = viewportWorldCenter();
    if (item.kind === 'widget') {
      const widget = model.widgetActions.addWidgetAtWorldCenter(
        item.id,
        center.worldX,
        center.worldY
      );
      return widget ? toDockFocusCandidate('widget', widget) : null;
    }
    if (item.id === 'sticky-note') {
      return toDockFocusCandidate(
        'sticky_note',
        model.widgetActions.addStickyNoteAtCursor(center.worldX, center.worldY)
      );
    }
    if (item.id === 'text') {
      return toDockFocusCandidate(
        'annotation',
        model.widgetActions.addTextAnnotationAtCursor(center.worldX, center.worldY)
      );
    }
    if (item.id === 'background-region') {
      return toDockFocusCandidate(
        'background_layer',
        model.widgetActions.addBackgroundLayerAtCursor(center.worldX, center.worldY)
      );
    }
    return null;
  };

  const handleDockFocusCycle = (item: WorkbenchDockItemActivation) => {
    let candidates = dockFocusCandidatesFor(item);
    let selection = selectedObject();
    if (candidates.length === 0) {
      const created = createDockFocusCandidate(item);
      if (!created) {
        dockFocusCycleSession = null;
        return;
      }
      candidates = dockFocusCandidatesFor(item);
      selection = { kind: created.kind, id: created.id };
    }

    const resolution = resolveWorkbenchDockFocusCycle({
      dockItemKey: dockItemKey(item),
      candidates,
      selectedObject: selection,
      session: dockFocusCycleSession,
    });
    dockFocusCycleSession = resolution.session;
    if (resolution.target) activateDockFocusCandidate(resolution.target);
  };

  const resolveDockItemPresentation = (
    item: Pick<WorkbenchDockItemActivation, 'kind' | 'id'>
  ): WorkbenchDockItemPresentation => {
    const candidates = sortWorkbenchDockFocusCandidates(dockFocusCandidatesFor(item));
    const current = selectedObject();
    const currentKey = current ? workbenchDockFocusCandidateKey(current) : null;
    const currentIndex = currentKey
      ? candidates.findIndex(
          (candidate) => workbenchDockFocusCandidateKey(candidate) === currentKey
        )
      : -1;
    return {
      count: candidates.length,
      currentIndex: currentIndex >= 0 ? currentIndex : null,
      active: currentIndex >= 0,
    };
  };

  const handleDockActivation = (item: Readonly<{ kind: string; id: string }>) => {
    if (dockFocusCycleSession?.dockItemKey !== `${item.kind}:${item.id}`) {
      dockFocusCycleSession = null;
    }
  };

  const focusWidgetForViewport = (widget: WorkbenchWidgetItem) => {
    const focusedWidget = model.navigation.fitWidget(widget);
    activateWidgetRoot(focusedWidget.id);
  };

  const overviewWidgetForViewport = (widget: WorkbenchWidgetItem) => {
    const focusedWidget = model.navigation.overviewWidget(widget);
    activateWidgetRoot(focusedWidget.id);
  };

  createEffect(() => {
    props.onApiReady?.({
      ensureWidget: (type, options) => model.widgetActions.ensureWidget(type, options) ?? null,
      createWidget: (type, options) => {
        const center = viewportWorldCenter();
        const widget =
          model.widgetActions.addWidgetAtWorldCenter(
            type,
            options?.worldX ?? center.worldX,
            options?.worldY ?? center.worldY
          ) ?? null;
        if (widget && options?.centerViewport !== false) {
          model.navigation.centerOnWidget(widget);
        }
        return widget;
      },
      createTextAnnotation: (options) => {
        const center = viewportWorldCenter();
        return (
          model.widgetActions.addTextAnnotationAtCursor(
            options?.worldX ?? center.worldX,
            options?.worldY ?? center.worldY
          ) ?? null
        );
      },
      createStickyNote: (options) => {
        const center = viewportWorldCenter();
        return (
          model.widgetActions.addStickyNoteAtCursor(
            options?.worldX ?? center.worldX,
            options?.worldY ?? center.worldY
          ) ?? null
        );
      },
      createBackgroundLayer: (options) => {
        const center = viewportWorldCenter();
        return (
          model.widgetActions.addBackgroundLayerAtCursor(
            options?.worldX ?? center.worldX,
            options?.worldY ?? center.worldY
          ) ?? null
        );
      },
      clearSelection: () => handoffCanvasAuthority('selection_cleared'),
      focusWidget: (widget, options) => {
        const focusedWidget = model.navigation.focusWidget(widget, options);
        activateWidgetRoot(focusedWidget.id);
        return focusedWidget;
      },
      fitWidget: (widget) => {
        const focusedWidget = model.navigation.fitWidget(widget);
        activateWidgetRoot(focusedWidget.id);
        return focusedWidget;
      },
      overviewWidget: (widget) => {
        const focusedWidget = model.navigation.overviewWidget(widget);
        activateWidgetRoot(focusedWidget.id);
        return focusedWidget;
      },
      findWidgetByType: (type) => model.queries.findWidgetByType(type),
      findWidgetById: (widgetId) => model.queries.findWidgetById(widgetId),
      findStickyNoteById: (noteId) => model.queries.findStickyNoteById(noteId),
      findAnnotationById: (annotationId) => model.queries.findAnnotationById(annotationId),
      findBackgroundLayerById: (layerId) => model.queries.findBackgroundLayerById(layerId),
      updateWidgetTitle: (widgetId, title) => {
        const normalizedWidgetId = String(widgetId ?? '').trim();
        const normalizedTitle = String(title ?? '').trim();
        if (!normalizedWidgetId || !normalizedTitle) {
          return;
        }

        props.setState((previous) => ({
          ...previous,
          widgets: previous.widgets.map((widget) =>
            widget.id === normalizedWidgetId && widget.title !== normalizedTitle
              ? { ...widget, title: normalizedTitle }
              : widget
          ),
        }));
      },
      updateStickyNote: (noteId, patch) => model.widgetActions.updateStickyNote(noteId, patch),
      updateTextAnnotation: (annotationId, patch) =>
        model.widgetActions.updateTextAnnotation(annotationId, patch),
      updateBackgroundLayer: (layerId, patch) =>
        model.widgetActions.updateBackgroundLayer(layerId, patch),
      deleteStickyNote: (noteId) => model.widgetActions.deleteStickyNote(noteId),
      deleteAnnotation: (annotationId) => model.widgetActions.deleteAnnotation(annotationId),
      deleteBackgroundLayer: (layerId) => model.widgetActions.deleteBackgroundLayer(layerId),
    });

    onCleanup(() => {
      props.onApiReady?.(null);
    });
  });

  const lockShortcut = () =>
    props.lockShortcut === undefined ? DEFAULT_LOCK_SHORTCUT : props.lockShortcut;

  createEffect(() => {
    if (typeof window === 'undefined') return;
    if (!model.contextMenu.state()) return;

    const cleanup = installWorkbenchContextMenuDismissListeners({
      ownerWindow: window,
      onDismiss: model.contextMenu.close,
    });

    onCleanup(() => cleanup());
  });

  createEffect(() => {
    const owner = inputOwner();
    if (owner.kind !== 'widget') return;

    const widgetStillExists = model.widgets().some((widget) => widget.id === owner.widgetId);
    if (!widgetStillExists) {
      setInputOwner(interactionAdapter().createCanvasInputOwner('widget_removed'));
    }
  });

  createEffect(() => {
    const root = surfaceRootEl();
    if (!root) return;

    const handlePointerDownCapture = (event: PointerEvent) => {
      updateInputOwnerFromTarget(event.target, 'pointer', 'background_pointer');
    };
    const handleFocusIn = (event: FocusEvent) => {
      updateInputOwnerFromTarget(event.target, 'focus', 'background_focus');
    };

    root.addEventListener('pointerdown', handlePointerDownCapture, true);
    root.addEventListener('focusin', handleFocusIn);

    onCleanup(() => {
      root.removeEventListener('pointerdown', handlePointerDownCapture, true);
      root.removeEventListener('focusin', handleFocusIn);
    });
  });

  // Keyboard handler for arrow navigation, lock toggle, and deleting the selected widget.
  createEffect(() => {
    if (props.enableKeyboard === false) return;
    if (typeof document === 'undefined') return;

    const shortcut = lockShortcut();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;

      if (shortcut !== null && event.key === shortcut) {
        event.preventDefault();
        model.lock.toggle();
        return;
      }

      if (
        interactionAdapter().shouldBypassGlobalHotkeys({
          root: surfaceRootEl(),
          target: event.target,
          owner: inputOwner(),
          interactiveSelector: interactionAdapter().interactiveSelector,
        })
      ) {
        return;
      }

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          model.navigation.handleArrowNavigation('up');
          break;
        case 'ArrowDown':
          event.preventDefault();
          model.navigation.handleArrowNavigation('down');
          break;
        case 'ArrowLeft':
          event.preventDefault();
          model.navigation.handleArrowNavigation('left');
          break;
        case 'ArrowRight':
          event.preventDefault();
          model.navigation.handleArrowNavigation('right');
          break;
        case 'Delete':
        case 'Backspace':
          if (model.selectedObject()) {
            event.preventDefault();
            model.widgetActions.deleteSelected();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    onCleanup(() => document.removeEventListener('keydown', handleKeyDown, true));
  });

  // Convert a client (viewport) point into world coords inside the canvas.
  // Returns null when the cursor is outside the canvas frame, so callers can
  // distinguish "dropped on canvas" from "dropped outside".
  const clientToWorld = (
    clientX: number,
    clientY: number,
    context?: Pick<WorkbenchDockDropContext, 'canvasFrame' | 'worldPoint'>
  ) => {
    if (context?.worldPoint) {
      return context.worldPoint;
    }
    if (context?.canvasFrame) {
      return clientToCanvasWorld(context.canvasFrame, model.viewport(), { clientX, clientY });
    }
    const frameEl = surfaceRootEl()?.querySelector(
      '[data-floe-workbench-canvas-frame="true"]'
    ) as HTMLElement | null;
    if (!frameEl) return null;
    const rect = frameEl.getBoundingClientRect();
    return clientToCanvasWorld(rect, model.viewport(), { clientX, clientY });
  };

  const handleCreateAtClient = (
    type: WorkbenchWidgetType,
    clientX: number,
    clientY: number,
    context?: WorkbenchDockDropContext
  ) => {
    const world = clientToWorld(clientX, clientY, context);
    if (!world) return;
    model.widgetActions.addWidgetAtWorldCenter(type, world.worldX, world.worldY);
  };

  const handleCreateToolAtClient = (
    tool: WorkbenchDockToolId,
    clientX: number,
    clientY: number,
    context?: WorkbenchDockDropContext
  ) => {
    const world = clientToWorld(clientX, clientY, context);
    if (!world) return;
    if (tool === 'sticky-note') {
      model.widgetActions.addStickyNoteAtCursor(world.worldX, world.worldY);
      return;
    }
    if (tool === 'text') {
      model.widgetActions.addTextAnnotationAtCursor(world.worldX, world.worldY);
      return;
    }
    if (tool === 'background-region') {
      model.widgetActions.addBackgroundLayerAtCursor(world.worldX, world.worldY);
    }
  };

  const handleCanvasPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    if (interactionAdapter().findWidgetRoot(event.target)) return;
    handoffCanvasAuthority('background_pointer');
  };

  const placementPreview = createMemo(() => {
    const preview = dockDragPreview();
    if (!preview) return null;
    const world = clientToWorld(preview.clientX, preview.clientY, preview);
    if (!world) return null;
    if (preview.kind === 'widget') {
      return resolveWorkbenchWidgetPlacementPreview({
        type: preview.id as WorkbenchWidgetType,
        widgetDefinitions: model.widgetDefinitions(),
        worldX: world.worldX,
        worldY: world.worldY,
        dropAllowed: preview.dropAllowed,
      });
    }
    return resolveWorkbenchToolPlacementPreview({
      tool: preview.id as WorkbenchDockToolId,
      label: preview.label,
      worldX: world.worldX,
      worldY: world.worldY,
      dropAllowed: preview.dropAllowed,
      textDefaults: props.textAnnotationDefaults,
      backgroundDefaults: props.backgroundLayerDefaults,
    });
  });

  return (
    <div
      ref={setSurfaceRootEl}
      class={`workbench-surface${props.class ? ` ${props.class}` : ''}`}
      {...{
        [interactionAdapter().surfaceRootAttr]: 'true',
        [interactionAdapter().dialogSurfaceHostAttr]: 'true',
        [DIALOG_SURFACE_HOST_ATTR]: 'true',
        [SURFACE_PORTAL_LAYER_ATTR]: 'true',
      }}
      data-workbench-theme={model.theme()}
      data-workbench-mode={model.mode()}
      tabIndex={-1}
    >
      <div class="workbench-surface__body" data-floe-workbench-canvas-frame="true">
        <WorkbenchCanvas
          widgetDefinitions={model.widgetDefinitions()}
          widgets={model.widgets()}
          stickyNotes={model.stickyNotes()}
          annotations={model.annotations()}
          backgroundLayers={model.backgroundLayers()}
          placementPreview={placementPreview()}
          viewport={model.viewport()}
          canvasFrameSize={model.canvasFrameSize()}
          selectedWidgetId={selectedWidgetId()}
          selectedObject={selectedObject()}
          mode={model.mode()}
          visualFrontOwnerId={model.visualFrontOwnerId()}
          locked={model.locked()}
          filters={model.filters()}
          interactionAdapter={interactionAdapter()}
          setCanvasFrameRef={model.setCanvasFrameRef}
          onViewportCommit={model.canvas.commitViewport}
          onViewportInteractionStart={model.canvas.cancelViewportNavigation}
          onCanvasContextMenu={model.canvas.openCanvasContextMenu}
          onCanvasPointerDown={handleCanvasPointerDown}
          onSelectWidget={selectWidget}
          onActivateWidget={activateWidget}
          onWidgetContextMenu={model.canvas.openWidgetContextMenu}
          onClaimVisualFrontOwner={model.canvas.claimVisualFrontOwner}
          onCommitFront={model.canvas.commitFront}
          onCommitMove={model.canvas.commitMove}
          onCommitResize={model.canvas.commitResize}
          onSelectStickyNote={model.canvas.selectStickyNote}
          onStickyNoteContextMenu={model.canvas.openStickyNoteContextMenu}
          onClaimStickyVisualFrontOwner={model.canvas.claimVisualFrontOwner}
          onCommitStickyFront={model.canvas.commitStickyFront}
          onCommitStickyMove={model.canvas.commitStickyMove}
          onCommitStickyResize={model.canvas.commitStickyResize}
          onUpdateStickyNote={model.widgetActions.updateStickyNote}
          onDeleteStickyNote={model.widgetActions.deleteStickyNote}
          onSelectAnnotation={model.canvas.selectAnnotation}
          onAnnotationContextMenu={model.canvas.openAnnotationContextMenu}
          onCommitAnnotationMove={model.canvas.commitAnnotationMove}
          onCommitAnnotationResize={model.canvas.commitAnnotationResize}
          onUpdateTextAnnotation={model.widgetActions.updateTextAnnotation}
          onDeleteAnnotation={model.widgetActions.deleteAnnotation}
          onSelectBackgroundLayer={model.canvas.selectBackgroundLayer}
          onBackgroundLayerContextMenu={model.canvas.openBackgroundLayerContextMenu}
          onCommitBackgroundMove={model.canvas.commitBackgroundMove}
          onCommitBackgroundResize={model.canvas.commitBackgroundResize}
          onUpdateBackgroundLayer={model.widgetActions.updateBackgroundLayer}
          onDeleteBackgroundLayer={model.widgetActions.deleteBackgroundLayer}
          onRequestOverview={overviewWidgetForViewport}
          onRequestFit={focusWidgetForViewport}
          onRequestDelete={props.onRequestDelete ?? model.widgetActions.deleteWidget}
          onLayoutInteractionStart={props.onLayoutInteractionStart}
          onLayoutInteractionEnd={props.onLayoutInteractionEnd}
        />
      </div>

      <WorkbenchLockButton
        locked={model.locked()}
        onToggle={model.lock.toggle}
        shortcutLabel={lockShortcut() ?? undefined}
      />

      <WorkbenchDock
        widgetDefinitions={filterBarWidgetDefinitions()}
        widgets={model.widgets()}
        filters={model.filters()}
        mode={model.mode()}
        activationMode={props.dockItemActivationMode}
        viewport={model.viewport()}
        onSoloFilter={model.filter.solo}
        onFocusCycleItem={handleDockFocusCycle}
        resolveItemPresentation={resolveDockItemPresentation}
        onDockActivation={handleDockActivation}
        onSelectMode={model.modes.setMode}
        onViewportCommit={model.canvas.commitViewport}
        onViewportInteractionStart={() => model.canvas.cancelViewportNavigation()}
        onCreateAt={handleCreateAtClient}
        onCreateToolAt={handleCreateToolAtClient}
        onItemClick={props.onDockItemClick}
        dockActions={props.dockActions}
        dockItems={props.dockItems}
        registerExternalDockDragController={props.registerExternalDockDragController}
        onDragPreviewChange={setDockDragPreview}
      />

      <WorkbenchHud
        scaleLabel={model.scaleLabel()}
        onZoomOut={model.hud.zoomOut}
        onZoomIn={model.hud.zoomIn}
        activeTheme={model.theme()}
        onSelectTheme={(id) => model.appearance.setTheme(id)}
      />

      <Show when={model.contextMenu.state()}>
        <Portal>
          <div
            class="workbench-menu-backdrop"
            data-floe-workbench-boundary="true"
            onContextMenu={model.contextMenu.retarget}
          />
          <WorkbenchContextMenu
            x={contextMenuPosition()?.left ?? 0}
            y={contextMenuPosition()?.top ?? 0}
            items={contextMenuItems()}
          />
        </Portal>
      </Show>
    </div>
  );
}
