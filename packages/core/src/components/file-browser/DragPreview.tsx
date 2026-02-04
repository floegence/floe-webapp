import { Show, For, createMemo, createSignal, createEffect, onCleanup } from 'solid-js';
import { Portal, Dynamic } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { useFileBrowserDrag } from '../../context/FileBrowserDragContext';
import { FolderIcon, getFileIcon } from './FileIcons';
import type { FileItem } from './types';

/**
 * Maximum number of items to show in the drag preview
 */
const MAX_PREVIEW_ITEMS = 3;

/**
 * Offset from cursor position
 */
const CURSOR_OFFSET_X = 16;
const CURSOR_OFFSET_Y = 16;

/**
 * Duration of the drag end animation in milliseconds
 */
const DRAG_END_ANIMATION_DURATION_MS = 200;

/**
 * Frozen state captured when drag ends, before Context resets
 */
interface FrozenDragState {
  items: FileItem[];
  position: { x: number; y: number };
  target: { x: number; y: number } | null;
  committed: boolean;
}

/**
 * Floating preview that follows the cursor during drag operations.
 * Shows dragged items with a count badge for multiple items.
 * Uses CSS transform for GPU-accelerated smooth positioning.
 * Includes fly-to-target animation when dropping onto a valid target.
 *
 * IMPORTANT: This component manages its own visibility independently from
 * Context state. The Context resets after 200ms, but we freeze all needed
 * data and control our own animation timeline to ensure smooth exit animation.
 */
export function DragPreview() {
  const dragContext = useFileBrowserDrag();

  const dragState = () => dragContext?.dragState();
  const isDragging = () => dragState()?.isDragging ?? false;
  const isDragEnding = () => dragState()?.isDragEnding ?? false;

  // Component's own visibility state - independent from Context
  const [isVisible, setIsVisible] = createSignal(false);

  // Animation phase: 'idle' | 'prepare' | 'animate'
  const [animationPhase, setAnimationPhase] = createSignal<'idle' | 'prepare' | 'animate'>('idle');

  // Frozen state captured when drag ends (preserved even after Context resets)
  const [frozenState, setFrozenState] = createSignal<FrozenDragState | null>(null);

  // Track previous isDragEnding to detect the moment it becomes true
  let prevIsDragEnding = false;

  createEffect(() => {
    const dragging = isDragging();
    const ending = isDragEnding();

    // Drag started
    if (dragging && !ending && !prevIsDragEnding) {
      setIsVisible(true);
      setAnimationPhase('idle');
      setFrozenState(null);
    }

    // Drag ending just started (transition from not-ending to ending)
    if (ending && !prevIsDragEnding) {
      const state = dragState();
      if (state && state.draggedItems.length > 0) {
        // Freeze all state NOW before Context resets it
        const pos = state.pointerPosition;
        setFrozenState({
          items: state.draggedItems.map((d) => d.item),
          position: { x: pos.x + CURSOR_OFFSET_X, y: pos.y + CURSOR_OFFSET_Y },
          target: state.endAnimationTarget,
          committed: state.isDropCommitted,
        });

        // Phase 1: prepare - add transition, stay at current position
        setAnimationPhase('prepare');

        // Phase 2: animate - next frame, move to target
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setAnimationPhase('animate');

            // Phase 3: complete - hide component after animation
            setTimeout(() => {
              setIsVisible(false);
              setAnimationPhase('idle');
              setFrozenState(null);
            }, DRAG_END_ANIMATION_DURATION_MS);
          });
        });
      }
    }

    // Drag cancelled (not ending, not dragging, no animation running)
    if (!dragging && !ending && animationPhase() === 'idle') {
      setIsVisible(false);
      setFrozenState(null);
    }

    prevIsDragEnding = ending;
  });

  // Cleanup on unmount
  onCleanup(() => {
    setIsVisible(false);
    setAnimationPhase('idle');
    setFrozenState(null);
  });

  // Display items: use frozen state during animation, live state during drag
  const displayItems = createMemo(() => {
    const frozen = frozenState();
    if (frozen) {
      return frozen.items.slice(0, MAX_PREVIEW_ITEMS);
    }
    const items = dragState()?.draggedItems ?? [];
    return items.slice(0, MAX_PREVIEW_ITEMS).map((d) => d.item);
  });

  const totalItemCount = createMemo(() => {
    const frozen = frozenState();
    if (frozen) {
      return frozen.items.length;
    }
    return dragState()?.draggedItems?.length ?? 0;
  });

  const remainingCount = createMemo(() => {
    const total = totalItemCount();
    return total > MAX_PREVIEW_ITEMS ? total - MAX_PREVIEW_ITEMS : 0;
  });

  // Transform position calculation
  const transformPosition = createMemo(() => {
    const frozen = frozenState();
    const phase = animationPhase();

    // During animation, use frozen state
    if (frozen) {
      if (phase === 'animate' && frozen.committed && frozen.target) {
        // Fly to target
        return frozen.target;
      }
      // Stay at frozen position (prepare phase or non-committed)
      return frozen.position;
    }

    // Normal dragging: follow pointer
    const state = dragState();
    const pos = state?.pointerPosition ?? { x: 0, y: 0 };
    return { x: pos.x + CURSOR_OFFSET_X, y: pos.y + CURSOR_OFFSET_Y };
  });

  // Visual state helpers
  const isCommitted = createMemo(() => frozenState()?.committed ?? false);
  const isValidDrop = () => dragState()?.isValidDrop ?? false;
  const hasDropTarget = () => !!dragState()?.dropTarget;
  const showDropIndicator = () => hasDropTarget() && !frozenState();

  const getIcon = (item: FileItem) =>
    item.type === 'folder' ? FolderIcon : getFileIcon(item.extension);

  return (
    <Show when={isVisible() && displayItems().length > 0}>
      <Portal>
        <div
          class={cn(
            'fixed top-0 left-0 pointer-events-none z-[9999]',
            'will-change-transform'
          )}
          style={{
            transform: `translate3d(${transformPosition().x}px, ${transformPosition().y}px, 0)`,
            // Enable transition only during animation phases
            transition:
              animationPhase() !== 'idle'
                ? `all ${DRAG_END_ANIMATION_DURATION_MS}ms ease-out`
                : 'none',
            // Apply exit styles in animate phase
            opacity: animationPhase() === 'animate' ? 0 : 1,
            scale: animationPhase() === 'animate' ? 0.75 : 1,
          }}
        >
          {/* Preview card */}
          <div
            class={cn(
              'flex flex-col gap-1 p-2.5 rounded-lg',
              'bg-card border border-border',
              'shadow-md',
              'min-w-[150px] max-w-[220px]',
              // Entrance animation (only when not animating exit)
              !frozenState() && 'animate-in fade-in zoom-in-95 duration-150',
              // Border transitions
              'transition-[border-color,box-shadow] duration-150',
              showDropIndicator() && isValidDrop() && 'border-success/60',
              showDropIndicator() && !isValidDrop() && 'border-error/60',
              // Committed state
              frozenState() && isCommitted() && 'border-success/60'
            )}
          >
            {/* Item list */}
            <For each={displayItems()}>
              {(item) => (
                <div class="flex items-center gap-2.5 text-xs text-foreground">
                  <span class="flex-shrink-0 w-4 h-4">
                    <Dynamic component={getIcon(item)} class="w-4 h-4" />
                  </span>
                  <span class="truncate font-medium">{item.name}</span>
                </div>
              )}
            </For>

            {/* "and X more" indicator */}
            <Show when={remainingCount() > 0}>
              <div class="text-[10px] text-muted-foreground pl-6">
                and {remainingCount()} more...
              </div>
            </Show>

            {/* Drop status indicator */}
            <Show when={showDropIndicator()}>
              <div
                class={cn(
                  'flex items-center gap-1.5 pt-1.5 mt-1 border-t border-border text-[11px] font-medium',
                  'transition-colors duration-150',
                  isValidDrop() ? 'text-success' : 'text-error'
                )}
              >
                <Show
                  when={isValidDrop()}
                  fallback={
                    <>
                      <InvalidDropIcon class="w-3.5 h-3.5" />
                      <span>Cannot drop here</span>
                    </>
                  }
                >
                  <ValidDropIcon class="w-3.5 h-3.5" />
                  <span>Drop to move</span>
                </Show>
              </div>
            </Show>
          </div>

          {/* Item count badge */}
          <Show when={totalItemCount() > 1}>
            <div
              class={cn(
                'absolute -top-2 -right-2',
                'min-w-[20px] h-5 px-1.5 rounded-full',
                'bg-foreground text-background',
                'flex items-center justify-center',
                'text-[10px] font-semibold',
                'shadow-sm',
                // Entrance animation (only when not animating exit)
                !frozenState() && 'animate-in zoom-in-50 duration-200'
              )}
            >
              {totalItemCount()}
            </div>
          </Show>
        </div>
      </Portal>
    </Show>
  );
}

// Checkmark icon for valid drop
function ValidDropIcon(props: { class?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={props.class}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// X icon for invalid drop
function InvalidDropIcon(props: { class?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={props.class}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
