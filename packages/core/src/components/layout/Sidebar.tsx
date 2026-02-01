import { type JSX } from 'solid-js';
import { cn } from '../../utils/cn';

export interface SidebarProps {
  children: JSX.Element;
  resizer?: JSX.Element;
  width?: number;
  collapsed?: boolean;
  class?: string;
}

/**
 * Collapsible sidebar panel
 */
export function Sidebar(props: SidebarProps) {
  const collapsed = () => props.collapsed ?? false;
  const width = () => props.width ?? 350;

  return (
    <aside
      class={cn(
        'relative h-full flex flex-col shrink-0 min-h-0',
        'bg-sidebar text-sidebar-foreground',
        'border-r border-sidebar-border',
        'overflow-hidden',
        'transition-[width] duration-150 ease-out',
        props.class
      )}
      style={{
        width: collapsed() ? '0px' : `${width()}px`,
        visibility: collapsed() ? 'hidden' : 'visible',
        'border-right-width': collapsed() ? '0px' : undefined,
      }}
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
        <div class="flex items-center justify-between px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
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
      class={cn(
        'w-full flex items-center gap-2 px-2.5 py-1.5 text-xs cursor-pointer',
        'transition-colors duration-75',
        'hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground',
        'focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-sidebar-ring',
        props.active && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium',
        props.class
      )}
      style={{ 'padding-left': props.indent ? `${10 + props.indent * 10}px` : undefined }}
      onClick={() => props.onClick?.()}
    >
      {props.icon && <span class="flex-shrink-0 w-4 h-4 opacity-60">{props.icon}</span>}
      <span class="flex-1 truncate text-left">{props.children}</span>
    </button>
  );
}
