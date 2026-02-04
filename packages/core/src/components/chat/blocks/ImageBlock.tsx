import { type Component, createSignal, Show, createEffect, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';
import { cn } from '../../../utils/cn';
import { lockBodyStyle } from '../../../utils/bodyStyleLock';

export interface ImageBlockProps {
  src: string;
  alt?: string;
  class?: string;
}

export const ImageBlock: Component<ImageBlockProps> = (props) => {
  const [isLoading, setIsLoading] = createSignal(true);
  const [hasError, setHasError] = createSignal(false);
  const [isOpen, setIsOpen] = createSignal(false);
  const [scale, setScale] = createSignal(1);
  const [position, setPosition] = createSignal({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = createSignal(false);

  let panRafId: number | null = null;
  let pendingPan = { x: 0, y: 0 };
  const pointers = new Map<number, { x: number; y: number }>();
  let panStart: { x: number; y: number } | null = null;
  let panOrigin: { x: number; y: number } | null = null;
  let pinchStartDistance = 0;
  let pinchStartScale = 1;

  const MIN_SCALE = 0.5;
  const MAX_SCALE = 5;
  const SCALE_STEP = 0.25;

  const clampScale = (next: number) => Math.max(MIN_SCALE, Math.min(next, MAX_SCALE));

  const setScaleClamped = (next: number) => {
    const clamped = clampScale(next);
    setScale(clamped);
    // When not zoomed-in, keep the content centered.
    if (clamped <= 1) {
      setPosition({ x: 0, y: 0 });
      setIsDragging(false);
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const openDialog = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsOpen(true);
  };

  const closeDialog = () => {
    setIsOpen(false);
  };

  const zoomIn = () => {
    setScaleClamped(scale() + SCALE_STEP);
  };

  const zoomOut = () => {
    setScaleClamped(scale() - SCALE_STEP);
  };

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsDragging(false);
  };

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      zoomIn();
    } else {
      zoomOut();
    }
  };

  const handlePointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();

    const target = e.currentTarget as HTMLElement;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      // Ignore (e.g. not supported).
    }

    if (pointers.size === 1) {
      panStart = { x: e.clientX, y: e.clientY };
      panOrigin = { ...position() };
      setIsDragging(scale() > 1);
      return;
    }

    if (pointers.size === 2) {
      const [a, b] = Array.from(pointers.values());
      pinchStartDistance = Math.hypot(a.x - b.x, a.y - b.y);
      pinchStartScale = scale();
      panStart = null;
      panOrigin = null;
      setIsDragging(false);
    }
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2) {
      const [a, b] = Array.from(pointers.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchStartDistance > 0) {
        setScaleClamped(pinchStartScale * (dist / pinchStartDistance));
      }
      return;
    }

    if (pointers.size !== 1 || scale() <= 1) return;
    setIsDragging(true);

    if (!panStart || !panOrigin) {
      panStart = { x: e.clientX, y: e.clientY };
      panOrigin = { ...position() };
    }

    pendingPan = {
      x: panOrigin.x + (e.clientX - panStart.x),
      y: panOrigin.y + (e.clientY - panStart.y),
    };

    if (panRafId !== null) return;
    if (typeof requestAnimationFrame === 'undefined') {
      setPosition(pendingPan);
      return;
    }
    panRafId = requestAnimationFrame(() => {
      panRafId = null;
      if (pointers.size !== 1 || scale() <= 1) return;
      setPosition(pendingPan);
    });
  };

  const handlePointerUpOrCancel = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore.
    }

    if (pointers.size === 0) {
      setIsDragging(false);
      panStart = null;
      panOrigin = null;
      pinchStartDistance = 0;
      pinchStartScale = scale();
      return;
    }

    if (pointers.size === 1) {
      const remaining = Array.from(pointers.values())[0]!;
      panStart = { x: remaining.x, y: remaining.y };
      panOrigin = { ...position() };
      setIsDragging(scale() > 1);
      pinchStartDistance = 0;
      pinchStartScale = scale();
      return;
    }

    if (pointers.size === 2) {
      const [a, b] = Array.from(pointers.values());
      pinchStartDistance = Math.hypot(a.x - b.x, a.y - b.y);
      pinchStartScale = scale();
      panStart = null;
      panOrigin = null;
      setIsDragging(false);
    }
  };

  onCleanup(() => {
    if (panRafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(panRafId);
      panRafId = null;
    }
    pointers.clear();
  });

  // Handle keyboard shortcuts
  createEffect(() => {
    if (!isOpen()) return;

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDialog();
      } else if (e.key === '+' || e.key === '=') {
        zoomIn();
      } else if (e.key === '-') {
        zoomOut();
      } else if (e.key === '0') {
        resetZoom();
      }
    };

    document.addEventListener('keydown', handleKeydown);
    onCleanup(() => document.removeEventListener('keydown', handleKeydown));
  });

  // Lock body scroll when open
  createEffect(() => {
    if (!isOpen()) return;
    const unlock = lockBodyStyle({ overflow: 'hidden' });
    onCleanup(unlock);
  });

  return (
    <>
      <div class={cn('chat-image-block', props.class)}>
        <Show when={isLoading()}>
          <div class="chat-image-loading">
            <LoadingSpinner />
          </div>
        </Show>

        <Show when={hasError()}>
          <div class="chat-image-error">
            <ImageErrorIcon />
            <span>Failed to load image</span>
          </div>
        </Show>

        <Show when={!hasError()}>
          <img
            src={props.src}
            alt={props.alt || 'Image'}
            class={cn('chat-image', isLoading() && 'invisible')}
            loading="lazy"
            onLoad={handleLoad}
            onError={handleError}
            onClick={openDialog}
          />
        </Show>
      </div>

      {/* Image Preview Dialog */}
      <Show when={isOpen()}>
        <Portal>
          {/* Backdrop */}
          <div
            class="chat-image-dialog-backdrop"
            onClick={closeDialog}
          />

          {/* Dialog Content */}
          <div class="chat-image-dialog">
            {/* Toolbar */}
            <div class="chat-image-dialog-toolbar">
              <button
                type="button"
                class="chat-image-dialog-btn"
                onClick={zoomOut}
                title="Zoom out (-)"
              >
                <ZoomOutIcon />
              </button>
              <span class="chat-image-dialog-scale">{Math.round(scale() * 100)}%</span>
              <button
                type="button"
                class="chat-image-dialog-btn"
                onClick={zoomIn}
                title="Zoom in (+)"
              >
                <ZoomInIcon />
              </button>
              <button
                type="button"
                class="chat-image-dialog-btn"
                onClick={resetZoom}
                title="Reset (0)"
              >
                <ResetIcon />
              </button>
              <div class="chat-image-dialog-separator" />
              <button
                type="button"
                class="chat-image-dialog-btn"
                onClick={closeDialog}
                title="Close (Esc)"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Image Container */}
            <div
              class="chat-image-dialog-content"
              style={{ 'touch-action': 'none' }}
              onWheel={handleWheel}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUpOrCancel}
              onPointerCancel={handlePointerUpOrCancel}
            >
              <img
                src={props.src}
                alt={props.alt || 'Image'}
                class="chat-image-dialog-img"
                style={{
                  transform: `translate(${position().x}px, ${position().y}px) scale(${scale()})`,
                  cursor: scale() > 1 ? (isDragging() ? 'grabbing' : 'grab') : 'default',
                }}
                draggable={false}
              />
            </div>

            {/* Hint */}
            <div class="chat-image-dialog-hint">
              Scroll/pinch to zoom · Drag to pan · Press Esc to close
            </div>
          </div>
        </Portal>
      </Show>
    </>
  );
};

// Icon components
const LoadingSpinner: Component = () => (
  <svg
    class="animate-spin h-6 w-6 text-muted-foreground"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      class="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      stroke-width="4"
    />
    <path
      class="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

const ImageErrorIcon: Component = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);

const CloseIcon: Component = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ZoomInIcon: Component = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="11" y1="8" x2="11" y2="14" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

const ZoomOutIcon: Component = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

const ResetIcon: Component = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);
