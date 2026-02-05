export type ActivityBarCollapseBehavior = 'toggle' | 'preserve';

export interface ResolveActivityBarClickArgs {
  clickedId: string;
  activeId: string;
  collapsed: boolean;
  /**
   * How the clicked item should affect the sidebar collapsed state.
   *
   * - `toggle` (default): VSCode-like behavior for sidebar-backed tabs.
   * - `preserve`: navigate without mutating the collapsed state (useful for fullScreen pages).
   */
  behavior?: ActivityBarCollapseBehavior;
}

export interface ResolveActivityBarClickResult {
  nextActiveId: string;
  /** When undefined, the click should not change the collapsed state. */
  nextCollapsed?: boolean;
  /**
   * Hint for LayoutContext.setSidebarActiveTab({ openSidebar }).
   * Only meaningful when the click causes a tab change.
   */
  openSidebar?: boolean;
}

export function resolveActivityBarClick(args: ResolveActivityBarClickArgs): ResolveActivityBarClickResult {
  const behavior: ActivityBarCollapseBehavior = args.behavior ?? 'toggle';

  // Preserve: navigate without touching collapsed state.
  if (behavior === 'preserve') {
    if (args.clickedId === args.activeId) return { nextActiveId: args.activeId };
    return { nextActiveId: args.clickedId, openSidebar: false };
  }

  // Default: VSCode-style toggle behavior.
  const isActive = args.clickedId === args.activeId;
  if (isActive && !args.collapsed) {
    return { nextActiveId: args.activeId, nextCollapsed: true };
  }

  // Switching tabs (or reopening a collapsed tab) should open the sidebar.
  return { nextActiveId: args.clickedId, nextCollapsed: false, openSidebar: true };
}

