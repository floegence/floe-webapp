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
  const [dragStart, setDragStart] = createSignal({ x: 0, y: 0 });

  let renderRunId = 0;
  let panRafId: number | null = null;
  let pendingPan = { x: 0, y: 0 };

  const MIN_SCALE = 0.5;
  const MAX_SCALE = 5;
  const SCALE_STEP = 0.25;

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

            {/* Diagram Container */}
            <div class="chat-image-dialog-content">
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
              Scroll to zoom · Drag to pan · Press Esc to close
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
