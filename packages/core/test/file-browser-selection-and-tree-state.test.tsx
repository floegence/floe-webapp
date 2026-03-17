import { describe, expect, it } from 'vitest';
import { renderToString } from 'solid-js/web';
import { FileBrowserProvider, useFileBrowser } from '../src/components/file-browser/FileBrowserContext';
import type { FileItem } from '../src/components/file-browser/types';

describe('FileBrowserContext selection and tree state', () => {
  it('should keep selection behavior consistent for single-select and multi-select toggles', () => {
    const files: FileItem[] = [
      { id: 'f1', name: 'a.txt', type: 'file', path: '/a.txt' },
      { id: 'f2', name: 'b.txt', type: 'file', path: '/b.txt' },
    ];

    function Harness() {
      const ctx = useFileBrowser();

      ctx.selectItem('f1');
      expect(ctx.selectedItems().has('f1')).toBe(true);
      expect(ctx.selectedItems().size).toBe(1);
      expect(ctx.isSelected('f1')).toBe(true);
      expect(ctx.isSelected('f2')).toBe(false);

      ctx.selectItem('f2', true);
      expect(ctx.selectedItems().has('f1')).toBe(true);
      expect(ctx.selectedItems().has('f2')).toBe(true);
      expect(ctx.selectedItems().size).toBe(2);

      ctx.selectItem('f1', true);
      expect(ctx.selectedItems().has('f1')).toBe(false);
      expect(ctx.selectedItems().has('f2')).toBe(true);
      expect(ctx.selectedItems().size).toBe(1);
      expect(ctx.getSelectedItemsList().map((item) => item.id)).toEqual(['f2']);

      return null;
    }

    renderToString(() => (
      <FileBrowserProvider files={files} initialPath="/">
        <Harness />
      </FileBrowserProvider>
    ));
  });

  it('should keep folder toggle and navigateTo expansion behavior consistent', () => {
    const docsFolder: FileItem = {
      id: 'docs',
      name: 'docs',
      type: 'folder',
      path: '/docs',
      children: [{ id: 'guide', name: 'guide.md', type: 'file', path: '/docs/guide.md' }],
    };
    const srcFolder: FileItem = {
      id: 'src',
      name: 'src',
      type: 'folder',
      path: '/src',
      children: [{ id: 'app', name: 'app.tsx', type: 'file', path: '/src/app.tsx' }],
    };

    function Harness() {
      const ctx = useFileBrowser();

      expect(ctx.isExpanded('/docs')).toBe(false);
      expect(ctx.isExpanded('/src')).toBe(false);

      ctx.toggleFolder('/docs');
      expect(ctx.isExpanded('/docs')).toBe(true);
      expect(ctx.expandedFolders().has('/docs')).toBe(true);
      expect(ctx.isExpanded('/src')).toBe(false);

      ctx.toggleFolder('/docs');
      expect(ctx.isExpanded('/docs')).toBe(false);

      ctx.navigateTo(srcFolder);
      expect(ctx.currentPath()).toBe('/src');
      expect(ctx.isExpanded('/src')).toBe(true);
      expect(ctx.expandedFolders().has('/src')).toBe(true);

      return null;
    }

    renderToString(() => (
      <FileBrowserProvider files={[docsFolder, srcFolder]} initialPath="/">
        <Harness />
      </FileBrowserProvider>
    ));
  });
});
