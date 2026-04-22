import { createMemo, createSignal, onCleanup, untrack, type Accessor, type JSX } from 'solid-js';
import { startHotInteraction } from '../../utils/hotInteraction';
import { GripVertical, Maximize, Minus, X } from '../../icons';
import {
  CANVAS_WHEEL_INTERACTIVE_ATTR,
  WORKBENCH_WIDGET_SHELL_ATTR,
  shouldActivateWorkbenchWidgetLocalTarget,
} from '../ui/localInteractionSurface';
import { startPointerSession, type PointerSessionController } from '../ui/pointerSession';
import { createWorkbenchWidgetSurfaceMetrics } from './workbenchHelpers';
import {
  resolveWorkbenchInteractionAdapter,
  type ResolvedWorkbenchInteractionAdapter,
} from './workbenchInteractionAdapter';
import type {
  WorkbenchViewport,
  WorkbenchInteractionAdapter,
  WorkbenchWidgetDefinition,
  WorkbenchWidgetBodyActivation,
  WorkbenchWidgetLifecycle,
  WorkbenchWidgetItem,
  WorkbenchWidgetRenderMode,
  WorkbenchWidgetSurfaceMetrics,
  WorkbenchWidgetType,
} from './types';

interface LocalDragState {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startWorldX: number;
  startWorldY: number;
  worldX: number;
  worldY: number;
  moved: boolean;
  scale: number;
  stopInteraction: () => void;
}

interface LocalResizeState {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startWidth: number;
  startHeight: number;
  width: number;
  height: number;
  scale: number;
  stopInteraction: () => void;
}

/** Minimum widget footprint in world-space pixels. */
const MIN_WIDTH = 220;
const MIN_HEIGHT = 160;

export interface WorkbenchWidgetProps {
  definition: WorkbenchWidgetDefinition;
  widgetId: string;
  widgetTitle: string;
  widgetType: WorkbenchWidgetType;
  x: number;
  y: number;
  width: number;
  height: number;
  renderLayer: number;
  itemSnapshot: () => WorkbenchWidgetItem;
  selected: boolean;
  optimisticFront: boolean;
  topRenderLayer: number;
  viewportScale: number;
  locked: boolean;
  filtered: boolean;
  layoutMode?: WorkbenchWidgetRenderMode;
  projectedViewport?: Accessor<WorkbenchViewport>;
  surfaceReady?: boolean;
  interactionAdapter?: WorkbenchInteractionAdapter | ResolvedWorkbenchInteractionAdapter;
  onSelect: (widgetId: string) => void;
  onContextMenu: (event: MouseEvent, item: WorkbenchWidgetItem) => void;
  onStartOptimisticFront: (widgetId: string) => void;
  onCommitFront: (widgetId: string) => void;
  onCommitMove: (widgetId: string, position: { x: number; y: number }) => void;
  onCommitResize: (widgetId: string, size: { width: number; height: number }) => void;
  onRequestOverview: (item: WorkbenchWidgetItem) => void;
  onRequestFit: (item: WorkbenchWidgetItem) => void;
  onRequestDelete: (widgetId: string) => void;
  onLayoutInteractionStart?: () => void;
  onLayoutInteractionEnd?: () => void;
}

export function WorkbenchWidget(props: WorkbenchWidgetProps) {
  const interactionAdapter = createMemo(() =>
    resolveWorkbenchInteractionAdapter(props.interactionAdapter)
  );
  const [dragState, setDragState] = createSignal<LocalDragState | null>(null);
  const [resizeState, setResizeState] = createSignal<LocalResizeState | null>(null);
  const [bodyActivation, setBodyActivation] =
    createSignal<WorkbenchWidgetBodyActivation>();
  let dragSession: PointerSessionController | undefined;
  let resizeSession: PointerSessionController | undefined;
  let widgetRootEl: HTMLElement | undefined;
  const startTrackedLayoutInteraction = (kind: 'drag' | 'resize', cursor: string) => {
    const stopHotInteraction = startHotInteraction({ kind, cursor });
    let stopped = false;
    untrack(() => props.onLayoutInteractionStart?.());
    return () => {
      if (stopped) return;
      stopped = true;
      stopHotInteraction();
      untrack(() => props.onLayoutInteractionEnd?.());
    };
  };

  onCleanup(() => {
    dragSession?.stop({ reason: 'manual_stop', commit: false });
    dragSession = undefined;
    resizeSession?.stop({ reason: 'manual_stop', commit: false });
    resizeSession = undefined;
    untrack(dragState)?.stopInteraction();
    untrack(resizeState)?.stopInteraction();
  });

  const isDragging = () => dragState() !== null;
  const isResizing = () => resizeState() !== null;
  const lifecycle = createMemo<WorkbenchWidgetLifecycle>(() => {
    if (props.filtered) {
      return 'cold';
    }
    return props.selected ? 'hot' : 'warm';
  });
  const resolveEventOwnership = (target: EventTarget | null) =>
    interactionAdapter().resolveWidgetEventOwnership({
      target,
      widgetRoot: widgetRootEl ?? null,
      interactiveSelector: interactionAdapter().interactiveSelector,
      panSurfaceSelector: interactionAdapter().panSurfaceSelector,
    });
  const requestActivate = () => {
    props.onSelect(props.widgetId);
    props.onCommitFront(props.widgetId);
    widgetRootEl?.focus({ preventScroll: true });
  };
  const handlePointerDown: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    if (event.button !== 0) return;

    props.onSelect(props.widgetId);
    props.onCommitFront(props.widgetId);

    const ownership = resolveEventOwnership(event.target);
    if (ownership === 'widget_shell') {
      widgetRootEl?.focus({ preventScroll: true });
      return;
    }

    if (ownership !== 'widget_local') return;
    if (
      !shouldActivateWorkbenchWidgetLocalTarget({
        target: event.target,
        widgetRoot: widgetRootEl ?? null,
        interactiveSelector: interactionAdapter().interactiveSelector,
        panSurfaceSelector: interactionAdapter().panSurfaceSelector,
      })
    ) {
      return;
    }

    setBodyActivation((previous) => ({
      seq: (previous?.seq ?? 0) + 1,
      source: 'local_pointer',
      pointerType: event.pointerType || undefined,
    }));
  };

  const livePosition = createMemo(() => {
    const current = dragState();
    if (!current) return { x: props.x, y: props.y };
    return { x: current.worldX, y: current.worldY };
  });

  const liveSize = createMemo(() => {
    const current = resizeState();
    if (!current) return { width: props.width, height: props.height };
    return { width: current.width, height: current.height };
  });
  const surfaceMetrics = createMemo<WorkbenchWidgetSurfaceMetrics | undefined>(() => {
    if (props.layoutMode !== 'projected_surface' || !props.projectedViewport) {
      return undefined;
    }

    return createWorkbenchWidgetSurfaceMetrics({
      widgetId: props.widgetId,
      worldX: livePosition().x,
      worldY: livePosition().y,
      worldWidth: liveSize().width,
      worldHeight: liveSize().height,
      viewport: props.projectedViewport(),
      ready: props.surfaceReady ?? true,
    });
  });
  const widgetBadgeLabel = createMemo(() => {
    const zIndex = props.itemSnapshot().z_index;
    const normalizedIndex = Number.isFinite(zIndex)
      ? Math.max(1, Math.min(99, Math.round(zIndex)))
      : 1;
    return String(normalizedIndex).padStart(2, '0');
  });
  const handleOverview: JSX.EventHandler<HTMLElement, MouseEvent | PointerEvent> = (event) => {
    event.preventDefault();
    event.stopPropagation();
    props.onRequestOverview(props.itemSnapshot());
  };
  const handleFit: JSX.EventHandler<HTMLElement, MouseEvent | PointerEvent> = (event) => {
    event.preventDefault();
    event.stopPropagation();
    props.onRequestFit(props.itemSnapshot());
  };
  const handleDelete: JSX.EventHandler<HTMLElement, MouseEvent | PointerEvent> = (event) => {
    event.preventDefault();
    event.stopPropagation();
    props.onRequestDelete(props.widgetId);
  };
  const rootStyle = createMemo<JSX.CSSProperties>(() => {
    const shared = {
      width: `${liveSize().width}px`,
      height: `${liveSize().height}px`,
      'z-index':
        isDragging() || isResizing() || props.optimisticFront
          ? `${props.topRenderLayer + 1}`
          : `${props.renderLayer}`,
    } satisfies JSX.CSSProperties;

    if (props.layoutMode === 'projected_surface') {
      const rect = surfaceMetrics()?.rect;
      return {
        ...shared,
        transform: `translate3d(${rect?.screenX ?? 0}px, ${rect?.screenY ?? 0}px, 0) scale(${rect?.viewportScale ?? Math.max(props.viewportScale, 0.001)})`,
      };
    }

    return {
      ...shared,
      transform: `translate(${livePosition().x}px, ${livePosition().y}px)`,
    };
  });

  const finishDrag = (commitMove: boolean) => {
    const current = untrack(dragState);
    if (!current) return;

    const next = { x: current.worldX, y: current.worldY };
    const start = { x: current.startWorldX, y: current.startWorldY };
    const shouldCommitMove =
      commitMove && (Math.abs(next.x - start.x) > 1 || Math.abs(next.y - start.y) > 1);

    // Commit position FIRST so the parent snapshot reflects the final value
    // before we release the local drag state. Otherwise livePosition would
    // snap back to stale props for a frame.
    props.onCommitFront(props.widgetId);
    if (shouldCommitMove) {
      props.onCommitMove(props.widgetId, next);
    }

    current.stopInteraction();
    setDragState(null);
    dragSession = undefined;
  };

  const beginDrag: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    if (event.button !== 0 || props.locked) return;

    event.preventDefault();
    event.stopPropagation();
    dragSession?.stop({ reason: 'manual_stop', commit: false });
    props.onSelect(props.widgetId);
    widgetRootEl?.focus({ preventScroll: true });
    props.onStartOptimisticFront(props.widgetId);

    const stopInteraction = startTrackedLayoutInteraction('drag', 'grabbing');
    const scale = Math.max(props.viewportScale, 0.001);

    setDragState({
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWorldX: props.x,
      startWorldY: props.y,
      worldX: props.x,
      worldY: props.y,
      moved: false,
      scale,
      stopInteraction,
    });

    const handleMove = (nextEvent: PointerEvent) => {
      setDragState((current) => {
        if (!current || current.pointerId !== nextEvent.pointerId) return current;
        const worldX =
          current.startWorldX + (nextEvent.clientX - current.startClientX) / current.scale;
        const worldY =
          current.startWorldY + (nextEvent.clientY - current.startClientY) / current.scale;
        return {
          ...current,
          worldX,
          worldY,
          moved:
            current.moved ||
            Math.abs(worldX - current.startWorldX) > 2 ||
            Math.abs(worldY - current.startWorldY) > 2,
        };
      });
    };

    dragSession = startPointerSession({
      pointerEvent: event,
      captureEl: event.currentTarget,
      onMove: handleMove,
      onEnd: ({ commit }) => finishDrag(commit),
    });
  };

  const finishResize = (commit: boolean) => {
    const current = untrack(resizeState);
    if (!current) return;

    const nextSize = { width: current.width, height: current.height };
    const changed =
      Math.abs(current.width - current.startWidth) > 1 ||
      Math.abs(current.height - current.startHeight) > 1;

    if (commit && changed) {
      props.onCommitResize(props.widgetId, nextSize);
    }

    current.stopInteraction();
    setResizeState(null);
    resizeSession = undefined;
  };

  const beginResize: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    if (event.button !== 0 || props.locked) return;

    event.preventDefault();
    event.stopPropagation();
    resizeSession?.stop({ reason: 'manual_stop', commit: false });
    props.onStartOptimisticFront(props.widgetId);

    const stopInteraction = startTrackedLayoutInteraction('resize', 'nwse-resize');
    const scale = Math.max(props.viewportScale, 0.001);

    setResizeState({
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWidth: props.width,
      startHeight: props.height,
      width: props.width,
      height: props.height,
      scale,
      stopInteraction,
    });

    const handleMove = (nextEvent: PointerEvent) => {
      setResizeState((current) => {
        if (!current || current.pointerId !== nextEvent.pointerId) return current;
        const width = Math.max(
          MIN_WIDTH,
          current.startWidth + (nextEvent.clientX - current.startClientX) / current.scale
        );
        const height = Math.max(
          MIN_HEIGHT,
          current.startHeight + (nextEvent.clientY - current.startClientY) / current.scale
        );
        return { ...current, width, height };
      });
    };

    resizeSession = startPointerSession({
      pointerEvent: event,
      captureEl: event.currentTarget,
      onMove: handleMove,
      onEnd: ({ commit }) => finishResize(commit),
    });
  };

  return (
    <article
      ref={widgetRootEl}
      class="workbench-widget"
      classList={{
        'is-selected': props.selected,
        'is-dragging': isDragging(),
        'is-resizing': isResizing(),
        'is-filtered-out': props.filtered,
        'is-projected-surface': props.layoutMode === 'projected_surface',
        'is-locked': props.locked,
      }}
      {...{ [interactionAdapter().dialogSurfaceHostAttr]: 'true' }}
      data-floe-workbench-widget-id={props.widgetId}
      {...{ [interactionAdapter().widgetRootAttr]: 'true' }}
      {...{ [interactionAdapter().widgetIdAttr]: props.widgetId }}
      data-workbench-widget-type={props.widgetType}
      data-floe-workbench-render-mode={props.layoutMode ?? 'canvas_scaled'}
      {...{ [CANVAS_WHEEL_INTERACTIVE_ATTR]: props.selected ? 'true' : undefined }}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onFocus={() => {
        props.onSelect(props.widgetId);
      }}
      onContextMenu={(event) => {
        if (resolveEventOwnership(event.target) !== 'widget_shell') return;
        event.preventDefault();
        event.stopPropagation();
        props.onContextMenu(event, props.itemSnapshot());
      }}
      style={rootStyle()}
    >
      <header
        class="workbench-widget__header"
        onPointerDown={beginDrag}
        {...{ [WORKBENCH_WIDGET_SHELL_ATTR]: 'true' }}
      >
        <span class="workbench-widget__traffic" role="group" aria-label="Window controls">
          <button
            type="button"
            class="workbench-widget__traffic-dot workbench-widget__traffic-dot--close"
            aria-label="Close widget"
            title="Close widget"
            data-floe-canvas-interactive="true"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={handleDelete}
          >
            <X class="workbench-widget__traffic-icon" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="workbench-widget__traffic-dot workbench-widget__traffic-dot--min"
            aria-label="Minimize widget to overview"
            title="Minimize widget to overview"
            data-floe-canvas-interactive="true"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={handleOverview}
          >
            <Minus class="workbench-widget__traffic-icon" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="workbench-widget__traffic-dot workbench-widget__traffic-dot--max"
            aria-label="Zoom widget to fit viewport"
            title="Zoom widget to fit viewport"
            data-floe-canvas-interactive="true"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={handleFit}
          >
            <Maximize class="workbench-widget__traffic-icon" aria-hidden="true" />
          </button>
        </span>
        <span class="workbench-widget__badge" aria-hidden="true">
          {widgetBadgeLabel()}
        </span>
        <button
          type="button"
          class="workbench-widget__drag"
          aria-label="Drag widget"
          data-floe-canvas-interactive="true"
          onPointerDown={beginDrag}
        >
          <GripVertical class="w-3.5 h-3.5" />
        </button>
        <div class="workbench-widget__title-area">
          <span class="workbench-widget__title-dot" aria-hidden="true" />
          {(() => {
            const Icon = props.definition.icon;
            return <Icon class="w-3.5 h-3.5" />;
          })()}
          <span class="workbench-widget__title">{props.widgetTitle}</span>
        </div>
        <span class="workbench-widget__window-controls" role="group" aria-label="Window controls">
          <button
            type="button"
            class="workbench-widget__window-control workbench-widget__window-control--min"
            aria-label="Minimize widget to overview"
            title="Minimize widget to overview"
            data-floe-canvas-interactive="true"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={handleOverview}
          >
            <Minus class="workbench-widget__window-control-icon" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="workbench-widget__window-control workbench-widget__window-control--max"
            aria-label="Zoom widget to fit viewport"
            title="Zoom widget to fit viewport"
            data-floe-canvas-interactive="true"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={handleFit}
          >
            <Maximize class="workbench-widget__window-control-icon" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="workbench-widget__window-control workbench-widget__window-control--close"
            aria-label="Remove widget"
            title="Remove widget"
            data-floe-canvas-interactive="true"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={handleDelete}
          >
            <X class="workbench-widget__window-control-icon" aria-hidden="true" />
          </button>
        </span>
      </header>
      <div class="workbench-widget__body" data-floe-canvas-interactive="true">
        {(() => {
          const Body = props.definition.body;
          return (
            <Body
              widgetId={props.widgetId}
              title={props.widgetTitle}
              type={props.widgetType}
              surfaceMetrics={surfaceMetrics}
              activation={bodyActivation()}
              lifecycle={lifecycle()}
              selected={props.selected}
              filtered={props.filtered}
              requestActivate={requestActivate}
            />
          );
        })()}
      </div>
      {props.locked ? null : (
        <div
          class="workbench-widget__resize"
          aria-label="Resize widget"
          data-floe-canvas-interactive="true"
          onPointerDown={beginResize}
        >
          <svg class="workbench-widget__resize-glyph" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M12 0 L0 12" />
            <path d="M12 4 L4 12" />
            <path d="M12 8 L8 12" />
          </svg>
        </div>
      )}
    </article>
  );
}
