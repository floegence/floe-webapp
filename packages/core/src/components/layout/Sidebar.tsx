import { type JSX } from 'solid-js';
import { cn } from '../../utils/cn';
import type { SidebarVisibilityMotion } from '../../context/LayoutContext';

export interface SidebarProps {
  children: JSX.Element;
  resizer?: JSX.Element;
  width?: number;
  collapsed?: boolean;
  visibilityMotion?: SidebarVisibilityMotion;
  ariaLabel?: string;
  class?: string;
}

/**
 * Collapsible sidebar panel
 */
export function Sidebar(props: SidebarProps) {
  const collapsed = () => props.collapsed ?? false;
  const width = () => props.width ?? 350;
  const visibilityMotion = () => props.visibilityMotion ?? 'animated';

  return (
    <aside
      data-floe-shell-slot="sidebar"
      data-floe-geometry-surface="shell-sidebar"
      data-floe-sidebar-visibility-motion={visibilityMotion()}
      class={cn(
        'relative h-full flex flex-col shrink-0 min-h-0',
        'bg-sidebar text-sidebar-foreground',
        'border-r border-sidebar-border',
        'overflow-hidden',
        visibilityMotion() === 'animated' && 'transition-[width] duration-[var(--floe-duration-fast)] ease-out',
        props.class
      )}
      style={{
        width: collapsed() ? '0px' : `${width()}px`,
        visibility: collapsed() ? 'hidden' : 'visible',
        'border-right-width': collapsed() ? '0px' : undefined,
      }}
      aria-label={props.ariaLabel}
      aria-hidden={collapsed() ? 'true' : undefined}
    >
      <div class="flex-1 overflow-auto overscroll-contain">{props.children}</div>
      {props.resizer}
    </aside>
  );
}

/**
 * Unified wrapper for sidebar content.
 * Use this component to ensure consistent padding and spacing across all sidebars.
 */
export interface SidebarContentProps {
  children: JSX.Element;
  class?: string;
}

export function SidebarContent(props: SidebarContentProps) {
  return <div class={cn('p-2.5 space-y-3', props.class)}>{props.children}</div>;
}

/**
 * Container for sidebar items within a section.
 * Provides consistent spacing between list items.
 */
export interface SidebarItemListProps {
  children: JSX.Element;
  class?: string;
}

export function SidebarItemList(props: SidebarItemListProps) {
  return <div class={cn('space-y-0.5', props.class)}>{props.children}</div>;
}

/**
 * Sidebar section with optional header
 */
export interface SidebarSectionProps {
  children: JSX.Element;
  title?: string;
  actions?: JSX.Element;
  class?: string;
}

export function SidebarSection(props: SidebarSectionProps) {
  return (
    <section class={cn('flex flex-col', props.class)}>
      {props.title && (
        <div class="flex items-center justify-between px-2.5 py-2 text-caption font-semibold uppercase tracking-wider text-[var(--floe-ink-quiet)]">
          <span>{props.title}</span>
          {props.actions}
        </div>
      )}
      <div class="flex-1">{props.children}</div>
    </section>
  );
}

/**
 * Sidebar list item
 */
export interface SidebarItemProps {
  children: JSX.Element;
  icon?: JSX.Element;
  active?: boolean;
  indent?: number;
  onClick?: () => void;
  class?: string;
}

export function SidebarItem(props: SidebarItemProps) {
  return (
    <button
      type="button"
      data-floe-interactive="row"
      data-selected={props.active ? 'true' : undefined}
      class={cn(
        'group w-full min-h-[var(--floe-row-height)] flex items-center gap-2 pl-2.5 pr-2 mx-1 rounded-sm',
        'text-[length:var(--floe-type-control)] leading-[var(--floe-line-control)] cursor-pointer',
        'text-[var(--floe-ink-soft)]',
        'focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring',
        props.active && 'text-foreground font-medium',
        props.class
      )}
      style={{ 'padding-left': props.indent ? `${10 + props.indent * 10}px` : undefined }}
      onClick={() => props.onClick?.()}
    >
      {props.icon && (
        <span
          class={cn(
            'flex-shrink-0 w-4 h-4 transition-colors duration-[var(--floe-duration-fast)] ease-[var(--floe-ease-out)]',
            props.active
              ? 'text-[var(--floe-ink-soft)]'
              : 'text-[var(--floe-ink-quiet)] group-hover:text-[var(--floe-ink)]'
          )}
        >
          {props.icon}
        </span>
      )}
      <span class="flex-1 truncate text-left">{props.children}</span>
    </button>
  );
}
