import type { SidebarVisibilityMotion } from '../../context/LayoutContext';

export interface SidebarVisibilityMotionResolverArgs {
  currentActiveId: string;
  nextActiveId: string;
  openSidebar: boolean;
  source: 'activity-bar';
  isMobile: boolean;
}

export interface ResolveShellSidebarActiveTabChangeArgs {
  currentActiveId: string;
  nextActiveId: string;
  requestedOpenSidebar?: boolean;
  sidebarHidden: boolean;
  nextActiveFullScreen: boolean;
  isMobile: boolean;
  resolveSidebarVisibilityMotion?: (
    args: SidebarVisibilityMotionResolverArgs
  ) => SidebarVisibilityMotion | undefined;
}

export interface ResolvedShellSidebarActiveTabChange {
  openSidebar: boolean;
  visibilityMotion?: SidebarVisibilityMotion;
}

export function resolveShellSidebarActiveTabChange(
  args: ResolveShellSidebarActiveTabChangeArgs
): ResolvedShellSidebarActiveTabChange {
  const openSidebar = args.sidebarHidden ? false : (args.requestedOpenSidebar ?? !args.nextActiveFullScreen);

  return {
    openSidebar,
    visibilityMotion: args.resolveSidebarVisibilityMotion?.({
      currentActiveId: args.currentActiveId,
      nextActiveId: args.nextActiveId,
      openSidebar,
      source: 'activity-bar',
      isMobile: args.isMobile,
    }),
  };
}
