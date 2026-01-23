import { Show, type JSX, createSignal, onMount, onCleanup } from 'solid-js';
import { cn } from '../../utils/cn';
import { FileBrowserProvider, useFileBrowser } from './FileBrowserContext';
import { DirectoryTree } from './DirectoryTree';
import { FileListView } from './FileListView';
import { FileGridView } from './FileGridView';
import { FileBrowserToolbar } from './FileBrowserToolbar';
import { FileContextMenu, type FileContextMenuProps } from './FileContextMenu';
import type { FileItem, ViewMode, ContextMenuCallbacks, ContextMenuItem } from './types';

export interface FileBrowserProps {
  /** File tree data */
  files: FileItem[];
  /** Initial path to display */
  initialPath?: string;
  /** Initial view mode */
  initialViewMode?: ViewMode;
  /** Callback when navigation occurs */
  onNavigate?: (path: string) => void;
  /** Callback when selection changes */
  onSelect?: (items: FileItem[]) => void;
  /** Additional class names */
  class?: string;
  /** Custom header content */
  header?: JSX.Element;
  /** Sidebar width in pixels */
  sidebarWidth?: number;
  /** Hide sidebar on mobile by default */
  hideSidebarOnMobile?: boolean;
  /** Context menu callbacks for built-in actions */
  contextMenuCallbacks?: ContextMenuCallbacks;
  /** Custom context menu items to add */
  customContextMenuItems?: ContextMenuItem[];
  /** Override default context menu items completely */
  overrideContextMenuItems?: ContextMenuItem[];
  /** Default context menu items to hide */
  hideContextMenuItems?: FileContextMenuProps['hideItems'];
}

/**
 * Professional file browser component with list/grid views and directory tree sidebar
 */
export function FileBrowser(props: FileBrowserProps) {
  return (
    <FileBrowserProvider
      files={props.files}
      initialPath={props.initialPath}
      initialViewMode={props.initialViewMode}
      onNavigate={props.onNavigate}
      onSelect={props.onSelect}
    >
      <FileBrowserInner
        class={props.class}
        header={props.header}
        sidebarWidth={props.sidebarWidth}
        hideSidebarOnMobile={props.hideSidebarOnMobile}
        contextMenuCallbacks={props.contextMenuCallbacks}
        customContextMenuItems={props.customContextMenuItems}
        overrideContextMenuItems={props.overrideContextMenuItems}
        hideContextMenuItems={props.hideContextMenuItems}
      />
    </FileBrowserProvider>
  );
}

interface FileBrowserInnerProps {
  class?: string;
  header?: JSX.Element;
  sidebarWidth?: number;
  hideSidebarOnMobile?: boolean;
  contextMenuCallbacks?: ContextMenuCallbacks;
  customContextMenuItems?: ContextMenuItem[];
  overrideContextMenuItems?: ContextMenuItem[];
  hideContextMenuItems?: FileContextMenuProps['hideItems'];
}

function FileBrowserInner(props: FileBrowserInnerProps) {
  const ctx = useFileBrowser();
  const [isMobile, setIsMobile] = createSignal(false);
  const sidebarWidth = () => props.sidebarWidth ?? 220;

  // Mobile detection
  onMount(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);

    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      // Auto-collapse sidebar on mobile
      if (e.matches && props.hideSidebarOnMobile !== false) {
        // Will use the context's sidebarCollapsed state
      }
    };

    mq.addEventListener('change', handler);
    onCleanup(() => mq.removeEventListener('change', handler));
  });

  const showSidebar = () => !ctx.sidebarCollapsed() || !isMobile();

  return (
    <div
      class={cn(
        'flex flex-col h-full min-h-0 bg-background',
        'border border-border rounded-lg overflow-hidden',
        'shadow-sm',
        props.class
      )}
    >
      {/* Optional header */}
      <Show when={props.header}>
        <div class="border-b border-border">{props.header}</div>
      </Show>

      {/* Main content area */}
      <div class="flex flex-1 min-h-0">
        {/* Sidebar with directory tree */}
        <aside
          class={cn(
            'flex-shrink-0 border-r border-border bg-sidebar',
            'transition-all duration-200 ease-out',
            'overflow-hidden',
            // Mobile overlay
            isMobile() && !ctx.sidebarCollapsed() && 'absolute inset-y-0 left-0 z-10 shadow-lg'
          )}
          style={{
            width: showSidebar() ? `${sidebarWidth()}px` : '0px',
          }}
        >
          <div
            class="h-full flex flex-col"
            style={{ width: `${sidebarWidth()}px` }}
          >
            {/* Sidebar header */}
            <div class="flex items-center justify-between px-3 py-2 border-b border-sidebar-border">
              <span class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Explorer
              </span>
              <Show when={isMobile()}>
                <button
                  type="button"
                  onClick={ctx.toggleSidebar}
                  class="flex items-center justify-center w-5 h-5 rounded cursor-pointer hover:bg-sidebar-accent/80 transition-colors"
                  aria-label="Close sidebar"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="w-3.5 h-3.5"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </Show>
            </div>

            {/* Directory tree */}
            <div class="flex-1 min-h-0 overflow-auto py-1">
              <DirectoryTree />
            </div>
          </div>
        </aside>

        {/* Mobile overlay backdrop */}
        <Show when={isMobile() && !ctx.sidebarCollapsed()}>
          <div
            class="fixed inset-0 bg-background/60 backdrop-blur-sm z-[9]"
            onClick={ctx.toggleSidebar}
          />
        </Show>

        {/* Main file view area */}
        <div class="flex-1 min-w-0 flex flex-col">
          {/* Toolbar */}
          <FileBrowserToolbar />

          {/* File view (list or grid) */}
          <div class="flex-1 min-h-0">
            <Show
              when={ctx.viewMode() === 'list'}
              fallback={<FileGridView />}
            >
              <FileListView />
            </Show>
          </div>

          {/* Status bar */}
          <div class="flex items-center justify-between px-3 py-1 border-t border-border text-[10px] text-muted-foreground">
            <span>
              {ctx.currentFiles().length} items
              <Show when={ctx.selectedItems().size > 0}>
                {' · '}{ctx.selectedItems().size} selected
              </Show>
            </span>
            <span class="truncate max-w-[200px]">{ctx.currentPath()}</span>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      <FileContextMenu
        callbacks={props.contextMenuCallbacks}
        customItems={props.customContextMenuItems}
        overrideItems={props.overrideContextMenuItems}
        hideItems={props.hideContextMenuItems}
      />
    </div>
  );
}
