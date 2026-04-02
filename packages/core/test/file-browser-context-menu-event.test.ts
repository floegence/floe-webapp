import { describe, expect, it } from 'vitest';
import { createItemContextMenuEvent } from '../src/components/file-browser/contextMenuEvent';
import type { FileItem } from '../src/components/file-browser/types';

describe('file browser context menu event builder', () => {
  const folder: FileItem = {
    id: 'folder-src',
    name: 'src',
    type: 'folder',
    path: '/workspace/src',
  };

  const file: FileItem = {
    id: 'file-readme',
    name: 'README.md',
    type: 'file',
    path: '/workspace/README.md',
  };

  it('captures directory scope for a single folder target', () => {
    const event = createItemContextMenuEvent({
      x: 24,
      y: 32,
      triggerItem: folder,
      items: [folder],
      source: 'tree',
    });

    expect(event.targetKind).toBe('item');
    expect(event.source).toBe('tree');
    expect(event.directory).toEqual({
      path: '/workspace/src',
      item: folder,
    });
  });

  it('does not synthesize directory scope for files or multi-select menus', () => {
    const fileEvent = createItemContextMenuEvent({
      x: 10,
      y: 12,
      triggerItem: file,
      items: [file],
      source: 'list',
    });

    const multiEvent = createItemContextMenuEvent({
      x: 18,
      y: 22,
      triggerItem: folder,
      items: [folder, file],
      source: 'grid',
    });

    expect(fileEvent.directory).toBeNull();
    expect(multiEvent.directory).toBeNull();
  });
});
