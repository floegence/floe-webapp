import {
  For,
  Index,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  type Component,
  type JSX,
} from 'solid-js';
import { Portal } from 'solid-js/web';
import { Motion } from 'solid-motionone';
import { duration, easing } from '../../utils/animations';
import {
  DockLayers,
  DockLayoutDashboard,
  DockMessageSquare,
  DockRegion,
  DockText,
  Plus,
} from '../../icons';
import { startHotInteraction } from '../../utils/hotInteraction';
import { startPointerSession, type PointerSessionController } from '../ui/pointerSession';
import { clientToCanvasWorld } from '../ui/canvasGeometry';
import {
  isBarItemContextMenuKey,
  keyboardBarItemContextMenuRequest,
  type BarItemContextMenuHandler,
} from '../layout/barItemContextMenu';
import { createWorkbenchWidgetFrame, type WorkbenchWidgetFrame } from './workbenchHelpers';
import { getWidgetEntry } from './widgets/widgetRegistry';
import {
  WORKBENCH_EDGE_AUTO_PAN_FRAME_SELECTOR,
  createWorkbenchEdgeAutoPanController,
  frameFromElement,
  type WorkbenchEdgeAutoPanController,
  type WorkbenchEdgeAutoPanFrame,
} from './workbenchEdgeAutoPan';
import type {
  WorkbenchDockToolId,
  WorkbenchInteractionMode,
  WorkbenchViewport,
  WorkbenchWidgetDefinition,
  WorkbenchWidgetItem,
  WorkbenchWidgetType,
} from './types';

export interface WorkbenchFilterBarProps {
  widgetDefinitions: readonly WorkbenchWidgetDefinition[];
  widgets: readonly WorkbenchWidgetItem[];
  filters: Record<string, boolean>;
  mode?: WorkbenchInteractionMode;
  /** Solo a single dock component in the supplied mode scope; soloing it again shows the full scope. */
  onSoloFilter: (id: string, scope: readonly string[]) => void;
  onSelectMode?: (mode: WorkbenchInteractionMode) => void;
  dockActions?: readonly WorkbenchDockAction[];
  dockItems?: readonly WorkbenchHostDockItem[];
  registerExternalDockDragController?: (
    controller: WorkbenchExternalDockDragController | null
  ) => void;
  /**
   * Called when the user drags a widget pill onto the canvas to create a
   * new widget of that type. Coordinates are in client space (clientX/Y).
   */
  onCreateAt?: (
    type: WorkbenchWidgetType,
    clientX: number,
    clientY: number,
    context?: WorkbenchDockDropContext
  ) => void;
  onCreateToolAt?: (
    tool: WorkbenchDockToolId,
    clientX: number,
    clientY: number,
    context?: WorkbenchDockDropContext
  ) => void;
  /**
   * Handles a plain click on a dock item. Return true when the host consumed
   * the click and the default filter-solo behavior should be skipped.
   */
  onItemClick?: (item: WorkbenchDockItemActivation) => boolean | void;
  onDragPreviewChange?: (preview: WorkbenchDockDragPreview | null) => void;
  viewport?: WorkbenchViewport;
  onViewportCommit?: (viewport: WorkbenchViewport) => void;
  onViewportInteractionStart?: (kind: 'pan') => void;
}

export type WorkbenchDockAction = Readonly<{
  id: string;
  label: string;
  icon: Component<{ class?: string }>;
  active?: boolean;
  onActivate: (trigger: HTMLButtonElement) => void;
}>;

export type WorkbenchHostDockItem = Readonly<{
  id: string;
  label: string;
  icon: Component<{ class?: string }>;
  active?: boolean;
  onActivate?: (trigger: HTMLButtonElement) => void;
  /** Requests a product-owned context menu for this concrete Dock button. */
  onContextMenu?: BarItemContextMenuHandler;
  /** Places the host item before or after Floe's built-in component group. */
  dockPlacement?: WorkbenchDockItemPlacement;
  canvasPlacement?: WorkbenchDockCanvasPlacement;
}>;

export type WorkbenchDockItemPlacement = 'before-components' | 'after-components';

export type WorkbenchDockItemActivation = Readonly<{
  kind: 'widget' | 'tool';
  id: WorkbenchWidgetType | WorkbenchDockToolId;
  label: string;
  trigger: HTMLButtonElement;
}>;

export type WorkbenchExternalDockDragItem = Readonly<{
  id: string;
  label: string;
  icon: Component<{ class?: string }>;
  /** Places the Dock drop preview before or after Floe's built-in component group. */
  dockPlacement?: WorkbenchDockItemPlacement;
  canvasPlacement?: WorkbenchDockCanvasPlacement;
  onDropToDock?: () => void;
}>;

export type WorkbenchExternalDockDragController = Readonly<{
  begin: (event: PointerEvent, item: WorkbenchExternalDockDragItem) => void;
}>;

export type WorkbenchDockDragPreview = Readonly<{
  kind: 'widget' | 'tool';
  id: WorkbenchWidgetType | WorkbenchDockToolId;
  label: string;
  clientX: number;
  clientY: number;
  dropAllowed: boolean;
  canvasFrame: WorkbenchEdgeAutoPanFrame;
}>;

export type WorkbenchDockDropContext = Readonly<{
  dropAllowed: boolean;
  canvasFrame: WorkbenchEdgeAutoPanFrame;
  worldPoint?: Readonly<{ worldX: number; worldY: number }>;
}>;

export type WorkbenchDockCanvasPlacement = Readonly<{
  widgetType: WorkbenchWidgetType;
  onDrop: (placement: WorkbenchCanvasWidgetPlacement) => void;
}>;

export type WorkbenchCanvasWidgetPlacement = Readonly<{
  widgetType: WorkbenchWidgetType;
  centerWorld: Readonly<{ worldX: number; worldY: number }>;
  frame: WorkbenchWidgetFrame;
}>;

type NormalizedWorkbenchCanvasPlacement = Readonly<{
  preview: Readonly<{
    kind: WorkbenchDockDragPreview['kind'];
    id: WorkbenchDockDragPreview['id'];
  }> | null;
  onDrop: (clientX: number, clientY: number, context?: WorkbenchDockDropContext) => void;
}>;

interface DragStateBase {
  id: WorkbenchWidgetType | WorkbenchDockToolId | string;
  label: string;
  icon: Component<{ class?: string }>;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  clientX: number;
  clientY: number;
  moved: boolean;
  overCanvas: boolean;
  hasEnteredCanvas: boolean;
  canvasFrame: WorkbenchEdgeAutoPanFrame | null;
  preview: WorkbenchDockDragPreview | null;
  canvasPlacement: NormalizedWorkbenchCanvasPlacement | null;
  dockDrop: (() => void) | null;
  dockPlacement: WorkbenchDockItemPlacement;
  stopInteraction: () => void;
  overDock: boolean;
}

type DragState = DragStateBase &
  Readonly<{
    kind: 'widget' | 'tool' | 'host' | 'external';
    id: WorkbenchWidgetType | WorkbenchDockToolId | string;
    trigger: HTMLElement;
  }>;

const DRAG_THRESHOLD_PX = 5;
const EXTERNAL_DRAG_CLICK_SUPPRESSION_EXPIRY_MS = 1000;

type ExternalDragClickSuppression = Readonly<{
  clear: () => void;
  expire: () => void;
}>;
const DOCK_SELECTOR = '.workbench-dock';

const WORKBENCH_MODE_ITEMS: readonly {
  mode: WorkbenchInteractionMode;
  label: string;
  description: string;
  icon: Component<{ class?: string }>;
}[] = [
  {
    mode: 'work',
    label: 'Work Mode',
    description: 'Operate windows and sticky notes',
    icon: DockLayoutDashboard,
  },
  {
    mode: 'background',
    label: 'Composition Mode',
    description: 'Arrange regions and canvas text',
    icon: DockLayers,
  },
];

const WORKBENCH_WORK_TOOL_ITEMS: readonly {
  tool: WorkbenchDockToolId;
  label: string;
  icon: Component<{ class?: string }>;
}[] = [{ tool: 'sticky-note', label: 'Sticky', icon: DockMessageSquare }];

const WORKBENCH_BACKGROUND_TOOL_ITEMS: readonly {
  tool: WorkbenchDockToolId;
  label: string;
  icon: Component<{ class?: string }>;
}[] = [
  { tool: 'background-region', label: 'Region', icon: DockRegion },
  { tool: 'text', label: 'Text', icon: DockText },
];

function readCanvasFrame(dockRoot: HTMLElement | undefined): WorkbenchEdgeAutoPanFrame | null {
  const surface = dockRoot?.closest('.workbench-surface');
  const frame = surface?.querySelector(WORKBENCH_EDGE_AUTO_PAN_FRAME_SELECTOR);
  return frame instanceof HTMLElement ? frameFromElement(frame) : null;
}

function isPointInFrame(
  clientX: number,
  clientY: number,
  frame: WorkbenchEdgeAutoPanFrame
): boolean {
  return (
    clientX >= frame.left &&
    clientX <= frame.right &&
    clientY >= frame.top &&
    clientY <= frame.bottom
  );
}

function isOverCanvas(
  clientX: number,
  clientY: number,
  frame: WorkbenchEdgeAutoPanFrame | null
): boolean {
  return frame ? isPointInFrame(clientX, clientY, frame) : false;
}

function clampToFrame(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function didSegmentEnterCanvas(
  frame: WorkbenchEdgeAutoPanFrame | null,
  startClientX: number,
  startClientY: number,
  endClientX: number,
  endClientY: number
): boolean {
  if (!frame) return false;
  if (
    isPointInFrame(startClientX, startClientY, frame) ||
    isPointInFrame(endClientX, endClientY, frame)
  ) {
    return true;
  }

  const dx = endClientX - startClientX;
  const dy = endClientY - startClientY;
  let tMin = 0;
  let tMax = 1;
  const clip = (p: number, q: number) => {
    if (p === 0) return q >= 0;
    const t = q / p;
    if (p < 0) {
      if (t > tMax) return false;
      if (t > tMin) tMin = t;
      return true;
    }
    if (t < tMin) return false;
    if (t < tMax) tMax = t;
    return true;
  };

  return (
    clip(-dx, startClientX - frame.left) &&
    clip(dx, frame.right - startClientX) &&
    clip(-dy, startClientY - frame.top) &&
    clip(dy, frame.bottom - startClientY)
  );
}

function isOverDock(clientX: number, clientY: number, dockRoot: HTMLElement | undefined): boolean {
  if (!dockRoot) return false;
  if (typeof document.elementFromPoint !== 'function') return false;
  const target = document.elementFromPoint(clientX, clientY);
  return target instanceof Element && target.closest(DOCK_SELECTOR) === dockRoot;
}

interface DockItemProps {
  id: string;
  kind: DragState['kind'];
  label: string;
  icon: Component<{ class?: string }>;
  active: boolean;
  visible: boolean;
  filterable: boolean;
  /** -1 = hovered, ±1 = adjacent (with -2 sentinel for left neighbor). */
  hoverOffset: number;
  isDragging: boolean;
  onEnter: () => void;
  onLeave: () => void;
  canvasPlacement: NormalizedWorkbenchCanvasPlacement | null;
  onContextMenu?: BarItemContextMenuHandler;
  onDragBegin: (
    event: PointerEvent,
    kind: DragState['kind'],
    id: WorkbenchWidgetType | WorkbenchDockToolId | string,
    label: string,
    icon: Component<{ class?: string }>,
    trigger: HTMLButtonElement,
    canvasPlacement: NormalizedWorkbenchCanvasPlacement | null,
    dockDrop: (() => void) | null
  ) => void;
}

function DockItem(props: DockItemProps) {
  const tileMotion = () => {
    if (props.hoverOffset === -1) return { scale: 1.26, y: -6, x: 0 };
    if (props.hoverOffset === 1) return { scale: 1.08, y: -2, x: 5 };
    if (props.hoverOffset === -2) return { scale: 1.08, y: -2, x: -5 };
    return { scale: 1, y: 0, x: 0 };
  };

  const isHovered = () => props.hoverOffset === -1;

  const handlePointerDown: JSX.EventHandler<HTMLButtonElement, PointerEvent> = (event) => {
    if (event.button !== 0) return;
    props.onDragBegin(
      event,
      props.kind,
      props.id as WorkbenchWidgetType | WorkbenchDockToolId,
      props.label,
      props.icon,
      event.currentTarget,
      props.canvasPlacement,
      null
    );
  };

  const handleContextMenu: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    if (!props.onContextMenu) return;
    event.preventDefault();
    event.stopPropagation();
    props.onContextMenu({
      trigger: event.currentTarget,
      clientX: event.clientX,
      clientY: event.clientY,
      source: 'pointer',
    });
  };

  const handleKeyDown: JSX.EventHandler<HTMLButtonElement, KeyboardEvent> = (event) => {
    if (!props.onContextMenu || !isBarItemContextMenuKey(event)) return;
    event.preventDefault();
    event.stopPropagation();
    props.onContextMenu(keyboardBarItemContextMenuRequest(event.currentTarget));
  };

  return (
    <button
      type="button"
      class="workbench-dock__item"
      data-workbench-dock-item={props.kind === 'host' ? props.id : undefined}
      classList={{
        'is-active': props.active,
        'is-filter-muted': props.filterable && !props.visible,
        'is-hovered': isHovered(),
        'is-source-dragging': props.isDragging,
      }}
      aria-label={
        props.filterable
          ? `${props.label} — click to solo, drag to canvas to create`
          : `${props.label} — drag to canvas to create`
      }
      aria-pressed={props.active}
      aria-haspopup={props.onContextMenu ? 'menu' : undefined}
      onPointerEnter={() => props.onEnter()}
      onPointerLeave={() => props.onLeave()}
      onPointerDown={handlePointerDown}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
    >
      <Motion.span
        class="workbench-dock__tile"
        animate={tileMotion()}
        transition={{ duration: duration.fast, easing: easing.easeOut }}
      >
        {(() => {
          const Icon = props.icon;
          return <Icon class="workbench-dock__icon" />;
        })()}
      </Motion.span>
      <Motion.span
        class="workbench-dock__tooltip"
        animate={{ opacity: isHovered() ? 1 : 0, y: isHovered() ? -6 : 0 }}
        transition={{ duration: duration.fast, easing: easing.easeOut }}
      >
        {props.label}
      </Motion.span>
    </button>
  );
}

function DockAction(props: {
  action: WorkbenchDockAction;
  hoverOffset: number;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const isHovered = () => props.hoverOffset === -1;
  const tileMotion = () => ({ scale: 1, y: 0, x: 0 });
  const Icon = props.action.icon;

  return (
    <button
      type="button"
      draggable={false}
      class="workbench-dock__item workbench-dock__action"
      data-workbench-dock-action={props.action.id}
      classList={{
        'is-active': Boolean(props.action.active),
        'is-hovered': isHovered(),
      }}
      aria-label={props.action.label}
      aria-pressed={props.action.active}
      onPointerEnter={props.onEnter}
      onPointerLeave={props.onLeave}
      onDragStart={(event) => event.preventDefault()}
      onClick={(event) => props.action.onActivate(event.currentTarget)}
    >
      <Motion.span
        class="workbench-dock__tile"
        animate={tileMotion()}
        transition={{ duration: duration.fast, easing: easing.easeOut }}
      >
        <Icon class="workbench-dock__icon" />
      </Motion.span>
      <Motion.span
        class="workbench-dock__tooltip"
        animate={{ opacity: isHovered() ? 1 : 0, y: isHovered() ? -6 : 0 }}
        transition={{ duration: duration.fast, easing: easing.easeOut }}
      >
        {props.action.label}
      </Motion.span>
    </button>
  );
}

export function WorkbenchDock(props: WorkbenchFilterBarProps) {
  const [hoveredIndex, setHoveredIndex] = createSignal<number | null>(null);
  const [dragState, setDragState] = createSignal<DragState | null>(null);
  const [modeMenuOpen, setModeMenuOpen] = createSignal(false);

  let dockRootEl: HTMLDivElement | undefined;
  let dragSession: PointerSessionController | undefined;
  let externalClickSuppression: ExternalDragClickSuppression | undefined;
  let edgeAutoPan: WorkbenchEdgeAutoPanController | undefined;
  let edgeAutoPanViewport: WorkbenchViewport | null = null;

  onCleanup(() => {
    edgeAutoPan?.stop();
    dragSession?.stop({ reason: 'manual_stop', commit: false });
    dragSession = undefined;
    externalClickSuppression?.clear();
    externalClickSuppression = undefined;
    const current = dragState();
    current?.stopInteraction();
    props.onDragPreviewChange?.(null);
    props.registerExternalDockDragController?.(null);
  });

  createEffect(() => {
    props.onDragPreviewChange?.(dragState()?.preview ?? null);
  });

  createEffect(() => {
    const cancel = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !dragState()) return;
      event.preventDefault();
      dragSession?.stop({ reason: 'manual_stop', commit: false });
    };
    window.addEventListener('keydown', cancel, true);
    onCleanup(() => window.removeEventListener('keydown', cancel, true));
  });

  createEffect(() => {
    if (!modeMenuOpen()) return;
    if (typeof window === 'undefined') return;

    const handlePointerDown = (event: PointerEvent) => {
      if (dockRootEl && event.target instanceof Node && dockRootEl.contains(event.target)) {
        return;
      }
      setModeMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setModeMenuOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('keydown', handleKeyDown, true);
    onCleanup(() => {
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    });
  });

  // Mode switcher = slot 0; the remaining slots follow their visual Dock order.
  const offsetFor = (slot: number): number => {
    const hovered = hoveredIndex();
    if (hovered === null) return 0;
    if (hovered <= actionItems().length) return 0;
    if (hovered === slot) return -1;
    if (hovered === slot + 1) return -2;
    if (hovered === slot - 1) return 1;
    return 0;
  };

  const stopEdgeAutoPan = () => {
    edgeAutoPan?.stop();
    edgeAutoPan = undefined;
    edgeAutoPanViewport = null;
  };

  const startEdgeAutoPan = () => {
    if (!props.viewport || !props.onViewportCommit) return;
    edgeAutoPanViewport = props.viewport;
    edgeAutoPan?.stop();
    edgeAutoPan = createWorkbenchEdgeAutoPanController({
      readFrame: () => {
        const surface = dockRootEl?.closest('.workbench-surface');
        const frame = surface?.querySelector(WORKBENCH_EDGE_AUTO_PAN_FRAME_SELECTOR);
        return frame instanceof HTMLElement ? frameFromElement(frame) : null;
      },
      readViewport: () => edgeAutoPanViewport ?? props.viewport ?? null,
      commitViewport: (viewport) => {
        edgeAutoPanViewport = viewport;
        props.onViewportCommit?.(viewport);
      },
      onPanStart: () => props.onViewportInteractionStart?.('pan'),
      shouldPan: () => {
        const current = dragState();
        return Boolean(
          current?.moved &&
          current.hasEnteredCanvas &&
          !isOverDock(current.clientX, current.clientY, dockRootEl)
        );
      },
    });
  };

  const finalizeDrag = (commitDrop: boolean) => {
    const current = dragState();
    if (!current) return;

    const isClick = !current.moved;
    const dropViewport = edgeAutoPanViewport ?? props.viewport;
    current.stopInteraction();
    stopEdgeAutoPan();
    setDragState(null);
    dragSession = undefined;

    if (current.kind === 'external' && current.moved) {
      externalClickSuppression?.expire();
    }

    if (isClick) {
      if (current.kind === 'external') return;
      if (!(current.trigger instanceof HTMLButtonElement)) return;
      if (current.kind === 'host') {
        props.dockItems?.find((item) => item.id === current.id)?.onActivate?.(current.trigger);
        return;
      }
      const consumed = props.onItemClick?.({
        kind: current.kind,
        id: current.id,
        label: current.label,
        trigger: current.trigger,
      });
      if (consumed) return;
      if (activeMode() !== 'background') {
        props.onSoloFilter(String(current.id), componentScope());
      }
      return;
    }

    if (commitDrop && current.overDock && current.dockDrop) {
      current.dockDrop();
      return;
    }

    if (commitDrop && current.overCanvas && current.canvasPlacement) {
      const worldPoint =
        current.canvasFrame && dropViewport
          ? clientToCanvasWorld(current.canvasFrame, dropViewport, {
              clientX: current.clientX,
              clientY: current.clientY,
            })
          : null;
      const context = current.canvasFrame
        ? {
            dropAllowed: current.overCanvas,
            canvasFrame: current.canvasFrame,
            ...(worldPoint ? { worldPoint } : {}),
          }
        : undefined;
      current.canvasPlacement.onDrop(current.clientX, current.clientY, context);
    }
  };

  const beginItemDragGesture = (
    event: PointerEvent,
    kind: DragState['kind'],
    id: WorkbenchWidgetType | WorkbenchDockToolId | string,
    label: string,
    icon: Component<{ class?: string }>,
    trigger: HTMLElement,
    canvasPlacement: NormalizedWorkbenchCanvasPlacement | null,
    dockDrop: (() => void) | null,
    dockPlacement: WorkbenchDockItemPlacement = 'before-components'
  ) => {
    event.preventDefault();
    dragSession?.stop({ reason: 'manual_stop', commit: false });
    startEdgeAutoPan();
    const canvasFrame = readCanvasFrame(dockRootEl);

    setDragState({
      kind,
      id,
      label,
      icon,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      clientX: event.clientX,
      clientY: event.clientY,
      moved: false,
      overCanvas: false,
      hasEnteredCanvas: false,
      canvasFrame,
      preview: null,
      canvasPlacement,
      dockDrop,
      dockPlacement,
      stopInteraction: startHotInteraction({ kind: 'drag', cursor: 'grabbing' }),
      trigger,
      overDock: false,
    });

    const resolveDragAtClientPoint = (
      next: Readonly<{
        pointerId: number;
        clientX: number;
        clientY: number;
      }>
    ) => {
      let shouldUpdateEdgeAutoPan = false;
      setDragState((current) => {
        if (!current || current.pointerId !== next.pointerId) return current;
        const dx = next.clientX - current.startClientX;
        const dy = next.clientY - current.startClientY;
        const moved =
          current.moved || Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX;
        if (current.kind === 'external' && moved && !current.moved) {
          let timeout: number | undefined;
          const clear = () => {
            if (timeout !== undefined) window.clearTimeout(timeout);
            current.trigger.removeEventListener('click', suppressClick, true);
            window.removeEventListener('pointerdown', clearOnNextPointerDown, true);
            if (externalClickSuppression?.clear === clear) externalClickSuppression = undefined;
          };
          const suppressClick = (click: MouseEvent) => {
            click.preventDefault();
            click.stopImmediatePropagation();
            clear();
          };
          const clearOnNextPointerDown = () => clear();
          const expire = () => {
            if (timeout !== undefined) window.clearTimeout(timeout);
            timeout = window.setTimeout(clear, EXTERNAL_DRAG_CLICK_SUPPRESSION_EXPIRY_MS);
          };
          current.trigger.addEventListener('click', suppressClick, true);
          window.addEventListener('pointerdown', clearOnNextPointerDown, true);
          externalClickSuppression = { clear, expire };
        }
        const overDock = isOverDock(next.clientX, next.clientY, dockRootEl);
        const canvasFrame = current.canvasFrame;
        const insideCanvas = moved && isOverCanvas(next.clientX, next.clientY, canvasFrame);
        const overCanvas = insideCanvas && !overDock;
        const crossedCanvas =
          moved &&
          !overDock &&
          didSegmentEnterCanvas(
            canvasFrame,
            current.clientX,
            current.clientY,
            next.clientX,
            next.clientY
          );
        const hasEnteredCanvas = current.hasEnteredCanvas || insideCanvas || crossedCanvas;
        shouldUpdateEdgeAutoPan = moved && hasEnteredCanvas && !overDock;
        const previewClientX = canvasFrame
          ? clampToFrame(next.clientX, canvasFrame.left, canvasFrame.right)
          : next.clientX;
        const previewClientY = canvasFrame
          ? clampToFrame(next.clientY, canvasFrame.top, canvasFrame.bottom)
          : next.clientY;
        return {
          ...current,
          clientX: next.clientX,
          clientY: next.clientY,
          moved,
          overDock,
          overCanvas,
          hasEnteredCanvas,
          preview:
            moved && canvasFrame && current.canvasPlacement?.preview
              ? {
                  kind: current.canvasPlacement.preview.kind,
                  id: current.canvasPlacement.preview.id,
                  label: current.label,
                  clientX: previewClientX,
                  clientY: previewClientY,
                  dropAllowed: overCanvas,
                  canvasFrame,
                }
              : null,
        };
      });
      if (shouldUpdateEdgeAutoPan) {
        edgeAutoPan?.updatePointer(next.clientX, next.clientY);
      }
    };

    dragSession = startPointerSession({
      pointerEvent: event,
      captureEl: event.currentTarget as HTMLElement,
      onMove: resolveDragAtClientPoint,
      onEnd: ({ commit, snapshot }) => {
        resolveDragAtClientPoint({
          pointerId: snapshot.pointerId,
          clientX: snapshot.latestClientX,
          clientY: snapshot.latestClientY,
        });
        finalizeDrag(commit);
      },
    });
  };

  const normalizeWidgetCanvasPlacement = (
    placement: WorkbenchDockCanvasPlacement | undefined
  ): NormalizedWorkbenchCanvasPlacement | null => {
    if (!placement) return null;
    return {
      preview: { kind: 'widget', id: placement.widgetType },
      onDrop: (_clientX, _clientY, context) => {
        if (!context?.worldPoint) return;
        const entry = getWidgetEntry(placement.widgetType, props.widgetDefinitions);
        placement.onDrop({
          widgetType: placement.widgetType,
          centerWorld: context.worldPoint,
          frame: createWorkbenchWidgetFrame(entry, {
            anchor: 'center',
            worldX: context.worldPoint.worldX,
            worldY: context.worldPoint.worldY,
          }),
        });
      },
    };
  };

  const beginExternalDockDrag: WorkbenchExternalDockDragController['begin'] = (event, item) => {
    if (event.button !== 0 || !(event.currentTarget instanceof HTMLElement)) return;
    externalClickSuppression?.clear();
    externalClickSuppression = undefined;
    beginItemDragGesture(
      event,
      'external',
      item.id,
      item.label,
      item.icon,
      event.currentTarget,
      normalizeWidgetCanvasPlacement(item.canvasPlacement),
      item.onDropToDock ?? null,
      item.dockPlacement ?? 'before-components'
    );
  };

  createEffect(() => {
    props.registerExternalDockDragController?.({ begin: beginExternalDockDrag });
    onCleanup(() => props.registerExternalDockDragController?.(null));
  });

  const draggingWidgetType = (): WorkbenchWidgetType | null =>
    dragState()?.kind === 'widget' ? (dragState()!.id as WorkbenchWidgetType) : null;
  const draggingTool = (): WorkbenchDockToolId | null =>
    dragState()?.kind === 'tool' ? (dragState()!.id as WorkbenchDockToolId) : null;
  const ExternalPlaceholderIcon = () =>
    dragState()?.kind === 'external' ? dragState()?.icon : undefined;
  const activeMode = (): WorkbenchInteractionMode =>
    props.mode === 'background' || props.mode === 'annotation' ? 'background' : 'work';
  const activeModeItem = createMemo(
    () =>
      WORKBENCH_MODE_ITEMS.find((item) => item.mode === activeMode()) ?? WORKBENCH_MODE_ITEMS[0]!
  );
  const componentItems = createMemo(() => {
    if (activeMode() === 'background') {
      return WORKBENCH_BACKGROUND_TOOL_ITEMS.map((item) => ({
        id: item.tool,
        kind: 'tool' as const,
        label: item.label,
        icon: item.icon,
      }));
    }

    return [
      ...WORKBENCH_WORK_TOOL_ITEMS.map((item) => ({
        id: item.tool,
        kind: 'tool' as const,
        label: item.label,
        icon: item.icon,
      })),
      ...props.widgetDefinitions.map((entry) => ({
        id: entry.type,
        kind: 'widget' as const,
        label: entry.label,
        icon: entry.icon,
      })),
    ];
  });
  const hostDockItems = createMemo(() =>
    activeMode() === 'background' ? [] : [...(props.dockItems ?? [])]
  );
  const leadingHostDockItems = createMemo(() =>
    hostDockItems().filter((item) => item.dockPlacement !== 'after-components')
  );
  const trailingHostDockItems = createMemo(() =>
    hostDockItems().filter((item) => item.dockPlacement === 'after-components')
  );
  const actionItems = createMemo(() =>
    activeMode() === 'background' ? [] : [...(props.dockActions ?? [])]
  );
  const componentScope = createMemo(() => componentItems().map((item) => String(item.id)));
  const componentFilterable = (): boolean => activeMode() !== 'background';
  const componentVisible = (id: string): boolean =>
    !componentFilterable() || props.filters[id] !== false;
  const componentSoloed = (id: string): boolean => {
    if (!componentFilterable()) {
      return false;
    }
    const scope = componentScope();
    return (
      scope.length > 1 && scope.every((key) => (props.filters[key] !== false) === (key === id))
    );
  };
  const modeTriggerHovered = () => hoveredIndex() === 0;
  const modeTriggerMotion = () => ({
    scale: 1,
    y: 0,
    x: 0,
  });
  const showExternalPlaceholder = (placement: WorkbenchDockItemPlacement): boolean => {
    const current = dragState();
    return Boolean(
      current?.kind === 'external' && current.moved && current.dockPlacement === placement
    );
  };
  const ExternalDockPlaceholder = () => (
    <span
      class="workbench-dock__external-placeholder"
      classList={{ 'is-drop-allowed': Boolean(dragState()?.overDock) }}
      aria-hidden="true"
    >
      <Show when={ExternalPlaceholderIcon()}>
        {(Icon) => {
          const PlaceholderIcon = Icon();
          return <PlaceholderIcon class="workbench-dock__icon" />;
        }}
      </Show>
    </span>
  );

  return (
    <>
      <div
        ref={dockRootEl}
        class={`workbench-dock workbench-dock-material${
          dragState()?.kind === 'external' && dragState()?.moved ? ' is-external-drop-target' : ''
        }${
          dragState()?.kind === 'external' && dragState()?.overDock
            ? ' is-external-drop-allowed'
            : ''
        }`}
        data-floe-canvas-interactive="true"
        onPointerLeave={() => setHoveredIndex(null)}
      >
        <div class="workbench-dock__mode-switcher">
          <button
            type="button"
            class="workbench-dock__item workbench-dock__mode-trigger"
            classList={{
              'is-active': activeMode() === 'background',
              'is-hovered': modeTriggerHovered() || modeMenuOpen(),
            }}
            aria-label="Switch canvas mode"
            aria-haspopup="menu"
            aria-expanded={modeMenuOpen()}
            onPointerEnter={() => setHoveredIndex(0)}
            onPointerLeave={() => setHoveredIndex((current) => (current === 0 ? null : current))}
            onClick={() => setModeMenuOpen((open) => !open)}
          >
            <Motion.span
              class="workbench-dock__tile"
              animate={modeTriggerMotion()}
              transition={{ duration: duration.fast, easing: easing.easeOut }}
            >
              {(() => {
                const ModeIcon = activeModeItem().icon;
                return <ModeIcon class="workbench-dock__icon" />;
              })()}
            </Motion.span>
            <Motion.span
              class="workbench-dock__tooltip"
              animate={{
                opacity: modeTriggerHovered() && !modeMenuOpen() ? 1 : 0,
                y: modeTriggerHovered() && !modeMenuOpen() ? -6 : 0,
              }}
              transition={{ duration: duration.fast, easing: easing.easeOut }}
            >
              {activeModeItem().label}
            </Motion.span>
          </button>
          <Show when={modeMenuOpen()}>
            <div class="workbench-dock__mode-popover" role="menu" aria-label="Canvas mode">
              <For each={WORKBENCH_MODE_ITEMS}>
                {(item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      type="button"
                      class="workbench-dock__mode-option"
                      classList={{ 'is-active': activeMode() === item.mode }}
                      role="menuitemradio"
                      aria-checked={activeMode() === item.mode}
                      onClick={() => {
                        props.onSelectMode?.(item.mode);
                        setModeMenuOpen(false);
                      }}
                    >
                      <span class="workbench-dock__mode-option-icon">
                        <Icon class="workbench-dock__mode-icon" />
                      </span>
                      <span class="workbench-dock__mode-option-copy">
                        <span class="workbench-dock__mode-option-label">{item.label}</span>
                        <span class="workbench-dock__mode-option-description">
                          {item.description}
                        </span>
                      </span>
                    </button>
                  );
                }}
              </For>
            </div>
          </Show>
        </div>
        <Index each={actionItems()}>
          {(action, index) => {
            const slot = () => index + 1;
            return (
              <DockAction
                action={action()}
                hoverOffset={offsetFor(slot())}
                onEnter={() => setHoveredIndex(slot())}
                onLeave={() => setHoveredIndex((current) => (current === slot() ? null : current))}
              />
            );
          }}
        </Index>
        <Show when={showExternalPlaceholder('before-components')}>
          <ExternalDockPlaceholder />
        </Show>
        <For each={leadingHostDockItems()}>
          {(item, index) => {
            const slot = () => index() + actionItems().length + 1;
            return (
              <DockItem
                id={item.id}
                kind="host"
                label={item.label}
                icon={item.icon}
                active={Boolean(item.active)}
                visible
                filterable={false}
                hoverOffset={offsetFor(slot())}
                isDragging={dragState()?.kind === 'host' && dragState()?.id === item.id}
                canvasPlacement={normalizeWidgetCanvasPlacement(item.canvasPlacement)}
                onContextMenu={item.onContextMenu}
                onEnter={() => setHoveredIndex(slot())}
                onLeave={() => setHoveredIndex((current) => (current === slot() ? null : current))}
                onDragBegin={beginItemDragGesture}
              />
            );
          }}
        </For>
        <span class="workbench-dock__divider" aria-hidden="true" />
        <For each={componentItems()}>
          {(entry, index) => {
            const slot = () =>
              index() + actionItems().length + leadingHostDockItems().length + 1;
            return (
              <DockItem
                id={String(entry.id)}
                kind={entry.kind}
                label={entry.label}
                icon={entry.icon}
                active={componentSoloed(String(entry.id))}
                visible={componentVisible(String(entry.id))}
                filterable={componentFilterable()}
                hoverOffset={offsetFor(slot())}
                isDragging={
                  entry.kind === 'widget'
                    ? draggingWidgetType() === entry.id
                    : draggingTool() === entry.id
                }
                canvasPlacement={
                  entry.kind === 'widget'
                    ? {
                        preview: { kind: 'widget', id: entry.id },
                        onDrop: (clientX, clientY, context) =>
                          props.onCreateAt?.(
                            entry.id as WorkbenchWidgetType,
                            clientX,
                            clientY,
                            context
                          ),
                      }
                    : {
                        preview: { kind: 'tool', id: entry.id },
                        onDrop: (clientX, clientY, context) =>
                          props.onCreateToolAt?.(
                            entry.id as WorkbenchDockToolId,
                            clientX,
                            clientY,
                            context
                          ),
                      }
                }
                onEnter={() => setHoveredIndex(slot())}
                onLeave={() => setHoveredIndex((current) => (current === slot() ? null : current))}
                onDragBegin={beginItemDragGesture}
              />
            );
          }}
        </For>
        <Show
          when={
            trailingHostDockItems().length > 0 ||
            showExternalPlaceholder('after-components')
          }
        >
          <span class="workbench-dock__divider" aria-hidden="true" />
        </Show>
        <For each={trailingHostDockItems()}>
          {(item, index) => {
            const slot = () =>
              index() +
              actionItems().length +
              leadingHostDockItems().length +
              componentItems().length +
              1;
            return (
              <DockItem
                id={item.id}
                kind="host"
                label={item.label}
                icon={item.icon}
                active={Boolean(item.active)}
                visible
                filterable={false}
                hoverOffset={offsetFor(slot())}
                isDragging={dragState()?.kind === 'host' && dragState()?.id === item.id}
                canvasPlacement={normalizeWidgetCanvasPlacement(item.canvasPlacement)}
                onContextMenu={item.onContextMenu}
                onEnter={() => setHoveredIndex(slot())}
                onLeave={() => setHoveredIndex((current) => (current === slot() ? null : current))}
                onDragBegin={beginItemDragGesture}
              />
            );
          }}
        </For>
        <Show when={showExternalPlaceholder('after-components')}>
          <ExternalDockPlaceholder />
        </Show>
      </div>

      <Show when={Boolean(dragState()?.moved && !dragState()?.preview)}>
        <DragGhost state={dragState} />
      </Show>
    </>
  );
}

export const WorkbenchFilterBar = WorkbenchDock;

interface DragGhostProps {
  /**
   * Passed as an accessor so the ghost component is mounted *once* at drag
   * start and updates via fine-grained reactivity on each pointermove —
   * instead of being re-created from scratch when the reactive `when`
   * object identity changes each frame.
   */
  state: () => DragState | null;
}

function DragGhost(props: DragGhostProps) {
  // Anchor offset: +14px right, -56px up of the cursor. Applying it here
  // inside the transform keeps positioning on the GPU composite layer and
  // avoids any layout reads on pointermove.
  const transform = () => {
    const state = props.state();
    if (!state) return 'translate3d(0px, 0px, 0)';
    return `translate3d(${state.clientX + 14}px, ${state.clientY - 56}px, 0)`;
  };

  const label = () => props.state()?.label ?? '';
  const Icon = () => props.state()?.icon;

  return (
    <Portal>
      <div
        class="workbench-dock-ghost"
        classList={{
          'is-over-dock': Boolean(props.state()?.kind === 'external' && props.state()?.overDock),
        }}
        style={{ transform: transform() }}
        aria-hidden="true"
      >
        <div class="workbench-dock-ghost__halo" />
        <div class="workbench-dock-ghost__card">
          <div class="workbench-dock-ghost__icon">
            <Show when={Icon()}>
              {(Comp) => {
                const C = Comp();
                return <C class="w-4 h-4" />;
              }}
            </Show>
          </div>
          <div class="workbench-dock-ghost__copy">
            <div class="workbench-dock-ghost__title">{label()}</div>
            <div class="workbench-dock-ghost__hint">
              <Plus class="w-3 h-3" />
              <span>{props.state()?.kind === 'external' ? 'Pin to Dock' : 'Drag onto canvas'}</span>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
