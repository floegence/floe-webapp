import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'solid-js/web';
import { FileBrowserProvider, useFileBrowser } from '../src/components/file-browser/FileBrowserContext';
import type { FileItem } from '../src/components/file-browser/types';

describe('FileBrowserContext.setCurrentPath', () => {
  it('should no-op when navigating to the current path (do not clear selection/filter)', () => {
    const files: FileItem[] = [
      { id: 'f1', name: 'a.txt', type: 'file', path: '/a.txt' },
    ];

    const onNavigate = vi.fn();

    function Harness() {
      const ctx = useFileBrowser();

      ctx.setFilterQuery('abc');
      ctx.setFilterActive(true);
      ctx.selectItem('f1');

      expect(ctx.filterQuery()).toBe('abc');
      expect(ctx.selectedItems().has('f1')).toBe(true);

      // Repeat navigation to the same path should not reset UI state.
      ctx.setCurrentPath('/');

      expect(ctx.filterQuery()).toBe('abc');
      expect(ctx.selectedItems().has('f1')).toBe(true);
      expect(onNavigate).not.toHaveBeenCalled();

      return null;
    }

    renderToString(() => (
      <FileBrowserProvider files={files} initialPath="/" onNavigate={onNavigate}>
        <Harness />
      </FileBrowserProvider>
    ));
  });
});

