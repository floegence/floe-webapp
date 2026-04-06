import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function read(relPath: string): string {
  const here = fileURLToPath(import.meta.url);
  const dir = path.dirname(here);
  return fs.readFileSync(path.resolve(dir, relPath), 'utf8');
}

describe('file browser view selection integration contract', () => {
  it('routes list-view click behavior through shared range and platform-aware selection helpers', () => {
    const src = read('../src/components/file-browser/FileListView.tsx');

    expect(src).toContain("import { createFileBrowserMarqueeSelection } from './useFileBrowserMarqueeSelection';");
    expect(src).toContain("import { isPrimaryModKeyPressed } from '../../utils/keybind';");
    expect(src).toContain('ctx.selectRangeTo(props.item.id, isPrimaryModKeyPressed(e));');
    expect(src).toContain('ctx.selectItem(props.item.id, isPrimaryModKeyPressed(e));');
    expect(src).toContain('ctx.ensureContextMenuSelection(props.item.id);');
    expect(src).toContain('onPointerDown={marquee.onPointerDown}');
  });

  it('routes grid-view click behavior through shared range and platform-aware selection helpers', () => {
    const src = read('../src/components/file-browser/FileGridView.tsx');

    expect(src).toContain("import { createFileBrowserMarqueeSelection } from './useFileBrowserMarqueeSelection';");
    expect(src).toContain("import { isPrimaryModKeyPressed } from '../../utils/keybind';");
    expect(src).toContain('ctx.selectRangeTo(props.item.id, isPrimaryModKeyPressed(e));');
    expect(src).toContain('ctx.selectItem(props.item.id, isPrimaryModKeyPressed(e));');
    expect(src).toContain('ctx.ensureContextMenuSelection(props.item.id);');
    expect(src).toContain('onPointerDown={marquee.onPointerDown}');
  });
});
