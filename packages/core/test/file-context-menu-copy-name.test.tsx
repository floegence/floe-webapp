import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'solid-js/web';
import { FileBrowserProvider, useFileBrowser } from '../src/components/file-browser/FileBrowserContext';
import { FileContextMenu, createDefaultContextMenuItems, dispatchContextMenuAction } from '../src/components/file-browser/FileContextMenu';
import type { FileItem } from '../src/components/file-browser/types';

describe('FileContextMenu copy-name behavior', () => {
  const files: FileItem[] = [{ id: 'f1', name: 'a.txt', type: 'file', path: '/a.txt' }];

  it('should hide Copy Name when callbacks.onCopyName is not provided', () => {
    function Harness() {
      const ctx = useFileBrowser();
      if (!ctx.contextMenu()) ctx.showContextMenu({ x: 8, y: 8, items: files });
      return <FileContextMenu callbacks={{}} />;
    }

    const html = renderToString(() => (
      <FileBrowserProvider files={files} initialPath="/">
        <Harness />
      </FileBrowserProvider>
    ));

    expect(html).not.toContain('Copy Name');
  });

  it('should show Copy Name when callbacks.onCopyName is provided', () => {
    function Harness() {
      const ctx = useFileBrowser();
      if (!ctx.contextMenu()) ctx.showContextMenu({ x: 8, y: 8, items: files });
      return <FileContextMenu callbacks={{ onCopyName: () => {} }} />;
    }

    const html = renderToString(() => (
      <FileBrowserProvider files={files} initialPath="/">
        <Harness />
      </FileBrowserProvider>
    ));

    expect(html).toContain('Copy Name');
  });

  it('should include Copy Name in the default item list only when the host binds it', () => {
    expect(createDefaultContextMenuItems({}).map((item) => item.type)).not.toContain('copy-name');
    expect(createDefaultContextMenuItems({ onCopyName: () => {} }).map((item) => item.type)).toContain('copy-name');
  });

  it('should dispatch selected items to callbacks.onCopyName', () => {
    const onCopyName = vi.fn();

    dispatchContextMenuAction({
      id: 'copy-name',
      label: 'Copy Name',
      type: 'copy-name',
    }, files, { onCopyName });

    expect(onCopyName).toHaveBeenCalledTimes(1);
    expect(onCopyName).toHaveBeenCalledWith(files);
  });
});
