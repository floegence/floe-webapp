import { For, Show, type Accessor } from 'solid-js';
import { Panel, PanelContent, PanelHeader, type ButtonProps, Button } from '@floegence/floe-webapp-core';
import type { DemoFile } from '../workspace';

export interface SearchPageProps {
  query: Accessor<string>;
  results: Accessor<DemoFile[]>;
  onOpenFile: (id: string) => void;
}

function HighlightedText(props: { text: string; query: string }) {
  const index = () => props.query ? props.text.toLowerCase().indexOf(props.query.toLowerCase()) : -1;

  return (
    <Show
      when={props.query && index() >= 0}
      fallback={<span class="truncate">{props.text}</span>}
    >
      <span class="truncate">
        {props.text.slice(0, index())}
        <mark class="rounded bg-warning/20 px-0.5 text-foreground">
          {props.text.slice(index(), index() + props.query.length)}
        </mark>
        {props.text.slice(index() + props.query.length)}
      </span>
    </Show>
  );
}

export function SearchPage(props: SearchPageProps) {
  const secondaryButton: ButtonProps = {
    size: 'sm',
    variant: 'outline',
  };

  return (
    <div class="p-6 max-w-5xl mx-auto space-y-6">
      <div class="space-y-2">
        <h1 class="text-2xl font-semibold">Search</h1>
        <p class="text-sm text-muted-foreground">
          Search over the demo workspace (files + docs + core sources).
        </p>
      </div>

      <Panel class="border border-border rounded-lg overflow-hidden">
        <PanelHeader actions={
          <div class="flex items-center gap-2">
            <Button
              {...secondaryButton}
              onClick={() => {
                const first = props.results()[0];
                if (first) props.onOpenFile(first.id);
              }}
              disabled={props.results().length === 0}
            >
              Open first result
            </Button>
          </div>
        }>
          <div class="flex items-center gap-2">
            <span class="text-muted-foreground">Query:</span>
            <span class="font-mono text-xs">{props.query() || '(empty)'}</span>
            <span class="text-muted-foreground">·</span>
            <span class="text-muted-foreground">{props.results().length} results</span>
          </div>
        </PanelHeader>
        <PanelContent noPadding>
          <div class="divide-y divide-border">
            <Show
              when={props.results().length > 0}
              fallback={
                <div class="p-4 text-sm text-muted-foreground">
                  Type in the Search sidebar to see results.
                </div>
              }
            >
              <For each={props.results()}>
                {(file) => (
                  <button
                    type="button"
                    class="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                    onClick={() => props.onOpenFile(file.id)}
                  >
                    <span class="w-24 shrink-0 text-xs font-mono text-muted-foreground">
                      {file.language}
                    </span>
                    <HighlightedText text={file.path} query={props.query()} />
                    <span class="ml-auto text-xs text-muted-foreground">Open</span>
                  </button>
                )}
              </For>
            </Show>
          </div>
        </PanelContent>
      </Panel>
    </div>
  );
}

