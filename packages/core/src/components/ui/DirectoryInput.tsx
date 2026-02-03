/**
 * DirectoryInput - A form-compatible input for selecting directories.
 * Shows the selected path and opens a DirectoryPicker dialog when clicked.
 */
import { createSignal, Show, splitProps } from 'solid-js';
import { cn } from '../../utils/cn';
import { DirectoryPicker } from './DirectoryPicker';
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
  /** Dialog title */
  dialogTitle?: string;
  /** Confirm button text in dialog */
  confirmText?: string;
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
    'dialogTitle',
    'confirmText',
  ]);

  const [pickerOpen, setPickerOpen] = createSignal(false);

  const size = () => local.size ?? 'md';
  const styles = () => sizeStyles[size()];

  const handleClick = () => {
    if (local.disabled) return;
    // Trigger initial load if needed
    if (local.files.length === 0 && local.onExpand) {
      local.onExpand('/');
    }
    setPickerOpen(true);
  };

  const handleSelect = (path: string) => {
    // Convert relative picker path to full path
    const fullPath = local.homePath
      ? (path === '/' ? local.homePath : local.homePath + path)
      : path;
    local.onChange?.(fullPath);
    setPickerOpen(false);
  };

  const displayValue = () => {
    if (!local.value) return null;
    // Show shortened path if it starts with homePath
    if (local.homePath && local.value.startsWith(local.homePath)) {
      const relative = local.value.slice(local.homePath.length);
      return relative || '~';
    }
    return local.value;
  };

  return (
    <>
      <div class="relative">
        <button
          type="button"
          onClick={handleClick}
          disabled={local.disabled}
          class={cn(
            'w-full flex items-center gap-2 rounded border border-input bg-background shadow-sm',
            'transition-colors duration-100 cursor-pointer',
            'hover:bg-muted/50',
            'focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            local.error && 'border-error focus:ring-error',
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
          <ChevronRight class={cn('text-muted-foreground flex-shrink-0', styles().icon)} />
        </button>

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

      <DirectoryPicker
        open={pickerOpen()}
        onOpenChange={setPickerOpen}
        files={local.files}
        initialPath={local.initialPath ?? '/'}
        title={local.dialogTitle ?? 'Select Directory'}
        confirmText={local.confirmText ?? 'Select'}
        homeLabel={local.homeLabel}
        homePath={local.homePath}
        onSelect={handleSelect}
        onExpand={local.onExpand}
      />
    </>
  );
}
