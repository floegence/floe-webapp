import { For, Show, untrack, createMemo, createSignal } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useResizeObserver } from '../../hooks/useResizeObserver';
import { useVirtualWindow } from '../../hooks/useVirtualWindow';
import { useFileBrowser } from './FileBrowserContext';
import { useFileBrowserDrag, type FileBrowserDragContextValue } from '../../context/FileBrowserDragContext';
import { FolderIcon, getFileIcon } from './FileIcons';
import type { FileItem, SortField, FilterMatchInfo } from './types';
import { ChevronDown } from '../icons';
import { createLongPressContextMenuHandlers } from './longPressContextMenu';
import { ResizeHandle } from '../layout/ResizeHandle';

export interface FileListViewProps {
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
    <span class="truncate">
      <For each={segments()}>
        {(seg) => (
          <Show when={seg.highlight} fallback={<>{seg.text}</>}>
            <mark class="bg-warning/40 text-inherit rounded-sm">{seg.text}</mark>
          </Show>
        )}
      </For>
    </span>
  );
}

/**
 * List view for displaying files in a table format
 */
export function FileListView(props: FileListViewProps) {
  const ctx = useFileBrowser();
  const dragContext = useFileBrowserDrag();
  const isDragEnabled = () => (props.enableDragDrop ?? true) && !!dragContext;
  const instanceId = () => props.instanceId ?? 'default';

  const ROW_HEIGHT_PX = 32;
  const virtual = useVirtualWindow({
    count: () => ctx.currentFiles().length,
    itemSize: () => ROW_HEIGHT_PX,
    overscan: 12,
  });

  const visibleFiles = createMemo(() => {
    const { start, end } = virtual.range();
    return ctx.currentFiles().slice(start, end);
  });

  const handleSort = (field: SortField) => {
    const current = ctx.sortConfig();
    ctx.setSortConfig({
      field,
      direction: current.field === field && current.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  const formatSize = (bytes?: number) => {
    if (bytes === undefined) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date?: Date) => {
    if (!date) return '-';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const SortIndicator = (fieldProp: { field: SortField }) => {
    const config = () => ctx.sortConfig();
    const isActive = () => config().field === fieldProp.field;

    return (
      <span
        class={cn(
          'ml-1 transition-all duration-150',
          isActive() ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
        )}
      >
        <ChevronDown
          class={cn(
            'w-3 h-3 transition-transform duration-150',
            isActive() && config().direction === 'asc' && 'rotate-180'
          )}
        />
      </span>
    );
  };

  const isSmUp = useMediaQuery('(min-width: 640px)');
  const isMdUp = useMediaQuery('(min-width: 768px)');

  const [headerEl, setHeaderEl] = createSignal<HTMLDivElement | null>(null);
  const headerSize = useResizeObserver(headerEl);

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const columnLayout = createMemo(() => {
    const width = headerSize()?.width ?? 0;
    const showModified = isSmUp();
    const showSize = isMdUp();
    const ratios = ctx.listColumnRatios();

    // Min widths tuned for the current typography (text-[11px] header, text-xs rows).
    const minName = 160;
    const minModified = 120;
    const minSize = 80;

    // Fallbacks when we cannot measure yet (e.g. before mount).
    const fallbackModified = 128;
    const fallbackSize = 96;

    if (!showModified || width <= 0) {
      return {
        width,
        showModified,
        showSize,
        minName,
        minModified,
        minSize,
        modifiedWidth: fallbackModified,
        sizeWidth: fallbackSize,
      };
    }

    if (!showSize) {
      // Size is hidden (<md). Name + Modified should occupy full width.
      const hiddenSizeRatio = ratios.size;
      const available = Math.max(0, 1 - hiddenSizeRatio);

      let modifiedWidth = (available > 0 ? ratios.modifiedAt / available : ratios.modifiedAt) * width;
      modifiedWidth = clamp(modifiedWidth, minModified, Math.max(minModified, width - minName));

      return {
        width,
        showModified,
        showSize,
        minName,
        minModified,
        minSize,
        modifiedWidth,
        sizeWidth: 0,
      };
    }

    // >=md: show all 3 columns. We only store ratios; here we map to px and enforce min widths.
    let modifiedWidth = Math.max(minModified, ratios.modifiedAt * width);
    let sizeWidth = Math.max(minSize, ratios.size * width);

    const maxOther = Math.max(0, width - minName);
    if (modifiedWidth + sizeWidth > maxOther) {
      // Pull space back into the Name column while respecting min widths.
      const over = modifiedWidth + sizeWidth - maxOther;
      const mShrink = Math.max(0, modifiedWidth - minModified);
      const sShrink = Math.max(0, sizeWidth - minSize);
      const totalShrink = mShrink + sShrink;

      if (totalShrink > 0) {
        modifiedWidth -= over * (mShrink / totalShrink);
        sizeWidth -= over * (sShrink / totalShrink);
      }
    }

    modifiedWidth = Math.max(minModified, modifiedWidth);
    sizeWidth = Math.max(minSize, sizeWidth);

    return {
      width,
      showModified,
      showSize,
      minName,
      minModified,
      minSize,
      modifiedWidth,
      sizeWidth,
    };
  });

  const modifiedWidthPx = () => columnLayout().modifiedWidth;
  const sizeWidthPx = () => columnLayout().sizeWidth;

  const handleResizeNameModified = (delta: number) => {
    const layout = columnLayout();
    if (!layout.showModified || layout.width <= 0) return;

    if (!layout.showSize) {
      // <md: only Name + Modified visible; keep the hidden Size ratio stable.
      const ratios = ctx.listColumnRatios();
      const sizeRatio = ratios.size;
      const available = Math.max(0, 1 - sizeRatio);
      if (available <= 0) return;

      const width = layout.width;
      const modified = layout.modifiedWidth;
      const name = Math.max(0, width - modified);

      const minDelta = layout.minName - name;
      const maxDelta = modified - layout.minModified;
      const d = clamp(delta, minDelta, maxDelta);
      if (d === 0) return;

      const nextName = name + d;
      const nextModified = modified - d;

      const nextNameRatio = (nextName / width) * available;
      const nextModifiedRatio = (nextModified / width) * available;
      ctx.setListColumnRatios({
        name: nextNameRatio,
        modifiedAt: nextModifiedRatio,
        size: sizeRatio,
      });
      return;
    }

    // >=md: transfer width between Name and Modified (Size stays the same).
    const width = layout.width;
    const modified = layout.modifiedWidth;
    const size = layout.sizeWidth;
    const name = Math.max(0, width - modified - size);

    const minDelta = layout.minName - name;
    const maxDelta = modified - layout.minModified;
    const d = clamp(delta, minDelta, maxDelta);
    if (d === 0) return;

    const nextName = name + d;
    const nextModified = modified - d;
    ctx.setListColumnRatios({
      name: nextName / width,
      modifiedAt: nextModified / width,
      size: size / width,
    });
  };

  const handleResizeModifiedSize = (delta: number) => {
    const layout = columnLayout();
    if (!layout.showSize || layout.width <= 0) return;

    const width = layout.width;
    const modified = layout.modifiedWidth;
    const size = layout.sizeWidth;

    // Transfer width between Modified and Size (Name stays the same).
    const minDelta = layout.minModified - modified;
    const maxDelta = size - layout.minSize;
    const d = clamp(delta, minDelta, maxDelta);
    if (d === 0) return;

    const nextModified = modified + d;
    const nextSize = size - d;
    const nextName = Math.max(0, width - nextModified - nextSize);

    ctx.setListColumnRatios({
      name: nextName / width,
      modifiedAt: nextModified / width,
      size: nextSize / width,
    });
  };

  return (
    <div class={cn('flex flex-col h-full min-h-0', props.class)}>
      {/* Header */}
      <div
        ref={setHeaderEl}
        class="flex items-center border-b border-border text-[11px] text-muted-foreground font-medium"
      >
        <div
          class={cn(
            'relative flex-1 min-w-0',
            columnLayout().showModified && 'border-r border-border'
          )}
        >
          <button
            type="button"
            onClick={() => handleSort('name')}
            class="group w-full flex items-center min-w-0 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
          >
            {/* Align header label with row content (icons + name). */}
            <span class="flex items-center gap-2 min-w-0">
              <span class="flex-shrink-0 w-4 h-4" aria-hidden="true" />
              <span class="flex items-center min-w-0">
                <span class="truncate">Name</span>
                <SortIndicator field="name" />
              </span>
            </span>
          </button>
          <Show when={columnLayout().showModified}>
            <ResizeHandle
              direction="horizontal"
              onResize={handleResizeNameModified}
            />
          </Show>
        </div>

        <Show when={columnLayout().showModified}>
          <div
            class={cn('relative shrink-0', columnLayout().showSize && 'border-r border-border')}
            style={{ width: `${modifiedWidthPx()}px` }}
          >
            <button
              type="button"
              onClick={() => handleSort('modifiedAt')}
              class="group w-full flex items-center justify-start text-left px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              Modified
              <SortIndicator field="modifiedAt" />
            </button>
            <Show when={columnLayout().showSize}>
              <ResizeHandle
                direction="horizontal"
                onResize={handleResizeModifiedSize}
              />
            </Show>
          </div>
        </Show>

        <Show when={columnLayout().showSize}>
          <div class="shrink-0" style={{ width: `${sizeWidthPx()}px` }}>
            <button
              type="button"
              onClick={() => handleSort('size')}
              class="group w-full flex items-center justify-start text-left px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              Size
              <SortIndicator field="size" />
            </button>
          </div>
        </Show>
      </div>

      {/* File list */}
      <div
        ref={(el) => {
          virtual.scrollRef(el);
          ctx.setScrollContainer(el);
        }}
        class="flex-1 min-h-0 overflow-auto"
        onScroll={virtual.onScroll}
      >
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
            style={{
              'padding-top': `${virtual.paddingTop()}px`,
              'padding-bottom': `${virtual.paddingBottom()}px`,
            }}
          >
            <For each={visibleFiles()}>
              {(item) => (
                <FileListItem
                  item={item}
                  formatSize={formatSize}
                  formatDate={formatDate}
                  showModified={columnLayout().showModified}
                  showSize={columnLayout().showSize}
                  modifiedWidthPx={modifiedWidthPx()}
                  sizeWidthPx={sizeWidthPx()}
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

interface FileListItemProps {
  item: FileItem;
  formatSize: (bytes?: number) => string;
  formatDate: (date?: Date) => string;
  showModified: boolean;
  showSize: boolean;
  modifiedWidthPx: number;
  sizeWidthPx: number;
  instanceId: string;
  enableDragDrop: boolean;
  dragContext: FileBrowserDragContextValue | undefined;
}

function FileListItem(props: FileListItemProps) {
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

    // Add global listeners for tracking pointer movement
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
  const handlePointerEnter = (_e: PointerEvent) => {
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
    props.dragContext.setDropTarget(
      {
        instanceId: props.instanceId,
        targetPath: props.item.path,
        targetItem: props.item,
      },
      isValid
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
        'group w-full h-8 flex items-center text-xs cursor-pointer',
        'transition-all duration-150 ease-out',
        'hover:bg-accent/50',
        'focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring',
        isSelected() && 'bg-accent text-accent-foreground',
        // Drag state styling - being dragged items become translucent
        isBeingDragged() && 'opacity-40 scale-[0.98]',
        // Drop target styling - enhanced visual feedback
        isActiveDropTarget() && isValidDropTarget() && [
          'bg-primary/15 outline outline-2 outline-primary/60',
          'scale-[1.01] shadow-sm shadow-primary/10'
        ],
        isActiveDropTarget() && !isValidDropTarget() && [
          'bg-destructive/10 outline outline-2 outline-dashed outline-destructive/50'
        ]
      )}
    >
      {/* Name column */}
      <div class="flex items-center gap-2 flex-1 min-w-0 px-3 py-1.5">
        <span class="flex-shrink-0 w-4 h-4">
          <Dynamic component={fileIcon()} class="w-4 h-4" />
        </span>
        <HighlightedName name={props.item.name} match={filterMatch()} />
      </div>

      {/* Modified column */}
      <Show when={props.showModified}>
        <div
          class="shrink-0 px-3 py-1.5 text-left text-muted-foreground truncate"
          style={{ width: `${props.modifiedWidthPx}px` }}
        >
          {props.formatDate(props.item.modifiedAt)}
        </div>
      </Show>

      {/* Size column */}
      <Show when={props.showSize}>
        <div
          class="shrink-0 px-3 py-1.5 text-left text-muted-foreground truncate"
          style={{ width: `${props.sizeWidthPx}px` }}
        >
          {props.item.type === 'folder' ? '-' : props.formatSize(props.item.size)}
        </div>
      </Show>
    </button>
  );
}
