import { type Component, createSignal, createEffect, onCleanup, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { cn } from '../../../utils/cn';
import { renderMermaid } from '../hooks/useMermaid';
import { lockBodyStyle } from '../../../utils/bodyStyleLock';
import { deferNonBlocking } from '../../../utils/defer';

export interface MermaidBlockProps {
  content: string;
  class?: string;
}

export const MermaidBlock: Component<MermaidBlockProps> = (props) => {
  const [svg, setSvg] = createSignal<string | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [isLoading, setIsLoading] = createSignal(true);
  const [isOpen, setIsOpen] = createSignal(false);
  const [scale, setScale] = createSignal(1);
  const [position, setPosition] = createSignal({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = createSignal(false);

  let renderRunId = 0;
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

  createEffect(() => {
    const currentRun = ++renderRunId;
    const content = props.content;
    if (!content) {
      setSvg(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // UI-first: let the loading state paint first, then render Mermaid (fallback path may be main-thread heavy).
    deferNonBlocking(() => {
      renderMermaid(content)
        .then((result) => {
          if (currentRun !== renderRunId) return;
          setSvg(result);
          setIsLoading(false);
        })
        .catch((err) => {
          if (currentRun !== renderRunId) return;
          setError(err.message || 'Failed to render diagram');
          setIsLoading(false);
        });
    });
  });

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
      <div class={cn('chat-mermaid-block', props.class)}>
        {isLoading() && (
          <div class="chat-mermaid-loading">
            <LoadingSpinner />
            <span>Rendering diagram...</span>
          </div>
        )}

        {error() && (
          <div class="chat-mermaid-error">
            <ErrorIcon />
            <span>{error()}</span>
          </div>
        )}

        {svg() && !error() && (
          <div
            class="chat-mermaid-content chat-mermaid-clickable"
            // eslint-disable-next-line solid/no-innerhtml -- Mermaid SVG output is trusted
            innerHTML={svg()!}
            onClick={openDialog}
          />
        )}
      </div>

      {/* Diagram Preview Dialog */}
      <Show when={isOpen() && svg()}>
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

            {/* Diagram Container */}
            <div
              class="chat-image-dialog-content"
              style={{ 'touch-action': 'none' }}
              onWheel={handleWheel}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUpOrCancel}
              onPointerCancel={handlePointerUpOrCancel}
            >
              <div
                class="chat-mermaid-dialog-svg"
                style={{
                  transform: `translate(${position().x}px, ${position().y}px) scale(${scale()})`,
                  cursor: scale() > 1 ? (isDragging() ? 'grabbing' : 'grab') : 'default',
                }}
                // eslint-disable-next-line solid/no-innerhtml -- Mermaid SVG output is trusted
                innerHTML={svg()!}
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

const LoadingSpinner: Component = () => (
  <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const ErrorIcon: Component = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
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
