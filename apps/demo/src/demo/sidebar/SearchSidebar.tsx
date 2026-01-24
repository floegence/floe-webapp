import { For, Show, type Accessor } from 'solid-js';
import { Input, SidebarContent, SidebarItemList, SidebarSection, SidebarItem, Search } from '@floegence/floe-webapp-core';
import type { DemoFile } from '../workspace';

export interface SearchSidebarProps {
  query: Accessor<string>;
  results: Accessor<DemoFile[]>;
  onQueryChange: (value: string) => void;
  onOpenFile: (id: string) => void;
}

function fileName(path: string) {
  const parts = path.split('/');
  return parts[parts.length - 1] ?? path;
}

export function SearchSidebar(props: SearchSidebarProps) {
  return (
    <SidebarContent>
      <SidebarSection title="Search">
        <Input
          value={props.query()}
          onInput={(e) => props.onQueryChange(e.currentTarget.value)}
          placeholder="Search files…"
          leftIcon={<Search class="w-4 h-4" />}
        />
        <div class="mt-2">
          <p class="text-[11px] text-muted-foreground">
            <Show when={props.query()} fallback="Type to search.">
              {props.results().length} results
            </Show>
          </p>
        </div>
        <div class="mt-1.5">
          <SidebarItemList>
            <For each={props.results().slice(0, 12)}>
              {(file) => (
                <SidebarItem onClick={() => props.onOpenFile(file.id)}>
                  <span class="truncate">{fileName(file.path)}</span>
                </SidebarItem>
              )}
            </For>
          </SidebarItemList>
        </div>
      </SidebarSection>
    </SidebarContent>
  );
}

