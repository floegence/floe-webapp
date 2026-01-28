import { For, Show, createMemo, untrack } from 'solid-js';
import { cn } from '../../utils/cn';
import { useFileBrowser } from './FileBrowserContext';
import { FolderIcon, FolderOpenIcon } from './FileIcons';
import type { FileItem } from './types';
import { ChevronRight } from '../icons';
import { createLongPressContextMenuHandlers } from './longPressContextMenu';

export interface DirectoryTreeProps {
  class?: string;
}

/**
 * Collapsible directory tree for sidebar navigation (folders only)
 */
export function DirectoryTree(props: DirectoryTreeProps) {
  const ctx = useFileBrowser();

  // Filter to only show folders at the root level
  const folders = createMemo(() => ctx.files().filter((item) => item.type === 'folder'));

  return (
    <div
      class={cn('flex flex-col', props.class)}
      // Prevent browser context menu inside the tree area.
      onContextMenu={(e) => e.preventDefault()}
    >
      <TreeNode items={folders()} depth={0} />
    </div>
  );
}

interface TreeNodeProps {
  items: FileItem[];
  depth: number;
}

function TreeNode(props: TreeNodeProps) {
  // Only render folders
  const folders = createMemo(() => props.items.filter((item) => item.type === 'folder'));

  return (
    <For each={folders()}>
      {(item) => <FolderTreeItem item={item} depth={props.depth} />}
    </For>
  );
}

interface TreeItemProps {
  item: FileItem;
  depth: number;
}

function FolderTreeItem(props: TreeItemProps) {
  const ctx = useFileBrowser();
  const isExpanded = () => ctx.isExpanded(props.item.path);
  const isActive = () => ctx.currentPath() === props.item.path;
  const item = untrack(() => props.item);
  const longPress = createLongPressContextMenuHandlers(ctx, item, { selectOnOpen: false });
  let lastPointerType: PointerEvent['pointerType'] | undefined;

  const isTouchLike = () => lastPointerType === 'touch' || lastPointerType === 'pen';

  // Count only subfolders for the badge
  const subfolderCount = createMemo(() =>
    props.item.children?.filter((c) => c.type === 'folder').length ?? 0
  );

  // Check if folder has any subfolders
  const hasSubfolders = () => subfolderCount() > 0;

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

  const handleNavigate = (e: MouseEvent) => {
    if (longPress.consumeClickSuppression(e)) return;
    // Keep tree behavior consistent with list/grid "open folder" behavior:
    // navigating into a folder should also expand it in the tree.
    ctx.navigateTo(item);
  };

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isTouchLike()) return;

    ctx.showContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [props.item],
    });
  };

  const handleToggle = () => {
    if (!hasSubfolders()) return;
    ctx.toggleFolder(props.item.path);
  };

  return (
    <div class="flex flex-col">
      <div
        class={cn(
          'group flex items-center w-full py-1 text-xs',
          'transition-all duration-100',
          'hover:bg-sidebar-accent/60',
          isActive() && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
        )}
        style={{ 'padding-left': `${8 + props.depth * 12}px` }}
      >
        {/* Expand/collapse chevron - only render for folders that have subfolders */}
        <Show
          when={hasSubfolders()}
          fallback={<span class="flex-shrink-0 w-3.5 h-3.5" />}
        >
          <button
            type="button"
            onClick={handleToggle}
            class={cn(
              'flex-shrink-0 w-3.5 h-3.5 flex items-center justify-center cursor-pointer',
              'transition-transform duration-150',
              isExpanded() && 'rotate-90',
              'focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-sidebar-ring'
            )}
            aria-label={isExpanded() ? 'Collapse folder' : 'Expand folder'}
          >
            <ChevronRight class="w-3 h-3 opacity-50" />
          </button>
        </Show>

        <button
          type="button"
          onClick={handleNavigate}
          onContextMenu={handleContextMenu}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          class={cn(
            'flex items-center gap-1 flex-1 min-w-0 text-left cursor-pointer pl-1',
            'focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-sidebar-ring'
          )}
        >
          {/* Folder icon */}
          <span class="flex-shrink-0 w-4 h-4">
            <Show
              when={hasSubfolders() && isExpanded()}
              fallback={<FolderIcon class="w-4 h-4" />}
            >
              <FolderOpenIcon class="w-4 h-4" />
            </Show>
          </span>

          {/* Folder name */}
          <span class="truncate">{props.item.name}</span>

          {/* Subfolder count badge */}
          <Show when={hasSubfolders()}>
            <span class="ml-auto mr-2 text-[10px] text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity">
              {subfolderCount()}
            </span>
          </Show>
        </button>
      </div>

      {/* Children (only folders) */}
      <Show when={isExpanded() && hasSubfolders()}>
        <div
          class={cn(
            'overflow-hidden transition-all duration-200',
            isExpanded() ? 'opacity-100' : 'opacity-0'
          )}
        >
          <TreeNode items={props.item.children ?? []} depth={props.depth + 1} />
        </div>
      </Show>
    </div>
  );
}
