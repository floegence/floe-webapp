import { describe, expect, it } from 'vitest';
import { renderToString } from 'solid-js/web';
import { FileBrowserProvider, useFileBrowser } from '../src/components/file-browser/FileBrowserContext';
import { FileContextMenu } from '../src/components/file-browser/FileContextMenu';
import type { FileItem } from '../src/components/file-browser/types';

describe('FileContextMenu ask-agent visibility', () => {
  const files: FileItem[] = [{ id: 'f1', name: 'a.txt', type: 'file', path: '/a.txt' }];

  it('should hide Ask Agent when callbacks.onAskAgent is not provided', () => {
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

    expect(html).toContain('Duplicate');
    expect(html).not.toContain('Ask Agent');
  });

  it('should show Ask Agent when callbacks.onAskAgent is provided', () => {
    function Harness() {
      const ctx = useFileBrowser();
      if (!ctx.contextMenu()) ctx.showContextMenu({ x: 8, y: 8, items: files });
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

