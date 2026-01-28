import { For, Show, untrack, createMemo } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { useFileBrowser } from './FileBrowserContext';
import { FolderIcon, getFileIcon } from './FileIcons';
import type { FileItem, FilterMatchInfo } from './types';
import { createLongPressContextMenuHandlers } from './longPressContextMenu';

export interface FileGridViewProps {
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

  return (
    <div class={cn('h-full min-h-0 overflow-auto p-3', props.class)}>
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
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          <For each={ctx.currentFiles()}>
            {(item, index) => <FileGridItem item={item} index={index()} />}
          </For>
        </div>
      </Show>
    </div>
  );
}

interface FileGridItemProps {
  item: FileItem;
  index: number;
}

function FileGridItem(props: FileGridItemProps) {
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
        'group relative flex flex-col items-center gap-2 p-3 rounded-lg cursor-pointer',
        'transition-all duration-150',
        'hover:bg-accent/50 hover:scale-[1.02]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'active:scale-[0.98]',
        isSelected() && 'bg-accent ring-2 ring-primary/50',
        // Staggered animation on mount
        'animate-in fade-in zoom-in-95'
      )}
      style={{
        'animation-delay': `${Math.min(props.index * 30, 300)}ms`,
        'animation-fill-mode': 'backwards',
      }}
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
