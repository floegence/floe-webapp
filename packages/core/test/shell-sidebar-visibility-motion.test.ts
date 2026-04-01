import { describe, expect, it } from 'vitest';
import { resolveShellSidebarActiveTabChange } from '../src/components/layout/sidebarVisibilityMotion';

describe('resolveShellSidebarActiveTabChange', () => {
  it('applies one-shot instant motion for desktop activity-bar visibility changes', () => {
    const res = resolveShellSidebarActiveTabChange({
      currentActiveId: 'files',
      nextActiveId: 'chat',
      sidebarHidden: false,
      nextActiveFullScreen: false,
      isMobile: false,
      resolveSidebarVisibilityMotion: ({ currentActiveId, nextActiveId, source, isMobile, openSidebar }) => (
        !isMobile && source === 'activity-bar' && currentActiveId === 'files' && nextActiveId === 'chat' && openSidebar
          ? 'instant'
          : undefined
      ),
    });

    expect(res).toEqual({
      openSidebar: true,
      visibilityMotion: 'instant',
    });
  });

  it('keeps sidebar closed when navigating to a full-screen tab', () => {
    const res = resolveShellSidebarActiveTabChange({
      currentActiveId: 'chat',
      nextActiveId: 'files',
      sidebarHidden: false,
      nextActiveFullScreen: true,
      isMobile: false,
    });

    expect(res).toEqual({
      openSidebar: false,
      visibilityMotion: undefined,
    });
  });

  it('forces the sidebar closed when the shell runs in hidden mode', () => {
    const res = resolveShellSidebarActiveTabChange({
      currentActiveId: 'files',
      nextActiveId: 'chat',
      requestedOpenSidebar: true,
      sidebarHidden: true,
      nextActiveFullScreen: false,
      isMobile: false,
      resolveSidebarVisibilityMotion: ({ openSidebar }) => (openSidebar ? 'instant' : undefined),
    });

    expect(res).toEqual({
      openSidebar: false,
      visibilityMotion: undefined,
    });
  });
});
