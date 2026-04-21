import { createSignal, Show, Index, type JSX, createEffect, createMemo, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { deferNonBlocking } from '../../utils/defer';
import { ChevronDown, ChevronRight, Check } from '../icons';
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

export interface DropdownItem {
  id: string;
  label: string;
  icon?: () => JSX.Element;
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
  trigger: JSX.Element;
  triggerClass?: string;
  triggerAriaLabel?: string;
  items: DropdownItem[];
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
  const [open, setOpen] = createSignal(false);
  const [menuPosition, setMenuPosition] = createSignal({ x: -9999, y: -9999 });
  let triggerRef: HTMLDivElement | undefined;
  let menuRef: HTMLDivElement | undefined;
  const dropdownId = `floe-dropdown-${(dropdownIdSeq += 1)}`;
  const menuId = `${dropdownId}-menu`;
  const surfaceHost = createMemo<ResolvedSurfacePortalHost>(() =>
    open() ? resolveSurfacePortalHost() : { host: null, mode: 'global' }
  );
  const portalLayout: DropdownPortalLayout = {
    mount: () => resolveSurfacePortalMount(surfaceHost()),
    isSurfaceMode: () => isSurfacePortalMode(surfaceHost()),
    boundaryRect: () => resolveSurfacePortalBoundaryRect(surfaceHost()),
    projectPosition: (position) => projectSurfacePortalPosition(position, surfaceHost()),
  };

  // Update menu position
  const updateMenuPosition = () => {
    if (!triggerRef || !menuRef) return;
    const triggerRect = triggerRef.getBoundingClientRect();
    const menuRect = menuRef.getBoundingClientRect();
    const pos = calculateMenuPosition(
      triggerRect,
      menuRect,
      props.align ?? 'start',
      portalLayout.boundaryRect()
    );
    setMenuPosition(pos);
  };

  // Close on click outside (including portal-rendered submenus)
  createEffect(() => {
    if (!open()) {
      setMenuPosition({ x: -9999, y: -9999 });
      return;
    }

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && typeof target.closest === 'function') {
        if (target.closest(`[data-floe-dropdown="${dropdownId}"]`)) return;
      }
      setOpen(false);
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      requestAnimationFrame(() => triggerRef?.focus());
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    // Initial positioning + focus after mount
    requestAnimationFrame(() => {
      updateMenuPosition();
      focusMenuItem(menuRef, props.value ? 'selected' : 'first');
    });

    onCleanup(() => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    });
  });

  const handleSelect = (item: DropdownItem) => {
    const onSelect = props.onSelect;
    if (!item.keepOpen) setOpen(false);
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
        setOpen(false);
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
          'cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          props.triggerClass,
          props.disabled && 'pointer-events-none opacity-50'
        )}
        role="button"
        tabIndex={props.disabled ? -1 : 0}
        aria-haspopup="menu"
        aria-expanded={open()}
        aria-controls={menuId}
        aria-label={props.triggerAriaLabel}
        aria-disabled={props.disabled ? 'true' : undefined}
        data-floe-dropdown-trigger=""
      >
        {props.trigger}
      </div>

      {/* Menu - rendered via Portal */}
      <Show when={open()}>
        <Portal mount={portalLayout.mount()}>
          <div
            ref={menuRef}
            class={cn(
              portalLayout.isSurfaceMode()
                ? 'absolute z-20 min-w-36 py-0.5'
                : 'fixed z-50 min-w-36 py-0.5',
              'bg-popover text-popover-foreground',
              'rounded border border-border shadow-md',
              'animate-in fade-in slide-in-from-top-2'
            )}
            data-floe-dropdown={dropdownId}
            {...{
              [LOCAL_INTERACTION_SURFACE_ATTR]: portalLayout.isSurfaceMode() ? 'true' : undefined,
            }}
            style={{
              left: `${portalLayout.projectPosition(menuPosition()).x}px`,
              top: `${portalLayout.projectPosition(menuPosition()).y}px`,
            }}
            role="menu"
            id={menuId}
            onKeyDown={handleMenuKeyDown}
          >
            <Index each={props.items}>
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
  const [submenuPosition, setSubmenuPosition] = createSignal({ x: -9999, y: -9999 });
  let itemRef: HTMLDivElement | undefined;
  let buttonRef: HTMLButtonElement | undefined;
  let submenuRef: HTMLDivElement | undefined;
  let hoverTimeout: ReturnType<typeof setTimeout> | undefined;
  const menuItemId = `floe-dropdown-item-${(dropdownMenuItemIdSeq += 1)}`;

  const hasChildren = () => props.item.children && props.item.children.length > 0;

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
          class={cn('w-full px-2 py-1.5', props.item.disabled && 'opacity-50 pointer-events-none')}
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
          class={cn(
            'w-full flex items-center gap-1.5 px-2 py-1 text-xs',
            'transition-colors duration-75',
            'focus:outline-none focus:bg-accent',
            props.item.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent cursor-pointer'
          )}
          role="menuitem"
          id={menuItemId}
          disabled={props.item.disabled}
          aria-haspopup={hasChildren() ? 'menu' : undefined}
          aria-expanded={hasChildren() ? submenuOpen() : undefined}
          data-floe-selected={props.selected && !hasChildren() ? 'true' : undefined}
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
            <ChevronRight class="w-3 h-3 text-muted-foreground" />
          </Show>
        </button>
      </Show>

      {/* Submenu */}
      <Show when={submenuOpen() && hasChildren()}>
        <Portal mount={props.portalLayout.mount()}>
          <div
            ref={submenuRef}
            class={cn(
              props.portalLayout.isSurfaceMode()
                ? 'absolute z-20 min-w-36 py-0.5'
                : 'fixed z-50 min-w-36 py-0.5',
              'bg-popover text-popover-foreground',
              'rounded border border-border shadow-md',
              'animate-in fade-in slide-in-from-left-1'
            )}
            data-floe-dropdown={props.dropdownId}
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

/**
 * Simple select dropdown
 */
export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  class?: string;
}

export function Select(props: SelectProps) {
  const selectedOption = () => props.options.find((o) => o.value === props.value);
  const items = () =>
    props.options.map((o) => ({
      id: o.value,
      label: o.label,
    }));

  return (
    <Dropdown
      triggerClass={cn(
        'flex items-center justify-between gap-2 h-8 px-2.5 w-full',
        'rounded border border-input bg-background text-xs shadow-sm',
        'transition-colors duration-100',
        props.class
      )}
      trigger={
        <>
          <span class={cn('truncate', !selectedOption() && 'text-muted-foreground')}>
            {selectedOption()?.label ?? props.placeholder ?? 'Select...'}
          </span>
          <ChevronDown class="w-3.5 h-3.5 text-muted-foreground" />
        </>
      }
      items={items()}
      value={props.value}
      onSelect={props.onChange}
      disabled={props.disabled}
    />
  );
}
