import { Show, Suspense, createMemo, createResource, createSignal, lazy, type Accessor } from 'solid-js';
import { Button, Panel, PanelContent, PanelHeader, Skeleton } from '@floegence/floe-webapp-core';
import type { DemoFile } from '../workspace';

export interface FileViewerPageProps {
  file: Accessor<DemoFile>;
}

const MonacoViewer = lazy(() => import('../components/MonacoViewer'));

export function FileViewerPage(props: FileViewerPageProps) {
  const [content] = createResource(() => props.file(), (file) => file.load());
  const [wordWrap, setWordWrap] = createSignal(false);
  const [minimap, setMinimap] = createSignal(false);
  const [readOnly, setReadOnly] = createSignal(true);

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
            <p class="text-sm font-mono truncate">{props.file().path}</p>
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
                class="h-full"
              />
            </Suspense>
          </Show>
        </PanelContent>
      </Panel>
    </div>
  );
}
