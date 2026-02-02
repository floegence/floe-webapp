import {
  createSignal,
  Show,
  For,
  type JSX,
  createEffect,
  onCleanup,
} from 'solid-js';
import { Portal } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { deferNonBlocking } from '../../utils/defer';
import { ChevronDown, ChevronRight, Check } from '../icons';

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
  items: DropdownItem[];
  value?: string;
  onSelect: (id: string) => void;
  align?: 'start' | 'center' | 'end';
  class?: string;
}

/** 视口边距常量 */
const VIEWPORT_MARGIN = 8;

/** 计算菜单位置，确保在视口内 */
function calculateMenuPosition(
  triggerRect: DOMRect,
  menuRect: DOMRect,
  align: 'start' | 'center' | 'end'
): { x: number; y: number } {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // 计算水平位置
  let x: number;
  switch (align) {
    case 'center':
      x = triggerRect.left + triggerRect.width / 2 - menuRect.width / 2;
      break;
    case 'end':
      x = triggerRect.right - menuRect.width;
      break;
    default: // start
      x = triggerRect.left;
  }

  // 计算垂直位置（默认在 trigger 下方）
  let y = triggerRect.bottom + 4;

  // 检查右边界溢出
  if (x + menuRect.width > viewportWidth - VIEWPORT_MARGIN) {
    x = viewportWidth - menuRect.width - VIEWPORT_MARGIN;
  }
  // 检查左边界溢出
  x = Math.max(VIEWPORT_MARGIN, x);

  // 检查底部溢出，如果下方空间不够则显示在上方
  if (y + menuRect.height > viewportHeight - VIEWPORT_MARGIN) {
    const spaceAbove = triggerRect.top - VIEWPORT_MARGIN;
    const spaceBelow = viewportHeight - triggerRect.bottom - VIEWPORT_MARGIN;

    if (spaceAbove > spaceBelow && spaceAbove >= menuRect.height) {
      // 在上方显示
      y = triggerRect.top - menuRect.height - 4;
    } else {
      // 下方空间不够，但仍在下方显示，调整到最大可用位置
      y = viewportHeight - menuRect.height - VIEWPORT_MARGIN;
    }
  }

  // 确保顶部不溢出
  y = Math.max(VIEWPORT_MARGIN, y);

  return { x, y };
}

/** 计算子菜单位置，确保在视口内 */
function calculateSubmenuPosition(
  parentRect: DOMRect,
  submenuRect: DOMRect
): { x: number; y: number } {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // 默认在右侧显示
  let x = parentRect.right;
  let y = parentRect.top;

  // 检查右侧空间是否足够，不够则显示在左侧
  if (x + submenuRect.width > viewportWidth - VIEWPORT_MARGIN) {
    // 尝试在左侧显示
    const leftPosition = parentRect.left - submenuRect.width;
    if (leftPosition >= VIEWPORT_MARGIN) {
      x = leftPosition;
    } else {
      // 左右都不够，尽量靠右显示
      x = viewportWidth - submenuRect.width - VIEWPORT_MARGIN;
    }
  }

  // 检查底部溢出
  if (y + submenuRect.height > viewportHeight - VIEWPORT_MARGIN) {
    y = viewportHeight - submenuRect.height - VIEWPORT_MARGIN;
  }

  // 确保顶部和左侧不溢出
  x = Math.max(VIEWPORT_MARGIN, x);
  y = Math.max(VIEWPORT_MARGIN, y);

  return { x, y };
}

/**
 * Dropdown menu component with cascade submenu support
 */
export function Dropdown(props: DropdownProps) {
  const [open, setOpen] = createSignal(false);
  const [menuPosition, setMenuPosition] = createSignal({ x: -9999, y: -9999 });
  let triggerRef: HTMLDivElement | undefined;
  let menuRef: HTMLDivElement | undefined;

  // 更新菜单位置
  const updateMenuPosition = () => {
    if (!triggerRef || !menuRef) return;
    const triggerRect = triggerRef.getBoundingClientRect();
    const menuRect = menuRef.getBoundingClientRect();
    const pos = calculateMenuPosition(triggerRect, menuRect, props.align ?? 'start');
    setMenuPosition(pos);
  };

  // Close on click outside
  createEffect(() => {
    if (!open()) {
      setMenuPosition({ x: -9999, y: -9999 });
      return;
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef &&
        !triggerRef.contains(e.target as Node) &&
        menuRef &&
        !menuRef.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    // 初始定位
    requestAnimationFrame(updateMenuPosition);

    onCleanup(() => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    });
  });

  const handleSelect = (id: string) => {
    const onSelect = props.onSelect;
    setOpen(false);
    deferNonBlocking(() => onSelect(id));
  };

  return (
    <div class={cn('relative inline-block', props.class)}>
      {/* Trigger */}
      <div ref={triggerRef} onClick={() => setOpen((v) => !v)} class="cursor-pointer">
        {props.trigger}
      </div>

      {/* Menu - rendered via Portal */}
      <Show when={open()}>
        <Portal>
          <div
            ref={menuRef}
            class={cn(
              'fixed z-50 min-w-36 py-0.5',
              'bg-popover text-popover-foreground',
              'rounded border border-border shadow-md',
              'animate-in fade-in slide-in-from-top-2'
            )}
            style={{
              left: `${menuPosition().x}px`,
              top: `${menuPosition().y}px`,
            }}
            role="menu"
          >
            <For each={props.items}>
              {(item) => (
                <Show
                  when={!item.separator}
                  fallback={<div class="my-1 h-px bg-border" role="separator" />}
                >
                  <DropdownMenuItem
                    item={item}
                    selected={props.value === item.id}
                    onSelect={handleSelect}
                    onCloseMenu={() => setOpen(false)}
                  />
                </Show>
              )}
            </For>
          </div>
        </Portal>
      </Show>
    </div>
  );
}

interface DropdownMenuItemProps {
  item: DropdownItem;
  selected: boolean;
  onSelect: (id: string) => void;
  onCloseMenu: () => void;
}

function DropdownMenuItem(props: DropdownMenuItemProps) {
  const [submenuOpen, setSubmenuOpen] = createSignal(false);
  const [submenuPosition, setSubmenuPosition] = createSignal({ x: -9999, y: -9999 });
  let itemRef: HTMLDivElement | undefined;
  let submenuRef: HTMLDivElement | undefined;
  let hoverTimeout: ReturnType<typeof setTimeout> | undefined;

  const hasChildren = () => props.item.children && props.item.children.length > 0;

  // 更新子菜单位置
  const updateSubmenuPosition = () => {
    if (!itemRef || !submenuRef) return;
    const parentRect = itemRef.getBoundingClientRect();
    const submenuRect = submenuRef.getBoundingClientRect();
    const pos = calculateSubmenuPosition(parentRect, submenuRect);
    setSubmenuPosition(pos);
  };

  // 鼠标进入
  const handleMouseEnter = () => {
    if (!hasChildren()) return;
    clearTimeout(hoverTimeout);
    hoverTimeout = setTimeout(() => {
      setSubmenuOpen(true);
      requestAnimationFrame(updateSubmenuPosition);
    }, 100);
  };

  // 鼠标离开
  const handleMouseLeave = () => {
    if (!hasChildren()) return;
    clearTimeout(hoverTimeout);
    hoverTimeout = setTimeout(() => {
      setSubmenuOpen(false);
    }, 150);
  };

  const handleClick = (e: MouseEvent) => {
    if (props.item.disabled) return;

    // 如果有自定义内容且设置了 keepOpen，阻止关闭
    if (props.item.content && props.item.keepOpen) {
      e.stopPropagation();
      return;
    }

    if (hasChildren()) {
      // 有子菜单时点击只切换子菜单显示
      setSubmenuOpen((v) => !v);
      requestAnimationFrame(updateSubmenuPosition);
    } else if (!props.item.content) {
      // 没有子菜单且没有自定义内容时触发选择
      props.onSelect(props.item.id);
    }
  };

  return (
    <div
      ref={itemRef}
      class="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 自定义内容 */}
      <Show when={props.item.content}>
        <div
          class={cn(
            'w-full px-2 py-1.5',
            props.item.disabled && 'opacity-50 pointer-events-none'
          )}
          onClick={handleClick}
        >
          {props.item.content!()}
        </div>
      </Show>

      {/* 默认按钮布局 */}
      <Show when={!props.item.content}>
        <button
          type="button"
          class={cn(
            'w-full flex items-center gap-1.5 px-2 py-1 text-xs',
            'transition-colors duration-75',
            'focus:outline-none focus:bg-accent',
            props.item.disabled
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-accent cursor-pointer'
          )}
          role="menuitem"
          disabled={props.item.disabled}
          onClick={handleClick}
        >
          <span class="w-3.5 h-3.5 flex items-center justify-center">
            <Show when={props.selected && !hasChildren()}>
              <Check class="w-3 h-3" />
            </Show>
          </span>
          <Show when={props.item.icon} keyed>
            {(Icon) => (
              <span class="w-3.5 h-3.5 flex items-center justify-center">
                {Icon()}
              </span>
            )}
          </Show>
          <span class="flex-1 text-left">{props.item.label}</span>
          <Show when={hasChildren()}>
            <ChevronRight class="w-3 h-3 text-muted-foreground" />
          </Show>
        </button>
      </Show>

      {/* Submenu */}
      <Show when={submenuOpen() && hasChildren()}>
        <Portal>
          <div
            ref={submenuRef}
            class={cn(
              'fixed z-50 min-w-36 py-0.5',
              'bg-popover text-popover-foreground',
              'rounded border border-border shadow-md',
              'animate-in fade-in slide-in-from-left-1'
            )}
            style={{
              left: `${submenuPosition().x}px`,
              top: `${submenuPosition().y}px`,
            }}
            role="menu"
            onMouseEnter={() => {
              clearTimeout(hoverTimeout);
            }}
            onMouseLeave={handleMouseLeave}
          >
            <For each={props.item.children}>
              {(child) => (
                <Show
                  when={!child.separator}
                  fallback={<div class="my-1 h-px bg-border" role="separator" />}
                >
                  <DropdownMenuItem
                    item={child}
                    selected={false}
                    onSelect={props.onSelect}
                    onCloseMenu={props.onCloseMenu}
                  />
                </Show>
              )}
            </For>
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
      trigger={
        <button
          type="button"
          class={cn(
            'flex items-center justify-between gap-2 h-8 px-2.5 w-full cursor-pointer',
            'rounded border border-input bg-background text-xs shadow-sm',
            'transition-colors duration-100',
            'focus:outline-none focus:ring-1 focus:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            props.class
          )}
          disabled={props.disabled}
        >
          <span class={cn(!selectedOption() && 'text-muted-foreground')}>
            {selectedOption()?.label ?? props.placeholder ?? 'Select...'}
          </span>
          <ChevronDown class="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      }
      items={items()}
      value={props.value}
      onSelect={props.onChange}
    />
  );
}
