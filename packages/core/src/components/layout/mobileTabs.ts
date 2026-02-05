export interface ResolveMobileTabActiveIdArgs {
  /** Current active tab id from LayoutContext. */
  activeId: string;
  /** Whether the mobile sidebar overlay is currently open. */
  mobileSidebarOpen: boolean;
  /** Whether the active component is marked as fullScreen. */
  activeIsFullScreen: boolean;
  /**
   * Whether the active tab should be treated as a page, even if it isn't fullScreen.
   *
   * This is useful for "main view + sidebar panel" tabs.
   */
  activeIsPage?: boolean;
}

/**
 * Determine which tab should appear active in the mobile tab bar.
 * - For fullScreen components: always show as active
 * - For sidebar components: show as active only when sidebar is open
 */
export function resolveMobileTabActiveId(args: ResolveMobileTabActiveIdArgs): string {
  if (args.activeIsFullScreen || args.activeIsPage) return args.activeId;
  return args.mobileSidebarOpen ? args.activeId : '';
}

export interface ResolveMobileTabSelectArgs {
  clickedId: string;
  activeId: string;
  mobileSidebarOpen: boolean;
  clickedIsFullScreen: boolean;
}

export interface ResolveMobileTabSelectResult {
  nextActiveId: string;
  nextMobileSidebarOpen: boolean;
}

/**
 * Handle mobile tab selection:
 * - FullScreen components: navigate directly, close sidebar
 * - Sidebar components: toggle sidebar visibility
 */
export function resolveMobileTabSelect(args: ResolveMobileTabSelectArgs): ResolveMobileTabSelectResult {
  // FullScreen components navigate directly without sidebar
  if (args.clickedIsFullScreen) {
    return { nextActiveId: args.clickedId, nextMobileSidebarOpen: false };
  }

  // Same tab clicked while sidebar is open: close sidebar
  if (args.clickedId === args.activeId && args.mobileSidebarOpen) {
    return { nextActiveId: args.clickedId, nextMobileSidebarOpen: false };
  }

  // Different tab or sidebar is closed: open sidebar with new tab
  return { nextActiveId: args.clickedId, nextMobileSidebarOpen: true };
}
