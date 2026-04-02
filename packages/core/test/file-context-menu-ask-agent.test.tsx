import { describe, expect, it } from 'vitest';
import { renderToString } from 'solid-js/web';
import { FileBrowserProvider, useFileBrowser } from '../src/components/file-browser/FileBrowserContext';
import { FileContextMenu } from '../src/components/file-browser/FileContextMenu';
import type { ContextMenuEvent, FileItem } from '../src/components/file-browser/types';

describe('FileContextMenu ask-agent visibility', () => {
  const files: FileItem[] = [{ id: 'f1', name: 'a.txt', type: 'file', path: '/a.txt' }];
  const menuEvent: ContextMenuEvent = {
    x: 8,
    y: 8,
    items: files,
    targetKind: 'item',
    source: 'list',
    directory: null,
  };

  it('should hide Ask Agent when callbacks.onAskAgent is not provided', () => {
    function Harness() {
      const ctx = useFileBrowser();
      if (!ctx.contextMenu()) ctx.showContextMenu(menuEvent);
      return <FileContextMenu callbacks={{}} />;
    }

    const html = renderToString(() => (
      <FileBrowserProvider files={files} initialPath="/">
        <Harness />
      </FileBrowserProvider>
    ));

    expect(html).toContain('Duplicate');
    expect(html).not.toContain('Ask Agent');
  });

  it('should show Ask Agent when callbacks.onAskAgent is provided', () => {
    function Harness() {
      const ctx = useFileBrowser();
      if (!ctx.contextMenu()) ctx.showContextMenu(menuEvent);
      return <FileContextMenu callbacks={{ onAskAgent: () => {} }} />;
    }

    const html = renderToString(() => (
      <FileBrowserProvider files={files} initialPath="/">
        <Harness />
      </FileBrowserProvider>
    ));

    expect(html).toContain('Ask Agent');
  });
});
