import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  untrack,
  type Accessor,
  type JSX,
} from 'solid-js';
import { startHotInteraction } from '../../utils/hotInteraction';
import { GripVertical, Maximize, Minus, X } from '../../icons';
import {
  CANVAS_WHEEL_INTERACTIVE_ATTR,
  resolveWorkbenchWidgetTextSelectionTarget,
  WORKBENCH_WIDGET_SHELL_ATTR,
  resolveWorkbenchWidgetLocalTypingTarget,
  shouldActivateWorkbenchWidgetLocalTarget,
} from '../ui/localInteractionSurface';
import { startPointerSession, type PointerSessionController } from '../ui/pointerSession';
import {
  createWorkbenchWidgetSurfaceMetrics,
  resolveWorkbenchProjectedSurfaceScaleBehavior,
} from './workbenchHelpers';
import {
  WORKBENCH_EDGE_AUTO_PAN_FRAME_SELECTOR,
  createWorkbenchEdgeAutoPanController,
  frameFromElement,
  type WorkbenchEdgeAutoPanController,
} from './workbenchEdgeAutoPan';
import {
  resolveWorkbenchInteractionAdapter,
  type ResolvedWorkbenchInteractionAdapter,
} from './workbenchInteractionAdapter';
import { createOwnerSafePropAccessor } from './workbenchOwnerSafeAccessors';
import type {
  WorkbenchViewport,
  WorkbenchInteractionAdapter,
  WorkbenchWidgetDefinition,
  WorkbenchWidgetBodyActivation,
  WorkbenchWidgetLifecycle,
  WorkbenchWidgetItem,
  WorkbenchWidgetMotionIntent,
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
  autoPanWorldX: number;
  autoPanWorldY: number;
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

interface ScheduledLocalTypingFocusRestore {
  token: number;
  pointerId: number;
  target: HTMLElement;
  timestamp: number;
}

interface PendingPointerOwnershipPreclaim {
  token: number;
  wasSelected: boolean;
  ownership: ReturnType<ResolvedWorkbenchInteractionAdapter['resolveWidgetEventOwnership']>;
}

/** Minimum widget footprint in world-space pixels. */
const MIN_WIDTH = 220;
const MIN_HEIGHT = 160;
const PROJECTED_SHARP_SETTLE_MS = 160;

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
  visualFront: boolean;
  motion?: WorkbenchWidgetMotionIntent | null;
  topRenderLayer: number;
  viewportScale: number;
  locked: boolean;
  filtered: boolean;
  layoutMode?: WorkbenchWidgetRenderMode;
  projectedViewport?: Accessor<WorkbenchViewport>;
  surfaceReady?: boolean;
  interactionAdapter?: WorkbenchInteractionAdapter | ResolvedWorkbenchInteractionAdapter;
  viewport?: WorkbenchViewport;
  onSelect: (widgetId: string) => void;
  onActivate?: (widgetId: string) => void;
  onContextMenu: (event: MouseEvent, item: WorkbenchWidgetItem) => void;
  onClaimVisualFrontOwner: (widgetId: string) => void;
  onCommitFront: (widgetId: string) => void;
  onCommitMove: (widgetId: string, position: { x: number; y: number }) => void;
  onCommitResize: (widgetId: string, size: { width: number; height: number }) => void;
  onViewportCommit?: (viewport: WorkbenchViewport) => void;
  onViewportInteractionStart?: (kind: 'pan') => void;
  onRequestOverview: (item: WorkbenchWidgetItem) => void;
  onRequestFit: (item: WorkbenchWidgetItem) => void;
  onRequestDelete: (widgetId: string) => void;
  onLayoutInteractionStart?: () => void;
  onLayoutInteractionEnd?: () => void;
}

export function WorkbenchWidget(props: WorkbenchWidgetProps) {
  const definition = createOwnerSafePropAccessor(() => props.definition);
  const widgetId = createOwnerSafePropAccessor(() => props.widgetId);
  const widgetTitle = createOwnerSafePropAccessor(() => props.widgetTitle);
  const widgetType = createOwnerSafePropAccessor(() => props.widgetType);
  const itemSnapshot = createOwnerSafePropAccessor(() => props.itemSnapshot);
  const renderLayer = createOwnerSafePropAccessor(() => props.renderLayer);
  const visualFront = createOwnerSafePropAccessor(() => props.visualFront);
  const motion = createOwnerSafePropAccessor(() => props.motion ?? null);
  const topRenderLayer = createOwnerSafePropAccessor(() => props.topRenderLayer);
  const viewport = createOwnerSafePropAccessor(() => props.viewport);
  const onSelect = createOwnerSafePropAccessor(() => props.onSelect);
  const onActivate = createOwnerSafePropAccessor(() => props.onActivate);
  const onContextMenu = createOwnerSafePropAccessor(() => props.onContextMenu);
  const onClaimVisualFrontOwner = createOwnerSafePropAccessor(() => props.onClaimVisualFrontOwner);
  const onCommitFront = createOwnerSafePropAccessor(() => props.onCommitFront);
  const onCommitMove = createOwnerSafePropAccessor(() => props.onCommitMove);
  const onCommitResize = createOwnerSafePropAccessor(() => props.onCommitResize);
  const onViewportCommit = createOwnerSafePropAccessor(() => props.onViewportCommit);
  const onViewportInteractionStart = createOwnerSafePropAccessor(
    () => props.onViewportInteractionStart
  );
  const onRequestOverview = createOwnerSafePropAccessor(() => props.onRequestOverview);
  const onRequestFit = createOwnerSafePropAccessor(() => props.onRequestFit);
  const onRequestDelete = createOwnerSafePropAccessor(() => props.onRequestDelete);
  const onLayoutInteractionStart = createOwnerSafePropAccessor(
    () => props.onLayoutInteractionStart
  );
  const onLayoutInteractionEnd = createOwnerSafePropAccessor(() => props.onLayoutInteractionEnd);
  const interactionAdapter = createMemo(() =>
    resolveWorkbenchInteractionAdapter(props.interactionAdapter)
  );
  const externallySelected = createOwnerSafePropAccessor(() => props.selected);
  const locked = createOwnerSafePropAccessor(() => props.locked);
  const filtered = createOwnerSafePropAccessor(() => props.filtered);
  const layoutMode = createOwnerSafePropAccessor(() => props.layoutMode ?? 'canvas_scaled');
  const projectedViewport = createOwnerSafePropAccessor(() => props.projectedViewport);
  const surfaceReady = createOwnerSafePropAccessor(() => props.surfaceReady ?? true);
  const position = createOwnerSafePropAccessor(() => ({ x: props.x, y: props.y }));
  const size = createOwnerSafePropAccessor(() => ({ width: props.width, height: props.height }));
  const viewportScale = createOwnerSafePropAccessor(() => Math.max(props.viewportScale, 0.001));
  const [dragState, setDragState] = createSignal<LocalDragState | null>(null);
  const [resizeState, setResizeState] = createSignal<LocalResizeState | null>(null);
  const [bodyActivation, setBodyActivation] = createSignal<WorkbenchWidgetBodyActivation>();
  const [localSelectionClaim, setLocalSelectionClaim] = createSignal(false);
  const [localActivationPending, setLocalActivationPending] = createSignal(false);
  const [sharpProjection, setSharpProjection] = createSignal({
    enabled: false,
    scale: 1,
  });
  let dragSession: PointerSessionController | undefined;
  let resizeSession: PointerSessionController | undefined;
  let edgeAutoPan: WorkbenchEdgeAutoPanController | undefined;
  let edgeAutoPanViewport: WorkbenchViewport | null = null;
  let pendingLocalInteractionToken = 0;
  let pendingPointerOwnershipPreclaimToken = 0;
  let pendingLocalTypingFocusRestore: ScheduledLocalTypingFocusRestore | null = null;
  let sharpProjectionTimer: number | undefined;
  const pendingPointerOwnershipPreclaims = new Map<number, PendingPointerOwnershipPreclaim>();
  let widgetRootEl: HTMLElement | undefined;
  const clearSharpProjectionTimer = () => {
    if (typeof window === 'undefined' || sharpProjectionTimer === undefined) {
      return;
    }

    window.clearTimeout(sharpProjectionTimer);
    sharpProjectionTimer = undefined;
  };
  const startTrackedLayoutInteraction = (kind: 'drag' | 'resize', cursor: string) => {
    const stopHotInteraction = startHotInteraction({ kind, cursor });
    let stopped = false;
    untrack(() => onLayoutInteractionStart()?.());
    return () => {
      if (stopped) return;
      stopped = true;
      stopHotInteraction();
      untrack(() => onLayoutInteractionEnd()?.());
    };
  };
  const stopEdgeAutoPan = () => {
    edgeAutoPan?.stop();
    edgeAutoPan = undefined;
    edgeAutoPanViewport = null;
  };
  const startEdgeAutoPan = () => {
    const currentViewport = viewport();
    const commitViewport = onViewportCommit();
    const notifyViewportInteractionStart = onViewportInteractionStart();
    if (!currentViewport || !commitViewport) return;
    edgeAutoPanViewport = currentViewport;
    edgeAutoPan?.stop();
    edgeAutoPan = createWorkbenchEdgeAutoPanController({
      readFrame: () => {
        const frame = widgetRootEl?.closest(WORKBENCH_EDGE_AUTO_PAN_FRAME_SELECTOR);
        return frame instanceof HTMLElement ? frameFromElement(frame) : null;
      },
      readViewport: () => edgeAutoPanViewport ?? currentViewport,
      commitViewport: (nextViewport) => {
        edgeAutoPanViewport = nextViewport;
        commitViewport(nextViewport);
      },
      onPanStart: () => notifyViewportInteractionStart?.('pan'),
      onPan: (step) => {
        setDragState((current) => {
          if (!current) return current;
          return {
            ...current,
            autoPanWorldX: current.autoPanWorldX + step.worldDeltaX,
            autoPanWorldY: current.autoPanWorldY + step.worldDeltaY,
            worldX: current.worldX + step.worldDeltaX,
            worldY: current.worldY + step.worldDeltaY,
            moved: true,
          };
        });
      },
      shouldPan: () => dragState() !== null,
    });
  };

  onCleanup(() => {
    stopEdgeAutoPan();
    dragSession?.stop({ reason: 'manual_stop', commit: false });
    dragSession = undefined;
    resizeSession?.stop({ reason: 'manual_stop', commit: false });
    resizeSession = undefined;
    untrack(dragState)?.stopInteraction();
    untrack(resizeState)?.stopInteraction();
    clearSharpProjectionTimer();
  });

  const commitWidgetSelectionAndFront = () => {
    const currentWidgetId = widgetId();
    const activate = onActivate();
    if (activate) {
      setLocalSelectionClaim(true);
      setLocalActivationPending(true);
      activate(currentWidgetId);
      return;
    }
    setLocalSelectionClaim(false);
    onSelect()(currentWidgetId);
    onCommitFront()(currentWidgetId);
  };
  const commitWidgetFrontIfBehind = () => {
    if (renderLayer() >= topRenderLayer()) {
      onClaimVisualFrontOwner()(widgetId());
      return;
    }
    onCommitFront()(widgetId());
  };
  const clearLocalSelectionClaim = () => {
    setLocalSelectionClaim(false);
  };
  const selected = createMemo(() => externallySelected() || localSelectionClaim());
  createEffect(() => {
    if (!localActivationPending() || !externallySelected()) return;
    setLocalActivationPending(false);
    setLocalSelectionClaim(false);
  });
  const preclaimPointerOwnership = (
    pointerId: number,
    wasSelected: boolean,
    ownership: ReturnType<ResolvedWorkbenchInteractionAdapter['resolveWidgetEventOwnership']>
  ) => {
    const preclaim = {
      token: ++pendingPointerOwnershipPreclaimToken,
      wasSelected,
      ownership,
    };
    pendingPointerOwnershipPreclaims.set(pointerId, preclaim);
    if (!wasSelected && ownership === 'widget_local') {
      setLocalSelectionClaim(true);
    }
    queueMicrotask(() => {
      const current = pendingPointerOwnershipPreclaims.get(pointerId);
      if (current?.token !== preclaim.token) return;
      pendingPointerOwnershipPreclaims.delete(pointerId);
    });
  };
  const consumePointerOwnershipPreclaim = (
    pointerId: number
  ): PendingPointerOwnershipPreclaim | null => {
    const preclaim = pendingPointerOwnershipPreclaims.get(pointerId) ?? null;
    if (preclaim) {
      pendingPointerOwnershipPreclaims.delete(pointerId);
    }
    return preclaim;
  };

  createEffect(() => {
    const root = widgetRootEl;
    if (!root) return;

    const handlePointerDownCapture = (event: PointerEvent) => {
      if (event.button !== 0) return;
      preclaimPointerOwnership(event.pointerId, selected(), resolveEventOwnership(event.target));
    };
    const handleClickCapture = (event: MouseEvent) => {
      if (event.button !== 0) return;
      if (resolveEventOwnership(event.target) !== 'widget_local') return;
      if (localSelectionClaim()) {
        commitWidgetSelectionAndFront();
        return;
      }
      if (externallySelected()) {
        commitWidgetFrontIfBehind();
      }
    };
    const handlePointerUp = () => {
      setTimeout(() => {
        if (!externallySelected()) {
          clearLocalSelectionClaim();
        }
      }, 0);
    };

    root.addEventListener('pointerdown', handlePointerDownCapture, true);
    root.addEventListener('click', handleClickCapture, true);
    root.addEventListener('pointerup', handlePointerUp);
    root.addEventListener('pointercancel', clearLocalSelectionClaim);
    onCleanup(() => {
      root.removeEventListener('pointerdown', handlePointerDownCapture, true);
      root.removeEventListener('click', handleClickCapture, true);
      root.removeEventListener('pointerup', handlePointerUp);
      root.removeEventListener('pointercancel', clearLocalSelectionClaim);
    });
  });

  const isDragging = () => dragState() !== null;
  const isResizing = () => resizeState() !== null;
  const lifecycle = createMemo<WorkbenchWidgetLifecycle>(() => {
    if (filtered() || locked()) {
      return 'cold';
    }
    return selected() ? 'hot' : 'warm';
  });
  const resolveEventOwnership = (target: EventTarget | null) =>
    interactionAdapter().resolveWidgetEventOwnership({
      target,
      widgetRoot: widgetRootEl ?? null,
      interactiveSelector: interactionAdapter().interactiveSelector,
      panSurfaceSelector: interactionAdapter().panSurfaceSelector,
    });
  const requestActivate = () => {
    commitWidgetSelectionAndFront();
    widgetRootEl?.focus({ preventScroll: true });
  };
  const emitBodyActivation = (pointerType?: string) => {
    setBodyActivation((previous) => ({
      seq: (previous?.seq ?? 0) + 1,
      source: 'local_pointer',
      pointerType,
    }));
  };
  const restoreTypingTargetFocus = (target: HTMLElement) => {
    if (!widgetRootEl || !target.isConnected || !widgetRootEl.contains(target)) {
      return;
    }

    try {
      target.focus({ preventScroll: true });
    } catch {
      target.focus();
    }
  };
  const scheduleTypingTargetFocusRestore = (pointerId: number, target: HTMLElement) => {
    pendingLocalTypingFocusRestore = {
      token: ++pendingLocalInteractionToken,
      pointerId,
      target,
      timestamp: Date.now(),
    };
    const scheduled = pendingLocalTypingFocusRestore;
    queueMicrotask(() => {
      const flush = () => {
        if (!scheduled || pendingLocalTypingFocusRestore?.token !== scheduled.token) return;
        restoreTypingTargetFocus(scheduled.target);
        pendingLocalTypingFocusRestore = null;
      };
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => flush());
        return;
      }
      flush();
    });
  };

  const handlePointerDown: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    if (event.button !== 0) return;
    if (locked()) return;

    const pointerOwnershipPreclaim = consumePointerOwnershipPreclaim(event.pointerId);
    const wasSelected = pointerOwnershipPreclaim?.wasSelected ?? externallySelected();
    const ownership = pointerOwnershipPreclaim?.ownership ?? resolveEventOwnership(event.target);
    const localTypingTarget =
      ownership === 'widget_local'
        ? resolveWorkbenchWidgetLocalTypingTarget({
            target: event.target,
            widgetRoot: widgetRootEl ?? null,
            interactiveSelector: interactionAdapter().interactiveSelector,
            panSurfaceSelector: interactionAdapter().panSurfaceSelector,
          })
        : null;
    const localTextSelectionTarget =
      ownership === 'widget_local'
        ? resolveWorkbenchWidgetTextSelectionTarget({
            target: event.target,
            widgetRoot: widgetRootEl ?? null,
            interactiveSelector: interactionAdapter().interactiveSelector,
            panSurfaceSelector: interactionAdapter().panSurfaceSelector,
          })
        : null;
    const shouldActivateLocalTarget =
      ownership === 'widget_local' &&
      !localTypingTarget &&
      !localTextSelectionTarget &&
      shouldActivateWorkbenchWidgetLocalTarget({
        target: event.target,
        widgetRoot: widgetRootEl ?? null,
        interactiveSelector: interactionAdapter().interactiveSelector,
        panSurfaceSelector: interactionAdapter().panSurfaceSelector,
      });

    if (ownership === 'widget_shell') {
      commitWidgetSelectionAndFront();
      widgetRootEl?.focus({ preventScroll: true });
      return;
    }

    if (ownership !== 'widget_local') return;
    if (localTypingTarget) {
      if (!wasSelected) {
        scheduleTypingTargetFocusRestore(event.pointerId, localTypingTarget);
      }
      return;
    }

    if (localTextSelectionTarget) {
      pendingLocalTypingFocusRestore = null;
      return;
    }

    if (!shouldActivateLocalTarget) {
      return;
    }

    pendingLocalTypingFocusRestore = null;
    if (wasSelected) {
      emitBodyActivation(event.pointerType || undefined);
      return;
    }

    commitWidgetSelectionAndFront();
    emitBodyActivation(event.pointerType || undefined);
  };

  const livePosition = createMemo(() => {
    const current = dragState();
    if (!current) return position();
    return { x: current.worldX, y: current.worldY };
  });

  const liveSize = createMemo(() => {
    const current = resizeState();
    if (!current) return size();
    return { width: current.width, height: current.height };
  });
  const surfaceMetrics = createMemo<WorkbenchWidgetSurfaceMetrics | undefined>(() => {
    const viewportAccessor = projectedViewport();
    if (layoutMode() !== 'projected_surface' || !viewportAccessor) {
      return undefined;
    }

    return createWorkbenchWidgetSurfaceMetrics({
      widgetId: widgetId(),
      worldX: livePosition().x,
      worldY: livePosition().y,
      worldWidth: liveSize().width,
      worldHeight: liveSize().height,
      viewport: viewportAccessor(),
      ready: surfaceReady(),
    });
  });
  const projectedScale = createMemo(() => surfaceMetrics()?.rect.viewportScale ?? viewportScale());
  const projectedSharpEligible = createMemo(
    () =>
      layoutMode() === 'projected_surface' &&
      resolveWorkbenchProjectedSurfaceScaleBehavior(definition()) === 'settle_sharp_zoom'
  );
  const projectedSharpActive = createMemo(
    () =>
      layoutMode() === 'projected_surface' &&
      projectedSharpEligible() &&
      sharpProjection().enabled &&
      sharpProjection().scale > 1.001
  );
  const projectedSurfaceStyle = createMemo<JSX.CSSProperties | undefined>(() => {
    if (layoutMode() !== 'projected_surface') {
      return undefined;
    }

    const scale = projectedScale();
    if (projectedSharpActive()) {
      return {
        width: `${liveSize().width}px`,
        height: `${liveSize().height}px`,
        zoom: `${scale}`,
      };
    }

    return {
      width: '100%',
      height: '100%',
      zoom: '1',
    };
  });
  const widgetBadgeLabel = createMemo(() => {
    const zIndex = itemSnapshot()().z_index;
    const normalizedIndex = Number.isFinite(zIndex)
      ? Math.max(1, Math.min(99, Math.round(zIndex)))
      : 1;
    return String(normalizedIndex).padStart(2, '0');
  });
  const handleOverview: JSX.EventHandler<HTMLElement, MouseEvent | PointerEvent> = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onRequestOverview()(itemSnapshot()());
  };
  const handleFit: JSX.EventHandler<HTMLElement, MouseEvent | PointerEvent> = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onRequestFit()(itemSnapshot()());
  };
  const handleDelete: JSX.EventHandler<HTMLElement, MouseEvent | PointerEvent> = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onRequestDelete()(widgetId());
  };
  const rootStyle = createMemo<JSX.CSSProperties>(() => {
    const shared = {
      'z-index':
        isDragging() || isResizing() || visualFront()
          ? `${topRenderLayer() + 1}`
          : `${renderLayer()}`,
    } satisfies JSX.CSSProperties;

    if (layoutMode() === 'projected_surface') {
      const rect = surfaceMetrics()?.rect;
      const scale = projectedScale();
      const sharp = projectedSharpActive();
      const width = sharp ? (rect?.screenWidth ?? liveSize().width * scale) : liveSize().width;
      const height = sharp ? (rect?.screenHeight ?? liveSize().height * scale) : liveSize().height;
      return {
        ...shared,
        width: `${width}px`,
        height: `${height}px`,
        transform: sharp
          ? `translate(${rect?.screenX ?? 0}px, ${rect?.screenY ?? 0}px)`
          : `translate(${rect?.screenX ?? 0}px, ${rect?.screenY ?? 0}px) scale(${scale})`,
        zoom: '1',
      };
    }

    return {
      ...shared,
      width: `${liveSize().width}px`,
      height: `${liveSize().height}px`,
      transform: `translate(${livePosition().x}px, ${livePosition().y}px)`,
    };
  });
  const enterMotionActive = createMemo(() => motion()?.phase === 'enter');

  createEffect(() => {
    if (!projectedSharpEligible()) {
      clearSharpProjectionTimer();
      setSharpProjection({ enabled: false, scale: 1 });
      return;
    }

    const scale = projectedScale();
    if (scale <= 1.001 || isDragging() || isResizing()) {
      clearSharpProjectionTimer();
      setSharpProjection({ enabled: false, scale });
      return;
    }

    setSharpProjection({ enabled: false, scale });
    if (typeof window === 'undefined') {
      return;
    }

    clearSharpProjectionTimer();
    const settleScale = scale;
    sharpProjectionTimer = window.setTimeout(() => {
      sharpProjectionTimer = undefined;
      setSharpProjection((current) =>
        Math.abs(current.scale - settleScale) < 0.001
          ? { enabled: true, scale: settleScale }
          : current
      );
    }, PROJECTED_SHARP_SETTLE_MS);
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
    const currentWidgetId = widgetId();
    onCommitFront()(currentWidgetId);
    if (shouldCommitMove) {
      onCommitMove()(currentWidgetId, next);
    }

    current.stopInteraction();
    stopEdgeAutoPan();
    setDragState(null);
    dragSession = undefined;
  };

  const beginDrag: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    if (event.button !== 0 || locked()) return;

    event.preventDefault();
    event.stopPropagation();
    dragSession?.stop({ reason: 'manual_stop', commit: false });
    const currentWidgetId = widgetId();
    onSelect()(currentWidgetId);
    widgetRootEl?.focus({ preventScroll: true });
    onClaimVisualFrontOwner()(currentWidgetId);

    const stopInteraction = startTrackedLayoutInteraction('drag', 'grabbing');
    const scale = viewportScale();
    const startPosition = position();

    setDragState({
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWorldX: startPosition.x,
      startWorldY: startPosition.y,
      worldX: startPosition.x,
      worldY: startPosition.y,
      autoPanWorldX: 0,
      autoPanWorldY: 0,
      moved: false,
      scale,
      stopInteraction,
    });

    startEdgeAutoPan();
    const handleMove = (nextEvent: PointerEvent) => {
      edgeAutoPan?.updatePointer(nextEvent.clientX, nextEvent.clientY);
      setDragState((current) => {
        if (!current || current.pointerId !== nextEvent.pointerId) return current;
        const worldX =
          current.startWorldX +
          (nextEvent.clientX - current.startClientX) / current.scale +
          current.autoPanWorldX;
        const worldY =
          current.startWorldY +
          (nextEvent.clientY - current.startClientY) / current.scale +
          current.autoPanWorldY;
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
      onCommitResize()(widgetId(), nextSize);
    }

    current.stopInteraction();
    setResizeState(null);
    resizeSession = undefined;
  };

  const beginResize: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    if (event.button !== 0 || locked()) return;

    event.preventDefault();
    event.stopPropagation();
    resizeSession?.stop({ reason: 'manual_stop', commit: false });
    onClaimVisualFrontOwner()(widgetId());

    const stopInteraction = startTrackedLayoutInteraction('resize', 'nwse-resize');
    const scale = viewportScale();
    const startSize = size();

    setResizeState({
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWidth: startSize.width,
      startHeight: startSize.height,
      width: startSize.width,
      height: startSize.height,
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
        'is-selected': selected(),
        'is-dragging': isDragging(),
        'is-resizing': isResizing(),
        'is-filtered-out': filtered(),
        'is-projected-surface': layoutMode() === 'projected_surface',
        'is-locked': locked(),
        'is-entering': enterMotionActive(),
      }}
      {...{ [interactionAdapter().dialogSurfaceHostAttr]: 'true' }}
      data-floe-workbench-widget-id={widgetId()}
      {...{ [interactionAdapter().widgetRootAttr]: 'true' }}
      {...{ [interactionAdapter().widgetIdAttr]: widgetId() }}
      data-workbench-widget-type={widgetType()}
      data-floe-workbench-render-mode={layoutMode()}
      data-workbench-widget-motion={enterMotionActive() ? 'enter' : undefined}
      {...{ [CANVAS_WHEEL_INTERACTIVE_ATTR]: selected() ? 'true' : undefined }}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onFocus={() => {
        if (localSelectionClaim() || localActivationPending()) return;
        onSelect()(widgetId());
      }}
      onContextMenu={(event) => {
        if (resolveEventOwnership(event.target) !== 'widget_shell') return;
        event.preventDefault();
        event.stopPropagation();
        onContextMenu()(event, itemSnapshot()());
      }}
      style={rootStyle()}
    >
      <div class="workbench-widget__surface" style={projectedSurfaceStyle()}>
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
              const Icon = definition().icon;
              return <Icon class="w-3.5 h-3.5" />;
            })()}
            <span class="workbench-widget__title">{widgetTitle()}</span>
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
            const Body = definition().body;
            return (
              <Body
                widgetId={widgetId()}
                title={widgetTitle()}
                type={widgetType()}
                surfaceMetrics={surfaceMetrics}
                activation={bodyActivation()}
                lifecycle={lifecycle()}
                motion={motion()}
                selected={selected()}
                filtered={filtered()}
                requestActivate={requestActivate}
              />
            );
          })()}
        </div>
        {locked() ? null : (
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
      </div>
    </article>
  );
}
