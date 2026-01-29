import {
  Show,
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
import { lockBodyStyle } from '../../utils/bodyStyleLock';

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

// Resize handle directions
type ResizeHandle =
  | 'n'
  | 's'
  | 'e'
  | 'w'
  | 'ne'
  | 'nw'
  | 'se'
  | 'sw';

/**
 * Floating window component with drag, resize, maximize/restore functionality
 */
export function FloatingWindow(props: FloatingWindowProps) {
  const resizable = () => props.resizable ?? true;
  const draggable = () => props.draggable ?? true;
  const minSize = () => props.minSize ?? { width: 200, height: 150 };
  const maxSize = () => props.maxSize ?? { width: Infinity, height: Infinity };
  const zIndex = () => props.zIndex ?? 100;
  const baseId = createUniqueId();

  // Use LayoutContext.isMobile() to stay consistent with Shell + FloeConfig.layout.mobileQuery.
  const layout = useLayout();
  const isMobile = () => layout.isMobile();
  const MOBILE_PADDING = 16; // Padding on each side for mobile
  const titleId = () => `floating-window-${baseId}-title`;

  // Window state
  const [position, setPosition] = createSignal(
    props.defaultPosition ?? { x: 0, y: 0 }
  );
  const [size, setSize] = createSignal(
    props.defaultSize ?? { width: 400, height: 300 }
  );
  const [isMaximized, setIsMaximized] = createSignal(false);
  const [isDragging, setIsDragging] = createSignal(false);
  const [isResizing, setIsResizing] = createSignal(false);

  // Store state before maximize (for restore)
  const [preMaximizeState, setPreMaximizeState] = createSignal<{
    position: { x: number; y: number };
    size: { width: number; height: number };
  } | null>(null);

  // Drag state
  let dragStartPos = { x: 0, y: 0 };
  let dragStartWindowPos = { x: 0, y: 0 };

  // Resize state
  let resizeStartPos = { x: 0, y: 0 };
  let resizeStartSize = { width: 0, height: 0 };
  let resizeStartWindowPos = { x: 0, y: 0 };
  let resizeHandle: ResizeHandle = 'se';

  // Pointer interaction state (drag/resize) - RAF throttled to avoid main thread jank.
  let windowRef: HTMLDivElement | undefined;
  let activePointerId: number | null = null;
  let mode: 'drag' | 'resize' | null = null;
  let lastPointerPos = { x: 0, y: 0 };
  let rafId: number | null = null;
  let unlockBody: (() => void) | null = null;

  const RESIZE_CURSORS: Record<ResizeHandle, string> = {
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
      unlockBody?.();
      unlockBody = null;
      return;
    }

    unlockBody?.();
    unlockBody = lockBodyStyle({ cursor, 'user-select': 'none' });
  };

  const stopInteraction = (pointerId?: number) => {
    if (rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (pointerId !== undefined) {
      try {
        windowRef?.releasePointerCapture(pointerId);
      } catch {
        // Ignore (e.g. already released).
      }
    }
    activePointerId = null;
    mode = null;
    setIsDragging(false);
    setIsResizing(false);
    setGlobalInteractionStyles(false, '');
  };

  const recenterIfNeeded = () => {
    if (typeof window === 'undefined') return;
    if (props.defaultPosition) return;
    if (isMaximized()) return;

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const mobile = isMobile();

    // Avoid tracking `size()` so this helper can be called from reactive effects safely.
    const currentSize = untrack(() => size());

    if (mobile) {
      // On mobile: full width with padding, centered vertically
      const mobileWidth = windowWidth - MOBILE_PADDING * 2;
      const nextWidth = Math.max(minSize().width, Math.min(mobileWidth, maxSize().width));
      const nextHeight = Math.max(minSize().height, Math.min(currentSize.height, maxSize().height));
      setSize({ width: nextWidth, height: nextHeight });
      setPosition({
        x: MOBILE_PADDING,
        y: Math.max(0, (windowHeight - nextHeight) / 2),
      });
      return;
    }

    // Desktop: keep current size, center it.
    const nextWidth = Math.max(minSize().width, Math.min(currentSize.width, maxSize().width));
    const nextHeight = Math.max(minSize().height, Math.min(currentSize.height, maxSize().height));
    setSize({ width: nextWidth, height: nextHeight });
    setPosition({
      x: Math.max(0, (windowWidth - nextWidth) / 2),
      y: Math.max(0, (windowHeight - nextHeight) / 2),
    });
  };

  // Initialize the window position (centered)
  onMount(() => {
    recenterIfNeeded();

    const handleResize = () => recenterIfNeeded();
    window.addEventListener('resize', handleResize);
    onCleanup(() => window.removeEventListener('resize', handleResize));
  });

  // Recenter when switching between mobile/desktop modes (e.g., responsive breakpoint changes).
  createEffect(() => {
    if (!props.open) return;
    // Track only the mobile flag; recenterIfNeeded() reads size untracked.
    void isMobile();
    if (typeof requestAnimationFrame === 'undefined') {
      recenterIfNeeded();
      return;
    }
    requestAnimationFrame(() => recenterIfNeeded());
  });

  // Close on Escape
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

  // If the window is closed mid-interaction, ensure we always clean up styles/state.
  createEffect(() => {
    if (!props.open) {
      stopInteraction(activePointerId ?? undefined);
    }
  });

  // Drag handling
  const handleDragStart = (e: PointerEvent) => {
    if (!draggable() || isMaximized()) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const target = e.target as HTMLElement | null;
    // Don't start dragging from interactive elements inside the title bar.
    if (target?.closest('button, input, select, textarea, a, [role="button"]')) return;

    e.preventDefault();

    activePointerId = e.pointerId;
    mode = 'drag';
    setIsDragging(true);
    dragStartPos = { x: e.clientX, y: e.clientY };
    dragStartWindowPos = { ...position() };
    lastPointerPos = { x: e.clientX, y: e.clientY };
    setGlobalInteractionStyles(true, 'grabbing');
    windowRef?.setPointerCapture(e.pointerId);
  };

  // Resize handling
  // eslint-disable-next-line solid/reactivity -- This returns an event handler
  const handleResizeStart = (handle: ResizeHandle) => (e: PointerEvent) => {
    if (!resizable() || isMaximized()) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    activePointerId = e.pointerId;
    mode = 'resize';
    setIsResizing(true);
    resizeHandle = handle;
    resizeStartPos = { x: e.clientX, y: e.clientY };
    resizeStartSize = { ...size() };
    resizeStartWindowPos = { ...position() };
    lastPointerPos = { x: e.clientX, y: e.clientY };
    setGlobalInteractionStyles(true, RESIZE_CURSORS[handle]);
    windowRef?.setPointerCapture(e.pointerId);
  };

  const flushPointerMove = () => {
    rafId = null;
    if (!props.open) return;
    if (activePointerId === null || mode === null) return;

    const deltaX = lastPointerPos.x - (mode === 'drag' ? dragStartPos.x : resizeStartPos.x);
    const deltaY = lastPointerPos.y - (mode === 'drag' ? dragStartPos.y : resizeStartPos.y);

    if (mode === 'drag') {
      const nextSize = size();
      const mobile = isMobile();
      // On mobile, keep x fixed at MOBILE_PADDING
      const newX = mobile
        ? MOBILE_PADDING
        : Math.max(0, Math.min(window.innerWidth - nextSize.width, dragStartWindowPos.x + deltaX));
      const newY = Math.max(
        0,
        Math.min(window.innerHeight - nextSize.height, dragStartWindowPos.y + deltaY)
      );
      setPosition({ x: newX, y: newY });
      return;
    }

    // mode === 'resize'
    let newWidth = resizeStartSize.width;
    let newHeight = resizeStartSize.height;
    let newX = resizeStartWindowPos.x;
    let newY = resizeStartWindowPos.y;

    // On mobile, skip horizontal resize (width is fixed)
    const mobile = isMobile();

    // Compute new size/position based on the handle direction.
    if (!mobile && resizeHandle.includes('e')) {
      newWidth = Math.max(minSize().width, Math.min(maxSize().width, resizeStartSize.width + deltaX));
    }
    if (!mobile && resizeHandle.includes('w')) {
      const possibleWidth = resizeStartSize.width - deltaX;
      if (possibleWidth >= minSize().width && possibleWidth <= maxSize().width) {
        newWidth = possibleWidth;
        newX = resizeStartWindowPos.x + deltaX;
      }
    }
    if (resizeHandle.includes('s')) {
      newHeight = Math.max(
        minSize().height,
        Math.min(maxSize().height, resizeStartSize.height + deltaY)
      );
    }
    if (resizeHandle.includes('n')) {
      const possibleHeight = resizeStartSize.height - deltaY;
      if (possibleHeight >= minSize().height && possibleHeight <= maxSize().height) {
        newHeight = possibleHeight;
        newY = resizeStartWindowPos.y + deltaY;
      }
    }

    // Ensure the window stays within the viewport.
    newX = Math.max(0, Math.min(window.innerWidth - newWidth, newX));
    newY = Math.max(0, Math.min(window.innerHeight - newHeight, newY));

    setSize({ width: newWidth, height: newHeight });
    setPosition({ x: newX, y: newY });
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
    stopInteraction(e.pointerId);
  };

  // Maximize / restore
  const toggleMaximize = () => {
    if (isMaximized()) {
      // Restore
      const prevState = preMaximizeState();
      if (prevState) {
        setPosition(prevState.position);
        setSize(prevState.size);
      }
      setIsMaximized(false);
    } else {
      // Maximize
      setPreMaximizeState({
        position: position(),
        size: size(),
      });
      setPosition({ x: 0, y: 0 });
      setSize({ width: window.innerWidth, height: window.innerHeight });
      setIsMaximized(true);
    }
  };

  // Double-click title bar to maximize/restore
  const handleTitleBarDoubleClick = () => {
    toggleMaximize();
  };

  // Build resize handle className for a given direction
  const getResizeHandleClass = (handle: ResizeHandle) => {
    const baseClass = 'absolute z-10';
    const cursorMap: Record<ResizeHandle, string> = {
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
        {/* Window container */}
        <div
          ref={windowRef}
          class={cn(
            'fixed bg-card text-card-foreground rounded-md shadow-xl',
            'border border-border',
            'flex flex-col',
            'animate-in fade-in zoom-in-95',
            isMaximized() && 'rounded-none',
            (isDragging() || isResizing()) && 'select-none',
            props.class
          )}
          style={{
            left: `${position().x}px`,
            top: `${position().y}px`,
            width: `${size().width}px`,
            height: `${size().height}px`,
            'z-index': zIndex(),
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUpOrCancel}
          onPointerCancel={handlePointerUpOrCancel}
          role="dialog"
          aria-modal="true"
          aria-labelledby={props.title ? titleId() : undefined}
        >
          {/* Title bar */}
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
            {/* Title */}
            <div class="flex-1 min-w-0">
              <Show when={props.title}>
                <h2
                  id={titleId()}
                  class="text-sm font-medium truncate select-none"
                >
                  {props.title}
                </h2>
              </Show>
            </div>

            {/* Window controls */}
            <div class="flex items-center gap-0.5 -mr-1">
              {/* Maximize/Restore button */}
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

              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                class="h-6 w-6 hover:bg-error hover:text-error-foreground"
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

          {/* Content */}
          <div class="flex-1 overflow-auto p-3">{props.children}</div>

          {/* Footer */}
          <Show when={props.footer}>
            <div class="flex items-center justify-end gap-2 p-3 border-t border-border">
              {props.footer}
            </div>
          </Show>

          {/* Resize handles */}
          <Show when={resizable() && !isMaximized()}>
            {/* Vertical edge handles (always visible) */}
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

            {/* Horizontal edge handles (hidden on mobile) */}
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

              {/* Corner handles (hidden on mobile) */}
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
      </Portal>
    </Show>
  );
}
