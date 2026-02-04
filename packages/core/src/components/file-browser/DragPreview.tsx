import { Show, For, createMemo } from 'solid-js';
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
 * Duration of the drag end animation in milliseconds (should match context)
 */
const DRAG_END_ANIMATION_DURATION_MS = 200;

/**
 * Floating preview that follows the cursor during drag operations.
 * Shows dragged items with a count badge for multiple items.
 * Uses CSS transform for GPU-accelerated smooth positioning.
 * Includes fly-to-target animation when dropping onto a valid target.
 */
export function DragPreview() {
  const dragContext = useFileBrowserDrag();

  const dragState = () => dragContext?.dragState();
  const isDragging = () => dragState()?.isDragging ?? false;
  const isDragEnding = () => dragState()?.isDragEnding ?? false;
  const isDropCommitted = () => dragState()?.isDropCommitted ?? false;
  const draggedItems = () => dragState()?.draggedItems ?? [];
  const position = () => dragState()?.pointerPosition ?? { x: 0, y: 0 };
  const endAnimationTarget = () => dragState()?.endAnimationTarget;
  const isValidDrop = () => dragState()?.isValidDrop ?? false;
  const hasDropTarget = () => !!dragState()?.dropTarget;

  // Show preview when dragging OR when ending (for exit animation)
  const shouldShow = () => (isDragging() || isDragEnding()) && draggedItems().length > 0;

  // Calculate the transform position
  const transformPosition = createMemo(() => {
    const ending = isDragEnding();
    const target = endAnimationTarget();
    const committed = isDropCommitted();

    // When ending with a valid drop target, fly to the target position
    if (ending && committed && target) {
      return { x: target.x, y: target.y };
    }

    // Otherwise use pointer position with offset
    const pos = position();
    return { x: pos.x + CURSOR_OFFSET_X, y: pos.y + CURSOR_OFFSET_Y };
  });

  const previewItems = createMemo(() => {
    const items = draggedItems();
    return items.slice(0, MAX_PREVIEW_ITEMS).map((d) => d.item);
  });

  const remainingCount = createMemo(() => {
    const total = draggedItems().length;
    return total > MAX_PREVIEW_ITEMS ? total - MAX_PREVIEW_ITEMS : 0;
  });

  const getIcon = (item: FileItem) =>
    item.type === 'folder' ? FolderIcon : getFileIcon(item.extension);

  return (
    <Show when={shouldShow()}>
      <Portal>
        <div
          class={cn(
            'fixed top-0 left-0 pointer-events-none z-[9999]',
            // GPU-accelerated transform for smooth movement
            'will-change-transform',
            // Add transition for fly-to-target animation during drag end
            isDragEnding() && 'transition-all ease-out',
            // Fade out and scale down during exit
            isDragEnding() && 'opacity-0 scale-75'
          )}
          style={{
            transform: `translate3d(${transformPosition().x}px, ${transformPosition().y}px, 0)`,
            'transition-duration': isDragEnding() ? `${DRAG_END_ANIMATION_DURATION_MS}ms` : '0ms',
          }}
        >
          {/* Preview card with entrance animation */}
          <div
            class={cn(
              'flex flex-col gap-1 p-2.5 rounded-lg',
              'bg-card border border-border',
              'shadow-md',
              'min-w-[150px] max-w-[220px]',
              // Entrance animation (only when not ending)
              !isDragEnding() && 'animate-in fade-in zoom-in-95 duration-150',
              // Visual feedback for valid/invalid drop with smooth transition
              'transition-[border-color,box-shadow] duration-150',
              hasDropTarget() && isValidDrop() && !isDragEnding() && 'border-success/60',
              hasDropTarget() && !isValidDrop() && !isDragEnding() && 'border-error/60',
              // Success state when committed
              isDragEnding() && isDropCommitted() && 'border-success/60'
            )}
          >
            {/* Item list */}
            <For each={previewItems()}>
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

            {/* Drop status indicator with smooth transition */}
            <Show when={hasDropTarget() && !isDragEnding()}>
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
          <Show when={draggedItems().length > 1}>
            <div
              class={cn(
                'absolute -top-2 -right-2',
                'min-w-[20px] h-5 px-1.5 rounded-full',
                'bg-foreground text-background',
                'flex items-center justify-center',
                'text-[10px] font-semibold',
                'shadow-sm',
                // Entrance animation (only when not ending)
                !isDragEnding() && 'animate-in zoom-in-50 duration-200'
              )}
            >
              {draggedItems().length}
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
