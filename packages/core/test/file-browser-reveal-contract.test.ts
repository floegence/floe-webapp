import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function read(relPath: string): string {
  const here = fileURLToPath(import.meta.url);
  const dir = path.dirname(here);
  return fs.readFileSync(path.resolve(dir, relPath), 'utf8');
}

describe('file browser reveal contract', () => {
  it('exposes controlled reveal props on FileBrowser and consumes reveal requests inside core views', () => {
    const browserSrc = read('../src/components/file-browser/FileBrowser.tsx');
    const indexSrc = read('../src/components/file-browser/index.ts');
    const listSrc = read('../src/components/file-browser/FileListView.tsx');
    const gridSrc = read('../src/components/file-browser/FileGridView.tsx');
    const typesSrc = read('../src/components/file-browser/types.ts');

    expect(typesSrc).toContain("export type FileBrowserRevealClearFilter = 'never' | 'if-needed';");
    expect(typesSrc).toContain('export interface FileBrowserRevealRequest {');
    expect(indexSrc).toContain('FileBrowserRevealClearFilter,');
    expect(indexSrc).toContain('FileBrowserRevealRequest,');
    expect(typesSrc).toContain('revealRequest: Accessor<FileBrowserRevealRequest | null>;');
    expect(typesSrc).toContain('consumeRevealRequest: (requestId: string) => void;');

    expect(browserSrc).toContain('revealRequest?: FileBrowserRevealRequest | null;');
    expect(browserSrc).toContain('onRevealRequestConsumed?: (requestId: string) => void;');
    expect(browserSrc).toContain('revealRequest={props.revealRequest}');
    expect(browserSrc).toContain('onRevealRequestConsumed={props.onRevealRequestConsumed}');

    expect(listSrc).toContain('const request = ctx.revealRequest();');
    expect(listSrc).toContain('ctx.selectItem(request.targetId, false);');
    expect(listSrc).toContain("scrollIntoView({ block: 'nearest', inline: 'nearest' })");
    expect(listSrc).toContain('ctx.consumeRevealRequest(request.requestId);');
    expect(listSrc).toContain('data-file-browser-item-id={props.item.id}');
    expect(listSrc).toContain('data-file-browser-item-path={props.item.path}');

    expect(gridSrc).toContain('const request = ctx.revealRequest();');
    expect(gridSrc).toContain('ctx.selectItem(request.targetId, false);');
    expect(gridSrc).toContain("scrollIntoView({ block: 'nearest', inline: 'nearest' })");
    expect(gridSrc).toContain('ctx.consumeRevealRequest(request.requestId);');
    expect(gridSrc).toContain('data-file-browser-item-id={props.item.id}');
    expect(gridSrc).toContain('data-file-browser-item-path={props.item.path}');
  });

  it('keeps reveal lifecycle orchestration inside FileBrowserContext without leaking product-specific logic', () => {
    const contextSrc = read('../src/components/file-browser/FileBrowserContext.tsx');

    expect(contextSrc).toContain('revealRequest?: FileBrowserRevealRequest | null;');
    expect(contextSrc).toContain('onRevealRequestConsumed?: (requestId: string) => void;');
    expect(contextSrc).toContain('const [activeRevealRequest, setActiveRevealRequest] = createSignal<FileBrowserRevealRequest | null>(null);');
    expect(contextSrc).toContain('const request = props.revealRequest ?? null;');
    expect(contextSrc).toContain('setActiveRevealRequest(request);');

    expect(contextSrc).toContain("if (!request || request.clearFilter !== 'if-needed') return;");
    expect(contextSrc).toContain('const currentVisible = filterState().fileById.has(request.targetId);');
    expect(contextSrc).toContain('const hiddenByFilter = sortedState().items.some((item) => item.id === request.targetId);');
    expect(contextSrc).toContain("setFilterQueryInternal('');");
    expect(contextSrc).toContain("setFilterQueryApplied('');");
    expect(contextSrc).toContain('setFilterActive(false);');

    expect(contextSrc).toContain('const consumeRevealRequest = (requestId: string) => {');
    expect(contextSrc).toContain("if (!current || current.requestId !== requestId) return;");
    expect(contextSrc).toContain('setActiveRevealRequest(null);');
    expect(contextSrc).toContain('deferNonBlocking(() => onRevealRequestConsumed?.(requestId));');
    expect(contextSrc).toContain('revealRequest: activeRevealRequest,');
    expect(contextSrc).toContain('consumeRevealRequest,');
  });
});
