import type { Component } from 'solid-js';
import type { WidgetProps } from '../context/WidgetRegistry';
import { cn } from '../utils/cn';
import { Files, Search, Settings, Terminal } from '../components/icons';

/**
 * Sidebar widget that wraps existing sidebar components
 * The actual content is provided by the demo app
 */
export function SidebarWidget(props: WidgetProps) {
  return (
    <div class={cn('h-full overflow-auto', props.isEditMode && 'pointer-events-none')}>
      <div class="p-3 text-sm text-muted-foreground">
        Sidebar content for: {props.widgetId}
      </div>
    </div>
  );
}

// Pre-configured sidebar widget components
export const FilesSidebarWidget: Component<WidgetProps> = (props) => (
  <div class={cn('h-full', props.isEditMode && 'pointer-events-none')}>
    <div class="h-full flex flex-col items-center justify-center text-muted-foreground">
      <Files class="w-8 h-8 mb-2" />
      <span class="text-xs">Files Widget</span>
      <span class="text-xs text-muted-foreground/60">Connect to file explorer</span>
    </div>
  </div>
);

export const SearchSidebarWidget: Component<WidgetProps> = (props) => (
  <div class={cn('h-full', props.isEditMode && 'pointer-events-none')}>
    <div class="h-full flex flex-col items-center justify-center text-muted-foreground">
      <Search class="w-8 h-8 mb-2" />
      <span class="text-xs">Search Widget</span>
      <span class="text-xs text-muted-foreground/60">Connect to search</span>
    </div>
  </div>
);

export const SettingsSidebarWidget: Component<WidgetProps> = (props) => (
  <div class={cn('h-full', props.isEditMode && 'pointer-events-none')}>
    <div class="h-full flex flex-col items-center justify-center text-muted-foreground">
      <Settings class="w-8 h-8 mb-2" />
      <span class="text-xs">Settings Widget</span>
      <span class="text-xs text-muted-foreground/60">Connect to settings</span>
    </div>
  </div>
);

export const ShowcaseSidebarWidget: Component<WidgetProps> = (props) => (
  <div class={cn('h-full', props.isEditMode && 'pointer-events-none')}>
    <div class="h-full flex flex-col items-center justify-center text-muted-foreground">
      <Terminal class="w-8 h-8 mb-2" />
      <span class="text-xs">Showcase Widget</span>
      <span class="text-xs text-muted-foreground/60">Connect to showcase</span>
    </div>
  </div>
);
