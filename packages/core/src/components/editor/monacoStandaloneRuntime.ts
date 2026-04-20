/* eslint-disable @typescript-eslint/triple-slash-reference -- ambient Monaco shims must load for direct source consumers. */
/// <reference path="../../monaco-internals.d.ts" />

export interface MonacoRuntimeFeatureSet {
  suggestMemory: boolean;
  codeLensCache: boolean;
  inlayHintsCache: boolean;
  treeViewsDnd: boolean;
  actionWidget: boolean;
}

export interface CodeEditorRuntimeOptions {
  standaloneFeatures?: Partial<MonacoRuntimeFeatureSet>;
}

export const DEFAULT_MONACO_STANDALONE_FEATURES: MonacoRuntimeFeatureSet = {
  suggestMemory: true,
  codeLensCache: true,
  inlayHintsCache: true,
  treeViewsDnd: true,
  actionWidget: true,
};

type MonacoStandaloneRuntimeLoader = (features: MonacoRuntimeFeatureSet) => Promise<unknown>;

export function normalizeMonacoRuntimeFeatureSet(
  standaloneFeatures?: Partial<MonacoRuntimeFeatureSet>,
): MonacoRuntimeFeatureSet {
  return {
    ...DEFAULT_MONACO_STANDALONE_FEATURES,
    ...(standaloneFeatures ?? {}),
  };
}

function serializeMonacoRuntimeFeatureSet(features: MonacoRuntimeFeatureSet): string {
  return [
    `suggestMemory:${features.suggestMemory ? '1' : '0'}`,
    `codeLensCache:${features.codeLensCache ? '1' : '0'}`,
    `inlayHintsCache:${features.inlayHintsCache ? '1' : '0'}`,
    `treeViewsDnd:${features.treeViewsDnd ? '1' : '0'}`,
    `actionWidget:${features.actionWidget ? '1' : '0'}`,
  ].join('|');
}

export function createMonacoStandaloneRuntime(
  loader: MonacoStandaloneRuntimeLoader,
): (options?: CodeEditorRuntimeOptions) => Promise<void> {
  const pendingByKey = new Map<string, Promise<void>>();

  return (options) => {
    const features = normalizeMonacoRuntimeFeatureSet(options?.standaloneFeatures);
    const key = serializeMonacoRuntimeFeatureSet(features);
    const pending = pendingByKey.get(key);
    if (pending) return pending;

    const next = loader(features)
      .then(() => undefined)
      .catch((error) => {
        pendingByKey.delete(key);
        throw error;
      });

    pendingByKey.set(key, next);
    return next;
  };
}

function loadMonacoStandaloneRuntime(features: MonacoRuntimeFeatureSet): Promise<unknown> {
  const loaders: Promise<unknown>[] = [
    import('monaco-editor/esm/vs/editor/edcore.main.js'),
  ];

  if (features.suggestMemory) {
    loaders.push(import('monaco-editor/esm/vs/editor/contrib/suggest/browser/suggestMemory.js'));
  }
  if (features.codeLensCache) {
    loaders.push(import('monaco-editor/esm/vs/editor/contrib/codelens/browser/codeLensCache.js'));
  }
  if (features.inlayHintsCache) {
    loaders.push(import('monaco-editor/esm/vs/editor/contrib/inlayHints/browser/inlayHintsContribution.js'));
  }
  if (features.treeViewsDnd) {
    loaders.push(import('monaco-editor/esm/vs/editor/common/services/treeViewsDndService.js'));
  }
  if (features.actionWidget) {
    loaders.push(import('monaco-editor/esm/vs/platform/actionWidget/browser/actionWidget.js'));
  }

  return Promise.all(loaders);
}

export const ensureMonacoStandaloneRuntime = createMonacoStandaloneRuntime(
  loadMonacoStandaloneRuntime,
);
