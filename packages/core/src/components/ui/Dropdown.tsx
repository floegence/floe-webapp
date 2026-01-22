import {
  createSignal,
  Show,
  For,
  type JSX,
  createEffect,
  onCleanup,
} from 'solid-js';
import { cn } from '../../utils/cn';
import { deferNonBlocking } from '../../utils/defer';
import { ChevronDown, Check } from '../icons';

export interface DropdownItem {
  id: string;
  label: string;
  icon?: () => JSX.Element;
  disabled?: boolean;
  separator?: boolean;
}

export interface DropdownProps {
  trigger: JSX.Element;
  items: DropdownItem[];
  value?: string;
  onSelect: (id: string) => void;
  align?: 'start' | 'center' | 'end';
  class?: string;
}

/**
 * Dropdown menu component
 */
export function Dropdown(props: DropdownProps) {
  const [open, setOpen] = createSignal(false);
  let triggerRef: HTMLDivElement | undefined;
  let menuRef: HTMLDivElement | undefined;

  // Close on click outside
  createEffect(() => {
    if (!open()) return;

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

    onCleanup(() => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    });
  });

  const alignClass = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  };

  return (
    <div class={cn('relative inline-block', props.class)}>
      {/* Trigger */}
      <div ref={triggerRef} onClick={() => setOpen((v) => !v)} class="cursor-pointer">
        {props.trigger}
      </div>

      {/* Menu */}
      <Show when={open()}>
        <div
          ref={menuRef}
          class={cn(
            'absolute z-50 mt-1 min-w-36 py-0.5',
            'bg-popover text-popover-foreground',
            'rounded border border-border shadow-md',
            'animate-in fade-in slide-in-from-top-2',
            alignClass[props.align ?? 'start']
          )}
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
                  onSelect={() => {
                    if (!item.disabled) {
                      const id = item.id;
                      const onSelect = props.onSelect;
                      setOpen(false);
                      // Close UI first to avoid blocking paint, then run selection logic.
                      deferNonBlocking(() => onSelect(id));
                    }
                  }}
                />
              </Show>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}

interface DropdownMenuItemProps {
  item: DropdownItem;
  selected: boolean;
  onSelect: () => void;
}

function DropdownMenuItem(props: DropdownMenuItemProps) {
  return (
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
      onClick={() => props.onSelect()}
    >
      <span class="w-3.5 h-3.5 flex items-center justify-center">
        <Show when={props.selected}>
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
    </button>
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
