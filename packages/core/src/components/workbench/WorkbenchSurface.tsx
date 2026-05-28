import { createEffect, createMemo, createSignal, onCleanup, Show, untrack } from 'solid-js';
import { Portal } from 'solid-js/web';
import { clientToCanvasWorld } from '../ui/canvasGeometry';
import { WorkbenchCanvas } from './WorkbenchCanvas';
import { WorkbenchContextMenu, type WorkbenchContextMenuItem } from './WorkbenchContextMenu';
import {
  WorkbenchDock,
  type WorkbenchDockDragPreview,
  type WorkbenchDockDropContext,
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
  onLayoutInteractionStart?: () => void;
  onLayoutInteractionEnd?: () => void;
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
    context?: Pick<WorkbenchDockDropContext, 'canvasFrame'>
  ) => {
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
      {...{ [interactionAdapter().surfaceRootAttr]: 'true' }}
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
          selectedWidgetId={model.selectedWidgetId()}
          selectedObject={model.selectedObject()}
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
          onSelectWidget={model.canvas.selectWidget}
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
        viewport={model.viewport()}
        onSoloFilter={model.filter.solo}
        onSelectMode={model.modes.setMode}
        onViewportCommit={model.canvas.commitViewport}
        onViewportInteractionStart={() => model.canvas.cancelViewportNavigation()}
        onCreateAt={handleCreateAtClient}
        onCreateToolAt={handleCreateToolAtClient}
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
