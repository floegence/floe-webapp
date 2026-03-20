type MonacoStandaloneRuntimeLoader = () => Promise<unknown>;

export function createMonacoStandaloneRuntime(loader: MonacoStandaloneRuntimeLoader): () => Promise<void> {
  let pending: Promise<void> | null = null;

  return () => {
    if (pending) return pending;

    pending = loader()
      .then(() => undefined)
      .catch((error) => {
        pending = null;
        throw error;
      });

    return pending;
  };
}

function loadMonacoStandaloneRuntime(): Promise<unknown> {
  return Promise.all([
    import('monaco-editor/esm/vs/editor/edcore.main.js'),
    import('monaco-editor/esm/vs/editor/contrib/suggest/browser/suggestMemory.js'),
    import('monaco-editor/esm/vs/editor/contrib/codelens/browser/codeLensCache.js'),
    import('monaco-editor/esm/vs/editor/common/services/treeViewsDndService.js'),
    import('monaco-editor/esm/vs/platform/actionWidget/browser/actionWidget.js'),
  ]);
}

export const ensureMonacoStandaloneRuntime = createMonacoStandaloneRuntime(loadMonacoStandaloneRuntime);
