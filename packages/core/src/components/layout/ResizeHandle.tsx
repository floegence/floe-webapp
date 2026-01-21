import { createSignal, onCleanup } from 'solid-js';
import { cn } from '../../utils/cn';

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
  let activePointerId: number | null = null;
  let handleRef: HTMLDivElement | undefined;

  const setGlobalDraggingStyles = (dragging: boolean) => {
    if (typeof document === 'undefined') return;
    document.body.style.cursor = dragging
      ? props.direction === 'horizontal'
        ? 'col-resize'
        : 'row-resize'
      : '';
    document.body.style.userSelect = dragging ? 'none' : '';
  };

  const stopDragging = () => {
    if (!isDragging()) return;
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
    setGlobalDraggingStyles(true);

    handleRef?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDragging() || activePointerId !== e.pointerId) return;

    const currentPos = getPos(e);
    const delta = currentPos - startPos;
    if (delta !== 0) {
      props.onResize(delta);
      startPos = currentPos;
    }
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
