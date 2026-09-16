import {
  Show,
  batch,
  createUniqueId,
  type JSX,
  createSignal,
  createEffect,
  onCleanup,
  onMount,
  untrack,
} from 'solid-js';
import { Portal } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { useLayout } from '../../context/LayoutContext';
import { Button } from './Button';
import { X, Maximize, Restore } from '../icons';
import { startHotInteraction } from '../../utils/hotInteraction';
import { startPointerSession, type PointerSessionController } from './pointerSession';
import {
  normalizeFloatingWindowRect,
  resolveFloatingWindowViewport,
  resolveFloatingWindowRect,
  type FloatingWindowRect,
  type FloatingWindowResizeHandle,
  type FloatingWindowViewportInsets,
} from './floatingWindowGeometry';
import { createFloatingPresence } from './floatingPresence';
import { LOCAL_INTERACTION_SURFACE_ATTR } from './localInteractionSurface';
import { SURFACE_FLOATING_LAYER_ATTR, SURFACE_PORTAL_LAYER_ATTR, resolveSurfacePortalHost } from './surfacePortalScope';
import { resolveFloatingBoundary, readSurfaceSafeArea, type SurfaceFloatingBoundary } from './surfaceFloatingBoundary';

export interface FloatingWindowProps {
  /** Whether the window is open */
  open: boolean;
  /** Callback when window open state changes */
  onOpenChange: (open: boolean) => void;
  /** Window title */
  title?: string;
  /** Compact actions at the right of the title bar, before the window controls. */
  headerActions?: JSX.Element;
  /** Window content */
  children: JSX.Element;
  /** Optional footer content */
  footer?: JSX.Element;
  /** Default position (centered if not provided) */
  defaultPosition?: { x: number; y: number };
  /** Default size */
  defaultSize?: { width: number; height: number };
  /** Minimum window size */
  minSize?: { width: number; height: number };
  /** Maximum window size */
  maxSize?: { width: number; height: number };
  /** Safe area inside the browser viewport that the floating window should avoid */
  viewportInsets?: FloatingWindowViewportInsets;
  /** Optional visible content boundary, measured in client coordinates by Floe. */
  boundary?: SurfaceFloatingBoundary;
  /** Fill the available boundary below this width, without drag/resize controls. Disabled by default. */
  compactBelow?: number;
  /** Localized native window control labels. */
  labels?: { close: string; maximize: string; restore: string };
  /** Whether the window can be resized */
  resizable?: boolean;
  /** Whether the window can be dragged */
  draggable?: boolean;
  /** Additional CSS class */
  class?: string;
  /** z-index for the window */
  zIndex?: number;
}

/**
 * Floating window component with drag, resize, maximize/restore functionality.
 *
 * Hot-path geometry updates are applied imperatively to the DOM and only committed
 * back into reactive state when the interaction ends. This keeps drag/resize smooth
 * even when the window body hosts a large subtree.
 */
export function FloatingWindow(props: FloatingWindowProps) {
  const resizable = () => props.resizable ?? true;
  const draggable = () => props.draggable ?? true;
  const minSize = () => props.minSize ?? { width: 200, height: 150 };
  const maxSize = () => props.maxSize ?? { width: Infinity, height: Infinity };
  let anchor: HTMLSpanElement | undefined;
  const safeArea = readSurfaceSafeArea();
  const [boundaryInsets, setBoundaryInsets] = createSignal<FloatingWindowViewportInsets>({});
  const [boundaryWidth, setBoundaryWidth] = createSignal(Infinity);
  const [boundaryVisible, setBoundaryVisible] = createSignal(true);
  const compact = () => Boolean(props.compactBelow && boundaryWidth() < props.compactBelow);
  const viewportInsets = () => ({
    top: (boundaryInsets().top ?? 0) + (props.viewportInsets?.top ?? 0),
    right: (boundaryInsets().right ?? 0) + (props.viewportInsets?.right ?? 0),
    bottom: (boundaryInsets().bottom ?? 0) + (props.viewportInsets?.bottom ?? 0),
    left: (boundaryInsets().left ?? 0) + (props.viewportInsets?.left ?? 0),
  });
  const zIndex = () => props.zIndex ?? 100;
  const baseId = createUniqueId();

  const layout = useLayout();
  const isMobile = () => layout.isMobile();
  const MOBILE_PADDING = 16;
  const titleId = () => `floating-window-${baseId}-title`;

  const [position, setPosition] = createSignal(props.defaultPosition ?? { x: 0, y: 0 });
  const [size, setSize] = createSignal(props.defaultSize ?? { width: 400, height: 300 });
  const [isMaximized, setIsMaximized] = createSignal(false);
  const [isDragging, setIsDragging] = createSignal(false);
  const [isResizing, setIsResizing] = createSignal(false);
  const [isActive, setIsActive] = createSignal(false);
  const windowPresence = createFloatingPresence({
    open: () => props.open,
  });
  let dragStartPos = { x: 0, y: 0 };
  let dragStartRect: FloatingWindowRect = { x: 0, y: 0, width: 0, height: 0 };
  let resizeStartPos = { x: 0, y: 0 };
  let resizeStartRect: FloatingWindowRect = { x: 0, y: 0, width: 0, height: 0 };
  let resizeHandle: FloatingWindowResizeHandle = 'se';

  let windowRef: HTMLDivElement | undefined;
  let activePointerId: number | null = null;
  let pointerSession: PointerSessionController | undefined;
  let mode: 'drag' | 'resize' | null = null;
  let lastPointerPos = { x: 0, y: 0 };
  let rafId: number | null = null;
  let stopHotInteraction: (() => void) | null = null;
  let hasOpenedOnce = false;
  let liveRect: FloatingWindowRect = {
    x: props.defaultPosition?.x ?? 0,
    y: props.defaultPosition?.y ?? 0,
    width: props.defaultSize?.width ?? 400,
    height: props.defaultSize?.height ?? 300,
  };

  // Viewport constraints are a rendering projection, never the user's preferred geometry.
  let preferredRect = { ...liveRect };
  let preferredPlacement: { x: number; y: number } | undefined;
  const rememberPreference = (rect: FloatingWindowRect) => {
    preferredRect = { ...rect };
    const bounds = resolveFloatingWindowViewport({ width: window.innerWidth, height: window.innerHeight }, viewportInsets());
    preferredPlacement = {
      x: bounds.width > rect.width ? (rect.x - bounds.x) / (bounds.width - rect.width) : (preferredPlacement?.x ?? 0.5),
      y: bounds.height > rect.height ? (rect.y - bounds.y) / (bounds.height - rect.height) : (preferredPlacement?.y ?? 0.5),
    };
  };

  const RESIZE_CURSORS: Record<FloatingWindowResizeHandle, string> = {
    n: 'ns-resize',
    s: 'ns-resize',
    e: 'ew-resize',
    w: 'ew-resize',
    ne: 'nesw-resize',
    nw: 'nwse-resize',
    se: 'nwse-resize',
    sw: 'nesw-resize',
  };

  const setGlobalInteractionStyles = (active: boolean, cursor: string) => {
    if (!active) {
      stopHotInteraction?.();
      stopHotInteraction = null;
      return;
    }

    stopHotInteraction?.();
    stopHotInteraction = startHotInteraction({
      kind: mode === 'resize' ? 'resize' : 'drag',
      cursor,
      lockUserSelect: true,
    });
  };

  const applyWindowRect = (rect: FloatingWindowRect) => {
    liveRect = rect;
    if (!windowRef) return;
    windowRef.style.transform = `translate3d(${rect.x}px, ${rect.y}px, 0)`;
    windowRef.style.width = `${rect.width}px`;
    windowRef.style.height = `${rect.height}px`;
  };

  const readCommittedRect = (): FloatingWindowRect => {
    const nextPosition = position();
    const nextSize = size();
    return {
      x: nextPosition.x,
      y: nextPosition.y,
      width: nextSize.width,
      height: nextSize.height,
    };
  };

  const setCommittedRect = (rect: FloatingWindowRect) => {
    liveRect = rect;
    setPosition((current) => (
      current.x === rect.x && current.y === rect.y
        ? current
        : { x: rect.x, y: rect.y }
    ));
    setSize((current) => (
      current.width === rect.width && current.height === rect.height
        ? current
        : { width: rect.width, height: rect.height }
    ));
  };

  const focusWindowRoot = () => {
    try {
      windowRef?.focus({ preventScroll: true });
    } catch {
      // Ignore focus failures (e.g. detached node).
    }
  };

  const shouldFocusWindowRootFromPointer = (target: EventTarget | null) => {
    const element = target instanceof Element ? target : null;
    if (!element) return true;
    return element.closest('button, input, select, textarea, a, [role="button"], [tabindex]:not([tabindex="-1"])') === null;
  };

  const isTargetInsideWindow = (target: EventTarget | null) =>
    !!windowRef && target instanceof Node && windowRef.contains(target);

  const isTargetInsideNestedFloatingMenu = (target: EventTarget | null) => {
    const element = target instanceof Element ? target : null;
    const menu = element?.closest('[role="menu"]');
    const floatingLayer = menu?.closest(`[${SURFACE_FLOATING_LAYER_ATTR}="true"]`);
    return Boolean(floatingLayer && windowRef?.contains(floatingLayer));
  };

  const readLiveRectFromDom = (): FloatingWindowRect | null => {
    if (!windowRef) return null;
    const rect = windowRef.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    };
  };

  const applyLatestPointerRect = () => {
    if (!props.open) return;
    if (activePointerId === null || mode === null) return;
    if (typeof window === 'undefined') return;

    applyWindowRect(resolveFloatingWindowRect({
      mode,
      pointer: lastPointerPos,
      dragStartPos,
      dragStartRect,
      resizeStartPos,
      resizeStartRect,
      resizeHandle,
      minSize: minSize(),
      maxSize: maxSize(),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      viewportInsets: viewportInsets(),
      mobile: isMobile(),
      mobilePadding: MOBILE_PADDING,
    }));
  };

  const syncRectToViewport = (options?: { center?: boolean }) => {
    if (typeof window === 'undefined') return;

    const viewport = { width: window.innerWidth, height: window.innerHeight };
    if (isMaximized() || compact()) {
      setCommittedRect(resolveFloatingWindowViewport(viewport, viewportInsets()));
      return;
    }

    let rect = normalizeFloatingWindowRect({
      rect: preferredRect,
      minSize: minSize(),
      maxSize: maxSize(),
      viewport,
      viewportInsets: viewportInsets(),
      mobile: props.boundary === undefined && isMobile(),
      mobilePadding: MOBILE_PADDING,
      center: options?.center ?? false,
    });
    if (props.boundary !== undefined && preferredPlacement && !options?.center) {
      const available = resolveFloatingWindowViewport(viewport, viewportInsets());
      rect = { ...rect,
        x: available.x + preferredPlacement.x * Math.max(0, available.width - rect.width),
        y: available.y + preferredPlacement.y * Math.max(0, available.height - rect.height),
      };
    }
    setCommittedRect(rect);
    if (!preferredPlacement) {
      const requestedSize = { width: preferredRect.width, height: preferredRect.height };
      rememberPreference(rect);
      Object.assign(preferredRect, requestedSize);
    }
  };

  const finishInteraction = (commit: boolean) => {
    if (rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (commit) {
      applyLatestPointerRect();
    }
    const committedRect = commit ? (readLiveRectFromDom() ?? liveRect) : null;

    batch(() => {
      if (committedRect) {
        setCommittedRect(committedRect);
        const preferredSize = { width: preferredRect.width, height: preferredRect.height };
        rememberPreference(committedRect);
        // Moving a constrained window changes only its placement; resizing owns size.
        if (mode === 'drag') Object.assign(preferredRect, preferredSize);
      }
      activePointerId = null;
      mode = null;
      setIsDragging(false);
      setIsResizing(false);
    });
    setGlobalInteractionStyles(false, '');
    pointerSession = undefined;
  };

  const stopInteraction = (commit = false) => {
    if (pointerSession) pointerSession.stop({ commit });
    else finishInteraction(commit);
  };
  onCleanup(() => stopInteraction(false));

  onMount(() => {
    let frame = 0;
    const measureBoundary = () => {
      if (props.boundary !== undefined) {
        const rect = resolveFloatingBoundary(resolveSurfacePortalHost({ owner: anchor }), props.boundary, safeArea);
        const next = rect ? { top: rect.top, left: rect.left, right: window.innerWidth - rect.right, bottom: window.innerHeight - rect.bottom } : {};
        batch(() => {
          setBoundaryVisible(Boolean(rect && rect.width > 16 && rect.height > 16));
          setBoundaryWidth(rect?.width ?? 0);
          setBoundaryInsets(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
        });
      } else {
        setBoundaryVisible(true);
        setBoundaryWidth(window.innerWidth);
        setBoundaryInsets(previous => Object.keys(previous).length ? {} : previous);
      }
      frame = requestAnimationFrame(measureBoundary);
    };
    measureBoundary();
    onCleanup(() => cancelAnimationFrame(frame));
    if (!props.open) {
      syncRectToViewport({ center: !props.defaultPosition });
    }

    const handleResize = () => {
      if (activePointerId !== null) return;
      syncRectToViewport({ center: false });
    };
    window.addEventListener('resize', handleResize);
    onCleanup(() => window.removeEventListener('resize', handleResize));
  });

  createEffect(() => {
    if (!props.open) return;
    void isMobile();
    const center = !hasOpenedOnce && !props.defaultPosition;
    const syncAfterFrame = () => {
      syncRectToViewport({ center });
      hasOpenedOnce = true;
    };
    if (typeof requestAnimationFrame === 'undefined') {
      syncAfterFrame();
      return;
    }
    requestAnimationFrame(syncAfterFrame);
  });

  createEffect(() => {
    viewportInsets();
    compact();
    if (!props.open || !hasOpenedOnce || activePointerId !== null) return;
    untrack(() => syncRectToViewport({ center: false }));
  });

  createEffect(() => {
    if (!props.open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;

      const activeElement = typeof document !== 'undefined' ? document.activeElement : null;
      if (!isTargetInsideWindow(e.target) && !isTargetInsideWindow(activeElement)) return;
      if (isTargetInsideNestedFloatingMenu(e.target)) return;

      e.preventDefault();
      if (typeof e.stopImmediatePropagation === 'function') {
        e.stopImmediatePropagation();
      } else {
        e.stopPropagation();
      }
      props.onOpenChange(false);
    };

    document.addEventListener('keydown', handleEscape, true);
    onCleanup(() => document.removeEventListener('keydown', handleEscape, true));
  });

  createEffect(() => {
    if (!props.open) {
      setIsActive(false);
      stopInteraction(false);
      return;
    }
    setIsActive(true);
  });

  createEffect(() => {
    if (!props.open) return;

    const syncActiveState = (target: EventTarget | null) => {
      setIsActive(isTargetInsideWindow(target));
    };

    const handlePointerDown = (e: PointerEvent) => {
      syncActiveState(e.target);
    };

    const handleFocusIn = (e: FocusEvent) => {
      syncActiveState(e.target);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('focusin', handleFocusIn);
    onCleanup(() => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('focusin', handleFocusIn);
    });
  });

  createEffect(() => {
    if (!props.open) return;
    const rect = readCommittedRect();
    if (activePointerId === null) {
      applyWindowRect(rect);
    } else {
      liveRect = rect;
    }
  });

  const handleDragStart = (e: PointerEvent) => {
    if (!draggable() || isMaximized() || compact() || activePointerId !== null) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const target = e.target as HTMLElement | null;
    if (target?.closest('button, input, select, textarea, a, [role="button"], [data-floe-floating-window-header-actions]')) return;

    e.preventDefault();

    activePointerId = e.pointerId;
    mode = 'drag';
    setIsDragging(true);
    dragStartPos = { x: e.clientX, y: e.clientY };
    dragStartRect = { ...liveRect };
    lastPointerPos = { x: e.clientX, y: e.clientY };
    setGlobalInteractionStyles(true, 'grabbing');
    startWindowPointerSession(e);
  };

  // eslint-disable-next-line solid/reactivity -- This returns an event handler.
  const handleResizeStart = (handle: FloatingWindowResizeHandle) => (e: PointerEvent) => {
    if (!resizable() || isMaximized() || compact() || activePointerId !== null) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    activePointerId = e.pointerId;
    mode = 'resize';
    setIsResizing(true);
    resizeHandle = handle;
    resizeStartPos = { x: e.clientX, y: e.clientY };
    resizeStartRect = { ...liveRect };
    lastPointerPos = { x: e.clientX, y: e.clientY };
    setGlobalInteractionStyles(true, RESIZE_CURSORS[handle]);
    startWindowPointerSession(e);
  };

  const flushPointerMove = () => {
    rafId = null;
    applyLatestPointerRect();
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (activePointerId === null || e.pointerId !== activePointerId) return;
    if (mode === null) return;

    lastPointerPos = { x: e.clientX, y: e.clientY };

    if (rafId !== null) return;
    if (typeof requestAnimationFrame === 'undefined') {
      flushPointerMove();
      return;
    }
    rafId = requestAnimationFrame(flushPointerMove);
  };

  const startWindowPointerSession = (event: PointerEvent) => {
    pointerSession = startPointerSession({
      pointerEvent: event,
      captureEl: windowRef,
      onMove: handlePointerMove,
      onEnd: ({ commit, reason, snapshot }) => {
        lastPointerPos = { x: snapshot.latestClientX, y: snapshot.latestClientY };
        // Preserve FloatingWindow's existing commit-on-cancel geometry contract.
        finishInteraction(commit || reason === 'pointer_cancel');
      },
    });
  };

  const toggleMaximize = () => {
    if (activePointerId !== null) {
      stopInteraction(true);
    }

    if (compact()) return;
    setIsMaximized(!isMaximized());
    syncRectToViewport();
  };

  const handleTitleBarDoubleClick = (event: MouseEvent) => {
    if ((event.target as Element | null)?.closest('button, [data-floe-floating-window-header-actions]')) return;
    toggleMaximize();
  };

  const handleSurfacePointerDown: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    if (!shouldFocusWindowRootFromPointer(event.target)) return;
    focusWindowRoot();
  };

  const getResizeHandleClass = (handle: FloatingWindowResizeHandle) => {
    const baseClass = 'absolute z-10';
    const cursorMap: Record<FloatingWindowResizeHandle, string> = {
      n: 'cursor-ns-resize top-0 left-2 right-2 h-1',
      s: 'cursor-ns-resize bottom-0 left-2 right-2 h-1',
      e: 'cursor-ew-resize right-0 top-2 bottom-2 w-1',
      w: 'cursor-ew-resize left-0 top-2 bottom-2 w-1',
      ne: 'cursor-nesw-resize top-0 right-0 w-2 h-2',
      nw: 'cursor-nwse-resize top-0 left-0 w-2 h-2',
      se: 'cursor-nwse-resize bottom-0 right-0 w-2 h-2',
      sw: 'cursor-nesw-resize bottom-0 left-0 w-2 h-2',
    };
    return cn(baseClass, cursorMap[handle]);
  };

  return (
    <>
    <span ref={anchor} hidden />
    <Show when={windowPresence.mounted()}>
      <Portal>
        <div
          ref={windowRef}
          data-floe-geometry-surface="floating-window"
          data-floating-presence={windowPresence.state()}
          aria-hidden={windowPresence.exiting() || !boundaryVisible() ? 'true' : undefined}
          inert={windowPresence.exiting() || !boundaryVisible()}
          data-floe-floating-window-compact={compact() ? 'true' : undefined}
          {...{ [LOCAL_INTERACTION_SURFACE_ATTR]: 'true' }}
          class={cn(
            'fixed left-0 top-0 z-[100] flex flex-col',
            (isDragging() || isResizing()) && 'select-none',
            windowPresence.exiting() && 'pointer-events-none'
          )}
          style={{
            visibility: boundaryVisible() ? undefined : 'hidden',
            width: `${size().width}px`,
            height: `${size().height}px`,
            transform: `translate3d(${position().x}px, ${position().y}px, 0)`,
            'z-index': zIndex(),
            'will-change': isDragging() ? 'transform' : isResizing() ? 'transform, width, height' : undefined,
          }}
          role="dialog"
          aria-labelledby={props.title ? titleId() : undefined}
          tabIndex={-1}
          onPointerDown={handleSurfacePointerDown}
        >
          <div
            data-floe-dialog-surface-host="true"
            {...{ [SURFACE_PORTAL_LAYER_ATTR]: 'true' }}
            data-floe-floating-window-surface="true"
            data-floe-surface="floating"
            data-floe-surface-interacting={isDragging() || isResizing() ? 'true' : undefined}
            data-floe-floating-window-state={isActive() ? 'active' : 'inactive'}
            {...{ [LOCAL_INTERACTION_SURFACE_ATTR]: 'true' }}
            class={cn(
              'relative flex h-full w-full flex-col overflow-hidden',
              'text-card-foreground rounded-md',
              'border',
              'floe-floating-presence floe-floating-window-motion',
              (isDragging() || isResizing()) && 'floe-floating-presence--suspended',
              isMaximized() && 'rounded-none',
              props.class
            )}
            style={{ 'border-radius': isMaximized() ? '0' : 'var(--floe-radius-floating)' }}
            data-floating-presence={windowPresence.state()}
          >
            <div
              data-floe-floating-window-titlebar="true"
              class={cn(
                'flex shrink-0 items-center justify-between h-8',
                'border-b',
                isMaximized() ? 'rounded-none' : 'rounded-t-md',
                draggable() && !isMaximized() && !compact() && 'cursor-move'
              )}
              onPointerDown={handleDragStart}
              onDblClick={handleTitleBarDoubleClick}
              style={{ 'touch-action': 'none' }}
            >
              <div class="flex-1 min-w-0 px-2">
                <Show when={props.title}>
                  <h2
                    id={titleId()}
                    class="text-xs leading-none font-medium truncate select-none"
                  >
                    {props.title}
                  </h2>
                </Show>
              </div>

              <Show when={props.headerActions}>
                <div
                  data-floe-floating-window-header-actions="true"
                  class="flex shrink-0 cursor-default items-center gap-1"
                >
                  {props.headerActions}
                  <span aria-hidden="true" class="mx-2 h-4 w-px shrink-0 bg-border" />
                </div>
              </Show>

              <div class="flex h-full shrink-0 items-stretch">
                <Show when={!compact()}>
                <Button
                  variant="ghost"
                  size="icon"
                  data-floe-floating-window-control="maximize"
                  class="h-full w-9 shrink-0 rounded-none border-0 px-0 active:scale-100"
                  onClick={(e: MouseEvent) => {
                    e.stopPropagation();
                    toggleMaximize();
                  }}
                  aria-label={isMaximized() ? (props.labels?.restore ?? 'Restore') : (props.labels?.maximize ?? 'Maximize')}
                >
                  <Show when={isMaximized()} fallback={<Maximize class="w-3 h-3" />}>
                    <Restore class="w-3 h-3" />
                  </Show>
                </Button>
                </Show>

                <Button
                  variant="ghost-destructive"
                  size="icon"
                  data-floe-floating-window-control="close"
                  class="h-full w-10 shrink-0 rounded-none border-0 px-0 active:scale-100"
                  onClick={(e: MouseEvent) => {
                    e.stopPropagation();
                    props.onOpenChange(false);
                  }}
                  aria-label={props.labels?.close ?? 'Close'}
                >
                  <X class="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div
              data-floe-floating-window-content="true"
              class="flex-1 overflow-auto p-3"
            >
              {props.children}
            </div>

            <Show when={props.footer}>
              <div
                data-floe-floating-window-footer="true"
                class="flex items-center justify-end gap-2 p-3 border-t border-border"
              >
                {props.footer}
              </div>
            </Show>

            <Show when={resizable() && !isMaximized() && !compact()}>
              <div
                class={getResizeHandleClass('n')}
                data-floe-floating-window-resize-handle="n"
                style={{ 'touch-action': 'none' }}
                onPointerDown={handleResizeStart('n')}
              />
              <div
                class={getResizeHandleClass('s')}
                data-floe-floating-window-resize-handle="s"
                style={{ 'touch-action': 'none' }}
                onPointerDown={handleResizeStart('s')}
              />

              <Show when={!isMobile()}>
                <div
                  class={getResizeHandleClass('e')}
                  data-floe-floating-window-resize-handle="e"
                  style={{ 'touch-action': 'none' }}
                  onPointerDown={handleResizeStart('e')}
                />
                <div
                  class={getResizeHandleClass('w')}
                  data-floe-floating-window-resize-handle="w"
                  style={{ 'touch-action': 'none' }}
                  onPointerDown={handleResizeStart('w')}
                />
                <div
                  class={getResizeHandleClass('ne')}
                  data-floe-floating-window-resize-handle="ne"
                  style={{ 'touch-action': 'none' }}
                  onPointerDown={handleResizeStart('ne')}
                />
                <div
                  class={getResizeHandleClass('nw')}
                  data-floe-floating-window-resize-handle="nw"
                  style={{ 'touch-action': 'none' }}
                  onPointerDown={handleResizeStart('nw')}
                />
                <div
                  class={getResizeHandleClass('se')}
                  data-floe-floating-window-resize-handle="se"
                  style={{ 'touch-action': 'none' }}
                  onPointerDown={handleResizeStart('se')}
                />
                <div
                  class={getResizeHandleClass('sw')}
                  data-floe-floating-window-resize-handle="sw"
                  style={{ 'touch-action': 'none' }}
                  onPointerDown={handleResizeStart('sw')}
                />
              </Show>
            </Show>
          </div>
        </div>
      </Portal>
    </Show>
    </>
  );
}
