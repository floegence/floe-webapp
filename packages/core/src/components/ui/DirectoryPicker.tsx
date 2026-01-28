import {
  Show,
  For,
  createSignal,
  createMemo,
  createEffect,
  on,
  type Accessor,
} from 'solid-js';
import { cn } from '../../utils/cn';
import { Dialog } from './Dialog';
import { Button } from './Button';
import { Input } from './Input';
import { ChevronRight, Plus, Check, X } from '../icons';
import { FolderIcon, FolderOpenIcon } from '../file-browser/FileIcons';
import type { FileItem } from '../file-browser/types';
import { deferNonBlocking } from '../../utils/defer';

// ─── Public API ──────────────────────────────────────────────────────────────

export interface DirectoryPickerProps {
  /** Whether the picker dialog is open */
  open: boolean;
  onOpenChange: (open: boolean) => void;

  /** Full file tree (same FileItem[] as FileBrowser) */
  files: FileItem[];

  /** Initial selected path (default: '/') */
  initialPath?: string;

  /** Dialog title (default: 'Select Directory') */
  title?: string;

  /** Confirm button text (default: 'Select') */
  confirmText?: string;

  /** Cancel button text (default: 'Cancel') */
  cancelText?: string;

  /** Called when user confirms selection */
  onSelect: (path: string) => void;

  /**
   * Called when user creates a new folder.
   * When provided, a "New Folder" button is shown.
   */
  onCreateFolder?: (parentPath: string, name: string) => Promise<void>;

  /** Optional: filter which directories are selectable (return false to grey-out) */
  filter?: (item: FileItem) => boolean;

  class?: string;
}

/**
 * Modal directory picker for selecting a folder path.
 * Standalone component — does not depend on FileBrowserContext.
 */
export function DirectoryPicker(props: DirectoryPickerProps) {
  const [selectedPath, setSelectedPath] = createSignal(props.initialPath ?? '/');
  const [expandedPaths, setExpandedPaths] = createSignal<Set<string>>(new Set(['/']));
  const [pathInput, setPathInput] = createSignal(props.initialPath ?? '/');
  const [pathInputError, setPathInputError] = createSignal('');
  const [creatingFolder, setCreatingFolder] = createSignal(false);
  const [newFolderName, setNewFolderName] = createSignal('');
  const [createLoading, setCreateLoading] = createSignal(false);

  // Reset state when dialog opens
  createEffect(
    on(
      () => props.open,
      (open) => {
        if (open) {
          const initial = props.initialPath ?? '/';
          setSelectedPath(initial);
          setPathInput(initial);
          setPathInputError('');
          setCreatingFolder(false);
          setNewFolderName('');
          setCreateLoading(false);

          // Auto-expand ancestors of initial path
          const ancestors = getAncestorPaths(initial);
          setExpandedPaths(new Set(['/', ...ancestors]));
        }
      }
    )
  );

  // Sync pathInput when selection changes via tree click
  createEffect(
    on(selectedPath, (path) => {
      setPathInput(path);
      setPathInputError('');
    })
  );

  // Build folder index: path → FileItem (folders only)
  const folderIndex = createMemo(() => {
    const map = new Map<string, FileItem>();
    const visit = (items: FileItem[]) => {
      for (const item of items) {
        if (item.type !== 'folder') continue;
        map.set(normalizePath(item.path), item);
        if (item.children?.length) visit(item.children);
      }
    };
    visit(props.files);
    return map;
  });

  // Root-level folders
  const rootFolders = createMemo(() => props.files.filter((f) => f.type === 'folder'));

  // Validate a path exists in the tree
  const isValidPath = (path: string): boolean => {
    const p = normalizePath(path);
    return p === '/' || folderIndex().has(p);
  };

  const isSelectable = (item: FileItem): boolean => {
    if (!props.filter) return true;
    return props.filter(item);
  };

  // ── Tree interaction ─────────────────────────────────────────────────

  const toggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleSelectFolder = (item: FileItem) => {
    if (!isSelectable(item)) return;
    setSelectedPath(item.path);

    // Auto-expand on select so user can see children
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      next.add(item.path);
      return next;
    });
  };

  const handleSelectRoot = () => {
    setSelectedPath('/');
  };

  // ── Path input ───────────────────────────────────────────────────────

  const handlePathInputGo = () => {
    const value = normalizePath(pathInput().trim());
    if (isValidPath(value)) {
      setSelectedPath(value);
      setPathInputError('');

      // Expand ancestors so the path is visible in tree
      const ancestors = getAncestorPaths(value);
      setExpandedPaths((prev) => {
        const next = new Set(prev);
        for (const a of ancestors) next.add(a);
        next.add(value);
        return next;
      });
    } else {
      setPathInputError('Path not found');
    }
  };

  const handlePathInputKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlePathInputGo();
    }
  };

  // ── New folder ───────────────────────────────────────────────────────

  const handleStartCreate = () => {
    setCreatingFolder(true);
    setNewFolderName('');
  };

  const handleCancelCreate = () => {
    setCreatingFolder(false);
    setNewFolderName('');
  };

  const handleConfirmCreate = async () => {
    const name = newFolderName().trim();
    if (!name || !props.onCreateFolder) return;

    setCreateLoading(true);
    try {
      await props.onCreateFolder(selectedPath(), name);
      // Close inline input after success
      setCreatingFolder(false);
      setNewFolderName('');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCreateKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirmCreate();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelCreate();
    }
  };

  // ── Confirm / Cancel ─────────────────────────────────────────────────

  const handleConfirm = () => {
    const path = selectedPath();
    const onSelect = props.onSelect;
    // Close UI first, then notify (UI response priority)
    props.onOpenChange(false);
    deferNonBlocking(() => onSelect(path));
  };

  const handleCancel = () => {
    props.onOpenChange(false);
  };

  // ── Breadcrumb segments ──────────────────────────────────────────────

  const breadcrumbSegments = createMemo(() => {
    const path = selectedPath();
    if (path === '/' || path === '') return [{ name: 'Root', path: '/' }];

    const parts = path.split('/').filter(Boolean);
    const result: { name: string; path: string }[] = [{ name: 'Root', path: '/' }];
    let current = '';
    for (const part of parts) {
      current += '/' + part;
      result.push({ name: part, path: current });
    }
    return result;
  });

  const handleBreadcrumbClick = (path: string) => {
    setSelectedPath(path);
    // Expand ancestors
    const ancestors = getAncestorPaths(path);
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      for (const a of ancestors) next.add(a);
      next.add(path);
      return next;
    });
  };

  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={props.title ?? 'Select Directory'}
      class={cn('max-w-lg', props.class)}
      footer={
        <div class="flex items-center w-full gap-2">
          {/* Selected path preview */}
          <span class="flex-1 text-[11px] text-muted-foreground truncate" title={selectedPath()}>
            {selectedPath()}
          </span>
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            {props.cancelText ?? 'Cancel'}
          </Button>
          <Button variant="primary" size="sm" onClick={handleConfirm}>
            {props.confirmText ?? 'Select'}
          </Button>
        </div>
      }
    >
      <div class="flex flex-col gap-2 -mt-1">
        {/* Path input */}
        <div class="flex items-center gap-1.5">
          <div class="flex-1">
            <Input
              size="sm"
              value={pathInput()}
              onInput={(e) => {
                setPathInput(e.currentTarget.value);
                setPathInputError('');
              }}
              onKeyDown={handlePathInputKeyDown}
              placeholder="/path/to/directory"
              error={pathInputError()}
            />
          </div>
          <Button variant="outline" size="sm" onClick={handlePathInputGo}>
            Go
          </Button>
        </div>

        {/* Breadcrumb */}
        <nav class="flex items-center gap-0.5 min-w-0 overflow-x-auto py-0.5" aria-label="Selected path">
          <For each={breadcrumbSegments()}>
            {(segment, index) => (
              <>
                <Show when={index() > 0}>
                  <ChevronRight class="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
                </Show>
                <button
                  type="button"
                  onClick={() => handleBreadcrumbClick(segment.path)}
                  class={cn(
                    'text-xs px-1 py-0.5 rounded cursor-pointer flex-shrink-0',
                    'transition-colors duration-100',
                    'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                    index() === breadcrumbSegments().length - 1
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  {segment.name}
                </button>
              </>
            )}
          </For>
        </nav>

        {/* Directory tree */}
        <div
          class="border border-border rounded overflow-y-auto"
          style={{ 'max-height': '280px', 'min-height': '160px' }}
        >
          {/* Root entry */}
          <button
            type="button"
            onClick={handleSelectRoot}
            class={cn(
              'flex items-center gap-1.5 w-full text-left text-xs py-1.5 px-2 cursor-pointer',
              'transition-colors duration-100',
              'hover:bg-accent/60',
              'focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring',
              selectedPath() === '/' && 'bg-accent text-accent-foreground font-medium'
            )}
          >
            <FolderOpenIcon class="w-4 h-4 flex-shrink-0" />
            <span>Root</span>
          </button>

          {/* Folder tree nodes */}
          <For each={rootFolders()}>
            {(item) => (
              <PickerTreeNode
                item={item}
                depth={1}
                selectedPath={selectedPath}
                expandedPaths={expandedPaths}
                onToggle={toggleExpand}
                onSelect={handleSelectFolder}
                isSelectable={isSelectable}
              />
            )}
          </For>

          {/* Empty state */}
          <Show when={rootFolders().length === 0}>
            <div class="flex items-center justify-center py-6 text-xs text-muted-foreground">
              No directories available
            </div>
          </Show>
        </div>

        {/* New folder section */}
        <Show when={props.onCreateFolder}>
          <Show
            when={creatingFolder()}
            fallback={
              <button
                type="button"
                onClick={handleStartCreate}
                class={cn(
                  'flex items-center gap-1 text-xs text-muted-foreground cursor-pointer',
                  'hover:text-foreground transition-colors duration-100',
                  'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded px-1 py-0.5'
                )}
              >
                <Plus class="w-3.5 h-3.5" />
                <span>New Folder</span>
              </button>
            }
          >
            <div class="flex items-center gap-1.5">
              <div class="flex-1">
                <Input
                  size="sm"
                  value={newFolderName()}
                  onInput={(e) => setNewFolderName(e.currentTarget.value)}
                  onKeyDown={handleCreateKeyDown}
                  placeholder="Folder name"
                  disabled={createLoading()}
                  autofocus
                />
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmCreate}
                loading={createLoading()}
                disabled={!newFolderName().trim()}
              >
                <Check class="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCancelCreate} disabled={createLoading()}>
                <X class="w-3.5 h-3.5" />
              </Button>
            </div>
            <p class="text-[11px] text-muted-foreground -mt-1">
              Creating in: {selectedPath()}
            </p>
          </Show>
        </Show>
      </div>
    </Dialog>
  );
}

// ─── Internal: PickerTreeNode ────────────────────────────────────────────────

interface PickerTreeNodeProps {
  item: FileItem;
  depth: number;
  selectedPath: Accessor<string>;
  expandedPaths: Accessor<Set<string>>;
  onToggle: (path: string) => void;
  onSelect: (item: FileItem) => void;
  isSelectable: (item: FileItem) => boolean;
}

function PickerTreeNode(props: PickerTreeNodeProps) {
  const isExpanded = () => props.expandedPaths().has(props.item.path);
  const isActive = () => props.selectedPath() === props.item.path;
  const selectable = () => props.isSelectable(props.item);
  const subfolders = createMemo(
    () => props.item.children?.filter((c) => c.type === 'folder') ?? []
  );
  const hasSubfolders = () => subfolders().length > 0;

  const handleChevronClick = (e: MouseEvent) => {
    e.stopPropagation();
    props.onToggle(props.item.path);
  };

  const handleSelect = () => {
    props.onSelect(props.item);
  };

  return (
    <div class="flex flex-col">
      <div
        class={cn(
          'group flex items-center w-full text-xs',
          'transition-colors duration-100',
          selectable() ? 'hover:bg-accent/60' : 'opacity-50',
          isActive() && selectable() && 'bg-accent text-accent-foreground font-medium'
        )}
        style={{ 'padding-left': `${4 + props.depth * 14}px` }}
      >
        {/* Expand / collapse chevron */}
        <Show
          when={hasSubfolders()}
          fallback={<span class="flex-shrink-0 w-4 h-4" />}
        >
          <button
            type="button"
            onClick={handleChevronClick}
            class={cn(
              'flex-shrink-0 w-4 h-4 flex items-center justify-center cursor-pointer',
              'transition-transform duration-150',
              isExpanded() && 'rotate-90',
              'focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring'
            )}
            aria-label={isExpanded() ? 'Collapse folder' : 'Expand folder'}
          >
            <ChevronRight class="w-3 h-3 opacity-60" />
          </button>
        </Show>

        {/* Folder row (clickable to select) */}
        <button
          type="button"
          onClick={handleSelect}
          disabled={!selectable()}
          class={cn(
            'flex items-center gap-1 flex-1 min-w-0 text-left py-1.5 pl-0.5 pr-2',
            selectable() ? 'cursor-pointer' : 'cursor-not-allowed',
            'focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring'
          )}
        >
          <span class="flex-shrink-0 w-4 h-4">
            <Show
              when={hasSubfolders() && isExpanded()}
              fallback={<FolderIcon class="w-4 h-4" />}
            >
              <FolderOpenIcon class="w-4 h-4" />
            </Show>
          </span>
          <span class="truncate">{props.item.name}</span>
        </button>
      </div>

      {/* Children */}
      <Show when={isExpanded() && hasSubfolders()}>
        <div class="overflow-hidden">
          <For each={subfolders()}>
            {(child) => (
              <PickerTreeNode
                item={child}
                depth={props.depth + 1}
                selectedPath={props.selectedPath}
                expandedPaths={props.expandedPaths}
                onToggle={props.onToggle}
                onSelect={props.onSelect}
                isSelectable={props.isSelectable}
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function normalizePath(path: string): string {
  const p = (path ?? '').trim();
  if (p === '' || p === '/') return '/';
  // Remove trailing slash, ensure leading slash
  const cleaned = p.replace(/\/+$/, '');
  return cleaned.startsWith('/') ? cleaned : '/' + cleaned;
}

/**
 * Returns all ancestor paths for a given path (excluding root and the path itself).
 * e.g. "/a/b/c" → ["/a", "/a/b"]
 */
function getAncestorPaths(path: string): string[] {
  const parts = path.split('/').filter(Boolean);
  const ancestors: string[] = [];
  let current = '';
  for (let i = 0; i < parts.length - 1; i++) {
    current += '/' + parts[i];
    ancestors.push(current);
  }
  return ancestors;
}
