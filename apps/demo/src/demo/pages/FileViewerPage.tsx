import { Show, Suspense, createEffect, createMemo, createResource, createSignal, lazy, on, type Accessor, onCleanup } from 'solid-js';
import { deferNonBlocking, useCommand, useNotification, useResolvedFloeConfig } from '@floegence/floe-webapp-core';
import { Panel, PanelContent, PanelHeader } from '@floegence/floe-webapp-core/layout';
import { Button } from '@floegence/floe-webapp-core/ui';
import { Skeleton } from '@floegence/floe-webapp-core/loading';
import type { DemoFile } from '../workspace';
import type { MonacoViewerApi } from '../components/MonacoViewer';

export interface FileViewerPageProps {
  file: Accessor<DemoFile>;
}

const MonacoViewer = lazy(() => import('../components/MonacoViewer'));

export function FileViewerPage(props: FileViewerPageProps) {
  const command = useCommand();
  const notifications = useNotification();
  const floe = useResolvedFloeConfig();

  const [content] = createResource(() => props.file(), (file) => file.load());
  const [wordWrap, setWordWrap] = createSignal(false);
  const [minimap, setMinimap] = createSignal(false);
  const [readOnly, setReadOnly] = createSignal(true);
  const [isDirty, setIsDirty] = createSignal(false);
  const [isSaving, setIsSaving] = createSignal(false);
  const [cleanAltVersionId, setCleanAltVersionId] = createSignal<number | null>(null);
  let editorApi: MonacoViewerApi | null = null;

  // Get storage key for this file
  const getStorageKey = () => `file-content:${props.file().id}`;

  // Reset editor-related state when switching files (avoid leaking dirty/saving state across files).
  createEffect(
    on(
      () => props.file().id,
      () => {
        editorApi = null;
        setIsDirty(false);
        setIsSaving(false);
        setCleanAltVersionId(null);
      }
    )
  );

  const handleEditorReady = (api: MonacoViewerApi) => {
    editorApi = api;
    setCleanAltVersionId(api.model.getAlternativeVersionId());
    setIsDirty(false);
  };

  const handleEditorContentChange = (_e: unknown, api: MonacoViewerApi) => {
    const clean = cleanAltVersionId();
    const current = api.model.getAlternativeVersionId();
    if (clean === null) {
      setCleanAltVersionId(current);
      setIsDirty(false);
      return;
    }
    setIsDirty(current !== clean);
  };

  // Save function
  const handleSave = () => {
    if (isSaving() || !isDirty()) return;
    const api = editorApi;
    if (!api) return;

    // Update UI first, then perform potentially heavy work (stringify + localStorage).
    setIsSaving(true);
    const storageKey = getStorageKey();
    const filePath = props.file().path;
    const persistSave = floe.persist.save;

    deferNonBlocking(() => {
      try {
        // If the user switched files before we run, drop this save.
        if (editorApi !== api) return;

        persistSave(storageKey, api.getValue());
        setCleanAltVersionId(api.model.getAlternativeVersionId());
        setIsDirty(false);
        notifications.success('File saved', `${filePath} saved to local storage`);
      } finally {
        setIsSaving(false);
      }
    });
  };

  // Register save command
  const unregister = command.register({
    id: 'file.save',
    title: 'Save File',
    description: 'Save current file (Cmd/Ctrl+S)',
    keybind: 'mod+s',
    category: 'File',
    execute: handleSave,
  });

  onCleanup(() => {
    unregister();
  });

  const editorOptions = createMemo(() => ({
    readOnly: readOnly(),
    wordWrap: wordWrap() ? ('on' as const) : ('off' as const),
    minimap: { enabled: minimap() },
  }));

  return (
    <div class="p-4 h-full">
      <Panel class="h-full border border-border rounded-lg overflow-hidden">
        <PanelHeader
          actions={
            <div class="flex items-center gap-2">
              <Show when={isDirty()}>
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleSave}
                  title="Save file (Cmd/Ctrl+S)"
                  loading={isSaving()}
                >
                  Save
                </Button>
              </Show>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setReadOnly((v) => !v)}
                title="Toggle read-only"
              >
                {readOnly() ? 'Read-only' : 'Editable'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setWordWrap((v) => !v)}
                title="Toggle word wrap"
              >
                {wordWrap() ? 'Wrap: On' : 'Wrap: Off'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMinimap((v) => !v)}
                title="Toggle minimap"
              >
                {minimap() ? 'Minimap: On' : 'Minimap: Off'}
              </Button>
            </div>
          }
        >
          <div class="min-w-0">
            <p class="text-xs text-muted-foreground">File</p>
            <p class="text-sm font-mono truncate">
              {props.file().path}
              <Show when={isDirty()}>
                <span class="text-warning ml-1">*</span>
              </Show>
            </p>
          </div>
        </PanelHeader>
        <PanelContent noPadding class="overflow-hidden">
          <Show
            when={content()}
            fallback={
              <div class="p-4 space-y-3">
                <Skeleton class="h-4 w-2/3" />
                <Skeleton class="h-4 w-1/2" />
                <Skeleton class="h-4 w-5/6" />
                <Skeleton class="h-64 w-full" />
              </div>
            }
          >
            <Suspense
              fallback={
                <div class="p-4 space-y-3">
                  <Skeleton class="h-4 w-2/3" />
                  <Skeleton class="h-4 w-1/2" />
                  <Skeleton class="h-4 w-5/6" />
                  <Skeleton class="h-64 w-full" />
                </div>
              }
            >
              <MonacoViewer
                path={props.file().path}
                language={props.file().language}
                value={content() ?? ''}
                options={editorOptions()}
                onReady={handleEditorReady}
                onContentChange={handleEditorContentChange}
                class="h-full"
              />
            </Suspense>
          </Show>
        </PanelContent>
      </Panel>
    </div>
  );
}
