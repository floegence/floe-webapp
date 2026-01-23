import { For, Show, onCleanup, createEffect } from 'solid-js';
import { Portal, Dynamic } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { useFileBrowser } from './FileBrowserContext';
import type { ContextMenuItem, ContextMenuCallbacks, FileItem } from './types';

// Default icons for menu items
const CopyIcon = (props: { class?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={props.class}>
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

const SparklesIcon = (props: { class?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={props.class}>
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
  </svg>
);

const FolderCopyIcon = (props: { class?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={props.class}>
    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
    <path d="M8 10v4" />
    <path d="M12 10v2" />
    <path d="M16 10v6" />
  </svg>
);

const MoveIcon = (props: { class?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={props.class}>
    <path d="M12 3v18" />
    <path d="m8 7-4 4 4 4" />
    <path d="m16 7 4 4-4 4" />
  </svg>
);

const TrashIcon = (props: { class?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={props.class}>
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

const PencilIcon = (props: { class?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={props.class}>
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </svg>
);

export interface FileContextMenuProps {
  /** Custom menu items to add (will be merged with defaults) */
  customItems?: ContextMenuItem[];
  /** Override default menu items completely */
  overrideItems?: ContextMenuItem[];
  /** Callbacks for built-in actions */
  callbacks?: ContextMenuCallbacks;
  /** Items to hide from default menu */
  hideItems?: Array<'duplicate' | 'ask-agent' | 'copy-to' | 'move-to' | 'delete' | 'rename'>;
}

/**
 * Context menu for file browser items
 */
export function FileContextMenu(props: FileContextMenuProps) {
  const ctx = useFileBrowser();
  let menuRef: HTMLDivElement | undefined;

  // Default menu items
  const defaultItems: ContextMenuItem[] = [
    {
      id: 'duplicate',
      label: 'Duplicate',
      type: 'duplicate',
      icon: CopyIcon,
      shortcut: 'Cmd+D',
    },
    {
      id: 'ask-agent',
      label: 'Ask Agent',
      type: 'ask-agent',
      icon: SparklesIcon,
      separator: true,
    },
    {
      id: 'copy-to',
      label: 'Copy to...',
      type: 'copy-to',
      icon: FolderCopyIcon,
    },
    {
      id: 'move-to',
      label: 'Move to...',
      type: 'move-to',
      icon: MoveIcon,
      separator: true,
    },
    {
      id: 'rename',
      label: 'Rename',
      type: 'rename',
      icon: PencilIcon,
      shortcut: 'Enter',
    },
    {
      id: 'delete',
      label: 'Delete',
      type: 'delete',
      icon: TrashIcon,
      shortcut: 'Del',
    },
  ];

  // Build final menu items
  const menuItems = () => {
    // If override is provided, use it directly
    if (props.overrideItems) {
      return props.overrideItems;
    }

    // Filter out hidden items
    let items = defaultItems;
    if (props.hideItems?.length) {
      items = items.filter((item) => !props.hideItems?.includes(item.type as never));
    }

    // Add custom items
    if (props.customItems?.length) {
      items = [...items, ...props.customItems];
    }

    return items;
  };

  // Handle menu item click
  const handleItemClick = (item: ContextMenuItem, targetItems: FileItem[]) => {
    // Close menu first
    ctx.hideContextMenu();

    // Execute action
    switch (item.type) {
      case 'duplicate':
        props.callbacks?.onDuplicate?.(targetItems);
        break;
      case 'ask-agent':
        props.callbacks?.onAskAgent?.(targetItems);
        break;
      case 'copy-to':
        props.callbacks?.onCopyTo?.(targetItems);
        break;
      case 'move-to':
        props.callbacks?.onMoveTo?.(targetItems);
        break;
      case 'delete':
        props.callbacks?.onDelete?.(targetItems);
        break;
      case 'rename':
        if (targetItems.length === 1) {
          props.callbacks?.onRename?.(targetItems[0]!);
        }
        break;
      case 'custom':
        item.onAction?.(targetItems);
        break;
    }
  };

  // Close menu on click outside
  const handleClickOutside = (e: MouseEvent) => {
    if (menuRef && !menuRef.contains(e.target as Node)) {
      ctx.hideContextMenu();
    }
  };

  // Close menu on escape
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      ctx.hideContextMenu();
    }
  };

  // Setup/cleanup event listeners
  createEffect(() => {
    if (ctx.contextMenu()) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
  });

  onCleanup(() => {
    document.removeEventListener('click', handleClickOutside);
    document.removeEventListener('keydown', handleKeyDown);
  });

  // Adjust position to stay within viewport
  const getAdjustedPosition = () => {
    const menu = ctx.contextMenu();
    if (!menu || !menuRef) return { x: 0, y: 0 };

    const rect = menuRef.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = menu.x;
    let y = menu.y;

    // Adjust if menu would go off right edge
    if (x + rect.width > viewportWidth) {
      x = viewportWidth - rect.width - 8;
    }

    // Adjust if menu would go off bottom edge
    if (y + rect.height > viewportHeight) {
      y = viewportHeight - rect.height - 8;
    }

    return { x: Math.max(8, x), y: Math.max(8, y) };
  };

  return (
    <Show when={ctx.contextMenu()}>
      {(menu) => (
        <Portal>
          <div
            ref={menuRef}
            class={cn(
              'fixed z-50 min-w-[180px] py-1',
              'bg-popover border border-border rounded-lg shadow-lg',
              'animate-in fade-in zoom-in-95 duration-100'
            )}
            style={{
              left: `${getAdjustedPosition().x}px`,
              top: `${getAdjustedPosition().y}px`,
            }}
            role="menu"
            aria-orientation="vertical"
          >
            <For each={menuItems()}>
              {(item) => (
                <>
                  <button
                    type="button"
                    onClick={() => handleItemClick(item, menu().items)}
                    disabled={item.disabled || (item.type === 'rename' && menu().items.length > 1)}
                    class={cn(
                      'w-full flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer',
                      'transition-colors duration-75',
                      'hover:bg-accent hover:text-accent-foreground',
                      'focus:outline-none focus-visible:bg-accent focus-visible:text-accent-foreground',
                      'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent',
                      item.type === 'delete' && 'text-error hover:bg-error/10 hover:text-error'
                    )}
                    role="menuitem"
                  >
                    <Show when={item.icon}>
                      {(Icon) => <Dynamic component={Icon()} class="w-3.5 h-3.5 opacity-60" />}
                    </Show>
                    <span class="flex-1 text-left">{item.label}</span>
                    <Show when={item.shortcut}>
                      <span class="text-[10px] text-muted-foreground opacity-60">{item.shortcut}</span>
                    </Show>
                  </button>
                  <Show when={item.separator}>
                    <div class="my-1 h-px bg-border" />
                  </Show>
                </>
              )}
            </For>
          </div>
        </Portal>
      )}
    </Show>
  );
}
