import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  on,
  untrack,
  type JSX,
} from 'solid-js';
import { Portal, Dynamic } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { deferAfterPaint } from '../../utils/defer';
import { ChevronRight, ChevronLeft } from '../icons';
import {
  clampMenuPosition,
  calculateSubmenuPosition,
  focusMenuItem,
  moveMenuFocus,
  type MenuBoundaryRect,
} from '../ui/menuUtils';
import {
  CANVAS_WHEEL_INTERACTIVE_ATTR,
  LOCAL_INTERACTION_SURFACE_ATTR,
} from '../ui/localInteractionSurface';
import {
  isSurfacePortalMode,
  projectSurfacePortalPosition,
  resolveSurfacePortalHost,
  resolveSurfacePortalMount,
  resolveSurfacePortalScale,
  type ResolvedSurfacePortalHost,
} from '../ui/surfacePortalScope';
import {
  readSurfaceSafeArea,
  resolveFloatingBoundary,
  type SurfaceFloatingBoundary,
} from '../ui/surfaceFloatingBoundary';
import { readFreshInteractionSnapshot } from '../ui/dialogSurfaceScope';
import { useResolvedFloeConfig } from '../../context/FloeConfigContext';
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
  /** Intersect the owner surface and visible viewport with this client-coordinate boundary. */
  boundary?: SurfaceFloatingBoundary;
  /** Stable trigger used for ownership and Escape/Tab focus restoration. */
  owner?: HTMLElement | null;
  /** Localized label for returning from a compact submenu. */
  backLabel?: string;
  /** Additional attributes for the real constrained menu scroll viewport. */
  scrollViewportProps?: JSX.HTMLAttributes<HTMLDivElement>;
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
  sizeStyle: () => JSX.CSSProperties;
  touch: () => boolean;
  enterChild: (path: ContextMenuItem[], focusMode: 'first' | 'last') => void;
  scrollViewportProps: () => JSX.HTMLAttributes<HTMLDivElement> | undefined;
  projectPosition: (
    position: Readonly<{ x: number; y: number }>
  ) => Readonly<{ x: number; y: number }>;
}>;

type ContextMenuPlacementPhase = 'closed' | 'measuring' | 'positioned';

type ContextMenuPlacementState = Readonly<{
  phase: ContextMenuPlacementPhase;
  requestId: number;
  anchor: Readonly<{ x: number; y: number }>;
  position: Readonly<{ x: number; y: number }>;
}>;

const OFFSCREEN_MENU_POSITION = { x: -9999, y: -9999 } as const;

function createMenuPlacement(
  phase: ContextMenuPlacementPhase,
  requestId = 0,
  anchor: Readonly<{ x: number; y: number }> = OFFSCREEN_MENU_POSITION,
  position: Readonly<{ x: number; y: number }> = anchor
): ContextMenuPlacementState {
  return { phase, requestId, anchor, position };
}

function isMenuPositioned(placement: ContextMenuPlacementState): boolean {
  return placement.phase === 'positioned';
}

function scheduleMenuPlacement(callback: FrameRequestCallback): number | undefined {
  if (typeof requestAnimationFrame !== 'function') {
    callback(0);
    return undefined;
  }

  return requestAnimationFrame(callback);
}

function cancelMenuPlacement(frame: number | undefined): void {
  if (frame === undefined || typeof cancelAnimationFrame !== 'function') return;
  cancelAnimationFrame(frame);
}

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
  path: ContextMenuItem[];
  scrollRevision: number;
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
  onDismiss: (reason?: 'escape') => void;
}): () => void {
  const { ownerWindow, contextMenuId, onDismiss } = options;

  const handlePointerOutside = (event: PointerEvent) => {
    if (isEventInsideContextMenu(event, contextMenuId)) return;
    onDismiss();
  };

  const handleEscape = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || isEventInsideContextMenu(event, contextMenuId)) return;
    onDismiss('escape');
  };

  const handleViewportChange = (event: Event) => {
    if (!isEventInsideContextMenu(event, contextMenuId)) onDismiss();
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
  const [submenuPlacement, setSubmenuPlacement] = createSignal<ContextMenuPlacementState>(
    createMenuPlacement('closed', 0)
  );
  let itemRef: HTMLDivElement | undefined;
  let buttonRef: HTMLButtonElement | undefined;
  let submenuRef: HTMLDivElement | undefined;
  let hoverTimeout: ReturnType<typeof setTimeout> | undefined;
  let submenuPlacementFrame: number | undefined;
  let submenuPlacementRequestId = 0;
  let restoreFocusFrame: number | undefined;

  const [submenuScrollRevision, setSubmenuScrollRevision] = createSignal(0);
  createEffect(() => {
    void props.scrollRevision;
    untrack(() => closeSubmenu({ restoreFocus: false }));
  });

  const hasChildren = () => (props.item.children?.length ?? 0) > 0;
  const submenuIsOpen = () => submenuPlacement().phase !== 'closed';
  const submenuIsPositioned = () => isMenuPositioned(submenuPlacement());

  const resolveSubmenuAnchor = () => {
    if (!itemRef) return OFFSCREEN_MENU_POSITION;
    const parentRect = itemRef.getBoundingClientRect();
    return { x: parentRect.right, y: parentRect.top };
  };

  const calculateAdjustedSubmenuPosition = (
    fallback: Readonly<{ x: number; y: number }>,
    boundaryRect: MenuBoundaryRect
  ) => {
    if (!itemRef || !submenuRef) return fallback;
    const parentRect = itemRef.getBoundingClientRect();
    const submenuRect = submenuRef.getBoundingClientRect();
    return calculateSubmenuPosition(parentRect, submenuRect, boundaryRect);
  };

  const clearHoverTimeout = () => {
    if (!hoverTimeout) return;
    clearTimeout(hoverTimeout);
    hoverTimeout = undefined;
  };

  const cancelSubmenuPlacementFrame = () => {
    cancelMenuPlacement(submenuPlacementFrame);
    submenuPlacementFrame = undefined;
  };

  const cancelRestoreFocusFrame = () => {
    cancelMenuPlacement(restoreFocusFrame);
    restoreFocusFrame = undefined;
  };

  const openSubmenu = (focusMode: 'first' | 'last' = 'first') => {
    if (!hasChildren() || props.item.disabled) return;
    clearHoverTimeout();
    cancelSubmenuPlacementFrame();
    cancelRestoreFocusFrame();

    if (props.portalLayout.touch()) {
      props.portalLayout.enterChild([...props.path, props.item], focusMode);
      return;
    }

    const requestId = ++submenuPlacementRequestId;
    const anchor = resolveSubmenuAnchor();
    const readBoundaryRect = props.portalLayout.boundaryRect;
    setSubmenuPlacement(createMenuPlacement('measuring', requestId, anchor));

    submenuPlacementFrame = scheduleMenuPlacement(() =>
      untrack(() => {
        submenuPlacementFrame = undefined;
        if (submenuPlacementRequestId !== requestId) return;

        const boundary = readBoundaryRect();
        const parent = itemRef?.getBoundingClientRect();
        const child = submenuRef?.getBoundingClientRect();
        if (
          parent &&
          child &&
          child.width > 0 &&
          Math.max(boundary.right - parent.right - 8, parent.left - boundary.left - 8) < child.width
        ) {
          closeSubmenu({ restoreFocus: false });
          props.portalLayout.enterChild([...props.path, props.item], focusMode);
          return;
        }
        const adjusted = calculateAdjustedSubmenuPosition(anchor, boundary);
        setSubmenuPlacement(createMenuPlacement('positioned', requestId, anchor, adjusted));
        focusMenuItem(submenuRef, focusMode);
      })
    );
  };

  const closeSubmenu = (options: { restoreFocus?: boolean } = {}) => {
    clearHoverTimeout();
    cancelSubmenuPlacementFrame();
    setSubmenuPlacement(createMenuPlacement('closed', ++submenuPlacementRequestId));

    if (options.restoreFocus ?? true) {
      cancelRestoreFocusFrame();
      restoreFocusFrame = scheduleMenuPlacement(() => {
        restoreFocusFrame = undefined;
        buttonRef?.focus();
      });
    }
  };

  const handleMouseEnter = () => {
    if (!hasChildren() || props.item.disabled || props.portalLayout.touch()) return;
    clearHoverTimeout();
    hoverTimeout = setTimeout(() => {
      openSubmenu('first');
    }, 100);
  };

  const handleMouseLeave = () => {
    if (!hasChildren()) return;
    clearHoverTimeout();
    hoverTimeout = setTimeout(() => {
      closeSubmenu({ restoreFocus: false });
    }, 150);
  };

  const handleClick = (event: MouseEvent) => {
    if (props.item.disabled) return;
    if (hasChildren()) {
      event.preventDefault();
      event.stopPropagation();
      if (submenuIsOpen()) {
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
    cancelSubmenuPlacementFrame();
    cancelRestoreFocusFrame();
  });

  const projectedSubmenuPosition = () =>
    props.portalLayout.projectPosition(submenuPlacement().position);

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
        data-file-menu-item={props.item.id}
        style={{ 'min-height': props.portalLayout.touch() ? '44px' : undefined }}
        role="menuitem"
        aria-haspopup={hasChildren() ? 'menu' : undefined}
        aria-expanded={hasChildren() ? submenuIsOpen() : undefined}
      >
        <Show when={props.item.icon}>
          {(Icon) => <Dynamic component={Icon()} class="w-3.5 h-3.5 shrink-0 opacity-60" />}
        </Show>
        <span class="min-w-0 flex-1 text-left [overflow-wrap:anywhere]">{props.item.label}</span>
        <Show when={props.item.shortcut && !hasChildren()}>
          <span class="shrink-0 text-[10px] text-muted-foreground opacity-60">
            {props.item.shortcut}
          </span>
        </Show>
        <Show when={hasChildren()}>
          <ChevronRight class="w-3 h-3 shrink-0 text-muted-foreground" />
        </Show>
      </button>

      <Show when={submenuIsOpen() && hasChildren()}>
        <Portal mount={props.portalLayout.mount()}>
          <div
            {...props.portalLayout.scrollViewportProps()}
            ref={submenuRef}
            onScroll={() => setSubmenuScrollRevision((value) => value + 1)}
            class={cn(
              props.portalLayout.isSurfaceMode() ? 'absolute z-20 py-1' : 'fixed z-50 py-1',
              'bg-popover border border-border rounded-lg shadow-lg overflow-y-auto overscroll-contain touch-pan-y motion-reduce:animate-none',
              submenuIsPositioned() && 'animate-in fade-in slide-in-from-left-1'
            )}
            data-floe-context-menu={props.contextMenuId}
            {...{
              [CANVAS_WHEEL_INTERACTIVE_ATTR]: 'true',
              [LOCAL_INTERACTION_SURFACE_ATTR]: props.portalLayout.isSurfaceMode()
                ? 'true'
                : undefined,
            }}
            style={{
              ...props.portalLayout.sizeStyle(),
              left: `${projectedSubmenuPosition().x}px`,
              top: `${projectedSubmenuPosition().y}px`,
              visibility: submenuIsPositioned() ? 'visible' : 'hidden',
              'pointer-events': submenuIsPositioned() ? 'auto' : 'none',
            }}
            role="menu"
            aria-hidden={submenuIsPositioned() ? undefined : 'true'}
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
                    path={[...props.path, props.item]}
                    scrollRevision={submenuScrollRevision()}
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
  const config = useResolvedFloeConfig();
  const [touch, setTouch] = createSignal(false);
  const [inlinePath, setInlinePath] = createSignal<ContextMenuItem[]>([]);
  const [scrollRevision, setScrollRevision] = createSignal(0);
  let focusAnchor: HTMLElement | null = null;
  let requestedFocus: string | 'first' | 'last' = 'first';
  let menuRef: HTMLDivElement | undefined;
  const isServer = typeof window === 'undefined' || typeof document === 'undefined';
  const contextMenuId = `floe-context-menu-${(fileContextMenuIdSeq += 1)}`;

  const [placement, setPlacement] = createSignal<ContextMenuPlacementState>(
    createMenuPlacement('closed')
  );
  let placementFrame: number | undefined;
  let placementRequestId = 0;
  const surfaceHost = createMemo<ResolvedSurfacePortalHost>(() =>
    ctx.contextMenu()
      ? resolveSurfacePortalHost({ owner: props.owner })
      : { host: null, boundaryHost: null, mountHost: null, mode: 'global' }
  );
  const safeArea = createMemo(() => {
    ctx.contextMenu();
    return readSurfaceSafeArea();
  });
  const readBoundary = () => resolveFloatingBoundary(surfaceHost(), props.boundary, safeArea());
  const portalLayout: ContextMenuPortalLayout = {
    mount: () => resolveSurfacePortalMount(surfaceHost()),
    isSurfaceMode: () => isSurfacePortalMode(surfaceHost()),
    boundaryRect: () =>
      readBoundary() ?? { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 },
    touch,
    scrollViewportProps: () => props.scrollViewportProps,
    enterChild: (path, focusMode) => {
      requestedFocus = focusMode;
      setInlinePath(path);
    },
    sizeStyle: () => {
      const boundary = readBoundary();
      const scale = resolveSurfacePortalScale(surfaceHost());
      const width = Math.max(0, (boundary?.width ?? 0) - 16) / scale.x;
      return {
        width: 'max-content',
        'transition-property': 'none',
        'animation-duration': '100ms',
        'min-width': `${Math.min(180, width)}px`,
        'max-width': `${width}px`,
        'max-height': `${Math.max(0, (boundary?.height ?? 0) - 16) / scale.y}px`,
      };
    },
    projectPosition: (nextPosition) => projectSurfacePortalPosition(nextPosition, surfaceHost()),
  };

  const menuItems = () => {
    const parent = inlinePath().at(-1);
    if (parent) return parent.children ?? [];
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

  const dismiss = (restoreFocus = false) => {
    const anchor = focusAnchor;
    ctx.hideContextMenu();
    if (restoreFocus && anchor?.isConnected) anchor.focus({ preventScroll: true });
  };
  const goBack = () => {
    requestedFocus = inlinePath().at(-1)?.id ?? 'first';
    setInlinePath((path) => path.slice(0, -1));
  };

  const handleItemSelect = (item: ContextMenuItem, event: ContextMenuEvent) => {
    ctx.hideContextMenu();

    const items = [...event.items];
    const callbacks = props.callbacks;
    deferAfterPaint(() => {
      dispatchContextMenuAction(item, items, callbacks, event);
    });
  };

  const calculateAdjustedPosition = (anchor: Readonly<{ x: number; y: number }>) => {
    if (!menuRef) return anchor;

    const rect = menuRef.getBoundingClientRect();
    return clampMenuPosition(anchor, rect, portalLayout.boundaryRect());
  };

  const cancelPlacementFrame = () => {
    cancelMenuPlacement(placementFrame);
    placementFrame = undefined;
  };

  createEffect(() => {
    if (isServer || !ctx.contextMenu()) return;
    const cleanup = installContextMenuDismissListeners({
      ownerWindow: window,
      contextMenuId,
      onDismiss: (reason) => dismiss(reason === 'escape'),
    });

    onCleanup(() => {
      cleanup();
    });
  });

  createEffect(() => {
    const menu = ctx.contextMenu();
    untrack(() => {
      setInlinePath([]);
      requestedFocus = 'first';
      const target = readFreshInteractionSnapshot()?.target;
      const trigger = target?.closest('button, [tabindex], a[href]') ?? target;
      focusAnchor =
        props.owner ??
        (trigger instanceof HTMLElement
          ? trigger
          : !isServer && document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null);
      setTouch(
        typeof window !== 'undefined' &&
          Boolean(
            window.matchMedia?.(`${config.config.layout.mobileQuery}, (pointer: coarse)`).matches
          )
      );
    });
    if (!menu) {
      cancelPlacementFrame();
      setPlacement(createMenuPlacement('closed', ++placementRequestId));
    }
  });

  createEffect(() => {
    const menu = ctx.contextMenu();
    inlinePath();
    void props.boundary;
    if (!menu) return;
    cancelPlacementFrame();
    const requestId = ++placementRequestId;
    const anchor = { x: menu.x, y: menu.y };
    setPlacement(createMenuPlacement('measuring', requestId, anchor));
    placementFrame = scheduleMenuPlacement(() =>
      untrack(() => {
        placementFrame = undefined;
        if (placementRequestId !== requestId) return;
        const boundary = readBoundary();
        if (
          !boundary ||
          (props.boundary !== undefined && (boundary.width <= 16 || boundary.height <= 16))
        ) {
          dismiss();
          return;
        }
        const adjusted = calculateAdjustedPosition(anchor);
        setPlacement(createMenuPlacement('positioned', requestId, anchor, adjusted));
        const focus = requestedFocus;
        const target = Array.from(
          menuRef?.querySelectorAll<HTMLElement>('[data-file-menu-item]') ?? []
        ).find((item) => item.dataset.fileMenuItem === focus);
        if (target) target.focus({ preventScroll: true });
        else focusMenuItem(menuRef, focus === 'last' ? 'last' : 'first');
        requestedFocus = 'first';
      })
    );
  });

  createEffect(
    on(
      () => props.boundary,
      () => {
        if (ctx.contextMenu()) dismiss();
      },
      { defer: true }
    )
  );

  createEffect(() => {
    if (!ctx.contextMenu() || isServer) return;
    const onViewportChange = () => dismiss();
    window.visualViewport?.addEventListener('resize', onViewportChange);
    window.visualViewport?.addEventListener('scroll', onViewportChange);
    window.addEventListener('blur', onViewportChange);
    const onFocusOutside = (event: FocusEvent) => {
      if (isMenuPositioned(placement()) && !isEventInsideContextMenu(event, contextMenuId))
        dismiss();
    };
    document.addEventListener('focusin', onFocusOutside, true);
    const boundary = props.boundary;
    const elements = [
      surfaceHost().boundaryHost,
      boundary instanceof HTMLElement ? boundary : null,
    ].filter((el): el is HTMLElement => Boolean(el));
    const initialRects = elements.map((el) => el.getBoundingClientRect());
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            if (
              elements.some((el, i) => {
                const rect = el.getBoundingClientRect();
                return (
                  rect.width !== initialRects[i]!.width || rect.height !== initialRects[i]!.height
                );
              })
            )
              dismiss();
          });
    elements.forEach((el) => observer?.observe(el));
    const visibilityOwner = props.owner ?? focusAnchor ?? elements[0];
    const ancestors: HTMLElement[] = [];
    for (
      let node: HTMLElement | null | undefined = visibilityOwner;
      node;
      node = node.parentElement
    )
      ancestors.push(node);
    const visibilityObserver =
      typeof MutationObserver === 'undefined'
        ? null
        : new MutationObserver(() => {
            if (
              ancestors.some(
                (node) =>
                  !node.isConnected ||
                  node.inert ||
                  node.hidden ||
                  node.getAttribute('aria-hidden') === 'true' ||
                  getComputedStyle(node).display === 'none' ||
                  getComputedStyle(node).visibility === 'hidden'
              )
            )
              dismiss();
          });
    ancestors.forEach((node) =>
      visibilityObserver?.observe(node, {
        attributes: true,
        attributeFilter: ['hidden', 'inert', 'aria-hidden', 'style', 'class'],
      })
    );
    onCleanup(() => {
      observer?.disconnect();
      visibilityObserver?.disconnect();
      document.removeEventListener('focusin', onFocusOutside, true);
      window.visualViewport?.removeEventListener('resize', onViewportChange);
      window.visualViewport?.removeEventListener('scroll', onViewportChange);
      window.removeEventListener('blur', onViewportChange);
    });
  });

  onCleanup(() => {
    cancelPlacementFrame();
  });

  const isPositioned = () => isMenuPositioned(placement());
  const projectedPosition = () => portalLayout.projectPosition(placement().position);

  const MenuPanel = (panelProps: { menu: () => ContextMenuEvent }) => (
    <div
      {...props.scrollViewportProps}
      ref={menuRef}
      onScroll={() => setScrollRevision((value) => value + 1)}
      class={cn(
        portalLayout.isSurfaceMode() ? 'absolute z-20 py-1' : 'fixed z-50 py-1',
        'bg-popover border border-border rounded-lg shadow-lg overflow-y-auto overscroll-contain touch-pan-y motion-reduce:animate-none',
        isPositioned() && (touch() ? 'animate-in fade-in' : 'animate-in fade-in zoom-in-95')
      )}
      data-floe-context-menu={contextMenuId}
      {...{
        [CANVAS_WHEEL_INTERACTIVE_ATTR]: 'true',
        [LOCAL_INTERACTION_SURFACE_ATTR]: portalLayout.isSurfaceMode() ? 'true' : undefined,
      }}
      style={{
        ...portalLayout.sizeStyle(),
        left: `${projectedPosition().x}px`,
        top: `${projectedPosition().y}px`,
        visibility: isPositioned() ? 'visible' : 'hidden',
        'pointer-events': isPositioned() ? 'auto' : 'none',
      }}
      role="menu"
      aria-hidden={isPositioned() ? undefined : 'true'}
      aria-orientation="vertical"
      onKeyDown={(event) =>
        handlePanelKeyDown(event, {
          onDismiss: () => dismiss(event.key === 'Escape' || event.key === 'Tab'),
          onCloseSubmenu: inlinePath().length ? goBack : undefined,
        })
      }
      onContextMenu={(event) => event.preventDefault()}
    >
      <Show when={inlinePath().length > 0}>
        <button
          type="button"
          role="menuitem"
          class="flex w-full items-center gap-2 border-b px-3 py-1.5 text-xs cursor-pointer hover:bg-accent focus-visible:bg-accent focus:outline-none"
          style={{ 'min-height': touch() ? '44px' : undefined }}
          onClick={goBack}
        >
          <ChevronLeft class="h-3.5 w-3.5 shrink-0" />
          <span>{props.backLabel ?? 'Back'}</span>
          <span class="min-w-0 flex-1 truncate text-right text-muted-foreground">
            {inlinePath().at(-1)?.label}
          </span>
        </button>
      </Show>
      <For each={menuItems()}>
        {(item) => (
          <>
            <ContextMenuEntry
              item={item}
              path={inlinePath()}
              scrollRevision={scrollRevision()}
              menu={panelProps.menu()}
              contextMenuId={contextMenuId}
              portalLayout={portalLayout}
              onSelect={handleItemSelect}
              onDismiss={() => dismiss(true)}
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
