import { createComponent, createRoot, createSignal } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import { FileBrowserProvider, useFileBrowser } from '../src/components/file-browser/FileBrowserContext';
import type { FileBrowserContextValue, FileItem } from '../src/components/file-browser/types';

describe('FileBrowserContext.setCurrentPath', () => {
  it('should no-op when navigating to the current path (do not clear selection/filter)', () => {
    const files: FileItem[] = [
      { id: 'f1', name: 'a.txt', type: 'file', path: '/a.txt' },
    ];

    const onNavigate = vi.fn();
    const onPathChange = vi.fn();
    let browser!: FileBrowserContextValue;
    let dispose!: () => void;

    createRoot((rootDispose) => {
      dispose = rootDispose;
      createComponent(FileBrowserProvider, {
        files,
        initialPath: '/',
        onNavigate,
        onPathChange,
        get children() {
          return createComponent(() => {
            browser = useFileBrowser();
            return null;
          }, {});
        },
      });
    });

    try {
      browser.setFilterQuery('abc');
      browser.setFilterActive(true);
      browser.selectItem('f1');

      expect(browser.filterQuery()).toBe('abc');
      expect(browser.selectedItems().has('f1')).toBe(true);

      // Repeat navigation to the same path should not reset UI state.
      browser.setCurrentPath('/');

      expect(browser.filterQuery()).toBe('abc');
      expect(browser.selectedItems().has('f1')).toBe(true);
      expect(onNavigate).not.toHaveBeenCalled();
      expect(onPathChange).not.toHaveBeenCalled();
    } finally {
      dispose();
    }
  });

  it('keeps a controlled path authoritative and emits every user intent', async () => {
    const files: FileItem[] = [
      { id: 'f1', name: 'a.txt', type: 'file', path: '/current/a.txt' },
    ];
    const onNavigate = vi.fn();
    const onPathChange = vi.fn();
    let browser!: FileBrowserContextValue;
    let commitPath!: (path: string) => void;
    let dispose!: () => void;

    createRoot((rootDispose) => {
      dispose = rootDispose;
      const [path, setPath] = createSignal('/current');
      commitPath = setPath;
      createComponent(FileBrowserProvider, {
        files,
        get path() { return path(); },
        onNavigate,
        onPathChange,
        get children() {
          return createComponent(() => {
            browser = useFileBrowser();
            return null;
          }, {});
        },
      });
    });

    try {
      await Promise.resolve();
      browser.setFilterQuery('keep-until-commit');
      browser.setFilterActive(true);
      browser.setCurrentPath('/pending');
      expect(browser.currentPath()).toBe('/current');
      expect(browser.filterQuery()).toBe('keep-until-commit');

      // Returning to the committed path is still an intent in controlled mode;
      // the parent may need it to supersede a different pending request.
      browser.setCurrentPath('/current');
      expect(browser.currentPath()).toBe('/current');
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(onNavigate.mock.calls).toEqual([['/pending'], ['/current']]);
      expect(onPathChange.mock.calls).toEqual([
        ['/pending', 'user'],
        ['/current', 'user'],
      ]);

      commitPath('/external');
      await Promise.resolve();
      expect(browser.currentPath()).toBe('/external');
      expect(browser.filterQuery()).toBe('');
    } finally {
      dispose();
    }
  });
});
