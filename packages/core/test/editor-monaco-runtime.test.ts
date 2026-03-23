import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { createMonacoStandaloneRuntime } from '../src/components/editor/monacoStandaloneRuntime';

function read(relPath: string): string {
  const here = fileURLToPath(import.meta.url);
  const dir = path.dirname(here);
  return fs.readFileSync(path.resolve(dir, relPath), 'utf8');
}

describe('Monaco standalone runtime', () => {
  it('loads the standalone runtime once after a successful bootstrap', async () => {
    const loader = vi.fn(async () => undefined);
    const ensureRuntime = createMonacoStandaloneRuntime(loader);

    await Promise.all([ensureRuntime(), ensureRuntime(), ensureRuntime()]);
    await ensureRuntime();

    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('allows retrying the bootstrap after a failed load', async () => {
    const loader = vi.fn()
      .mockRejectedValueOnce(new Error('runtime bootstrap failed'))
      .mockResolvedValueOnce(undefined);
    const ensureRuntime = createMonacoStandaloneRuntime(loader);

    await expect(ensureRuntime()).rejects.toThrow('runtime bootstrap failed');
    await expect(ensureRuntime()).resolves.toBeUndefined();

    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('keeps runtime bootstrap explicit and ordered ahead of editor creation', () => {
    const runtimeSrc = read('../src/components/editor/monacoStandaloneRuntime.ts');
    const codeEditorSrc = read('../src/components/editor/CodeEditor.tsx');
    const languagesSrc = read('../src/components/editor/languages.ts');

    expect(runtimeSrc).toContain("import('monaco-editor/esm/vs/editor/edcore.main.js')");
    expect(runtimeSrc).toContain("import('monaco-editor/esm/vs/editor/contrib/suggest/browser/suggestMemory.js')");
    expect(runtimeSrc).toContain("import('monaco-editor/esm/vs/editor/contrib/codelens/browser/codeLensCache.js')");
    expect(runtimeSrc).toContain("import('monaco-editor/esm/vs/editor/common/services/treeViewsDndService.js')");
    expect(runtimeSrc).toContain("import('monaco-editor/esm/vs/platform/actionWidget/browser/actionWidget.js')");

    expect(codeEditorSrc).toContain('await ensureMonacoStandaloneRuntime();');
    expect(codeEditorSrc.indexOf('await ensureMonacoStandaloneRuntime();')).toBeLessThan(
      codeEditorSrc.indexOf('editor = monaco.editor.create('),
    );

    expect(languagesSrc).toContain(
      "javascript: () => import('monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution.js')",
    );
    expect(languagesSrc).toContain(
      "typescript: () => import('monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution.js')",
    );
    expect(languagesSrc).toContain(
      "() => import('monaco-editor/esm/vs/basic-languages/html/html.contribution.js')",
    );
    expect(languagesSrc).toContain(
      "() => import('monaco-editor/esm/vs/language/html/monaco.contribution.js')",
    );
    expect(languagesSrc).toContain(
      "() => import('monaco-editor/esm/vs/basic-languages/css/css.contribution.js')",
    );
    expect(languagesSrc).toContain(
      "() => import('monaco-editor/esm/vs/basic-languages/scss/scss.contribution.js')",
    );
    expect(languagesSrc).toContain(
      "() => import('monaco-editor/esm/vs/basic-languages/less/less.contribution.js')",
    );
    expect(languagesSrc).toContain(
      "() => import('monaco-editor/esm/vs/language/css/monaco.contribution.js')",
    );
    expect(languagesSrc).not.toContain(
      "javascript: () => import('monaco-editor/esm/vs/language/typescript/monaco.contribution.js')",
    );
    expect(languagesSrc).not.toContain(
      "typescript: () => import('monaco-editor/esm/vs/language/typescript/monaco.contribution.js')",
    );
  });
});
