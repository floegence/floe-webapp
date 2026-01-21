import { For } from 'solid-js';
import { SidebarSection, SidebarItem, Button } from '@floegence/floe-webapp-core';

export interface ShowcaseSidebarProps {
  onJumpTo: (id: string) => void;
  onOpenFile: (id: string) => void;
}

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'ui-buttons', label: 'Buttons' },
  { id: 'ui-inputs', label: 'Inputs' },
  { id: 'ui-menus', label: 'Dropdown & Select' },
  { id: 'ui-tooltips', label: 'Tooltip' },
  { id: 'ui-dialogs', label: 'Dialogs' },
  { id: 'ui-command-palette', label: 'Command Palette' },
  { id: 'layout-resize', label: 'Layout & Resize' },
  { id: 'loading-overlay', label: 'Loading' },
  { id: 'icons', label: 'Icons' },
];

export function ShowcaseSidebar(props: ShowcaseSidebarProps) {
  return (
    <div class="p-3 space-y-4">
      <SidebarSection title="Showcase">
        <div class="space-y-1">
          <For each={sections}>
            {(item) => (
              <SidebarItem onClick={() => props.onJumpTo(item.id)}>
                {item.label}
              </SidebarItem>
            )}
          </For>
        </div>
      </SidebarSection>

      <SidebarSection title="Source">
        <div class="flex flex-col gap-2">
          <Button size="sm" variant="outline" onClick={() => props.onOpenFile('core.shell')}>
            View Shell.tsx
          </Button>
          <Button size="sm" variant="outline" onClick={() => props.onOpenFile('core.command-palette')}>
            View CommandPalette.tsx
          </Button>
          <Button size="sm" variant="outline" onClick={() => props.onOpenFile('docs.getting-started')}>
            View Getting Started
          </Button>
        </div>
      </SidebarSection>
    </div>
  );
}

