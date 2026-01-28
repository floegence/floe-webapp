import { For, Show, untrack, createMemo } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { useFileBrowser } from './FileBrowserContext';
import { FolderIcon, getFileIcon } from './FileIcons';
import type { FileItem, SortField, FilterMatchInfo } from './types';
import { ChevronDown } from '../icons';
import { createLongPressContextMenuHandlers } from './longPressContextMenu';

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

  return (
    <div class={cn('flex flex-col h-full min-h-0', props.class)}>
      {/* Header */}
      <div class="flex items-center border-b border-border text-[11px] text-muted-foreground font-medium">
        <button
          type="button"
          onClick={() => handleSort('name')}
          class="group flex items-center flex-1 min-w-0 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
        >
          Name
          <SortIndicator field="name" />
        </button>
        <button
          type="button"
          onClick={() => handleSort('modifiedAt')}
          class="group hidden sm:flex items-center w-32 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
        >
          Modified
          <SortIndicator field="modifiedAt" />
        </button>
        <button
          type="button"
          onClick={() => handleSort('size')}
          class="group hidden md:flex items-center w-24 px-3 py-2 text-right justify-end cursor-pointer hover:bg-muted/50 transition-colors"
        >
          Size
          <SortIndicator field="size" />
        </button>
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
      <div class="hidden sm:block w-32 px-3 py-1.5 text-muted-foreground truncate">
        {props.formatDate(props.item.modifiedAt)}
      </div>

      {/* Size column */}
      <div class="hidden md:block w-24 px-3 py-1.5 text-right text-muted-foreground">
        {props.item.type === 'folder' ? '-' : props.formatSize(props.item.size)}
      </div>
    </button>
  );
}
