import { Show, For, createMemo, createSignal, createEffect } from 'solid-js';
import { Portal, Dynamic } from 'solid-js/web';
import { Motion, Presence } from 'solid-motionone';
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
const CURSOR_OFFSET_X = 4;
const CURSOR_OFFSET_Y = 4;

/**
 * Duration of the drag end animation in seconds
 */
const DRAG_END_ANIMATION_DURATION = 0.2;

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
 * Uses Motion library for smooth animations.
 * Includes fly-to-target animation when dropping onto a valid target.
 */
export function DragPreview() {
  const dragContext = useFileBrowserDrag();

  const dragState = () => dragContext?.dragState();
  const isDragging = () => dragState()?.isDragging ?? false;
  const isDragEnding = () => dragState()?.isDragEnding ?? false;

  // Frozen state captured when drag ends (preserved even after Context resets)
  const [frozenState, setFrozenState] = createSignal<FrozenDragState | null>(null);

  // Track if we're in exit animation phase
  const [isExiting, setIsExiting] = createSignal(false);

  // Track previous isDragEnding to detect transitions
  let prevIsDragEnding = false;

  createEffect(() => {
    const dragging = isDragging();
    const ending = isDragEnding();

    // Drag started - clear previous frozen state
    if (dragging && !ending && !prevIsDragEnding) {
      setFrozenState(null);
      setIsExiting(false);
    }

    // Drag ending just started - freeze state for exit animation
    if (ending && !prevIsDragEnding) {
      const state = dragState();
      if (state && state.draggedItems.length > 0) {
        const pos = state.pointerPosition;
        setFrozenState({
          items: state.draggedItems.map((d) => d.item),
          position: { x: pos.x + CURSOR_OFFSET_X, y: pos.y + CURSOR_OFFSET_Y },
          target: state.endAnimationTarget,
          committed: state.isDropCommitted,
        });
        setIsExiting(true);
      }
    }

    prevIsDragEnding = ending;
  });

  // Show preview when dragging or when in exit animation
  const shouldShow = () => isDragging() || isDragEnding() || isExiting();

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

  // Current position (frozen or live)
  const currentPosition = createMemo(() => {
    const frozen = frozenState();
    if (frozen) {
      return frozen.position;
    }
    const state = dragState();
    const pos = state?.pointerPosition ?? { x: 0, y: 0 };
    return { x: pos.x + CURSOR_OFFSET_X, y: pos.y + CURSOR_OFFSET_Y };
  });

  // Target position for exit animation (if committed to a drop target)
  const exitPosition = createMemo(() => {
    const frozen = frozenState();
    if (frozen?.committed && frozen?.target) {
      return frozen.target;
    }
    return currentPosition();
  });

  // Visual state helpers
  const isCommitted = createMemo(() => frozenState()?.committed ?? false);
  const isValidDrop = () => dragState()?.isValidDrop ?? false;
  const hasDropTarget = () => !!dragState()?.dropTarget;
  const showDropIndicator = () => hasDropTarget() && !frozenState();

  const getIcon = (item: FileItem) =>
    item.type === 'folder' ? FolderIcon : getFileIcon(item.extension);

  return (
    <Presence>
      <Show when={shouldShow() && displayItems().length > 0}>
        <Portal>
          <Motion.div
            class={cn(
              'fixed top-0 left-0 pointer-events-none z-[9999]',
              'will-change-transform'
            )}
            initial={false}
            animate={{
              x: isExiting() ? exitPosition().x : currentPosition().x,
              y: isExiting() ? exitPosition().y : currentPosition().y,
              opacity: isExiting() ? 0 : 1,
              scale: isExiting() ? 0.75 : 1,
            }}
            exit={{
              opacity: 0,
              scale: 0.75,
            }}
            transition={{
              duration: isExiting() ? DRAG_END_ANIMATION_DURATION : 0,
              easing: 'ease-out',
            }}
            onMotionComplete={() => {
              if (isExiting()) {
                setIsExiting(false);
                setFrozenState(null);
              }
            }}
          >
            {/* Preview card */}
            <div
              class={cn(
                'flex flex-col gap-1 p-2.5 rounded-lg',
                'bg-card border border-border',
                'shadow-md',
                'min-w-[150px] max-w-[220px]',
                // Entrance animation (only when not exiting)
                !isExiting() && 'animate-in fade-in zoom-in-95 duration-150',
                // Border transitions
                'transition-[border-color,box-shadow] duration-150',
                showDropIndicator() && isValidDrop() && 'border-success/60',
                showDropIndicator() && !isValidDrop() && 'border-error/60',
                // Committed state
                isExiting() && isCommitted() && 'border-success/60'
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
                  // Entrance animation (only when not exiting)
                  !isExiting() && 'animate-in zoom-in-50 duration-200'
                )}
              >
                {totalItemCount()}
              </div>
            </Show>
          </Motion.div>
        </Portal>
      </Show>
    </Presence>
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
