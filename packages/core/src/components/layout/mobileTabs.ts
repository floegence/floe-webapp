export interface ResolveMobileTabActiveIdArgs {
  /** Current active tab id from LayoutContext. */
  activeId: string;
  /** Whether the mobile sidebar overlay is currently open. */
  mobileSidebarOpen: boolean;
  /** Whether the active component is marked as fullScreen. */
  activeIsFullScreen: boolean;
}

/**
 * On mobile, the active tab is always shown as active since content is always visible.
 * The mobileSidebarOpen state is no longer used for content visibility.
 */
export function resolveMobileTabActiveId(args: ResolveMobileTabActiveIdArgs): string {
  return args.activeId;
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
 * On mobile, clicking a tab simply switches to that tab.
 * The mobileSidebarOpen state is kept for backwards compatibility but is no longer
 * used to control content visibility.
 */
export function resolveMobileTabSelect(args: ResolveMobileTabSelectArgs): ResolveMobileTabSelectResult {
  // Simply switch to the clicked tab
  return { nextActiveId: args.clickedId, nextMobileSidebarOpen: false };
}

