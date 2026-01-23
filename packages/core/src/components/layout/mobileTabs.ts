export interface ResolveMobileTabActiveIdArgs {
  /** Current active tab id from LayoutContext. */
  activeId: string;
  /** Whether the mobile sidebar overlay is currently open. */
  mobileSidebarOpen: boolean;
  /** Whether the active component is marked as fullScreen. */
  activeIsFullScreen: boolean;
}

/**
 * On mobile we support two UX modes:
 * - Sidebar overlay mode (default): tabs toggle an overlay that renders the component as sidebar content.
 * - FullScreen navigation mode: tabs switch the main page (no overlay).
 */
export function resolveMobileTabActiveId(args: ResolveMobileTabActiveIdArgs): string {
  if (args.activeIsFullScreen) return args.activeId;
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

export function resolveMobileTabSelect(args: ResolveMobileTabSelectArgs): ResolveMobileTabSelectResult {
  if (args.clickedIsFullScreen) {
    return { nextActiveId: args.clickedId, nextMobileSidebarOpen: false };
  }

  // Same tab clicked while open: close overlay.
  if (args.clickedId === args.activeId && args.mobileSidebarOpen) {
    return { nextActiveId: args.clickedId, nextMobileSidebarOpen: false };
  }

  // Different tab (or currently closed): open overlay and switch active tab.
  return { nextActiveId: args.clickedId, nextMobileSidebarOpen: true };
}

