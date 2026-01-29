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
  const [dragStart, setDragStart] = createSignal({ x: 0, y: 0 });

  let panRafId: number | null = null;
  let pendingPan = { x: 0, y: 0 };

  const MIN_SCALE = 0.5;
  const MAX_SCALE = 5;
  const SCALE_STEP = 0.25;

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
    setScale((s) => Math.min(s + SCALE_STEP, MAX_SCALE));
  };

  const zoomOut = () => {
    setScale((s) => Math.max(s - SCALE_STEP, MIN_SCALE));
  };

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      zoomIn();
    } else {
      zoomOut();
    }
  };

  const handleMouseDown = (e: MouseEvent) => {
    if (scale() > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position().x, y: e.clientY - position().y });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging()) return;

    pendingPan = {
      x: e.clientX - dragStart().x,
      y: e.clientY - dragStart().y,
    };

    if (panRafId !== null) return;
    if (typeof requestAnimationFrame === 'undefined') {
      setPosition(pendingPan);
      return;
    }
    panRafId = requestAnimationFrame(() => {
      panRafId = null;
      if (!isDragging()) return;
      setPosition(pendingPan);
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  onCleanup(() => {
    if (panRafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(panRafId);
      panRafId = null;
    }
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
          <div
            class="chat-image-dialog"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
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
            <div class="chat-image-dialog-content">
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
              Scroll to zoom · Drag to pan · Press Esc to close
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
