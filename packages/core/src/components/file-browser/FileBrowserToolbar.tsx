import type { JSX } from 'solid-js';
import { Show, onMount } from 'solid-js';
import { cn } from '../../utils/cn';
import { deferAfterPaint } from '../../utils/defer';
import { useFileBrowser } from './FileBrowserContext';
import { Breadcrumb } from './Breadcrumb';
import type { ViewMode } from './types';
import { Grid } from '../icons';

export interface FileBrowserToolbarProps {
  class?: string;
  /** Reference to focus the filter input */
  filterInputRef?: (el: HTMLInputElement) => void;
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

// Search icon
const SearchIcon = (props: { class?: string }) => (
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
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

// X icon for clear
const XIcon = (props: { class?: string }) => (
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
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

/**
 * Toolbar with navigation, breadcrumb, filter, and view mode toggle
 */
export function FileBrowserToolbar(props: FileBrowserToolbarProps) {
  const ctx = useFileBrowser();
  let inputRef: HTMLInputElement | undefined;

  const canNavigateUp = () => {
    const path = ctx.currentPath();
    return path !== '/' && path !== '';
  };

	  const handleFilterToggle = () => {
	    if (ctx.isFilterActive()) {
      // Close filter: clear query and collapse
      ctx.setFilterQuery('');
      ctx.setFilterActive(false);
	    } else {
	      // Open filter
	      ctx.setFilterActive(true);
	      // Defer focus so the input is mounted and the UI update can paint first.
	      deferAfterPaint(() => inputRef?.focus());
	    }
	  };

  const handleClearFilter = () => {
    ctx.setFilterQuery('');
    inputRef?.focus();
  };

  const handleFilterKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      ctx.setFilterQuery('');
      ctx.setFilterActive(false);
    }
  };

  const handleInputBlur = () => {
    // Collapse if empty on blur
    if (!ctx.filterQuery().trim()) {
      ctx.setFilterActive(false);
    }
  };

  // Set ref for external access (keyboard shortcut)
  onMount(() => {
    if (props.filterInputRef && inputRef) {
      props.filterInputRef(inputRef);
    }
  });

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

      {/* Breadcrumb navigation - hidden when filter is active on mobile */}
      <div
        class={cn(
          'flex-1 min-w-0 overflow-hidden transition-all duration-200',
          ctx.isFilterActive() && 'hidden sm:block sm:flex-1'
        )}
      >
        <Breadcrumb />
      </div>

      {/* Filter search box */}
      <div
        class={cn(
          'flex items-center gap-1 transition-all duration-200 ease-out',
          ctx.isFilterActive()
            ? 'flex-1 sm:flex-none sm:w-48'
            : 'w-7'
        )}
      >
        <Show
          when={ctx.isFilterActive()}
          fallback={
            <button
              type="button"
              onClick={handleFilterToggle}
              class={cn(
                'flex items-center justify-center w-7 h-7 rounded cursor-pointer',
                'transition-colors duration-100',
                'hover:bg-muted/70',
                'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring'
              )}
              aria-label="Filter files"
            >
              <SearchIcon class="w-4 h-4" />
            </button>
          }
        >
          <div class="flex items-center flex-1 gap-1 px-2 py-1 bg-muted/50 rounded-md border border-border/50 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring">
            <SearchIcon class="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <input
              ref={(el) => {
                inputRef = el;
                if (props.filterInputRef) props.filterInputRef(el);
              }}
              type="text"
              value={ctx.filterQuery()}
              onInput={(e) => ctx.setFilterQuery(e.currentTarget.value)}
              onKeyDown={handleFilterKeyDown}
              onBlur={handleInputBlur}
              placeholder="Filter..."
              class={cn(
                'flex-1 min-w-0 bg-transparent text-xs',
                'outline-none border-0 ring-0 shadow-none appearance-none',
                'focus:outline-none focus:border-0 focus:ring-0',
                'placeholder:text-muted-foreground/60'
              )}
              aria-label="Filter files by name"
            />
            <Show when={ctx.filterQuery()}>
              <button
                type="button"
                onClick={handleClearFilter}
                class={cn(
                  'flex items-center justify-center w-4 h-4 rounded-sm cursor-pointer',
                  'text-muted-foreground hover:text-foreground',
                  'transition-colors duration-100'
                )}
                aria-label="Clear filter"
              >
                <XIcon class="w-3 h-3" />
              </button>
            </Show>
          </div>
        </Show>
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
