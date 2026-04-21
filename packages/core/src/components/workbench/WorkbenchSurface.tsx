import { createEffect, onCleanup, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { isTypingElement } from '../../utils/dom';
import { clientToCanvasWorld } from '../ui/canvasGeometry';
import { WorkbenchCanvas } from './WorkbenchCanvas';
import { WorkbenchContextMenu } from './WorkbenchContextMenu';
import { WorkbenchFilterBar } from './WorkbenchFilterBar';
import { WorkbenchHud } from './WorkbenchHud';
import { WorkbenchLockButton } from './WorkbenchLockButton';
import { installWorkbenchContextMenuDismissListeners } from './workbenchContextMenuDismiss';
import { useWorkbenchModel, type UseWorkbenchModelOptions } from './useWorkbenchModel';
import type {
  WorkbenchState,
  WorkbenchWidgetDefinition,
  WorkbenchWidgetItem,
  WorkbenchWidgetType,
} from './types';

export interface WorkbenchSurfaceApi {
  ensureWidget: (
    type: WorkbenchWidgetType,
    options?: { centerViewport?: boolean; worldX?: number; worldY?: number },
  ) => WorkbenchWidgetItem | null;
  clearSelection: () => void;
  focusWidget: (
    widget: WorkbenchWidgetItem,
    options?: { centerViewport?: boolean },
  ) => WorkbenchWidgetItem;
  fitWidget: (widget: WorkbenchWidgetItem) => WorkbenchWidgetItem;
  overviewWidget: (widget: WorkbenchWidgetItem) => WorkbenchWidgetItem;
  findWidgetByType: (type: WorkbenchWidgetType) => WorkbenchWidgetItem | null;
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
  onApiReady?: (api: WorkbenchSurfaceApi | null) => void;
}

const DEFAULT_LOCK_SHORTCUT = 'F1';

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

  createEffect(() => {
    props.onApiReady?.({
      ensureWidget: (type, options) => model.widgetActions.ensureWidget(type, options) ?? null,
      clearSelection: () => model.selection.clear(),
      focusWidget: (widget, options) => model.navigation.focusWidget(widget, options),
      fitWidget: (widget) => model.navigation.fitWidget(widget),
      overviewWidget: (widget) => model.navigation.overviewWidget(widget),
      findWidgetByType: (type) => model.queries.findWidgetByType(type),
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

      const target = event.target;
      if (target instanceof Element && isTypingElement(target)) return;

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
    const frameEl = document.querySelector(
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
    <div class={`workbench-surface${props.class ? ` ${props.class}` : ''}`}>
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
          setCanvasFrameRef={model.setCanvasFrameRef}
          onViewportCommit={model.canvas.commitViewport}
          onViewportInteractionStart={model.canvas.cancelViewportNavigation}
          onCanvasContextMenu={model.canvas.openCanvasContextMenu}
          onSelectWidget={model.canvas.selectWidget}
          onWidgetContextMenu={model.canvas.openWidgetContextMenu}
          onStartOptimisticFront={model.canvas.startOptimisticFront}
          onCommitFront={model.canvas.commitFront}
          onCommitMove={model.canvas.commitMove}
          onCommitResize={model.canvas.commitResize}
          onRequestDelete={model.widgetActions.deleteWidget}
        />
      </div>

      <WorkbenchLockButton
        locked={model.locked()}
        onToggle={model.lock.toggle}
        shortcutLabel={lockShortcut() ?? undefined}
      />

      <WorkbenchFilterBar
        widgetDefinitions={model.widgetDefinitions()}
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
            items={model.contextMenu.items()}
          />
        </Portal>
      </Show>
    </div>
  );
}
