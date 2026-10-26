import { For, Show, createMemo, createSignal } from 'solid-js';
import {
  SidebarContent,
  SidebarItem,
  SidebarItemList,
  SidebarSection,
} from '@floegence/floe-webapp-core/layout';
import { Input } from '@floegence/floe-webapp-core/ui';
import {
  Bookmark,
  FileCode,
  Grid3x3,
  Home,
  Layers,
  Search,
  Sparkles,
} from '@floegence/floe-webapp-core/icons';
import {
  COMPONENT_GROUPS,
  SHOWCASE_COMPONENTS,
  type ShowcaseEntry,
  type ShowcaseGroup,
} from '../showcaseCatalog';

export interface ShowcaseSidebarProps {
  activeSection: string;
  onSelectSection: (id: string) => void;
  onOpenFile: (id: string) => void;
}

/* The demo's navigation. It serves a product tour rather than a file tree, so
 * it is laid out in three bands: who this is, where to start, and what is in
 * the box. The catalog is thirty-one pages, which is too many to scan as one
 * list, so it stays grouped and gains a filter that searches labels,
 * descriptions and group names. */

const START_ITEMS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'scenarios', label: 'Scenarios', icon: Sparkles },
  { id: 'overview', label: 'Components', icon: Grid3x3 },
] as const;

const SOURCE_ITEMS = [
  { file: 'core.shell', label: 'Shell.tsx', icon: FileCode },
  { file: 'core.command-palette', label: 'CommandPalette.tsx', icon: FileCode },
  { file: 'docs.getting-started', label: 'Getting started', icon: Bookmark },
] as const;

export function ShowcaseSidebar(props: ShowcaseSidebarProps) {
  const [query, setQuery] = createSignal('');

  const matches = (item: ShowcaseEntry, groupLabel: string, needle: string) =>
    item.label.toLowerCase().includes(needle) ||
    item.description.toLowerCase().includes(needle) ||
    groupLabel.toLowerCase().includes(needle);

  const groups = createMemo<ShowcaseGroup[]>(() => {
    const needle = query().trim().toLowerCase();
    if (!needle) return COMPONENT_GROUPS;
    return COMPONENT_GROUPS.map((group) => ({
      label: group.label,
      items: group.items.filter((item) => matches(item, group.label, needle)),
    })).filter((group) => group.items.length > 0);
  });

  return (
    <div class="flex h-full min-h-0 flex-col">
      {/* Identity: this sidebar belongs to a product, so it says which one. */}
      <div class="flex shrink-0 items-center gap-2.5 border-b border-sidebar-border px-3 py-3">
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-primary text-primary-foreground">
          <Layers class="h-4 w-4" />
        </span>
        <div class="min-w-0 flex-1">
          <div class="truncate text-[length:var(--floe-type-control)] font-semibold leading-tight">
            Floe Webapp
          </div>
          <div class="truncate text-caption text-[var(--floe-ink-quiet)]">
            {SHOWCASE_COMPONENTS.length} components · one shell
          </div>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-auto overscroll-contain">
        <SidebarContent>
          {/* Orientation: three destinations, not components. */}
          <SidebarItemList>
            <For each={START_ITEMS}>
              {(item) => (
                <SidebarItem
                  active={props.activeSection === item.id}
                  icon={<item.icon class="h-4 w-4" />}
                  onClick={() => props.onSelectSection(item.id)}
                >
                  {item.label}
                </SidebarItem>
              )}
            </For>
          </SidebarItemList>

          <div class="px-1">
            <Input
              size="sm"
              type="search"
              placeholder="Find a component"
              aria-label="Find a component"
              leftIcon={<Search class="h-3.5 w-3.5" />}
              value={query()}
              onInput={(event) => setQuery(event.currentTarget.value)}
            />
          </div>

          <For each={groups()}>
            {(group) => (
              <SidebarSection
                title={group.label}
                actions={
                  <span class="text-caption font-normal tracking-normal text-[var(--floe-ink-quiet)]">
                    {group.items.length}
                  </span>
                }
              >
                <SidebarItemList>
                  <For each={group.items}>
                    {(item) => (
                      <SidebarItem
                        active={props.activeSection === item.id}
                        onClick={() => props.onSelectSection(item.id)}
                      >
                        {item.label}
                      </SidebarItem>
                    )}
                  </For>
                </SidebarItemList>
              </SidebarSection>
            )}
          </For>

          <Show when={query().trim() && groups().length === 0}>
            <p class="px-2.5 py-4 text-caption leading-relaxed text-[var(--floe-ink-quiet)]">
              No component matches “{query().trim()}”. Try a group name, such as Inputs or Overlays.
            </p>
          </Show>

          {/* Source: the three files a reader asks for next. Rows, not buttons,
              so the panel keeps one navigation language. */}
          <div class="border-t border-[var(--floe-line-quiet)] pt-3">
            <SidebarSection title="Source">
              <SidebarItemList>
                <For each={SOURCE_ITEMS}>
                  {(item) => (
                    <SidebarItem
                      icon={<item.icon class="h-4 w-4" />}
                      onClick={() => props.onOpenFile(item.file)}
                    >
                      {item.label}
                    </SidebarItem>
                  )}
                </For>
              </SidebarItemList>
            </SidebarSection>
          </div>
        </SidebarContent>
      </div>
    </div>
  );
}
