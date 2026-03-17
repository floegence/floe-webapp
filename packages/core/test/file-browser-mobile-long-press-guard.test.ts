import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function read(relPath: string): string {
  const here = fileURLToPath(import.meta.url);
  const dir = path.dirname(here);
  return fs.readFileSync(path.resolve(dir, relPath), 'utf8');
}

describe('file browser mobile long-press guard', () => {
  it('defines one shared touch-target attribute contract and styles it in core CSS', () => {
    const guardSrc = read('../src/components/file-browser/touchInteractionGuard.ts');
    const stylesSrc = read('../src/styles/floe.css');

    expect(guardSrc).toContain("FILE_BROWSER_TOUCH_TARGET_ATTR = 'data-file-browser-touch-target'");
    expect(guardSrc).toContain("FILE_BROWSER_TOUCH_TARGET_VALUE = 'true'");
    expect(guardSrc).toContain('[FILE_BROWSER_TOUCH_TARGET_ATTR]: FILE_BROWSER_TOUCH_TARGET_VALUE');

    expect(stylesSrc).toContain("[data-file-browser-touch-target='true']");
    expect(stylesSrc).toContain('-webkit-user-select: none;');
    expect(stylesSrc).toContain('user-select: none;');
    expect(stylesSrc).toContain('-webkit-touch-callout: none;');
  });

  it('applies the shared touch-target guard to file list, file grid, and directory tree items', () => {
    const listSrc = read('../src/components/file-browser/FileListView.tsx');
    const gridSrc = read('../src/components/file-browser/FileGridView.tsx');
    const treeSrc = read('../src/components/file-browser/DirectoryTree.tsx');

    expect(listSrc).toContain("import { fileBrowserTouchTargetAttrs } from './touchInteractionGuard';");
    expect(gridSrc).toContain("import { fileBrowserTouchTargetAttrs } from './touchInteractionGuard';");
    expect(treeSrc).toContain("import { fileBrowserTouchTargetAttrs } from './touchInteractionGuard';");

    expect(listSrc).toContain('{...fileBrowserTouchTargetAttrs}');
    expect(gridSrc).toContain('{...fileBrowserTouchTargetAttrs}');
    expect(treeSrc).toContain('{...fileBrowserTouchTargetAttrs}');
  });
});
