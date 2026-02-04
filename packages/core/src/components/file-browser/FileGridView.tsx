import { For, Show, untrack, createMemo, createSignal } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useVirtualWindow } from '../../hooks/useVirtualWindow';
import { useFileBrowser } from './FileBrowserContext';
import { useFileBrowserDrag, type FileBrowserDragContextValue } from '../../context/FileBrowserDragContext';
import { FolderIcon, getFileIcon } from './FileIcons';
import type { FileItem, FilterMatchInfo } from './types';
import { createLongPressContextMenuHandlers } from './longPressContextMenu';

export interface FileGridViewProps {
  class?: string;
  /** Instance ID for drag operations */
  instanceId?: string;
  /** Whether drag and drop is enabled */
  enableDragDrop?: boolean;
}

/**
 * Render file name with highlighted matched characters
 */
function HighlightedName(props: { name: string; match: FilterMatchInfo | null }) {
  const segments = createMemo(() => {
    if (!props.match || props.match.matchedIndices.length === 0) {
      return [{ text: props.name, highlight: false }];
    }

    const result: Array<{ text: string; highlight: boolean }> = [];
    const indices = new Set(props.match.matchedIndices);
    let currentText = '';
    let currentHighlight = false;

    for (let i = 0; i < props.name.length; i++) {
      const isHighlight = indices.has(i);
      if (i === 0) {
        currentHighlight = isHighlight;
        currentText = props.name[i];
      } else if (isHighlight === currentHighlight) {
        currentText += props.name[i];
      } else {
        result.push({ text: currentText, highlight: currentHighlight });
        currentText = props.name[i];
        currentHighlight = isHighlight;
      }
    }
    if (currentText) {
      result.push({ text: currentText, highlight: currentHighlight });
    }

    return result;
  });

  return (
    <>
      <For each={segments()}>
        {(seg) => (
          <Show when={seg.highlight} fallback={<>{seg.text}</>}>
            <mark class="bg-warning/40 text-inherit rounded-sm">{seg.text}</mark>
          </Show>
        )}
      </For>
    </>
  );
}

/**
 * Grid/tile view for displaying files in a card format
 */
export function FileGridView(props: FileGridViewProps) {
  const ctx = useFileBrowser();
  const dragContext = useFileBrowserDrag();
  const isDragEnabled = () => (props.enableDragDrop ?? true) && !!dragContext;
  const instanceId = () => props.instanceId ?? 'default';

  const isSmUp = useMediaQuery('(min-width: 640px)');
  const isMdUp = useMediaQuery('(min-width: 768px)');
  const isLgUp = useMediaQuery('(min-width: 1024px)');
  const isXlUp = useMediaQuery('(min-width: 1280px)');

  const columns = () => (isXlUp() ? 6 : isLgUp() ? 5 : isMdUp() ? 4 : isSmUp() ? 3 : 2);

  const TILE_HEIGHT_PX = 112; // h-28
  const GRID_GAP_PX = 8; // gap-2
  const rowHeightPx = () => TILE_HEIGHT_PX + GRID_GAP_PX;
  const rowCount = () => Math.ceil(ctx.currentFiles().length / Math.max(1, columns()));

  const virtualRows = useVirtualWindow({
    count: rowCount,
    itemSize: rowHeightPx,
    overscan: 2,
  });

  const startIndex = () => virtualRows.range().start * columns();
  const endIndex = () => Math.min(ctx.currentFiles().length, virtualRows.range().end * columns());

  const visibleFiles = createMemo(() => ctx.currentFiles().slice(startIndex(), endIndex()));

  return (
    <div
      ref={(el) => {
        virtualRows.scrollRef(el);
        ctx.setScrollContainer(el);
      }}
      class={cn('h-full min-h-0 overflow-auto', props.class)}
      onScroll={virtualRows.onScroll}
    >
      <div class="p-3">
        <Show
          when={ctx.currentFiles().length > 0}
          fallback={
            <div class="flex flex-col items-center justify-center h-32 gap-2 text-xs text-muted-foreground">
              <Show
                when={ctx.filterQueryApplied().trim()}
                fallback={<span>This folder is empty</span>}
              >
                <span>No files matching "{ctx.filterQueryApplied()}"</span>
                <button
                  type="button"
                  onClick={() => ctx.setFilterQuery('')}
                  class="px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors"
                >
                  Clear Filter
                </button>
              </Show>
            </div>
          }
        >
          <div
            class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2"
            style={{
              'padding-top': `${virtualRows.paddingTop()}px`,
              'padding-bottom': `${virtualRows.paddingBottom()}px`,
            }}
          >
            <For each={visibleFiles()}>
              {(item) => (
                <FileGridItem
                  item={item}
                  instanceId={instanceId()}
                  enableDragDrop={isDragEnabled()}
                  dragContext={dragContext}
                />
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
}

interface FileGridItemProps {
  item: FileItem;
  instanceId: string;
  enableDragDrop: boolean;
  dragContext: FileBrowserDragContextValue | undefined;
}

function FileGridItem(props: FileGridItemProps) {
  const ctx = useFileBrowser();
  const isSelected = () => ctx.isSelected(props.item.id);
  const filterMatch = () => ctx.getFilterMatchForId(props.item.id);
  const item = untrack(() => props.item);
  const longPress = createLongPressContextMenuHandlers(ctx, item);
  let lastPointerType: PointerEvent['pointerType'] | undefined;

  // Drag state
  let activePointerId: number | null = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let isDragMode = false;
  const DRAG_THRESHOLD_PX = 5;
  const LONG_PRESS_DRAG_MS = 500;
  let longPressDragTimer: ReturnType<typeof setTimeout> | null = null;

  // Drop target state
  const [isDropHovered, setIsDropHovered] = createSignal(false);

  const isTouchLike = () => lastPointerType === 'touch' || lastPointerType === 'pen';

  const isFolder = () => props.item.type === 'folder';

  const canBeDropTarget = () => isFolder() && props.enableDragDrop && props.dragContext;

  // Check if this folder is a valid drop target
  const isValidDropTarget = () => {
    if (!canBeDropTarget() || !props.dragContext) return false;
    const state = props.dragContext.dragState();
    if (!state.isDragging) return false;
    return props.dragContext.canDropOn(
      state.draggedItems,
      props.item.path,
      props.item,
      props.instanceId
    );
  };

  // Check if currently being dragged
  const isBeingDragged = () => {
    if (!props.dragContext) return false;
    const state = props.dragContext.dragState();
    if (!state.isDragging) return false;
    return state.draggedItems.some((d) => d.item.id === props.item.id);
  };

  const clearDragTimers = () => {
    if (longPressDragTimer !== null) {
      clearTimeout(longPressDragTimer);
      longPressDragTimer = null;
    }
  };

  // Clean up global listeners
  const removeGlobalListeners = () => {
    if (typeof document === 'undefined') return;
    document.removeEventListener('pointermove', globalPointerMove, true);
    document.removeEventListener('pointerup', globalPointerUp, true);
    document.removeEventListener('pointercancel', globalPointerCancel, true);
  };

  // Add global listeners
  const addGlobalListeners = () => {
    if (typeof document === 'undefined') return;
    document.addEventListener('pointermove', globalPointerMove, true);
    document.addEventListener('pointerup', globalPointerUp, true);
    document.addEventListener('pointercancel', globalPointerCancel, true);
  };

  const stopDragOperation = (commit: boolean) => {
    clearDragTimers();
    removeGlobalListeners();

    // End drag in context
    if (isDragMode && props.dragContext) {
      props.dragContext.endDrag(commit);
    }

    activePointerId = null;
    isDragMode = false;
  };

  const startDragOperation = (x: number, y: number) => {
    if (!props.enableDragDrop || !props.dragContext || isDragMode) return;

    isDragMode = true;

    // If item is not selected, select it
    if (!isSelected()) {
      ctx.selectItem(props.item.id, false);
    }

    // Get all selected items
    const selectedItems = ctx.getSelectedItemsList();
    const itemsToDrag = selectedItems.length > 0 && isSelected()
      ? selectedItems
      : [props.item];

    // Create dragged items
    const draggedItems = itemsToDrag.map((fileItem) => ({
      item: fileItem,
      sourceInstanceId: props.instanceId,
      sourcePath: ctx.currentPath(),
    }));

    // Trigger haptic feedback on mobile
    if (isTouchLike() && 'vibrate' in navigator) {
      try { navigator.vibrate(50); } catch { /* ignore */ }
    }

    props.dragContext.startDrag(draggedItems, x, y);
  };

  // Global pointer event handlers
  const globalPointerMove = (e: PointerEvent) => {
    if (activePointerId !== e.pointerId) return;

    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // For touch, cancel drag if moved before long press completes
    if (isTouchLike() && !isDragMode) {
      if (distance > 10) {
        stopDragOperation(false);
        return;
      }
    }

    // For mouse, start drag after threshold
    if (!isTouchLike() && !isDragMode && distance > DRAG_THRESHOLD_PX) {
      startDragOperation(e.clientX, e.clientY);
    }

    // Update drag position if in drag mode
    if (isDragMode && props.dragContext) {
      props.dragContext.updateDrag(e.clientX, e.clientY);
    }
  };

  const globalPointerUp = (e: PointerEvent) => {
    if (activePointerId !== e.pointerId) return;
    longPress.onPointerUp();
    stopDragOperation(true);
  };

  const globalPointerCancel = (e: PointerEvent) => {
    if (activePointerId !== e.pointerId) return;
    longPress.onPointerCancel();
    stopDragOperation(false);
  };

  const handlePointerDown = (e: PointerEvent) => {
    lastPointerType = e.pointerType;

    // For context menu long press (non-drag)
    longPress.onPointerDown(e);

    // Only enable drag for primary button
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (!props.enableDragDrop || !props.dragContext) return;

    // Store pointer state
    activePointerId = e.pointerId;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    isDragMode = false;

    // Add global listeners for full-screen tracking
    addGlobalListeners();

    // For touch devices, use long press to initiate drag
    if (isTouchLike()) {
      clearDragTimers();
      longPressDragTimer = setTimeout(() => {
        if (activePointerId !== null && !isDragMode) {
          startDragOperation(dragStartX, dragStartY);
        }
      }, LONG_PRESS_DRAG_MS);
    }
  };

  // Local pointer move for updating lastPointerType
  const handlePointerMove = (e: PointerEvent) => {
    lastPointerType = e.pointerType;
    longPress.onPointerMove(e);
  };

  // Drop target handlers for folders
  const handlePointerEnter = (e: PointerEvent) => {
    if (!canBeDropTarget() || !props.dragContext) return;
    const state = props.dragContext.dragState();
    if (!state.isDragging) return;

    setIsDropHovered(true);
    const isValid = props.dragContext.canDropOn(
      state.draggedItems,
      props.item.path,
      props.item,
      props.instanceId
    );

    // Get the target element's bounding rect for fly-to animation
    const targetEl = e.currentTarget as HTMLElement;
    const targetRect = targetEl?.getBoundingClientRect() ?? null;

    props.dragContext.setDropTarget(
      {
        instanceId: props.instanceId,
        targetPath: props.item.path,
        targetItem: props.item,
      },
      isValid,
      targetRect
    );
  };

  const handlePointerLeave = (_e: PointerEvent) => {
    if (!props.dragContext) return;
    setIsDropHovered(false);

    const state = props.dragContext.dragState();
    if (state.isDragging && state.dropTarget?.targetPath === props.item.path) {
      props.dragContext.setDropTarget(null, false);
    }
  };

  const handleClick = (e: MouseEvent) => {
    // Skip if we just finished a drag operation
    if (isDragMode) {
      isDragMode = false;
      return;
    }
    if (longPress.consumeClickSuppression(e)) return;
    if (isTouchLike()) {
      ctx.openItem(props.item);
      return;
    }
    ctx.selectItem(props.item.id, e.metaKey || e.ctrlKey);
  };

  const handleDoubleClick = () => {
    if (isTouchLike()) return;
    ctx.openItem(props.item);
  };

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isTouchLike()) return;

    // If item is not selected, select it first
    if (!isSelected()) {
      ctx.selectItem(props.item.id, false);
    }

    // Get all selected items for the context menu
    const selectedFromCurrent = ctx.getSelectedItemsList();
    const selectedItems = selectedFromCurrent.length > 0 ? selectedFromCurrent : [props.item];

    ctx.showContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: selectedItems,
    });
  };

  const fileIcon = () =>
    props.item.type === 'folder'
      ? FolderIcon
      : getFileIcon(props.item.extension);

  // Get drag state for styling
  const dragState = () => props.dragContext?.dragState();
  const isGlobalDragging = () => dragState()?.isDragging ?? false;
  const isActiveDropTarget = () =>
    isDropHovered() && isGlobalDragging() && canBeDropTarget();

  return (
    <button
      type="button"
      onClick={handleClick}
      onDblClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      class={cn(
        'group relative flex flex-col items-center gap-2 p-3 rounded-lg cursor-pointer h-28',
        'transition-all duration-150 ease-out',
        'hover:bg-accent/50 hover:scale-[1.02]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'active:scale-[0.98]',
        isSelected() && 'bg-accent ring-2 ring-primary/50',
        // Drag state styling - being dragged items become translucent and shrink
        isBeingDragged() && 'opacity-40 scale-90',
        // Drop target styling - enhanced visual feedback for folders
        isActiveDropTarget() && isValidDropTarget() && [
          'bg-primary/15 ring-2 ring-primary/60',
          'scale-105 shadow-lg shadow-primary/15'
        ],
        isActiveDropTarget() && !isValidDropTarget() && [
          'bg-destructive/10 ring-2 ring-dashed ring-destructive/50'
        ]
      )}
    >
      {/* Selection indicator */}
      <Show when={isSelected()}>
        <div class="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="w-2.5 h-2.5 text-primary-foreground"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </Show>

      {/* Icon */}
      <div
        class={cn(
          'w-12 h-12 flex items-center justify-center rounded-lg',
          'transition-transform duration-200',
          'group-hover:scale-110',
          props.item.type === 'folder'
            ? 'bg-warning/10'
            : 'bg-muted/50'
        )}
      >
        <Dynamic component={fileIcon()} class="w-8 h-8" />
      </div>

      {/* Name */}
      <span
        class={cn(
          'text-xs text-center line-clamp-2 w-full px-1',
          'transition-colors duration-150',
          isSelected() && 'font-medium'
        )}
        title={props.item.name}
      >
        <HighlightedName name={props.item.name} match={filterMatch()} />
      </span>

      {/* Subtle glow effect on hover */}
      <div
        class={cn(
          'absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300',
          'group-hover:opacity-100',
          'pointer-events-none'
        )}
        style={{
          background: props.item.type === 'folder'
            ? 'radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--warning) 8%, transparent), transparent 70%)'
            : 'radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--primary) 5%, transparent), transparent 70%)',
        }}
      />
    </button>
  );
}
