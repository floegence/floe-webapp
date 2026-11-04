import { createControllableValue } from './controllable';
import { useFloeLocale } from '../../context/LocaleContext';
import { createSignal, Show, Index, type Accessor, type JSX, createEffect, createMemo, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { deferNonBlocking } from '../../utils/defer';
import { ChevronRight, Check } from '../icons';
import {
  calculateMenuPosition,
  calculateSubmenuPosition,
  focusMenuItem,
  MENU_ITEM_SELECTOR,
  moveMenuFocus,
  type MenuBoundaryRect,
} from './menuUtils';
import { LOCAL_INTERACTION_SURFACE_ATTR } from './localInteractionSurface';
import {
  isSurfacePortalMode,
  projectSurfacePortalPosition,
  resolveSurfacePortalBoundaryRect,
  resolveSurfacePortalHost,
  resolveSurfacePortalMount,
  type ResolvedSurfacePortalHost,
} from './surfacePortalScope';
import { createFloatingPresence } from './floatingPresence';
import { useOverlayMask } from '../../hooks/useOverlayMask';

export interface DropdownItem {
  id: string;
  label: string;
  icon?: () => JSX.Element;
  /** Visual emphasis for destructive actions. */
  tone?: 'default' | 'danger';
  disabled?: boolean;
  separator?: boolean;
  /** Submenu items for cascade dropdown */
  children?: DropdownItem[];
  /** Custom content to render instead of label (for embedding components) */
  content?: () => JSX.Element;
  /** Prevent closing menu when clicking this item */
  keepOpen?: boolean;
}

export interface DropdownProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger: JSX.Element;
  triggerClass?: string;
  triggerAriaLabel?: string;
  triggerAriaLabelledBy?: string;
  triggerAriaDescribedBy?: string;
  /** Treat the existing trigger boundary as a field (used by Select). */
  triggerInputSurface?: boolean;
  items: DropdownItem[] | Accessor<DropdownItem[]>;
  value?: string;
  onSelect: (id: string) => void;
  align?: 'start' | 'center' | 'end';
  disabled?: boolean;
  class?: string;
}

type DropdownPortalLayout = Readonly<{
  mount: () => HTMLElement | undefined;
  isSurfaceMode: () => boolean;
  boundaryRect: () => MenuBoundaryRect;
  projectPosition: (
    position: Readonly<{ x: number; y: number }>
  ) => Readonly<{ x: number; y: number }>;
}>;

let dropdownIdSeq = 0;
let dropdownMenuItemIdSeq = 0;

export type DropdownFocusMode = 'first' | 'last' | 'selected';

export interface DropdownTriggerAction {
  nextOpen: boolean;
  focusMode?: DropdownFocusMode;
}

export function resolveDropdownTriggerKeyAction(
  key: string,
  options: { open: boolean; hasSelection: boolean }
): DropdownTriggerAction | null {
  switch (key) {
    case 'Enter':
    case ' ':
      if (options.open) return { nextOpen: false };
      return {
        nextOpen: true,
        focusMode: options.hasSelection ? 'selected' : 'first',
      };
    case 'ArrowDown':
      return {
        nextOpen: true,
        focusMode: options.hasSelection ? 'selected' : 'first',
      };
    case 'ArrowUp':
      return { nextOpen: true, focusMode: 'last' };
    default:
      return null;
  }
}

/**
 * Dropdown menu component with cascade submenu support
 */
export function Dropdown(props: DropdownProps) {
  const locale = useFloeLocale();
  const [open, setOpen] = createControllableValue({ value: () => props.open, defaultValue: props.defaultOpen ?? false, onChange: value => props.onOpenChange?.(value) });
  const menuPresence = createFloatingPresence({
    open,
    element: () => menuRef,
  });
  const [menuPosition, setMenuPosition] = createSignal({ x: -9999, y: -9999 });
  const [menuSide, setMenuSide] = createSignal<'top' | 'bottom'>('bottom');
  let triggerRef: HTMLDivElement | undefined;
  let menuRef: HTMLDivElement | undefined;
  const dropdownId = `floe-dropdown-${(dropdownIdSeq += 1)}`;
  const menuId = `${dropdownId}-menu`;
  const items = () => typeof props.items === 'function' ? props.items() : props.items;
  const surfaceHost = createMemo<ResolvedSurfacePortalHost>(() =>
    menuPresence.mounted()
      ? resolveSurfacePortalHost({ owner: triggerRef })
      : { host: null, boundaryHost: null, mountHost: null, mode: 'global' }
  );
  const portalLayout: DropdownPortalLayout = {
    mount: () => resolveSurfacePortalMount(surfaceHost()),
    isSurfaceMode: () => isSurfacePortalMode(surfaceHost()),
    boundaryRect: () => resolveSurfacePortalBoundaryRect(surfaceHost()),
    projectPosition: (position) => projectSurfacePortalPosition(position, surfaceHost()),
  };

  const dismissMenu = () => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef?.focus());
  };
  useOverlayMask({
    open: menuPresence.mounted,
    root: () => menuRef,
    containsTarget: (target) => {
      const element = target instanceof Element ? target : document.activeElement;
      return Boolean(element?.closest(`[data-floe-dropdown="${dropdownId}"]`));
    },
    onClose: dismissMenu,
    onEscapeOutside: dismissMenu,
    lockBodyScroll: false,
    trapFocus: false,
    autoFocus: false,
    restoreFocus: false,
    blockHotkeys: false,
    closeOnEscape: 'inside',
    escapeKeyPhase: 'bubble',
  });

  // Update menu position
  const updateMenuPosition = () => {
    if (!triggerRef || !menuRef) return;
    const triggerRect = triggerRef.getBoundingClientRect();
    const menuRect = menuRef.getBoundingClientRect();
    const pos = calculateMenuPosition(
      triggerRect,
      menuRect,
      locale.direction === 'rtl' ? (props.align === 'end' ? 'start' : props.align === 'center' ? 'center' : 'end') : props.align ?? 'start',
      portalLayout.boundaryRect()
    );
    setMenuSide(pos.y < triggerRect.top ? 'top' : 'bottom');
    setMenuPosition(pos);
  };

  // Close on click outside (including portal-rendered submenus)
  createEffect(() => {
    if (!menuPresence.mounted()) {
      setMenuPosition({ x: -9999, y: -9999 });
      return;
    }
    if (!open()) return;

    const handleClickOutside = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && typeof target.closest === 'function') {
        if (target.closest(`[data-floe-dropdown="${dropdownId}"]`)) return;
      }
      setOpen(false);
    };

    document.addEventListener('pointerdown', handleClickOutside, true);

    // Initial positioning + focus after mount
    requestAnimationFrame(() => {
      updateMenuPosition();
      focusMenuItem(menuRef, props.value ? 'selected' : 'first');
    });

    onCleanup(() => {
      document.removeEventListener('pointerdown', handleClickOutside, true);
    });
  });

  const handleSelect = (item: DropdownItem) => {
    const onSelect = props.onSelect;
    if (!item.keepOpen) {
      setOpen(false);
      // A deferred action may open a dialog. Give it a durable return target
      // before the selected menu item leaves the document.
      triggerRef?.focus({ preventScroll: true });
    }
    deferNonBlocking(() => onSelect(item.id));
  };

  const setOpenWithFocus = (
    nextOpen: boolean,
    focusMode: 'first' | 'last' | 'selected' = 'first'
  ) => {
    if (props.disabled) return;
    setOpen(nextOpen);
    if (!nextOpen) return;
    requestAnimationFrame(() => {
      updateMenuPosition();
      focusMenuItem(menuRef, focusMode);
    });
  };

  const handleTriggerKeyDown = (event: KeyboardEvent) => {
    if (props.disabled) return;
    const action = resolveDropdownTriggerKeyAction(event.key, {
      open: open(),
      hasSelection: Boolean(props.value),
    });
    if (!action) return;
    event.preventDefault();
    if (!action.nextOpen) {
      setOpen(false);
      return;
    }
    setOpenWithFocus(true, action.focusMode ?? 'first');
  };

  const handleMenuKeyDown = (event: KeyboardEvent) => {
    const currentTarget = event.target as HTMLElement | null;
    const menu = currentTarget?.closest('[role="menu"]');
    const activeItem = currentTarget?.closest(MENU_ITEM_SELECTOR) as HTMLElement | null;

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
      case 'Tab':
        event.preventDefault();
        setOpen(false);
        triggerRef?.focus();
        return;
      default:
        return;
    }
  };

  return (
    <div class={cn('relative inline-block', props.class)} data-floe-dropdown={dropdownId}>
      {/* Trigger */}
      <div
        ref={triggerRef}
        onClick={() => {
          if (props.disabled) return;
          if (open()) {
            setOpen(false);
            return;
          }
          setOpenWithFocus(true, props.value ? 'selected' : 'first');
        }}
        onKeyDown={handleTriggerKeyDown}
        class={cn(
          'cursor-pointer',
          props.triggerClass,
          props.disabled && 'pointer-events-none opacity-50'
        )}
        role="button"
        tabIndex={props.disabled ? -1 : 0}
        aria-haspopup="menu"
        aria-expanded={open()}
        aria-controls={menuId}
        aria-label={props.triggerAriaLabel}
        aria-labelledby={props.triggerAriaLabelledBy}
        aria-describedby={props.triggerAriaDescribedBy}
        aria-disabled={props.disabled ? 'true' : undefined}
        data-floe-dropdown-trigger=""
        data-floe-input-surface={props.triggerInputSurface ? 'true' : undefined}
        data-floe-surface={props.triggerInputSurface ? 'inset' : undefined}
      >
        {props.trigger}
      </div>

      {/* Menu - rendered via Portal */}
      <Show when={menuPresence.mounted()}>
        <Portal mount={portalLayout.mount()}>
          <div
            ref={(node) => {
              menuRef = node;
              queueMicrotask(() => { if (node.isConnected) updateMenuPosition(); });
            }}
            class={cn(
              portalLayout.isSurfaceMode()
                ? 'absolute z-20 min-w-36'
                : 'fixed z-50 min-w-36',
              'bg-popover text-popover-foreground p-1',
              'rounded-panel border border-[var(--floe-line)]',
              'shadow-[var(--floe-elevation-float)]',
              'floe-floating-presence floe-floating-menu'
            )}
            data-floe-dropdown={dropdownId}
            data-floating-presence={menuPresence.state()}
            data-floating-side={menuSide()}
            aria-hidden={menuPresence.exiting() ? 'true' : undefined}
            {...{
              [LOCAL_INTERACTION_SURFACE_ATTR]: portalLayout.isSurfaceMode() ? 'true' : undefined,
            }}
            style={{
              left: `${portalLayout.projectPosition(menuPosition()).x}px`,
              top: `${portalLayout.projectPosition(menuPosition()).y}px`,
            }}
            role="menu"
            data-floe-surface="floating"
            id={menuId}
            onKeyDown={handleMenuKeyDown}
          >
            <Index each={items()}>
              {(item) => (
                <Show
                  when={!item().separator}
                  fallback={<div class="my-1 h-px bg-border" role="separator" />}
                >
                  <DropdownMenuItem
                    item={item()}
                    selected={props.value === item().id}
                    onSelect={handleSelect}
                    onCloseMenu={() => setOpen(false)}
                    dropdownId={dropdownId}
                    portalLayout={portalLayout}
                  />
                </Show>
              )}
            </Index>
          </div>
        </Portal>
      </Show>
    </div>
  );
}

interface DropdownMenuItemProps {
  item: DropdownItem;
  selected: boolean;
  onSelect: (item: DropdownItem) => void;
  onCloseMenu: () => void;
  dropdownId: string;
  portalLayout: DropdownPortalLayout;
}

function DropdownMenuItem(props: DropdownMenuItemProps) {
  const [submenuOpen, setSubmenuOpen] = createSignal(false);
  const hasChildren = () => props.item.children && props.item.children.length > 0;
  const submenuActive = () => Boolean(submenuOpen() && hasChildren());
  const submenuPresence = createFloatingPresence({
    open: submenuActive,
    element: () => submenuRef,
  });
  const [submenuPosition, setSubmenuPosition] = createSignal({ x: -9999, y: -9999 });
  const [submenuSide, setSubmenuSide] = createSignal<'left' | 'right'>('right');
  let itemRef: HTMLDivElement | undefined;
  let buttonRef: HTMLButtonElement | undefined;
  let submenuRef: HTMLDivElement | undefined;
  let hoverTimeout: ReturnType<typeof setTimeout> | undefined;
  const menuItemId = `floe-dropdown-item-${(dropdownMenuItemIdSeq += 1)}`;

  createEffect(() => {
    if (!submenuPresence.mounted()) {
      setSubmenuPosition({ x: -9999, y: -9999 });
    }
  });

  // Update submenu position
  const updateSubmenuPosition = () => {
    if (!itemRef || !submenuRef) return;
    const parentRect = itemRef.getBoundingClientRect();
    const submenuRect = submenuRef.getBoundingClientRect();
    const pos = calculateSubmenuPosition(
      parentRect,
      submenuRect,
      props.portalLayout.boundaryRect()
    );
    setSubmenuSide(pos.x < parentRect.left ? 'left' : 'right');
    setSubmenuPosition(pos);
  };

  // Mouse enter
  const handleMouseEnter = () => {
    if (!hasChildren()) return;
    clearTimeout(hoverTimeout);
    hoverTimeout = setTimeout(() => {
      setSubmenuOpen(true);
      requestAnimationFrame(updateSubmenuPosition);
    }, 100);
  };

  // Mouse leave
  const handleMouseLeave = () => {
    if (!hasChildren()) return;
    clearTimeout(hoverTimeout);
    hoverTimeout = undefined;
    if (props.item.keepOpen) return;
    hoverTimeout = setTimeout(() => {
      setSubmenuOpen(false);
    }, 150);
  };

  const handleClick = (e: MouseEvent) => {
    if (props.item.disabled) return;

    // When using custom content with keepOpen, prevent closing the menu.
    if (props.item.content && props.item.keepOpen) {
      e.stopPropagation();
      return;
    }

    if (hasChildren()) {
      // For submenus, click toggles submenu visibility.
      setSubmenuOpen((v) => !v);
      requestAnimationFrame(updateSubmenuPosition);
    } else if (!props.item.content) {
      // For regular items, trigger selection.
      props.onSelect(props.item);
    }
  };

  const openSubmenu = (focusMode: 'first' | 'last' = 'first') => {
    if (!hasChildren()) return;
    setSubmenuOpen(true);
    requestAnimationFrame(() => {
      updateSubmenuPosition();
      focusMenuItem(submenuRef, focusMode);
    });
  };

  const closeSubmenu = () => {
    setSubmenuOpen(false);
    requestAnimationFrame(() => buttonRef?.focus());
  };

  return (
    <div
      ref={itemRef}
      class="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Custom content */}
      <Show when={props.item.content}>
        <div
          class={cn(
            'w-full px-2 py-1.5',
            props.item.tone === 'danger' && 'text-error',
            props.item.disabled && 'opacity-50 pointer-events-none'
          )}
          data-tone={props.item.tone ?? 'default'}
          onClick={handleClick}
        >
          {props.item.content!()}
        </div>
      </Show>

      {/* Default button layout */}
      <Show when={!props.item.content}>
        <button
          type="button"
          ref={buttonRef}
          data-floe-interactive="item"
          class={cn(
            'w-full flex items-center gap-2 px-2',
            'min-h-[var(--floe-row-height)] rounded-sm',
            'text-[length:var(--floe-type-control)] leading-[var(--floe-line-control)]',
            'focus:outline-none',
            props.item.tone === 'danger' ? 'text-error' : 'text-[var(--floe-ink-soft)]',
            props.item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          )}
          role="menuitem"
          id={menuItemId}
          disabled={props.item.disabled}
          aria-haspopup={hasChildren() ? 'menu' : undefined}
          aria-expanded={hasChildren() ? submenuOpen() : undefined}
          data-floe-selected={props.selected && !hasChildren() ? 'true' : undefined}
          data-tone={props.item.tone ?? 'default'}
          onClick={handleClick}
          onKeyDown={(event) => {
            if (props.item.disabled) return;
            if (!hasChildren()) return;
            if (event.key === 'ArrowRight' || event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              openSubmenu('first');
            }
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              closeSubmenu();
            }
          }}
        >
          <span class="w-3.5 h-3.5 flex items-center justify-center">
            <Show when={props.selected && !hasChildren()}>
              <Check class="w-3 h-3" />
            </Show>
          </span>
          <Show when={props.item.icon} keyed>
            {(Icon) => <span class="w-3.5 h-3.5 flex items-center justify-center">{Icon()}</span>}
          </Show>
          <span class="flex-1 text-left">{props.item.label}</span>
          <Show when={hasChildren()}>
            <ChevronRight class="w-3 h-3 text-[var(--floe-ink-quiet)]" />
          </Show>
        </button>
      </Show>

      {/* Submenu */}
      <Show when={submenuPresence.mounted() && hasChildren()}>
        <Portal mount={props.portalLayout.mount()}>
          <div
            ref={(node) => {
              submenuRef = node;
              queueMicrotask(() => { if (node.isConnected) updateSubmenuPosition(); });
            }}
            class={cn(
              props.portalLayout.isSurfaceMode()
                ? 'absolute z-20 min-w-36'
                : 'fixed z-50 min-w-36',
              'bg-popover text-popover-foreground p-1',
              'rounded-panel border border-[var(--floe-line)]',
              'shadow-[var(--floe-elevation-float)]',
              'floe-floating-presence floe-floating-menu floe-floating-submenu'
            )}
            data-floe-dropdown={props.dropdownId}
            data-floating-presence={submenuPresence.state()}
            data-floating-side={submenuSide()}
            aria-hidden={submenuPresence.exiting() ? 'true' : undefined}
            {...{
              [LOCAL_INTERACTION_SURFACE_ATTR]: props.portalLayout.isSurfaceMode()
                ? 'true'
                : undefined,
            }}
            style={{
              left: `${props.portalLayout.projectPosition(submenuPosition()).x}px`,
              top: `${props.portalLayout.projectPosition(submenuPosition()).y}px`,
            }}
            role="menu"
            data-floe-surface="floating"
            aria-labelledby={menuItemId}
            onMouseEnter={() => {
              clearTimeout(hoverTimeout);
            }}
            onMouseLeave={handleMouseLeave}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowLeft' && event.key !== 'Escape') return;
              event.preventDefault();
              event.stopPropagation();
              closeSubmenu();
            }}
          >
            <Index each={props.item.children}>
              {(child) => (
                <Show
                  when={!child().separator}
                  fallback={<div class="my-1 h-px bg-border" role="separator" />}
                >
                  <DropdownMenuItem
                    item={child()}
                    selected={false}
                    onSelect={props.onSelect}
                    onCloseMenu={props.onCloseMenu}
                    dropdownId={props.dropdownId}
                    portalLayout={props.portalLayout}
                  />
                </Show>
              )}
            </Index>
          </div>
        </Portal>
      </Show>
    </div>
  );
}

export { Select, type SelectProps } from './Select';
