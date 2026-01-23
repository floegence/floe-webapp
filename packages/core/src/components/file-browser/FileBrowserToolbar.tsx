import type { JSX } from 'solid-js';
import { cn } from '../../utils/cn';
import { useFileBrowser } from './FileBrowserContext';
import { Breadcrumb } from './Breadcrumb';
import type { ViewMode } from './types';
import { Grid } from '../icons';

export interface FileBrowserToolbarProps {
  class?: string;
}

// List icon
const ListIcon = (props: { class?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

// Folder up icon
const FolderUpIcon = (props: { class?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
    <path d="M12 10v6" />
    <path d="m9 13 3-3 3 3" />
  </svg>
);

// Sidebar toggle icon
const SidebarIcon = (props: { class?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <line x1="9" y1="3" x2="9" y2="21" />
  </svg>
);

/**
 * Toolbar with navigation, breadcrumb, and view mode toggle
 */
export function FileBrowserToolbar(props: FileBrowserToolbarProps) {
  const ctx = useFileBrowser();

  const canNavigateUp = () => {
    const path = ctx.currentPath();
    return path !== '/' && path !== '';
  };

  return (
    <div
      class={cn(
        'flex items-center gap-2 px-2 py-1.5 border-b border-border',
        'bg-background/50 backdrop-blur-sm',
        props.class
      )}
    >
      {/* Sidebar toggle (mobile) */}
      <button
        type="button"
        onClick={ctx.toggleSidebar}
        class={cn(
          'md:hidden flex items-center justify-center w-7 h-7 rounded cursor-pointer',
          'transition-colors duration-100',
          'hover:bg-muted/70',
          'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          !ctx.sidebarCollapsed() && 'bg-muted/50'
        )}
        aria-label="Toggle sidebar"
      >
        <SidebarIcon class="w-4 h-4" />
      </button>

      {/* Navigate up button */}
      <button
        type="button"
        onClick={ctx.navigateUp}
        disabled={!canNavigateUp()}
        class={cn(
          'flex items-center justify-center w-7 h-7 rounded cursor-pointer',
          'transition-colors duration-100',
          'hover:bg-muted/70',
          'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent'
        )}
        aria-label="Navigate to parent folder"
      >
        <FolderUpIcon class="w-4 h-4" />
      </button>

      {/* Breadcrumb navigation */}
      <div class="flex-1 min-w-0 overflow-hidden">
        <Breadcrumb />
      </div>

      {/* View mode toggle */}
      <div class="flex items-center gap-0.5 p-0.5 bg-muted/50 rounded-md">
        <ViewModeButton
          mode="list"
          currentMode={ctx.viewMode()}
          onClick={() => ctx.setViewMode('list')}
          icon={ListIcon}
          label="List view"
        />
        <ViewModeButton
          mode="grid"
          currentMode={ctx.viewMode()}
          onClick={() => ctx.setViewMode('grid')}
          icon={Grid}
          label="Grid view"
        />
      </div>
    </div>
  );
}

interface ViewModeButtonProps {
  mode: ViewMode;
  currentMode: ViewMode;
  onClick: () => void;
  icon: (props: { class?: string }) => JSX.Element;
  label: string;
}

function ViewModeButton(props: ViewModeButtonProps) {
  const isActive = () => props.currentMode === props.mode;

  return (
    <button
      type="button"
      onClick={() => props.onClick()}
      class={cn(
        'flex items-center justify-center w-6 h-6 rounded cursor-pointer',
        'transition-all duration-150',
        'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        isActive()
          ? 'bg-background shadow-sm text-foreground'
          : 'text-muted-foreground hover:text-foreground'
      )}
      aria-label={props.label}
      aria-pressed={isActive()}
    >
      <props.icon class="w-3.5 h-3.5" />
    </button>
  );
}
