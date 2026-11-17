import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  untrack,
  type Component,
  type JSX,
} from 'solid-js';
import { Dynamic, Portal } from 'solid-js/web';
import { Motion } from 'solid-motionone';
import { createBarLayoutMotion, barDropPosition, keyboardBarOrder, measureBarSlots, sameBarDropPosition, type BarDropPosition } from '../layout/barReorder';
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
import { startPointerSession, type PointerSessionController, type PointerSessionEndReason } from '../ui/pointerSession';
import { clientToCanvasWorld } from '../ui/canvasGeometry';
import {
  isBarItemContextMenuKey,
  keyboardBarItemContextMenuRequest,
  type BarItemContextMenuHandler,
  type BarItemContextMenuRequest,
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
  /** Optional artwork shared by the mode trigger and menu; omitted entries use the built-in icons. */
  modeIcons?: WorkbenchDockModeIcons;
  /** Changes built-in Dock clicks without affecting drag-to-create behavior. */
  activationMode?: WorkbenchDockItemActivationMode;
  /** Orders work-mode widgets and tools by id; unlisted entries retain their relative order at the end. */
  componentOrder?: readonly (WorkbenchWidgetType | WorkbenchDockToolId)[];
  customization?: WorkbenchDockCustomization;
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
   * the click and the configured default activation should be skipped.
   */
  onItemClick?: (item: WorkbenchDockItemActivation) => boolean | void;
  onFocusCycleItem?: (item: WorkbenchDockItemActivation) => void;
  resolveItemPresentation?: (
    item: Pick<WorkbenchDockItemActivation, 'kind' | 'id'>
  ) => WorkbenchDockItemPresentation;
  onDockActivation?: (
    item: Readonly<{
      kind: 'widget' | 'tool' | 'host' | 'external' | 'action' | 'mode';
      id: string;
    }>
  ) => void;
  onDragPreviewChange?: (preview: WorkbenchDockDragPreview | null) => void;
  viewport?: WorkbenchViewport;
  onViewportCommit?: (viewport: WorkbenchViewport) => void;
  onViewportInteractionStart?: (kind: 'pan') => void;
}

/** Keys distinguish built-in components, host actions and host instances. */
export type WorkbenchDockEntry = Readonly<{
  key: string;
  kind: 'widget' | 'tool' | 'action' | 'host';
  id: string;
  label: string;
  icon: Component<{ class?: string }>;
  activate: (trigger: HTMLButtonElement) => void;
  /** Focuses this entry after the host restores its visibility. */
  focus: () => void;
  /** Uses the Dock's canvas gesture from a host-owned overflow row. Click remains host-owned. */
  beginDrag?: (event: PointerEvent, lifecycle: WorkbenchDockOverflowDragLifecycle) => void;
}>;

export type WorkbenchDockOverflowDragLifecycle = Readonly<{
  /** Fires only after the drag threshold, while capture is held by the stable Dock. */
  onStart: () => void;
  onEnd: (result: Readonly<{ dropped: boolean; reason: PointerSessionEndReason }>) => void;
}>;

export type WorkbenchDockCustomization = Readonly<{
  order?: readonly string[];
  hidden?: readonly string[];
  onOrderChange?: (keys: string[]) => void;
  onContextMenu?: (entry: WorkbenchDockEntry, request: BarItemContextMenuRequest) => void;
  /** Host renders its localized overflow trigger/panel; hidden entries remain activatable. */
  overflow?: Component<{ entries: readonly WorkbenchDockEntry[] }>;
}>;

export type WorkbenchDockItemActivationMode = 'solo-filter' | 'focus-cycle';

export type WorkbenchDockItemPresentation = Readonly<{
  count: number;
  currentIndex: number | null;
  active: boolean;
}>;

export type WorkbenchDockModeIcons = Readonly<
  Partial<Record<'work' | 'background', Component<{ class?: string }>>>
>;

export type WorkbenchDockAction = Readonly<{
  id: string;
  label: string;
  icon: Component<{ class?: string }>;
  active?: boolean;
  /** Places the action before or after components, always before host items in that group. */
  dockPlacement?: WorkbenchDockItemPlacement;
  onActivate: (trigger: HTMLButtonElement) => void;
  /** Receives the concrete action button on mount and null on disposal. */
  buttonRef?: (button: HTMLButtonElement | null) => void;
  onContextMenu?: BarItemContextMenuHandler;
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
  startTranslateX: number;
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
  overflow?: WorkbenchDockOverflowDragLifecycle;
}

type DragState = DragStateBase &
  Readonly<{
    kind: 'widget' | 'tool' | 'host' | 'external' | 'action';
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
  mode: 'work' | 'background';
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
  activationMode: WorkbenchDockItemActivationMode;
  presentation?: WorkbenchDockItemPresentation;
  /** -1 = hovered, ±1 = adjacent (with -2 sentinel for left neighbor). */
  hoverOffset: number;
  isDragging: boolean;
  onEnter: () => void;
  onLeave: () => void;
  canvasPlacement: NormalizedWorkbenchCanvasPlacement | null;
  onContextMenu?: BarItemContextMenuHandler;
  buttonRef?: (button: HTMLButtonElement | null) => void;
  onReorderKey?: (event: KeyboardEvent) => void;
  reorderable?: boolean;
  dropEdge?: 'before' | 'after';
  onKeyboardActivate: (trigger: HTMLButtonElement) => void;
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
  let button: HTMLButtonElement | undefined;
  onMount(() => props.buttonRef?.(button ?? null));
  onCleanup(() => props.buttonRef?.(null));
  const tileMotion = () => {
    if (props.kind === 'action') return { scale: 1, y: 0, x: 0 };
    if (props.hoverOffset === -1) return { scale: 1.26, y: -6, x: 0 };
    if (props.hoverOffset === 1) return { scale: 1.08, y: -2, x: 5 };
    if (props.hoverOffset === -2) return { scale: 1.08, y: -2, x: -5 };
    return { scale: 1, y: 0, x: 0 };
  };

  const isHovered = () => props.hoverOffset === -1;

  const handlePointerDown: JSX.EventHandler<HTMLButtonElement, PointerEvent> = (event) => {
    if (event.button !== 0 || (props.kind === 'action' && !props.reorderable)) return;
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
    props.onReorderKey?.(event);
    if (event.defaultPrevented || !props.onContextMenu || !isBarItemContextMenuKey(event)) return;
    event.preventDefault();
    event.stopPropagation();
    props.onContextMenu(keyboardBarItemContextMenuRequest(event.currentTarget));
  };

  const handleClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    // Pointer activation is committed by the pointer session so drag and click
    // remain mutually exclusive. Native keyboard activation produces detail=0.
    if (event.detail !== 0 && !(props.kind === 'action' && !props.reorderable)) return;
    props.onKeyboardActivate(event.currentTarget);
  };

  const focusCycleLabel = () => {
    const presentation = props.presentation;
    if (!presentation) return props.label;
    if (presentation.count === 0) return `${props.label} +`;
    if (presentation.active && presentation.currentIndex !== null) {
      return `${props.label} ${presentation.currentIndex + 1}/${presentation.count}`;
    }
    if (presentation.count > 1) return `${props.label} ${presentation.count}`;
    return props.label;
  };

  return (
    <button
      type="button"
      ref={button}
      style={{ 'touch-action': 'none' }}
      class="workbench-dock__item"
      data-floe-bar-key={`${props.kind}:${props.id}`}
      data-workbench-dock-action={props.kind === 'action' ? props.id : undefined}
      aria-keyshortcuts={props.reorderable ? 'Alt+Shift+ArrowLeft Alt+Shift+ArrowRight' : undefined}
      onDragStart={event => event.preventDefault()}
      data-workbench-dock-item={props.kind === 'host' ? props.id : undefined}
      data-workbench-dock-component={
        props.kind === 'widget' || props.kind === 'tool' ? props.id : undefined
      }
      classList={{
        'is-active': props.active,
        'is-filter-muted': props.filterable && !props.visible,
        'is-hovered': isHovered(),
        'is-source-dragging': props.isDragging,
        'workbench-dock__action': props.kind === 'action',
      }}
      aria-label={
        props.kind === 'action' ? props.label : props.activationMode === 'focus-cycle' && props.presentation
          ? focusCycleLabel()
          : props.filterable
            ? `${props.label} — click to solo, drag to canvas to create`
            : `${props.label} — drag to canvas to create`
      }
      aria-pressed={
        props.activationMode === 'focus-cycle' && props.presentation ? props.presentation.active : props.active
      }
      aria-haspopup={props.onContextMenu ? 'menu' : undefined}
      onPointerEnter={() => props.onEnter()}
      onPointerLeave={() => props.onLeave()}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
    >
      <Show when={props.dropEdge}><span aria-hidden="true" style={{ position: 'absolute', top: '8px', bottom: '8px', width: '2px', background: 'var(--ring)', 'border-radius': '2px', left: props.dropEdge === 'before' ? '-3px' : undefined, right: props.dropEdge === 'after' ? '-3px' : undefined }} /></Show>
      <Motion.span
        class="workbench-dock__tile"
        animate={tileMotion()}
        transition={{ duration: duration.fast, easing: easing.easeOut }}
      >
        <Dynamic component={props.icon} class="workbench-dock__icon" />
      </Motion.span>
      <Motion.span
        class="workbench-dock__tooltip"
        animate={{ opacity: isHovered() ? 1 : 0, y: isHovered() ? -6 : 0 }}
        transition={{ duration: duration.fast, easing: easing.easeOut }}
      >
        {props.activationMode === 'focus-cycle' ? focusCycleLabel() : props.label}
      </Motion.span>
    </button>
  );
}

export function WorkbenchDock(props: WorkbenchFilterBarProps) {
  const [hoveredIndex, setHoveredIndex] = createSignal<number | null>(null);
  const [dragState, setDragState] = createSignal<DragState | null>(null);
  const elements = new Map<string, HTMLElement>();
  const [dropPosition, setDropPosition] = createSignal<BarDropPosition | undefined>(undefined, { equals: sameBarDropPosition });
  const [modeMenuOpen, setModeMenuOpen] = createSignal(false);

  let dockRootEl: HTMLDivElement | undefined;
  let dragSession: PointerSessionController | undefined;
  let externalClickSuppression: ExternalDragClickSuppression | undefined;
  let edgeAutoPan: WorkbenchEdgeAutoPanController | undefined;
  let edgeAutoPanViewport: WorkbenchViewport | null = null;

  const activationMode = (): WorkbenchDockItemActivationMode =>
    props.activationMode === 'focus-cycle' ? 'focus-cycle' : 'solo-filter';

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
    if (visibleEntries()[hovered - 1]?.kind === 'action') return 0;
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

  const activateDockItem = (
    kind: DragState['kind'],
    id: WorkbenchWidgetType | WorkbenchDockToolId | string,
    label: string,
    trigger: HTMLButtonElement
  ) => {
    props.onDockActivation?.({ kind, id: String(id) });
    if (kind === 'external') return;
    if (kind === 'action') { props.dockActions?.find(item => item.id === id)?.onActivate(trigger); return; }
    if (kind === 'host') {
      props.dockItems?.find((item) => item.id === id)?.onActivate?.(trigger);
      return;
    }

    const activation: WorkbenchDockItemActivation = {
      kind,
      id,
      label,
      trigger,
    };
    if (props.onItemClick?.(activation)) return;
    if (activationMode() === 'focus-cycle') {
      props.onFocusCycleItem?.(activation);
      return;
    }
    if (activeMode() !== 'background') {
      props.onSoloFilter(String(id), componentScope());
    }
  };

  const suppressGestureClick = (trigger: HTMLElement) => {
    externalClickSuppression?.clear();
    let timeout: number | undefined;
    const clear = () => {
      if (timeout !== undefined) window.clearTimeout(timeout);
      trigger.removeEventListener('click', suppressClick, true);
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
    trigger.addEventListener('click', suppressClick, true);
    window.addEventListener('pointerdown', clearOnNextPointerDown, true);
    externalClickSuppression = { clear, expire };
  };

  const finalizeDrag = (commitDrop: boolean, reason: PointerSessionEndReason) => {
    const current = dragState();
    if (!current) return;

    const isClick = !current.moved;
    const dropViewport = edgeAutoPanViewport ?? props.viewport;
    current.stopInteraction();
    stopEdgeAutoPan();
    const proposal = dropPosition();
    setDropPosition(undefined);
    setDragState(null);
    dragSession = undefined;

    if ((current.kind === 'external' || current.overflow) && current.moved) {
      externalClickSuppression?.expire();
    }

    const initialOverflow = current.moved ? current.overflow : undefined;
    const finishOverflow = (dropped: boolean) => {
      initialOverflow?.onEnd({ dropped, reason });
    };
    if (!commitDrop) {
      if (current.overflow && !current.moved) { suppressGestureClick(current.trigger); externalClickSuppression?.expire(); }
      finishOverflow(false); return;
    }

    if (isClick) {
      if (current.kind === 'external' || current.overflow) return;
      if (!(current.trigger instanceof HTMLButtonElement)) return;
      activateDockItem(current.kind, current.id, current.label, current.trigger);
      return;
    }

    if (current.overDock && current.kind !== 'external' && proposal && props.customization?.onOrderChange) {
      props.customization.onOrderChange(proposal.order);
      elements.get(`${current.kind}:${current.id}`)?.focus({ preventScroll: true });
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
      finishOverflow(true);
      return;
    }
    finishOverflow(false);
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
    dockPlacement: WorkbenchDockItemPlacement = 'before-components',
    overflow?: WorkbenchDockOverflowDragLifecycle,
  ) => {
    event.preventDefault();
    dragSession?.stop({ reason: 'manual_stop', commit: false });
    startEdgeAutoPan();
    const canvasFrame = readCanvasFrame(dockRootEl);

    const transform = getComputedStyle(trigger).transform;
    const startTranslateX = typeof DOMMatrix === 'function' ? new DOMMatrix(transform === 'none' ? undefined : transform).m41 : 0;
    setDragState({
      kind,
      id,
      label,
      icon,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startTranslateX,
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
      overflow,
    });
    const slots = measureBarSlots(elements, 'x');

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
        if ((current.kind === 'external' || current.overflow) && moved && !current.moved) {
          suppressGestureClick(current.trigger);
        }
        const overDock = isOverDock(next.clientX, next.clientY, dockRootEl);
        setDropPosition(moved && overDock && current.kind !== 'external' && props.customization?.onOrderChange
          ? barDropPosition(visibleEntries().map(entry => entry.key), `${current.kind}:${current.id}`, elements, 'x', next.clientX, slots)
          : undefined);
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
            moved && (!overDock || !props.customization?.onOrderChange) && canvasFrame && current.canvasPlacement?.preview
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
      const current = dragState();
      if (current?.moved && current.overflow && !overflowStarted) {
        overflowStarted = true;
        dragSession?.capturePointer();
        current.overflow.onStart();
      }
      if (shouldUpdateEdgeAutoPan) {
        edgeAutoPan?.updatePointer(next.clientX, next.clientY);
      }
    };

    let overflowStarted = false;
    dragSession = startPointerSession({
      pointerEvent: event,
      captureEl: overflow ? dockRootEl : event.currentTarget as HTMLElement,
      capturePointer: !overflow,
      onMove: resolveDragAtClientPoint,
      onEnd: ({ commit, snapshot, reason }) => {
        resolveDragAtClientPoint({
          pointerId: snapshot.pointerId,
          clientX: snapshot.latestClientX,
          clientY: snapshot.latestClientY,
        });
        finalizeDrag(commit && (reason === 'pointer_up' || reason === 'buttons_released'), reason);
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

  const ExternalPlaceholderIcon = () =>
    dragState()?.kind === 'external' ? dragState()?.icon : undefined;
  const activeMode = (): WorkbenchInteractionMode =>
    props.mode === 'background' || props.mode === 'annotation' ? 'background' : 'work';
  const modeItems = createMemo(() =>
    WORKBENCH_MODE_ITEMS.map((item) => ({
      ...item,
      icon: props.modeIcons?.[item.mode] ?? item.icon,
    }))
  );
  const activeModeItem = createMemo(
    () => modeItems().find((item) => item.mode === activeMode()) ?? modeItems()[0]!
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

    const items = [
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
    const order = new Map(props.componentOrder?.map((id, index) => [id, index]));
    return items.sort(
      (a, b) =>
        (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER)
    );
  });
  const hostDockItems = createMemo(() =>
    activeMode() === 'background' ? [] : [...(props.dockItems ?? [])]
  );
  const actionItems = createMemo(() => activeMode() === 'background' ? [] : [...(props.dockActions ?? [])]);
  type DockEntry = WorkbenchDockEntry & { action?: WorkbenchDockAction; host?: WorkbenchHostDockItem; group: number };
  const canvasPlacementForEntry = (entry: DockEntry): NormalizedWorkbenchCanvasPlacement | null =>
    entry.host ? normalizeWidgetCanvasPlacement(entry.host.canvasPlacement)
      : entry.kind === 'action' ? null : {
        preview: { kind: entry.kind as 'widget' | 'tool', id: entry.id },
        onDrop: (x, y, context) => entry.kind === 'widget'
          ? props.onCreateAt?.(entry.id, x, y, context)
          : props.onCreateToolAt?.(entry.id as WorkbenchDockToolId, x, y, context),
      };
  const catalog = createMemo<DockEntry[]>(() => {
    const entries: DockEntry[] = [
      ...actionItems().map(action => ({ ...action, action, kind: 'action' as const, key: `action:${action.id}`,
        group: action.dockPlacement === 'after-components' ? 3 : 0,
        focus: () => elements.get(`action:${action.id}`)?.focus({ preventScroll: true }),
        activate: (trigger: HTMLButtonElement) => activateDockItem('action', action.id, action.label, trigger) })),
      ...hostDockItems().map(host => ({ ...host, host, kind: 'host' as const, key: `host:${host.id}`,
        group: host.dockPlacement === 'after-components' ? 4 : 1,
        focus: () => elements.get(`host:${host.id}`)?.focus({ preventScroll: true }),
        activate: (trigger: HTMLButtonElement) => activateDockItem('host', host.id, host.label, trigger) })),
      ...componentItems().map(entry => ({ ...entry, key: `${entry.kind}:${entry.id}`, group: 2,
        focus: () => elements.get(`${entry.kind}:${entry.id}`)?.focus({ preventScroll: true }),
        activate: (trigger: HTMLButtonElement) => activateDockItem(entry.kind, entry.id, entry.label, trigger) })),
    ];
    entries.sort((a, b) => a.group - b.group);
    const order = activeMode() === 'work' ? props.customization?.order : undefined;
    if (order) entries.sort((a, b) => {
      const ai = order.indexOf(a.key), bi = order.indexOf(b.key);
      return (ai < 0 ? Infinity : ai) - (bi < 0 ? Infinity : bi);
    });
    return entries.map(entry => ({ ...entry, beginDrag: canvasPlacementForEntry(entry)
      ? (event: PointerEvent, lifecycle: WorkbenchDockOverflowDragLifecycle) => {
        if (event.button !== 0 || !(event.currentTarget instanceof HTMLElement)) return;
        beginItemDragGesture(event, entry.kind, entry.id, entry.label, entry.icon, event.currentTarget,
          canvasPlacementForEntry(entry), null, 'before-components', lifecycle);
      } : undefined }));
  });
  const hiddenEntries = createMemo(() => activeMode() === 'work' && props.customization?.overflow
    ? catalog().filter(entry => props.customization?.hidden?.includes(entry.key)) : []);
  const visibleEntries = createMemo(() => catalog().filter(entry => !hiddenEntries().includes(entry)));
  const sortingKey = createMemo(() => {
    const current = dragState();
    return current?.moved && current.overDock && !current.overflow && current.kind !== 'external' && props.customization?.onOrderChange
      ? `${current.kind}:${current.id}` : undefined;
  });
  createBarLayoutMotion({ keys: () => visibleEntries().map(entry => entry.key), elements, preview: () => dropPosition()?.order,
    drag: () => {
      const key = sortingKey(), current = dragState();
      return key && current ? { key, x: current.clientX - current.startClientX + current.startTranslateX, y: 0 } : undefined;
    }, axis: 'x' });
  const entryByKey = createMemo(() => new Map(visibleEntries().map(entry => [entry.key, entry])));
  const reorderKey = (key: string, event: KeyboardEvent) => {
    if (activeMode() !== 'work' || !props.customization?.onOrderChange) return;
    const order = keyboardBarOrder(visibleEntries().map(entry => entry.key), key, event, 'x');
    if (order) { props.customization.onOrderChange(order); elements.get(key)?.focus({ preventScroll: true }); }
  };
  createEffect(() => {
    const keys = visibleEntries().map(entry => entry.key).join('\0');
    void keys;
    if (dragSession) dragSession.stop({ commit: false });
  });
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
  const componentPresentation = (
    kind: WorkbenchDockItemActivation['kind'],
    id: WorkbenchDockItemActivation['id']
  ): WorkbenchDockItemPresentation | undefined =>
    activationMode() === 'focus-cycle' ? props.resolveItemPresentation?.({ kind, id }) : undefined;
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
            onClick={() => {
              props.onDockActivation?.({ kind: 'mode', id: activeMode() });
              setModeMenuOpen((open) => !open);
            }}
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
              <For each={modeItems()}>
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
                        props.onDockActivation?.({ kind: 'mode', id: item.mode });
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
        <Show when={showExternalPlaceholder('before-components')}><ExternalDockPlaceholder /></Show>
        <For each={visibleEntries().map(entry => entry.key)}>{(key, index) => {
          // Keep the last record until keyed disposal completes. Child effects
          // may run after the catalog removes a key but before For disposes it.
          const entry = createMemo<DockEntry>(previous => entryByKey().get(key) ?? previous!,
            untrack(() => entryByKey().get(key)!));
          const initialBindAction = entry().action?.buttonRef;
          const presentation = () => entry().kind === 'widget' || entry().kind === 'tool'
            ? componentPresentation(entry().kind as 'widget' | 'tool', entry().id) : undefined;
          const contextMenu = (): BarItemContextMenuHandler | undefined => entry().host?.onContextMenu ?? entry().action?.onContextMenu
            ?? (props.customization?.onContextMenu && activeMode() === 'work'
              ? request => props.customization?.onContextMenu?.(entry(), request) : undefined);
          return <>
            <Show when={props.customization ? index() === 0 : (entry().group === 2 || entry().group === 4) && visibleEntries()[index() - 1]?.group !== entry().group}>
              <span class="workbench-dock__divider" aria-hidden="true" />
            </Show>
            <DockItem id={entry().id} kind={entry().kind} label={entry().label} icon={entry().icon}
              active={entry().action ? Boolean(entry().action!.active) : entry().host ? Boolean(entry().host!.active) : presentation()?.active ?? componentSoloed(entry().id)}
              visible={entry().group !== 2 || activationMode() === 'focus-cycle' || componentVisible(entry().id)}
              filterable={entry().group === 2 && activationMode() === 'solo-filter' && componentFilterable()}
              activationMode={activationMode()} presentation={presentation()}
              hoverOffset={dragState()?.moved ? 0 : offsetFor(index() + 1)}
              isDragging={!sortingKey() && dragState()?.kind === entry().kind && dragState()?.id === entry().id}
              canvasPlacement={canvasPlacementForEntry(entry())}
              buttonRef={button => {
                if (button) elements.set(key, button); else elements.delete(key);
                initialBindAction?.(button);
              }}
              onContextMenu={contextMenu()}
              onKeyboardActivate={trigger => entry().activate(trigger)}
              onEnter={() => setHoveredIndex(index() + 1)} onLeave={() => setHoveredIndex(null)}
              onDragBegin={beginItemDragGesture} onReorderKey={event => reorderKey(key, event)}
              reorderable={activeMode() === 'work' && Boolean(props.customization?.onOrderChange)}
              dropEdge={dropPosition()?.key === key ? dropPosition()?.edge : undefined} />
          </>;
        }}</For>
        <Show when={showExternalPlaceholder('after-components')}><ExternalDockPlaceholder /></Show>
        <Show when={activeMode() === 'work' && props.customization?.overflow}>
          <Dynamic component={props.customization?.overflow} entries={hiddenEntries()} />
        </Show>
      </div>

      <Show when={Boolean(dragState()?.moved && !dragState()?.preview && !sortingKey())}>
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
