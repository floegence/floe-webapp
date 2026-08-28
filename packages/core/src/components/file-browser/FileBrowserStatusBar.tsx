import { Show, type JSX } from 'solid-js';
import { cn } from '../../utils/cn';
import { useFileBrowser } from './FileBrowserContext';

export interface FileBrowserStatusBarProps {
  /** Additional classes for the status bar container. */
  class?: string;
  /** Additional classes for the current-path label. */
  pathClass?: string;
  /** Localized item-count formatter. */
  formatItemCount?: (count: number) => JSX.Element;
  /** Localized label shown while a filter is applied. */
  filteredLabel?: JSX.Element;
  /** Localized selected-item-count formatter. */
  formatSelectedCount?: (count: number) => JSX.Element;
}

function defaultItemCount(count: number): string {
  return `${count} ${count === 1 ? 'item' : 'items'}`;
}

function defaultSelectedCount(count: number): string {
  return `${count} selected`;
}

/**
 * Shared file-browser status presentation for primitive-based and complete browsers.
 * Must be rendered inside a FileBrowserProvider.
 */
export function FileBrowserStatusBar(props: FileBrowserStatusBarProps) {
  const browser = useFileBrowser();
  const itemCount = () => browser.currentFiles().length;
  const selectedCount = () => browser.selectedItems().size;

  return (
    <div
      data-file-browser-status-bar="true"
      class={cn(
        'flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-1 text-[10px] text-muted-foreground',
        props.class
      )}
    >
      <div class="flex flex-wrap items-center gap-1.5">
        <span>{props.formatItemCount?.(itemCount()) ?? defaultItemCount(itemCount())}</span>
        <Show when={browser.filterQueryApplied().trim()}>
          <span aria-hidden="true">·</span>
          <span>{props.filteredLabel ?? 'Filtered'}</span>
        </Show>
        <Show when={selectedCount() > 0}>
          <span aria-hidden="true">·</span>
          <span>{props.formatSelectedCount?.(selectedCount()) ?? defaultSelectedCount(selectedCount())}</span>
        </Show>
      </div>
      <div
        class={cn('max-w-[200px] truncate text-right', props.pathClass)}
        title={browser.currentPath()}
      >
        {browser.currentPath()}
      </div>
    </div>
  );
}
