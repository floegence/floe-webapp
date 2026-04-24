import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_MONACO_RUNTIME_PROFILE,
  createMonacoStandaloneRuntime,
  resolveMonacoRuntimeProfile,
  resolveMonacoRuntimeRequest,
} from '../src/components/editor/monacoStandaloneRuntime';

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
    expect(loader).toHaveBeenCalledWith(resolveMonacoRuntimeRequest());
  });

  it('caches profile-scoped runtime loads independently', async () => {
    const loader = vi.fn(async () => undefined);
    const ensureRuntime = createMonacoStandaloneRuntime(loader);

    await Promise.all([
      ensureRuntime({ profile: 'preview_basic' }),
      ensureRuntime({ profile: 'preview_basic' }),
    ]);
    await ensureRuntime({ profile: 'editor_full' });

    expect(loader).toHaveBeenCalledTimes(2);
    expect(loader).toHaveBeenNthCalledWith(
      1,
      resolveMonacoRuntimeRequest({ profile: 'preview_basic' }),
    );
    expect(loader).toHaveBeenNthCalledWith(
      2,
      resolveMonacoRuntimeRequest({ profile: 'editor_full' }),
    );
  });

  it('maps the legacy all-disabled feature combination to the safe preview profile', () => {
    const request = resolveMonacoRuntimeRequest({
      standaloneFeatures: {
        suggestMemory: false,
        codeLensCache: false,
        inlayHintsCache: false,
        treeViewsDnd: false,
        actionWidget: false,
      },
    });

    expect(request.profile).toBe('preview_basic');
    expect(request.blueprint.modules.map((module) => module.id)).toEqual([
      'edcore.main',
      'suggestMemory',
      'codeLensCache',
      'inlayHintsContribution',
      'treeViewsDndService',
      'actionWidget',
    ]);
  });

  it('keeps legacy partial feature overrides on the safe full editor profile', () => {
    expect(resolveMonacoRuntimeProfile({
      standaloneFeatures: {
        actionWidget: false,
      },
    })).toBe(DEFAULT_MONACO_RUNTIME_PROFILE);
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

    expect(runtimeSrc).toContain("export type MonacoRuntimeProfileName = 'editor_full' | 'preview_basic';");
    expect(runtimeSrc).toContain("export const DEFAULT_MONACO_RUNTIME_PROFILE: MonacoRuntimeProfileName = 'editor_full';");
    expect(runtimeSrc).toContain("profile: 'preview_basic'");
    expect(runtimeSrc).toContain('resolveMonacoRuntimeRequest(options)');
    expect(runtimeSrc).toContain('cacheKey: `profile:${profile}`');
    expect(runtimeSrc).toContain('return Promise.all(request.blueprint.modules.map((module) => module.load()))');
    expect(runtimeSrc).toContain('.then(() => undefined);');
    expect(runtimeSrc).toContain("type MonacoEditorApi = typeof import('monaco-editor/esm/vs/editor/editor.api.js');");
    expect(runtimeSrc).toContain("export async function loadMonacoEditorApi(");
    expect(runtimeSrc).toContain("await ensureMonacoStandaloneRuntime(options);");
    expect(runtimeSrc).toContain("pendingMonacoEditorApi = import('monaco-editor/esm/vs/editor/editor.api.js')");
    expect(runtimeSrc).toContain("import('monaco-editor/esm/vs/editor/edcore.main.js')");
    expect(runtimeSrc).toContain("import('monaco-editor/esm/vs/editor/contrib/suggest/browser/suggestMemory.js')");
    expect(runtimeSrc).toContain("import('monaco-editor/esm/vs/editor/contrib/codelens/browser/codeLensCache.js')");
    expect(runtimeSrc).toContain("import('monaco-editor/esm/vs/editor/contrib/inlayHints/browser/inlayHintsContribution.js')");
    expect(runtimeSrc).toContain("import('monaco-editor/esm/vs/editor/common/services/treeViewsDndService.js')");
    expect(runtimeSrc).toContain("import('monaco-editor/esm/vs/platform/actionWidget/browser/actionWidget.js')");
    expect(runtimeSrc).toContain('const pendingByKey = new Map<string, Promise<void>>();');
    expect(runtimeSrc).toContain('areAllStandaloneFeaturesDisabled(features)');

    expect(codeEditorSrc).toContain('monaco = await loadMonacoEditorApi(props.runtimeOptions);');
    expect(codeEditorSrc).not.toContain("import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';");
    expect(codeEditorSrc.indexOf('monaco = await loadMonacoEditorApi(props.runtimeOptions);')).toBeLessThan(
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
