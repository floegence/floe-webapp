import { createSignal, onCleanup } from 'solid-js';
import { cn } from '../../utils/cn';
import { lockBodyStyle } from '../../utils/bodyStyleLock';

export interface ResizeHandleProps {
  direction: 'horizontal' | 'vertical';
  onResize: (delta: number) => void;
  class?: string;
}

/**
 * Draggable resize handle for panels
 */
export function ResizeHandle(props: ResizeHandleProps) {
  const [isDragging, setIsDragging] = createSignal(false);
  let startPos = 0;
  let lastPos = 0;
  let activePointerId: number | null = null;
  let handleRef: HTMLDivElement | undefined;
  let rafId: number | null = null;
  let unlockBody: (() => void) | null = null;

  const setGlobalDraggingStyles = (dragging: boolean) => {
    if (!dragging) {
      unlockBody?.();
      unlockBody = null;
      return;
    }

    unlockBody?.();
    unlockBody = lockBodyStyle({
      cursor: props.direction === 'horizontal' ? 'col-resize' : 'row-resize',
      'user-select': 'none',
    });
  };

  const stopDragging = () => {
    if (!isDragging()) return;
    if (rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    const delta = lastPos - startPos;
    if (delta !== 0) {
      props.onResize(delta);
      startPos = lastPos;
    }

    setIsDragging(false);
    activePointerId = null;
    setGlobalDraggingStyles(false);
  };

  const getPos = (e: PointerEvent) => (props.direction === 'horizontal' ? e.clientX : e.clientY);

  const handlePointerDown = (e: PointerEvent) => {
    // Only start a mouse drag with the primary button.
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();

    activePointerId = e.pointerId;
    setIsDragging(true);
    startPos = getPos(e);
    lastPos = startPos;
    setGlobalDraggingStyles(true);

    handleRef?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDragging() || activePointerId !== e.pointerId) return;

    lastPos = getPos(e);
    if (rafId !== null) return;
    if (typeof requestAnimationFrame === 'undefined') {
      const delta = lastPos - startPos;
      if (delta !== 0) {
        props.onResize(delta);
        startPos = lastPos;
      }
      return;
    }

    rafId = requestAnimationFrame(() => {
      rafId = null;
      if (!isDragging()) return;

      const delta = lastPos - startPos;
      if (delta !== 0) {
        props.onResize(delta);
        startPos = lastPos;
      }
    });
  };

  const handlePointerUpOrCancel = (e: PointerEvent) => {
    if (activePointerId !== e.pointerId) return;
    try {
      handleRef?.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore release errors (e.g. already released).
    }
    stopDragging();
  };

  onCleanup(() => stopDragging());

  const isHorizontal = () => props.direction === 'horizontal';

  return (
    <div
      ref={handleRef}
      class={cn(
        'absolute z-20 group',
        isHorizontal()
          ? 'top-0 right-0 w-1 h-full cursor-col-resize hover:w-1.5'
          : 'left-0 top-0 h-1 w-full cursor-row-resize hover:h-1.5',
        'transition-all duration-100',
        isDragging() && 'bg-primary',
        !isDragging() && 'hover:bg-primary/50',
        props.class
      )}
      style={{ 'touch-action': 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUpOrCancel}
      onPointerCancel={handlePointerUpOrCancel}
      role="separator"
      aria-orientation={isHorizontal() ? 'vertical' : 'horizontal'}
    >
      {/* Subtle always-visible guide line for discoverability */}
      <div
        class={cn(
          'absolute pointer-events-none',
          isHorizontal()
            ? 'top-0 bottom-0 left-1/2 w-px -translate-x-1/2'
            : 'left-0 right-0 top-1/2 h-px -translate-y-1/2',
          isDragging() && 'bg-primary opacity-100',
          !isDragging() && 'bg-border/60 opacity-70 group-hover:bg-primary/50 group-hover:opacity-100'
        )}
      />

      {/* Visual indicator */}
      <div
        class={cn(
          'absolute opacity-0 group-hover:opacity-100 transition-opacity duration-150',
          isHorizontal()
            ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-8 rounded-full bg-muted-foreground/30'
            : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-0.5 w-8 rounded-full bg-muted-foreground/30'
        )}
      />
    </div>
  );
}
