import { For } from 'solid-js';
import { SidebarContent, SidebarItemList, SidebarSection, SidebarItem, Button } from '@floegence/floe-webapp-core';

export interface ShowcaseSidebarProps {
  onJumpTo: (id: string) => void;
  onOpenFile: (id: string) => void;
}

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'ui-buttons', label: 'Buttons' },
  { id: 'ui-tabs', label: 'Tabs' },
  { id: 'ui-cards', label: 'Cards' },
  { id: 'ui-inputs', label: 'Inputs' },
  { id: 'ui-menus', label: 'Dropdown & Select' },
  { id: 'ui-tooltips', label: 'Tooltip' },
  { id: 'ui-dialogs', label: 'Dialogs' },
  { id: 'ui-directory-picker', label: 'Directory Picker' },
  { id: 'ui-floating-window', label: 'Floating Window' },
  { id: 'ui-command-palette', label: 'Command Palette' },
  { id: 'ui-file-browser', label: 'File Browser' },
  { id: 'loading-overlay', label: 'Loading' },
  { id: 'icons', label: 'Icons' },
];

export function ShowcaseSidebar(props: ShowcaseSidebarProps) {
  return (
    <SidebarContent>
      <SidebarSection title="Showcase">
        <SidebarItemList>
          <For each={sections}>
            {(item) => (
              <SidebarItem onClick={() => props.onJumpTo(item.id)}>
                {item.label}
              </SidebarItem>
            )}
          </For>
        </SidebarItemList>
      </SidebarSection>

      <SidebarSection title="Source">
        <div class="flex flex-col gap-1.5">
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
    </SidebarContent>
  );
}

