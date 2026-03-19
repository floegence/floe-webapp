import {
  Show,
  batch,
  createUniqueId,
  type JSX,
  createSignal,
  createEffect,
  onCleanup,
  onMount,
} from 'solid-js';
import { Portal } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { useLayout } from '../../context/LayoutContext';
import { Button } from './Button';
import { X, Maximize, Restore } from '../icons';
import { startHotInteraction } from '../../utils/hotInteraction';
import {
  normalizeFloatingWindowRect,
  resolveFloatingWindowRect,
  type FloatingWindowRect,
  type FloatingWindowResizeHandle,
} from './floatingWindowGeometry';

export interface FloatingWindowProps {
  /** Whether the window is open */
  open: boolean;
  /** Callback when window open state changes */
  onOpenChange: (open: boolean) => void;
  /** Window title */
  title?: string;
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
  const [preMaximizeState, setPreMaximizeState] = createSignal<{
    position: { x: number; y: number };
    size: { width: number; height: number };
  } | null>(null);

  let dragStartPos = { x: 0, y: 0 };
  let dragStartRect: FloatingWindowRect = { x: 0, y: 0, width: 0, height: 0 };
  let resizeStartPos = { x: 0, y: 0 };
  let resizeStartRect: FloatingWindowRect = { x: 0, y: 0, width: 0, height: 0 };
  let resizeHandle: FloatingWindowResizeHandle = 'se';

  let windowRef: HTMLDivElement | undefined;
  let activePointerId: number | null = null;
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
    setPosition({ x: rect.x, y: rect.y });
    setSize({ width: rect.width, height: rect.height });
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
      mobile: isMobile(),
      mobilePadding: MOBILE_PADDING,
    }));
  };

  const syncRectToViewport = (options?: { center?: boolean }) => {
    if (typeof window === 'undefined') return;

    const viewport = { width: window.innerWidth, height: window.innerHeight };
    if (isMaximized()) {
      setCommittedRect({
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height,
      });
      return;
    }

    setCommittedRect(normalizeFloatingWindowRect({
      rect: readCommittedRect(),
      minSize: minSize(),
      maxSize: maxSize(),
      viewport,
      mobile: isMobile(),
      mobilePadding: MOBILE_PADDING,
      center: options?.center ?? false,
    }));
  };

  const stopInteraction = (pointerId?: number, commit = true) => {
    if (rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (commit) {
      applyLatestPointerRect();
    }
    const committedRect = commit ? (readLiveRectFromDom() ?? liveRect) : null;
    if (pointerId !== undefined) {
      try {
        windowRef?.releasePointerCapture(pointerId);
      } catch {
        // Ignore (e.g. already released).
      }
    }

    batch(() => {
      if (committedRect) {
        setCommittedRect(committedRect);
      }
      activePointerId = null;
      mode = null;
      setIsDragging(false);
      setIsResizing(false);
    });
    setGlobalInteractionStyles(false, '');
  };

  onMount(() => {
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
    if (!props.open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        props.onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    onCleanup(() => document.removeEventListener('keydown', handleEscape));
  });

  createEffect(() => {
    if (!props.open) {
      stopInteraction(activePointerId ?? undefined, false);
    }
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
    if (!draggable() || isMaximized()) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const target = e.target as HTMLElement | null;
    if (target?.closest('button, input, select, textarea, a, [role="button"]')) return;

    e.preventDefault();

    activePointerId = e.pointerId;
    mode = 'drag';
    setIsDragging(true);
    dragStartPos = { x: e.clientX, y: e.clientY };
    dragStartRect = { ...liveRect };
    lastPointerPos = { x: e.clientX, y: e.clientY };
    setGlobalInteractionStyles(true, 'grabbing');
    windowRef?.setPointerCapture(e.pointerId);
  };

  // eslint-disable-next-line solid/reactivity -- This returns an event handler.
  const handleResizeStart = (handle: FloatingWindowResizeHandle) => (e: PointerEvent) => {
    if (!resizable() || isMaximized()) return;
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
    windowRef?.setPointerCapture(e.pointerId);
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

  const handlePointerUpOrCancel = (e: PointerEvent) => {
    if (activePointerId === null || e.pointerId !== activePointerId) return;
    lastPointerPos = { x: e.clientX, y: e.clientY };
    stopInteraction(e.pointerId);
  };

  const toggleMaximize = () => {
    if (activePointerId !== null) {
      stopInteraction(activePointerId, true);
    }

    if (isMaximized()) {
      const prevState = preMaximizeState();
      if (prevState) {
        setCommittedRect(normalizeFloatingWindowRect({
          rect: {
            x: prevState.position.x,
            y: prevState.position.y,
            width: prevState.size.width,
            height: prevState.size.height,
          },
          minSize: minSize(),
          maxSize: maxSize(),
          viewport: { width: window.innerWidth, height: window.innerHeight },
          mobile: isMobile(),
          mobilePadding: MOBILE_PADDING,
          center: false,
        }));
      }
      setIsMaximized(false);
      return;
    }

    const currentRect = readCommittedRect();
    setPreMaximizeState({
      position: { x: currentRect.x, y: currentRect.y },
      size: { width: currentRect.width, height: currentRect.height },
    });
    setCommittedRect({ x: 0, y: 0, width: window.innerWidth, height: window.innerHeight });
    setIsMaximized(true);
  };

  const handleTitleBarDoubleClick = () => {
    toggleMaximize();
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
    <Show when={props.open}>
      <Portal>
        <div
          ref={windowRef}
          data-floe-geometry-surface="floating-window"
          class={cn(
            'fixed left-0 top-0 z-[100] flex flex-col',
            (isDragging() || isResizing()) && 'select-none'
          )}
          style={{
            width: `${size().width}px`,
            height: `${size().height}px`,
            transform: `translate3d(${position().x}px, ${position().y}px, 0)`,
            'z-index': zIndex(),
            'will-change': isDragging() ? 'transform' : isResizing() ? 'transform, width, height' : undefined,
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUpOrCancel}
          onPointerCancel={handlePointerUpOrCancel}
          role="dialog"
          aria-modal="true"
          aria-labelledby={props.title ? titleId() : undefined}
        >
          <div
            class={cn(
              'relative flex h-full w-full flex-col overflow-hidden',
              'bg-card text-card-foreground rounded-md shadow-xl',
              'border border-border',
              'animate-in fade-in duration-150',
              isMaximized() && 'rounded-none',
              props.class
            )}
          >
            <div
              class={cn(
                'flex items-center justify-between h-9 px-3',
                'border-b border-border',
                'bg-muted/50',
                isMaximized() ? 'rounded-none' : 'rounded-t-md',
                draggable() && !isMaximized() && 'cursor-move'
              )}
              onPointerDown={handleDragStart}
              onDblClick={handleTitleBarDoubleClick}
              style={{ 'touch-action': 'none' }}
            >
              <div class="flex-1 min-w-0">
                <Show when={props.title}>
                  <h2 id={titleId()} class="text-sm font-medium truncate select-none">
                    {props.title}
                  </h2>
                </Show>
              </div>

              <div class="flex items-center gap-0.5 -mr-1">
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-6 w-6"
                  onClick={(e: MouseEvent) => {
                    e.stopPropagation();
                    toggleMaximize();
                  }}
                  aria-label={isMaximized() ? 'Restore' : 'Maximize'}
                >
                  <Show when={isMaximized()} fallback={<Maximize class="w-3 h-3" />}>
                    <Restore class="w-3 h-3" />
                  </Show>
                </Button>

                <Button
                  variant="ghost-destructive"
                  size="icon"
                  class="h-6 w-6"
                  onClick={(e: MouseEvent) => {
                    e.stopPropagation();
                    props.onOpenChange(false);
                  }}
                  aria-label="Close"
                >
                  <X class="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div class="flex-1 overflow-auto p-3">{props.children}</div>

            <Show when={props.footer}>
              <div class="flex items-center justify-end gap-2 p-3 border-t border-border">
                {props.footer}
              </div>
            </Show>

            <Show when={resizable() && !isMaximized()}>
              <div
                class={getResizeHandleClass('n')}
                style={{ 'touch-action': 'none' }}
                onPointerDown={handleResizeStart('n')}
              />
              <div
                class={getResizeHandleClass('s')}
                style={{ 'touch-action': 'none' }}
                onPointerDown={handleResizeStart('s')}
              />

              <Show when={!isMobile()}>
                <div
                  class={getResizeHandleClass('e')}
                  style={{ 'touch-action': 'none' }}
                  onPointerDown={handleResizeStart('e')}
                />
                <div
                  class={getResizeHandleClass('w')}
                  style={{ 'touch-action': 'none' }}
                  onPointerDown={handleResizeStart('w')}
                />
                <div
                  class={getResizeHandleClass('ne')}
                  style={{ 'touch-action': 'none' }}
                  onPointerDown={handleResizeStart('ne')}
                />
                <div
                  class={getResizeHandleClass('nw')}
                  style={{ 'touch-action': 'none' }}
                  onPointerDown={handleResizeStart('nw')}
                />
                <div
                  class={getResizeHandleClass('se')}
                  style={{ 'touch-action': 'none' }}
                  onPointerDown={handleResizeStart('se')}
                />
                <div
                  class={getResizeHandleClass('sw')}
                  style={{ 'touch-action': 'none' }}
                  onPointerDown={handleResizeStart('sw')}
                />
              </Show>
            </Show>
          </div>
        </div>
      </Portal>
    </Show>
  );
}
