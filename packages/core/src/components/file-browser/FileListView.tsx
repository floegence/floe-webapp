import { For, Show, untrack, createMemo, createSignal } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useResizeObserver } from '../../hooks/useResizeObserver';
import { useFileBrowser } from './FileBrowserContext';
import { FolderIcon, getFileIcon } from './FileIcons';
import type { FileItem, SortField, FilterMatchInfo } from './types';
import { ChevronDown } from '../icons';
import { createLongPressContextMenuHandlers } from './longPressContextMenu';
import { ResizeHandle } from '../layout/ResizeHandle';

export interface FileListViewProps {
  class?: string;
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
      <div class="flex-1 min-h-0 overflow-auto">
        <Show
          when={ctx.currentFiles().length > 0}
          fallback={
            <div class="flex flex-col items-center justify-center h-32 gap-2 text-xs text-muted-foreground">
              <Show
                when={ctx.filterQuery().trim()}
                fallback={<span>This folder is empty</span>}
              >
                <span>No files matching "{ctx.filterQuery()}"</span>
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
          <For each={ctx.currentFiles()}>
            {(item, index) => (
              <FileListItem
                item={item}
                formatSize={formatSize}
                formatDate={formatDate}
                index={index()}
                showModified={columnLayout().showModified}
                showSize={columnLayout().showSize}
                modifiedWidthPx={modifiedWidthPx()}
                sizeWidthPx={sizeWidthPx()}
              />
            )}
          </For>
        </Show>
      </div>
    </div>
  );
}

interface FileListItemProps {
  item: FileItem;
  formatSize: (bytes?: number) => string;
  formatDate: (date?: Date) => string;
  index: number;
  showModified: boolean;
  showSize: boolean;
  modifiedWidthPx: number;
  sizeWidthPx: number;
}

function FileListItem(props: FileListItemProps) {
  const ctx = useFileBrowser();
  const isSelected = () => ctx.isSelected(props.item.id);
  const filterMatch = () => ctx.getFilterMatch(props.item.name);
  const item = untrack(() => props.item);
  const longPress = createLongPressContextMenuHandlers(ctx, item);
  let lastPointerType: PointerEvent['pointerType'] | undefined;

  const isTouchLike = () => lastPointerType === 'touch' || lastPointerType === 'pen';

  const handlePointerDown = (e: PointerEvent) => {
    lastPointerType = e.pointerType;
    longPress.onPointerDown(e);
  };

  const handlePointerMove = (e: PointerEvent) => {
    lastPointerType = e.pointerType;
    longPress.onPointerMove(e);
  };

  const handlePointerUp = (e: PointerEvent) => {
    lastPointerType = e.pointerType;
    longPress.onPointerUp();
  };

  const handlePointerCancel = (e: PointerEvent) => {
    lastPointerType = e.pointerType;
    longPress.onPointerCancel();
  };

  const handleClick = (e: MouseEvent) => {
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
    const selectedIds = ctx.selectedItems();
    const allFiles = ctx.currentFiles();
    const selectedItems = selectedIds.size > 0
      ? allFiles.filter((f) => selectedIds.has(f.id))
      : [props.item];

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

  return (
    <button
      type="button"
      onClick={handleClick}
      onDblClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      class={cn(
        'group w-full flex items-center text-xs cursor-pointer',
        'transition-all duration-100',
        'hover:bg-accent/50',
        'focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring',
        isSelected() && 'bg-accent text-accent-foreground',
        // Staggered animation on mount
        'animate-in fade-in slide-in-from-top-2'
      )}
      style={{
        'animation-delay': `${Math.min(props.index * 20, 200)}ms`,
        'animation-fill-mode': 'backwards',
      }}
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
