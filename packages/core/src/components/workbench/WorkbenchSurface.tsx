import { createEffect, createMemo, createSignal, onCleanup, Show, untrack } from 'solid-js';
import { Portal } from 'solid-js/web';
import { clientToCanvasWorld } from '../ui/canvasGeometry';
import { WorkbenchCanvas } from './WorkbenchCanvas';
import { WorkbenchContextMenu } from './WorkbenchContextMenu';
import { WorkbenchFilterBar } from './WorkbenchFilterBar';
import { WorkbenchHud } from './WorkbenchHud';
import { WorkbenchLockButton } from './WorkbenchLockButton';
import { installWorkbenchContextMenuDismissListeners } from './workbenchContextMenuDismiss';
import { useWorkbenchModel, type UseWorkbenchModelOptions } from './useWorkbenchModel';
import {
  resolveWorkbenchInteractionAdapter,
  type ResolvedWorkbenchInteractionAdapter,
} from './workbenchInteractionAdapter';
import type {
  WorkbenchState,
  WorkbenchInputOwner,
  WorkbenchInteractionAdapter,
  WorkbenchWidgetDefinition,
  WorkbenchWidgetItem,
  WorkbenchWidgetType,
} from './types';

export interface WorkbenchSurfaceApi {
  ensureWidget: (
    type: WorkbenchWidgetType,
    options?: { centerViewport?: boolean; worldX?: number; worldY?: number }
  ) => WorkbenchWidgetItem | null;
  createWidget: (
    type: WorkbenchWidgetType,
    options?: { centerViewport?: boolean; worldX?: number; worldY?: number }
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
  interactionAdapter?: WorkbenchInteractionAdapter;
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
    onClose: () => {
      // Page mode has no "close" — surface is a permanent display, not a modal.
    },
  };

  const model = useWorkbenchModel(modelOptions);
  const [surfaceRootEl, setSurfaceRootEl] = createSignal<HTMLDivElement | null>(null);
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
  const contextMenuItems = createMemo(() => {
    const items = model.contextMenu.items();
    const allowed = manuallyAddableWidgetTypes();
    if (!allowed) {
      return items;
    }
    return items.filter((item) => {
      if (item.kind !== 'action') {
        return true;
      }
      const addMatch = /^add-(.+)$/.exec(String(item.id ?? ''));
      if (!addMatch) {
        return true;
      }
      return allowed.has(addMatch[1] as WorkbenchWidgetType);
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
      setInputOwner(adapter.createWidgetInputOwner(widgetId, widgetReason));
      return;
    }

    const root = surfaceRootEl();
    if (root && target instanceof Node && root.contains(target)) {
      setInputOwner(adapter.createCanvasInputOwner(canvasReason));
    }
  };

  const handoffCanvasAuthority = (
    reason: 'background_pointer' | 'selection_cleared' = 'selection_cleared',
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
      if (activeWidgetRoot && document.activeElement === activeElement && activeElement.isConnected) {
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
        const widget = model.widgetActions.addWidgetAtCursor(
          type,
          options?.worldX ?? center.worldX,
          options?.worldY ?? center.worldY
        ) ?? null;
        if (widget && options?.centerViewport !== false) {
          model.navigation.centerOnWidget(widget);
        }
        return widget;
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

      if (interactionAdapter().shouldBypassGlobalHotkeys({
        root: surfaceRootEl(),
        target: event.target,
        owner: inputOwner(),
        interactiveSelector: interactionAdapter().interactiveSelector,
      })) {
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
          if (model.selectedWidgetId()) {
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
  const clientToWorld = (clientX: number, clientY: number) => {
    const frameEl = surfaceRootEl()?.querySelector(
      '[data-floe-workbench-canvas-frame="true"]'
    ) as HTMLElement | null;
    if (!frameEl) return null;
    const rect = frameEl.getBoundingClientRect();
    return clientToCanvasWorld(rect, model.viewport(), { clientX, clientY });
  };

  const handleCreateAtClient = (type: WorkbenchWidgetType, clientX: number, clientY: number) => {
    const world = clientToWorld(clientX, clientY);
    if (!world) return;
    model.widgetActions.addWidgetAtCursor(type, world.worldX, world.worldY);
  };

  return (
    <div
      ref={setSurfaceRootEl}
      class={`workbench-surface${props.class ? ` ${props.class}` : ''}`}
      {...{ [interactionAdapter().surfaceRootAttr]: 'true' }}
      data-workbench-theme={model.theme()}
      tabIndex={-1}
    >
      <div class="workbench-surface__body" data-floe-workbench-canvas-frame="true">
        <WorkbenchCanvas
          widgetDefinitions={model.widgetDefinitions()}
          widgets={model.widgets()}
          viewport={model.viewport()}
          canvasFrameSize={model.canvasFrameSize()}
          selectedWidgetId={model.selectedWidgetId()}
          optimisticFrontWidgetId={model.optimisticFrontWidgetId()}
          locked={model.locked()}
          filters={model.filters()}
          interactionAdapter={interactionAdapter()}
          setCanvasFrameRef={model.setCanvasFrameRef}
          onViewportCommit={model.canvas.commitViewport}
          onViewportInteractionStart={model.canvas.cancelViewportNavigation}
          onCanvasContextMenu={model.canvas.openCanvasContextMenu}
          onCanvasPointerDown={() => handoffCanvasAuthority('background_pointer')}
          onSelectWidget={model.canvas.selectWidget}
          onWidgetContextMenu={model.canvas.openWidgetContextMenu}
          onStartOptimisticFront={model.canvas.startOptimisticFront}
          onCommitFront={model.canvas.commitFront}
          onCommitMove={model.canvas.commitMove}
          onCommitResize={model.canvas.commitResize}
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

      <WorkbenchFilterBar
        widgetDefinitions={filterBarWidgetDefinitions()}
        widgets={model.widgets()}
        filters={model.filters()}
        onSoloFilter={model.filter.solo}
        onShowAll={model.filter.showAll}
        onCreateAt={handleCreateAtClient}
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
            x={model.contextMenu.position()?.left ?? 0}
            y={model.contextMenu.position()?.top ?? 0}
            items={contextMenuItems()}
          />
        </Portal>
      </Show>
    </div>
  );
}
