import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dispatchContextMenuAction } from '../src/components/file-browser/FileContextMenu';
import type { ContextMenuEvent, FileItem } from '../src/components/file-browser/types';

function read(relPath: string): string {
  const here = fileURLToPath(import.meta.url);
  const dir = path.dirname(here);
  return fs.readFileSync(path.resolve(dir, relPath), 'utf8');
}

describe('FileContextMenu submenu contract', () => {
  it('passes the full context menu event into custom actions', () => {
    const item: FileItem = { id: 'folder-src', name: 'src', type: 'folder', path: '/workspace/src' };
    const onAction = vi.fn();
    const menu: ContextMenuEvent = {
      x: 12,
      y: 24,
      items: [item],
      targetKind: 'item',
      source: 'tree',
      directory: {
        path: '/workspace/src',
        item,
      },
    };

    dispatchContextMenuAction({
      id: 'new-file',
      label: 'New File',
      type: 'custom',
      onAction,
    }, [item], undefined, menu);

    expect(onAction).toHaveBeenCalledWith([item], menu);
  });

  it('keeps explicit submenu rendering logic in the file context menu implementation', () => {
    const src = read('../src/components/file-browser/FileContextMenu.tsx');
    const typesSrc = read('../src/components/file-browser/types.ts');

    expect(typesSrc).toContain('children?: ContextMenuItem[]');
    expect(src).toContain('calculateSubmenuPosition');
    expect(src).toContain('<ChevronRight');
    expect(src).toContain('submenuOpen() && hasChildren()');
    expect(src).toContain('isEventInsideContextMenu');
    expect(src).toContain('installContextMenuDismissListeners');
    expect(src).toContain("ownerWindow.addEventListener('pointerdown', handlePointerOutside, true);");
    expect(src).toContain("ownerWindow.addEventListener('scroll', handleViewportChange, true);");
  });
});
