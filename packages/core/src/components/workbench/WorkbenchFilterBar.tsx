import {
  For,
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
import { Layers, LayoutDashboard, MessageSquare, Plus, Region, TextTool } from '../../icons';
import { startHotInteraction } from '../../utils/hotInteraction';
import { startPointerSession, type PointerSessionController } from '../ui/pointerSession';
import {
  WORKBENCH_EDGE_AUTO_PAN_FRAME_SELECTOR,
  createWorkbenchEdgeAutoPanController,
  frameFromElement,
  type WorkbenchEdgeAutoPanController,
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
  /**
   * Called when the user drags a widget pill onto the canvas to create a
   * new widget of that type. Coordinates are in client space (clientX/Y).
   */
  onCreateAt?: (type: WorkbenchWidgetType, clientX: number, clientY: number) => void;
  onCreateToolAt?: (tool: WorkbenchDockToolId, clientX: number, clientY: number) => void;
  onDragPreviewChange?: (preview: WorkbenchDockDragPreview | null) => void;
  viewport?: WorkbenchViewport;
  onViewportCommit?: (viewport: WorkbenchViewport) => void;
  onViewportInteractionStart?: (kind: 'pan') => void;
}

export type WorkbenchDockDragPreview = Readonly<{
  kind: 'widget' | 'tool';
  id: WorkbenchWidgetType | WorkbenchDockToolId;
  label: string;
  clientX: number;
  clientY: number;
}>;

interface DragState {
  kind: 'widget' | 'tool';
  id: WorkbenchWidgetType | WorkbenchDockToolId;
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
  preview: WorkbenchDockDragPreview | null;
  stopInteraction: () => void;
}

const DRAG_THRESHOLD_PX = 5;
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
    icon: LayoutDashboard,
  },
  {
    mode: 'background',
    label: 'Composition Mode',
    description: 'Arrange regions and canvas text',
    icon: Layers,
  },
];

const WORKBENCH_WORK_TOOL_ITEMS: readonly {
  tool: WorkbenchDockToolId;
  label: string;
  icon: Component<{ class?: string }>;
}[] = [{ tool: 'sticky-note', label: 'Sticky', icon: MessageSquare }];

const WORKBENCH_BACKGROUND_TOOL_ITEMS: readonly {
  tool: WorkbenchDockToolId;
  label: string;
  icon: Component<{ class?: string }>;
}[] = [
  { tool: 'background-region', label: 'Region', icon: Region },
  { tool: 'text', label: 'Text', icon: TextTool },
];

function readCanvasFrameRect(): DOMRect | null {
  const frame = document.querySelector(WORKBENCH_EDGE_AUTO_PAN_FRAME_SELECTOR);
  if (!(frame instanceof HTMLElement)) return null;
  return frame.getBoundingClientRect();
}

function isPointInRect(clientX: number, clientY: number, rect: DOMRect): boolean {
  return (
    clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
  );
}

function isOverCanvas(clientX: number, clientY: number): boolean {
  const rect = readCanvasFrameRect();
  return rect ? isPointInRect(clientX, clientY, rect) : false;
}

function didSegmentEnterCanvas(
  startClientX: number,
  startClientY: number,
  endClientX: number,
  endClientY: number
): boolean {
  const rect = readCanvasFrameRect();
  if (!rect) return false;
  if (
    isPointInRect(startClientX, startClientY, rect) ||
    isPointInRect(endClientX, endClientY, rect)
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
    clip(-dx, startClientX - rect.left) &&
    clip(dx, rect.right - startClientX) &&
    clip(-dy, startClientY - rect.top) &&
    clip(dy, rect.bottom - startClientY)
  );
}

function isOverDock(clientX: number, clientY: number): boolean {
  if (typeof document.elementFromPoint !== 'function') return false;
  const target = document.elementFromPoint(clientX, clientY);
  return target instanceof Element && target.closest(DOCK_SELECTOR) !== null;
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
  onDragBegin: (
    event: PointerEvent,
    kind: DragState['kind'],
    id: WorkbenchWidgetType | WorkbenchDockToolId,
    label: string,
    icon: Component<{ class?: string }>
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
      props.icon
    );
  };

  return (
    <button
      type="button"
      class="workbench-dock__item"
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
      onPointerEnter={() => props.onEnter()}
      onPointerLeave={() => props.onLeave()}
      onPointerDown={handlePointerDown}
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

export function WorkbenchDock(props: WorkbenchFilterBarProps) {
  const [hoveredIndex, setHoveredIndex] = createSignal<number | null>(null);
  const [dragState, setDragState] = createSignal<DragState | null>(null);
  const [modeMenuOpen, setModeMenuOpen] = createSignal(false);

  let dockRootEl: HTMLDivElement | undefined;
  let dragSession: PointerSessionController | undefined;
  let edgeAutoPan: WorkbenchEdgeAutoPanController | undefined;
  let edgeAutoPanViewport: WorkbenchViewport | null = null;

  onCleanup(() => {
    edgeAutoPan?.stop();
    dragSession?.stop({ reason: 'manual_stop', commit: false });
    dragSession = undefined;
    const current = dragState();
    current?.stopInteraction();
    props.onDragPreviewChange?.(null);
  });

  createEffect(() => {
    props.onDragPreviewChange?.(dragState()?.preview ?? null);
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

  // Mode switcher = slot 0; visible component types = slots 1..N.
  const offsetFor = (slot: number): number => {
    const hovered = hoveredIndex();
    if (hovered === null) return 0;
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
        const frame = document.querySelector(WORKBENCH_EDGE_AUTO_PAN_FRAME_SELECTOR);
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
          !isOverDock(current.clientX, current.clientY)
        );
      },
    });
  };

  const finalizeDrag = (commitDrop: boolean) => {
    const current = dragState();
    if (!current) return;

    const isClick = !current.moved;
    current.stopInteraction();
    stopEdgeAutoPan();
    setDragState(null);
    dragSession = undefined;

    if (isClick) {
      if (activeMode() !== 'background') {
        props.onSoloFilter(String(current.id), componentScope());
      }
      return;
    }

    if (commitDrop && current.overCanvas) {
      if (current.kind === 'widget') {
        props.onCreateAt?.(current.id as WorkbenchWidgetType, current.clientX, current.clientY);
      } else {
        props.onCreateToolAt?.(current.id as WorkbenchDockToolId, current.clientX, current.clientY);
      }
    }
  };

  const beginItemDragGesture = (
    event: PointerEvent,
    kind: DragState['kind'],
    id: WorkbenchWidgetType | WorkbenchDockToolId,
    label: string,
    icon: Component<{ class?: string }>
  ) => {
    event.preventDefault();
    dragSession?.stop({ reason: 'manual_stop', commit: false });
    startEdgeAutoPan();

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
      preview: null,
      stopInteraction: startHotInteraction({ kind: 'drag', cursor: 'grabbing' }),
    });

    const handleMove = (next: PointerEvent) => {
      let shouldUpdateEdgeAutoPan = false;
      setDragState((current) => {
        if (!current || current.pointerId !== next.pointerId) return current;
        const dx = next.clientX - current.startClientX;
        const dy = next.clientY - current.startClientY;
        const moved =
          current.moved || Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX;
        const overDock = isOverDock(next.clientX, next.clientY);
        const overCanvas = moved && isOverCanvas(next.clientX, next.clientY) && !overDock;
        const crossedCanvas =
          moved &&
          !overDock &&
          didSegmentEnterCanvas(current.clientX, current.clientY, next.clientX, next.clientY);
        const hasEnteredCanvas = current.hasEnteredCanvas || overCanvas || crossedCanvas;
        shouldUpdateEdgeAutoPan = moved && hasEnteredCanvas && !overDock;
        return {
          ...current,
          clientX: next.clientX,
          clientY: next.clientY,
          moved,
          overCanvas,
          hasEnteredCanvas,
          preview: overCanvas
            ? {
                kind: current.kind,
                id: current.id,
                label: current.label,
                clientX: next.clientX,
                clientY: next.clientY,
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
      onMove: handleMove,
      onEnd: ({ commit }) => finalizeDrag(commit),
    });
  };

  const draggingWidgetType = (): WorkbenchWidgetType | null =>
    dragState()?.kind === 'widget' ? (dragState()!.id as WorkbenchWidgetType) : null;
  const draggingTool = (): WorkbenchDockToolId | null =>
    dragState()?.kind === 'tool' ? (dragState()!.id as WorkbenchDockToolId) : null;
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
    scale: modeTriggerHovered() || modeMenuOpen() ? 1.26 : 1,
    y: modeTriggerHovered() || modeMenuOpen() ? -6 : 0,
    x: hoveredIndex() === 1 ? -5 : 0,
  });

  return (
    <>
      <div
        ref={dockRootEl}
        class="workbench-dock"
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
              <Layers class="workbench-dock__icon" />
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
        <span class="workbench-dock__divider" aria-hidden="true" />
        <For each={componentItems()}>
          {(entry, index) => {
            const slot = () => index() + 1;
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
                onEnter={() => setHoveredIndex(slot())}
                onLeave={() => setHoveredIndex((current) => (current === slot() ? null : current))}
                onDragBegin={beginItemDragGesture}
              />
            );
          }}
        </For>
      </div>

      <Show when={(dragState()?.moved ?? false) as boolean}>
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

  const overCanvas = () => props.state()?.overCanvas ?? false;
  const label = () => props.state()?.label ?? '';
  const Icon = () => props.state()?.icon;

  return (
    <Portal>
      <div
        class="workbench-dock-ghost"
        classList={{ 'is-over-canvas': overCanvas() }}
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
              <span>{overCanvas() ? 'Drop to create' : 'Drag onto canvas'}</span>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
