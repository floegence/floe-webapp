import { describe, expect, it } from 'vitest';
import { resolveMobileTabActiveId, resolveMobileTabSelect } from '../src/components/layout/mobileTabs';

describe('mobileTabs', () => {
  describe('resolveMobileTabActiveId', () => {
    it('highlights the active tab when the active component is fullScreen (page navigation mode)', () => {
      expect(
        resolveMobileTabActiveId({
          activeId: 'home',
          mobileSidebarOpen: false,
          activeIsFullScreen: true,
        })
      ).toBe('home');
    });

    it('only highlights the active tab while the overlay is open (sidebar overlay mode)', () => {
      expect(
        resolveMobileTabActiveId({
          activeId: 'files',
          mobileSidebarOpen: false,
          activeIsFullScreen: false,
        })
      ).toBe('');
      expect(
        resolveMobileTabActiveId({
          activeId: 'files',
          mobileSidebarOpen: true,
          activeIsFullScreen: false,
        })
      ).toBe('files');
    });
  });

  describe('resolveMobileTabSelect', () => {
    it('navigates to fullScreen tabs without opening the overlay', () => {
      expect(
        resolveMobileTabSelect({
          clickedId: 'home',
          activeId: 'files',
          mobileSidebarOpen: true,
          clickedIsFullScreen: true,
        })
      ).toEqual({ nextActiveId: 'home', nextMobileSidebarOpen: false });
    });

    it('toggles the overlay when clicking the same non-fullScreen tab', () => {
      expect(
        resolveMobileTabSelect({
          clickedId: 'files',
          activeId: 'files',
          mobileSidebarOpen: true,
          clickedIsFullScreen: false,
        })
      ).toEqual({ nextActiveId: 'files', nextMobileSidebarOpen: false });
    });

    it('opens the overlay when selecting a different non-fullScreen tab', () => {
      expect(
        resolveMobileTabSelect({
          clickedId: 'search',
          activeId: 'files',
          mobileSidebarOpen: true,
          clickedIsFullScreen: false,
        })
      ).toEqual({ nextActiveId: 'search', nextMobileSidebarOpen: true });
    });
  });
});

