import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dir = __dirname;

function read(relativePath: string): string {
  return readFileSync(resolve(dir, relativePath), 'utf8');
}

describe('file-browser drag preview public surface', () => {
  it('exposes a reusable drag preview component from the public file-browser entrypoint', () => {
    const previewSrc = read('../src/components/file-browser/DragPreview.tsx');
    const indexSrc = read('../src/components/file-browser/index.ts');

    expect(previewSrc).toContain('export function FileBrowserDragPreview()');
    expect(indexSrc).toContain("export { FileBrowserDragPreview } from './DragPreview';");
  });

  it('keeps the standard FileBrowser wired to the shared drag preview component', () => {
    const browserSrc = read('../src/components/file-browser/FileBrowser.tsx');

    expect(browserSrc).toContain("import { FileBrowserDragPreview } from './DragPreview';");
    expect(browserSrc).toContain('<FileBrowserDragPreview />');
  });
});
