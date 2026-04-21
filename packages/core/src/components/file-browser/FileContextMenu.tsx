import { For, Show, createEffect, createMemo, createSignal, onCleanup } from 'solid-js';
import { Portal, Dynamic } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { deferAfterPaint } from '../../utils/defer';
import { ChevronRight } from '../icons';
import {
  clampMenuPosition,
  calculateSubmenuPosition,
  focusMenuItem,
  moveMenuFocus,
  type MenuBoundaryRect,
} from '../ui/menuUtils';
import { LOCAL_INTERACTION_SURFACE_ATTR } from '../ui/localInteractionSurface';
import {
  isSurfacePortalMode,
  projectSurfacePortalPosition,
  resolveSurfacePortalBoundaryRect,
  resolveSurfacePortalHost,
  resolveSurfacePortalMount,
  type ResolvedSurfacePortalHost,
} from '../ui/surfacePortalScope';
import { useFileBrowser } from './FileBrowserContext';
import type {
  ContextMenuActionType,
  ContextMenuCallbacks,
  ContextMenuEvent,
  ContextMenuItem,
  FileItem,
} from './types';

/**
 * Built-in menu action types (excluding 'custom').
 */
export type BuiltinContextMenuAction = Exclude<ContextMenuActionType, 'custom'>;

/**
 * hideItems supports a static array or a dynamic function.
 * - Static array: list action types to hide.
 * - Dynamic function: decide which action types to hide based on the target items.
 */
export type HideItemsValue =
  | BuiltinContextMenuAction[]
  | ((targetItems: FileItem[]) => BuiltinContextMenuAction[]);

// Default icons for menu items
const CopyIcon = (props: { class?: string }) => (
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
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

const ClipboardIcon = (props: { class?: string }) => (
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
    <rect width="14" height="16" x="5" y="4" rx="2" />
    <path d="M9 4.5h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v.5a1 1 0 0 0 1 1Z" />
  </svg>
);

const SparklesIcon = (props: { class?: string }) => (
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
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
  </svg>
);

const FolderCopyIcon = (props: { class?: string }) => (
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
    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
    <path d="M8 10v4" />
    <path d="M12 10v2" />
    <path d="M16 10v6" />
  </svg>
);

const MoveIcon = (props: { class?: string }) => (
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
    <path d="M12 3v18" />
    <path d="m8 7-4 4 4 4" />
    <path d="m16 7 4 4-4 4" />
  </svg>
);

const TrashIcon = (props: { class?: string }) => (
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
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

const PencilIcon = (props: { class?: string }) => (
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
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </svg>
);

let fileContextMenuIdSeq = 0;

type ContextMenuDismissWindow = Pick<Window, 'addEventListener' | 'removeEventListener'>;

export interface FileContextMenuProps {
  /** Custom menu items to add (will be merged with defaults) */
  customItems?: ContextMenuItem[];
  /** Override default menu items completely */
  overrideItems?: ContextMenuItem[];
  /** Callbacks for built-in actions */
  callbacks?: ContextMenuCallbacks;
  /**
   * Items to hide from default menu.
   * Can be a static array or a function that receives target items and returns the array.
   *
   * @example Static array
   * hideItems={['ask-agent', 'duplicate']}
   *
   * @example Dynamic function (e.g., hide non-atomic operations for folders)
   * hideItems={(items) => items.some(i => i.type === 'folder') ? ['duplicate', 'copy-to'] : []}
   */
  hideItems?: HideItemsValue;
}

type ContextMenuPortalLayout = Readonly<{
  mount: () => HTMLElement | undefined;
  isSurfaceMode: () => boolean;
  boundaryRect: () => MenuBoundaryRect;
  projectPosition: (
    position: Readonly<{ x: number; y: number }>
  ) => Readonly<{ x: number; y: number }>;
}>;

export function createDefaultContextMenuItems(callbacks?: ContextMenuCallbacks): ContextMenuItem[] {
  const hasAskAgent = !!callbacks?.onAskAgent;
  const hasCopyName = !!callbacks?.onCopyName;

  return [
    {
      id: 'duplicate',
      label: 'Duplicate',
      type: 'duplicate',
      icon: CopyIcon,
      shortcut: 'Cmd+D',
      separator: !hasCopyName && !hasAskAgent,
    },
    ...(hasCopyName
      ? ([
          {
            id: 'copy-name',
            label: 'Copy Name',
            type: 'copy-name',
            icon: ClipboardIcon,
            separator: !hasAskAgent,
          },
        ] satisfies ContextMenuItem[])
      : []),
    ...(hasAskAgent
      ? ([
          {
            id: 'ask-agent',
            label: 'Ask Agent',
            type: 'ask-agent',
            icon: SparklesIcon,
            separator: true,
          },
        ] satisfies ContextMenuItem[])
      : []),
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
}

export function dispatchContextMenuAction(
  item: ContextMenuItem,
  items: FileItem[],
  callbacks?: ContextMenuCallbacks,
  event?: ContextMenuEvent
) {
  switch (item.type) {
    case 'duplicate':
      callbacks?.onDuplicate?.(items);
      break;
    case 'copy-name':
      callbacks?.onCopyName?.(items);
      break;
    case 'ask-agent':
      callbacks?.onAskAgent?.(items);
      break;
    case 'copy-to':
      callbacks?.onCopyTo?.(items);
      break;
    case 'move-to':
      callbacks?.onMoveTo?.(items);
      break;
    case 'delete':
      callbacks?.onDelete?.(items);
      break;
    case 'rename':
      if (items.length === 1) {
        callbacks?.onRename?.(items[0]!);
      }
      break;
    case 'custom':
      item.onAction?.(items, event);
      break;
  }
}

type ContextMenuEntryProps = {
  item: ContextMenuItem;
  menu: ContextMenuEvent;
  contextMenuId: string;
  portalLayout: ContextMenuPortalLayout;
  onSelect: (item: ContextMenuItem, event: ContextMenuEvent) => void;
  onDismiss: () => void;
};

function handlePanelKeyDown(
  event: KeyboardEvent,
  options: {
    onDismiss: () => void;
    onCloseSubmenu?: () => void;
  }
) {
  const currentTarget = event.target as HTMLElement | null;
  const menu = currentTarget?.closest('[role="menu"]');
  const activeItem = currentTarget?.closest('[role="menuitem"]') as HTMLElement | null;

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      moveMenuFocus(menu, activeItem, 1);
      return;
    case 'ArrowUp':
      event.preventDefault();
      moveMenuFocus(menu, activeItem, -1);
      return;
    case 'Home':
      event.preventDefault();
      focusMenuItem(menu, 'first');
      return;
    case 'End':
      event.preventDefault();
      focusMenuItem(menu, 'last');
      return;
    case 'ArrowLeft':
      if (!options.onCloseSubmenu) return;
      event.preventDefault();
      event.stopPropagation();
      options.onCloseSubmenu();
      return;
    case 'Escape':
      event.preventDefault();
      event.stopPropagation();
      if (options.onCloseSubmenu) {
        options.onCloseSubmenu();
        return;
      }
      options.onDismiss();
      return;
    case 'Tab':
      options.onDismiss();
      return;
    default:
      return;
  }
}

function matchesContextMenuNode(node: unknown, contextMenuId: string): boolean {
  if (!node || typeof node !== 'object') return false;

  const dataset =
    'dataset' in node
      ? (node as { dataset?: Record<string, string | undefined> }).dataset
      : undefined;
  return dataset?.floeContextMenu === contextMenuId;
}

function isEventInsideContextMenu(event: Event, contextMenuId: string): boolean {
  if (typeof event.composedPath === 'function') {
    const path = event.composedPath();
    for (const node of path) {
      if (matchesContextMenuNode(node, contextMenuId)) return true;
    }
  }

  const target = event.target;
  if (typeof Element !== 'undefined' && target instanceof Element) {
    return !!target.closest(`[data-floe-context-menu="${contextMenuId}"]`);
  }

  return false;
}

export function installContextMenuDismissListeners(options: {
  ownerWindow: ContextMenuDismissWindow;
  contextMenuId: string;
  onDismiss: () => void;
}): () => void {
  const { ownerWindow, contextMenuId, onDismiss } = options;

  const handlePointerOutside = (event: PointerEvent) => {
    if (isEventInsideContextMenu(event, contextMenuId)) return;
    onDismiss();
  };

  const handleEscape = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    onDismiss();
  };

  const handleViewportChange = () => {
    onDismiss();
  };

  ownerWindow.addEventListener('pointerdown', handlePointerOutside, true);
  ownerWindow.addEventListener('keydown', handleEscape, true);
  ownerWindow.addEventListener('resize', handleViewportChange);
  ownerWindow.addEventListener('scroll', handleViewportChange, true);

  return () => {
    ownerWindow.removeEventListener('pointerdown', handlePointerOutside, true);
    ownerWindow.removeEventListener('keydown', handleEscape, true);
    ownerWindow.removeEventListener('resize', handleViewportChange);
    ownerWindow.removeEventListener('scroll', handleViewportChange, true);
  };
}

function ContextMenuEntry(props: ContextMenuEntryProps) {
  const [submenuOpen, setSubmenuOpen] = createSignal(false);
  const [submenuPosition, setSubmenuPosition] = createSignal({ x: -9999, y: -9999 });
  let itemRef: HTMLDivElement | undefined;
  let buttonRef: HTMLButtonElement | undefined;
  let submenuRef: HTMLDivElement | undefined;
  let hoverTimeout: ReturnType<typeof setTimeout> | undefined;

  const hasChildren = () => (props.item.children?.length ?? 0) > 0;

  const updateSubmenuPosition = () => {
    if (!itemRef || !submenuRef) return;
    const parentRect = itemRef.getBoundingClientRect();
    const submenuRect = submenuRef.getBoundingClientRect();
    const pos = calculateSubmenuPosition(
      parentRect,
      submenuRect,
      props.portalLayout.boundaryRect()
    );
    setSubmenuPosition(pos);
  };

  const clearHoverTimeout = () => {
    if (!hoverTimeout) return;
    clearTimeout(hoverTimeout);
    hoverTimeout = undefined;
  };

  const openSubmenu = (focusMode: 'first' | 'last' = 'first') => {
    if (!hasChildren() || props.item.disabled) return;
    clearHoverTimeout();
    setSubmenuOpen(true);
    requestAnimationFrame(() => {
      updateSubmenuPosition();
      focusMenuItem(submenuRef, focusMode);
    });
  };

  const closeSubmenu = () => {
    clearHoverTimeout();
    setSubmenuOpen(false);
    requestAnimationFrame(() => buttonRef?.focus());
  };

  const handleMouseEnter = () => {
    if (!hasChildren() || props.item.disabled) return;
    clearHoverTimeout();
    hoverTimeout = setTimeout(() => {
      openSubmenu('first');
    }, 100);
  };

  const handleMouseLeave = () => {
    if (!hasChildren()) return;
    clearHoverTimeout();
    hoverTimeout = setTimeout(() => {
      setSubmenuOpen(false);
    }, 150);
  };

  const handleClick = (event: MouseEvent) => {
    if (props.item.disabled) return;
    if (hasChildren()) {
      event.preventDefault();
      event.stopPropagation();
      if (submenuOpen()) {
        closeSubmenu();
      } else {
        openSubmenu('first');
      }
      return;
    }
    props.onSelect(props.item, props.menu);
  };

  onCleanup(() => {
    clearHoverTimeout();
  });

  const projectedSubmenuPosition = () => props.portalLayout.projectPosition(submenuPosition());

  return (
    <div
      ref={itemRef}
      class="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        ref={buttonRef}
        onClick={handleClick}
        onKeyDown={(event) => {
          if (props.item.disabled || !hasChildren()) return;
          if (event.key === 'ArrowRight' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openSubmenu('first');
          }
        }}
        disabled={
          props.item.disabled ||
          (!hasChildren() && props.item.type === 'rename' && props.menu.items.length > 1)
        }
        class={cn(
          'w-full flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer',
          'transition-colors duration-75',
          'hover:bg-accent hover:text-accent-foreground',
          'focus:outline-none focus-visible:bg-accent focus-visible:text-accent-foreground',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent',
          props.item.type === 'delete' && 'text-error hover:bg-error/10 hover:text-error'
        )}
        role="menuitem"
        aria-haspopup={hasChildren() ? 'menu' : undefined}
        aria-expanded={hasChildren() ? submenuOpen() : undefined}
      >
        <Show when={props.item.icon}>
          {(Icon) => <Dynamic component={Icon()} class="w-3.5 h-3.5 opacity-60" />}
        </Show>
        <span class="flex-1 text-left">{props.item.label}</span>
        <Show when={props.item.shortcut && !hasChildren()}>
          <span class="text-[10px] text-muted-foreground opacity-60">{props.item.shortcut}</span>
        </Show>
        <Show when={hasChildren()}>
          <ChevronRight class="w-3 h-3 text-muted-foreground" />
        </Show>
      </button>

      <Show when={submenuOpen() && hasChildren()}>
        <Portal mount={props.portalLayout.mount()}>
          <div
            ref={submenuRef}
            class={cn(
              props.portalLayout.isSurfaceMode()
                ? 'absolute z-20 min-w-[180px] py-1'
                : 'fixed z-50 min-w-[180px] py-1',
              'bg-popover border border-border rounded-lg shadow-lg',
              'animate-in fade-in slide-in-from-left-1'
            )}
            data-floe-context-menu={props.contextMenuId}
            {...{
              [LOCAL_INTERACTION_SURFACE_ATTR]: props.portalLayout.isSurfaceMode()
                ? 'true'
                : undefined,
            }}
            style={{
              left: `${projectedSubmenuPosition().x}px`,
              top: `${projectedSubmenuPosition().y}px`,
            }}
            role="menu"
            onMouseEnter={clearHoverTimeout}
            onMouseLeave={handleMouseLeave}
            onKeyDown={(event) =>
              handlePanelKeyDown(event, {
                onDismiss: props.onDismiss,
                onCloseSubmenu: closeSubmenu,
              })
            }
          >
            <For each={props.item.children}>
              {(child) => (
                <>
                  <ContextMenuEntry
                    item={child}
                    menu={props.menu}
                    contextMenuId={props.contextMenuId}
                    portalLayout={props.portalLayout}
                    onSelect={props.onSelect}
                    onDismiss={props.onDismiss}
                  />
                  <Show when={child.separator}>
                    <div class="my-1 h-px bg-border" role="separator" />
                  </Show>
                </>
              )}
            </For>
          </div>
        </Portal>
      </Show>
    </div>
  );
}

/**
 * Context menu for file browser items
 */
export function FileContextMenu(props: FileContextMenuProps) {
  const ctx = useFileBrowser();
  let menuRef: HTMLDivElement | undefined;
  const isServer = typeof window === 'undefined' || typeof document === 'undefined';
  const contextMenuId = `floe-context-menu-${(fileContextMenuIdSeq += 1)}`;

  const [position, setPosition] = createSignal({ x: -9999, y: -9999 });
  const surfaceHost = createMemo<ResolvedSurfacePortalHost>(() =>
    ctx.contextMenu() ? resolveSurfacePortalHost() : { host: null, mode: 'global' }
  );
  const portalLayout: ContextMenuPortalLayout = {
    mount: () => resolveSurfacePortalMount(surfaceHost()),
    isSurfaceMode: () => isSurfacePortalMode(surfaceHost()),
    boundaryRect: () => resolveSurfacePortalBoundaryRect(surfaceHost()),
    projectPosition: (nextPosition) => projectSurfacePortalPosition(nextPosition, surfaceHost()),
  };

  const menuItems = () => {
    if (props.overrideItems) {
      return props.overrideItems;
    }

    const resolveHideItems = (): BuiltinContextMenuAction[] => {
      const hideItems = props.hideItems;
      if (!hideItems) return [];
      if (typeof hideItems === 'function') {
        const targetItems = ctx.contextMenu()?.items ?? [];
        return hideItems(targetItems);
      }
      return hideItems;
    };

    let items = createDefaultContextMenuItems(props.callbacks);
    const hiddenTypes = resolveHideItems();
    if (hiddenTypes.length > 0) {
      items = items.filter((item) => !hiddenTypes.includes(item.type as BuiltinContextMenuAction));
    }

    if (props.customItems?.length) {
      items = [...items, ...props.customItems];
    }

    return items;
  };

  const handleItemSelect = (item: ContextMenuItem, event: ContextMenuEvent) => {
    ctx.hideContextMenu();

    const items = [...event.items];
    const callbacks = props.callbacks;
    deferAfterPaint(() => {
      dispatchContextMenuAction(item, items, callbacks, event);
    });
  };

  const calculateAdjustedPosition = () => {
    const menu = ctx.contextMenu();
    if (!menu || !menuRef) return { x: menu?.x ?? 0, y: menu?.y ?? 0 };

    const rect = menuRef.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return { x: menu.x, y: menu.y };
    }

    return clampMenuPosition({ x: menu.x, y: menu.y }, rect, portalLayout.boundaryRect());
  };

  createEffect(() => {
    if (isServer || !ctx.contextMenu()) return;
    const cleanup = installContextMenuDismissListeners({
      ownerWindow: window,
      contextMenuId,
      onDismiss: ctx.hideContextMenu,
    });

    onCleanup(() => {
      cleanup();
    });
  });

  createEffect(() => {
    const menu = ctx.contextMenu();
    if (!menu) {
      setPosition({ x: -9999, y: -9999 });
      return;
    }

    setPosition({ x: menu.x, y: menu.y });

    requestAnimationFrame(() => {
      const adjusted = calculateAdjustedPosition();
      setPosition(adjusted);
      focusMenuItem(menuRef, 'first');
    });
  });

  const projectedPosition = () => portalLayout.projectPosition(position());

  const MenuPanel = (panelProps: { menu: () => ContextMenuEvent }) => (
    <div
      ref={menuRef}
      class={cn(
        portalLayout.isSurfaceMode()
          ? 'absolute z-20 min-w-[180px] py-1'
          : 'fixed z-50 min-w-[180px] py-1',
        'bg-popover border border-border rounded-lg shadow-lg',
        'animate-in fade-in zoom-in-95 duration-100'
      )}
      data-floe-context-menu={contextMenuId}
      {...{ [LOCAL_INTERACTION_SURFACE_ATTR]: portalLayout.isSurfaceMode() ? 'true' : undefined }}
      style={{
        left: `${projectedPosition().x}px`,
        top: `${projectedPosition().y}px`,
      }}
      role="menu"
      aria-orientation="vertical"
      onKeyDown={(event) => handlePanelKeyDown(event, { onDismiss: ctx.hideContextMenu })}
    >
      <For each={menuItems()}>
        {(item) => (
          <>
            <ContextMenuEntry
              item={item}
              menu={panelProps.menu()}
              contextMenuId={contextMenuId}
              portalLayout={portalLayout}
              onSelect={handleItemSelect}
              onDismiss={ctx.hideContextMenu}
            />
            <Show when={item.separator}>
              <div class="my-1 h-px bg-border" role="separator" />
            </Show>
          </>
        )}
      </For>
    </div>
  );

  return (
    <Show when={ctx.contextMenu()}>
      {(menu) =>
        isServer ? (
          <MenuPanel menu={menu} />
        ) : (
          <Portal mount={portalLayout.mount()}>
            <MenuPanel menu={menu} />
          </Portal>
        )
      }
    </Show>
  );
}
