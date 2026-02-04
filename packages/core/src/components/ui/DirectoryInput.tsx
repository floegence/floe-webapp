/**
 * DirectoryInput - A form-compatible input for selecting directories.
 * Shows the selected path and expands an inline folder tree panel when clicked.
 */
import { createSignal, createEffect, on, Show, splitProps } from 'solid-js';
import { cn } from '../../utils/cn';
import {
  usePickerTree,
  PickerFolderTree,
  PickerBreadcrumb,
} from './picker/PickerBase';
import { Folder, ChevronRight } from '../icons';
import type { FileItem } from '../file-browser/types';

export type DirectoryInputSize = 'sm' | 'md' | 'lg';

export interface DirectoryInputProps {
  /** Currently selected directory path */
  value?: string;
  /** Callback when directory is selected */
  onChange?: (path: string) => void;
  /** File tree data for the picker */
  files: FileItem[];
  /** Callback to load directory contents (for lazy loading) */
  onExpand?: (path: string) => void;
  /** Placeholder text when no directory is selected */
  placeholder?: string;
  /** Optional home directory path for display */
  homePath?: string;
  /** Label for home button in picker */
  homeLabel?: string;
  /** Initial path when picker opens */
  initialPath?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Input size variant */
  size?: DirectoryInputSize;
  /** Error message - also sets visual error state */
  error?: string;
  /** Helper text displayed below the input */
  helperText?: string;
  /** Additional CSS class */
  class?: string;
  /** Maximum height for the tree panel (default: '200px') */
  treeMaxHeight?: string;
  /** Whether the tree panel is expanded by default (default: true) */
  defaultExpanded?: boolean;
}

const sizeStyles: Record<DirectoryInputSize, { container: string; icon: string; text: string }> = {
  sm: {
    container: 'h-7 px-2',
    icon: 'w-3.5 h-3.5',
    text: 'text-xs',
  },
  md: {
    container: 'h-8 px-2.5',
    icon: 'w-4 h-4',
    text: 'text-xs',
  },
  lg: {
    container: 'h-9 px-3',
    icon: 'w-4 h-4',
    text: 'text-sm',
  },
};

export function DirectoryInput(props: DirectoryInputProps) {
  const [local] = splitProps(props, [
    'value',
    'onChange',
    'files',
    'onExpand',
    'placeholder',
    'homePath',
    'homeLabel',
    'initialPath',
    'disabled',
    'size',
    'error',
    'helperText',
    'class',
    'treeMaxHeight',
    'defaultExpanded',
  ]);

  // Default to expanded
  const [expanded, setExpanded] = createSignal(local.defaultExpanded !== false);

  const size = () => local.size ?? 'md';
  const styles = () => sizeStyles[size()];

  // Trigger initial load on mount if expanded and no files
  createEffect(() => {
    if (expanded() && local.files.length === 0 && local.onExpand) {
      local.onExpand('/');
    }
  });

  // Picker tree state — initialized once on mount (open is always true to skip reset behavior)
  const tree = usePickerTree({
    initialPath: local.initialPath ?? '/',
    open: () => true,
    files: () => local.files,
    onExpand: (path) => local.onExpand?.(path),
    homeLabel: () => local.homeLabel,
    homePath: () => local.homePath,
  });

  // When user selects a folder in the tree, propagate to parent via onChange
  createEffect(
    on(tree.selectedPath, (path) => {
      // Only fire onChange when tree panel is open (avoid firing on initial mount)
      if (!expanded()) return;
      const displayPath = tree.toDisplayPath(path);
      local.onChange?.(displayPath);
    })
  );

  const handleToggle = () => {
    if (local.disabled) return;
    const wasExpanded = expanded();
    // Trigger initial load if needed
    if (!wasExpanded && local.files.length === 0 && local.onExpand) {
      local.onExpand('/');
    }
    setExpanded(!wasExpanded);
  };

  const displayValue = () => {
    if (!local.value) return null;
    // Show shortened path if it starts with homePath
    if (local.homePath && local.value.startsWith(local.homePath)) {
      const relative = local.value.slice(local.homePath.length);
      return '~' + (relative || '');
    }
    return local.value;
  };

  return (
    <div>
      {/* Trigger button — looks like a form input */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={local.disabled}
        class={cn(
          'w-full flex items-center gap-2 rounded border border-input bg-background shadow-sm',
          'transition-colors duration-100 cursor-pointer',
          'hover:bg-muted/50',
          'focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          local.error && 'border-error focus:ring-error',
          expanded() && 'rounded-b-none border-b-0',
          styles().container,
          local.class
        )}
      >
        <Folder class={cn('text-muted-foreground flex-shrink-0', styles().icon)} />
        <span
          class={cn(
            'flex-1 text-left truncate font-mono',
            styles().text,
            local.value ? 'text-foreground' : 'text-muted-foreground/60'
          )}
        >
          {displayValue() || local.placeholder || 'Select a directory...'}
        </span>
        <ChevronRight
          class={cn(
            'text-muted-foreground flex-shrink-0 transition-transform duration-150',
            styles().icon,
            expanded() && 'rotate-90'
          )}
        />
      </button>

      {/* Inline tree panel */}
      <Show when={expanded()}>
        <div class="border border-input rounded-b-md overflow-hidden bg-background shadow-sm border-t-0">
          {/* Breadcrumb */}
          <div class="px-2 py-1 border-b border-border/50 bg-muted/30">
            <PickerBreadcrumb
              segments={tree.breadcrumbSegments}
              onClick={tree.handleBreadcrumbClick}
            />
          </div>

          {/* Folder tree */}
          <PickerFolderTree
            rootFolders={tree.rootFolders}
            selectedPath={tree.selectedPath}
            expandedPaths={tree.expandedPaths}
            onToggle={tree.toggleExpand}
            onSelect={tree.handleSelectFolder}
            onSelectRoot={tree.handleSelectRoot}
            isSelectable={tree.isSelectable}
            homeLabel={tree.homeLabel}
            class="border-0 rounded-none"
            style={{ 'max-height': local.treeMaxHeight ?? '200px' }}
          />
        </div>
      </Show>

      <Show when={local.error}>
        <p class="mt-1 text-[11px] text-error" role="alert">
          {local.error}
        </p>
      </Show>

      <Show when={local.helperText && !local.error}>
        <p class="mt-1 text-[11px] text-muted-foreground">
          {local.helperText}
        </p>
      </Show>
    </div>
  );
}
