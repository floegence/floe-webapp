import { Show } from 'solid-js';
import { cn } from '../../utils/cn';
import { Dialog } from './Dialog';
import { Button } from './Button';
import type { FileItem } from '../file-browser/types';
import { deferNonBlocking } from '../../utils/defer';
import {
  usePickerTree,
  PathInputBar,
  PickerBreadcrumb,
  PickerFolderTree,
  NewFolderSection,
} from './picker/PickerBase';

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
  const tree = usePickerTree({
    initialPath: props.initialPath,
    open: () => props.open,
    files: () => props.files,
    // eslint-disable-next-line solid/reactivity -- filter is a static callback
    filter: props.filter ? (item: FileItem) => props.filter!(item) : undefined,
  });

  // ── Confirm / Cancel ─────────────────────────────────────────────────

  const handleConfirm = () => {
    const path = tree.selectedPath();
    const onSelect = props.onSelect;
    // Close UI first, then notify (UI response priority)
    props.onOpenChange(false);
    deferNonBlocking(() => onSelect(path));
  };

  const handleCancel = () => {
    props.onOpenChange(false);
  };

  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={props.title ?? 'Select Directory'}
      class={cn('max-w-lg', props.class)}
      footer={
        <div class="flex items-center w-full gap-2">
          <span class="flex-1 text-[11px] text-muted-foreground truncate" title={tree.selectedPath()}>
            {tree.selectedPath()}
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
        <PathInputBar
          value={tree.pathInput}
          onInput={(v) => {
            tree.setPathInput(v);
            tree.setPathInputError('');
          }}
          error={tree.pathInputError}
          onGo={tree.handlePathInputGo}
          onKeyDown={tree.handlePathInputKeyDown}
        />

        <PickerBreadcrumb
          segments={tree.breadcrumbSegments}
          onClick={tree.handleBreadcrumbClick}
        />

        <PickerFolderTree
          rootFolders={tree.rootFolders}
          selectedPath={tree.selectedPath}
          expandedPaths={tree.expandedPaths}
          onToggle={tree.toggleExpand}
          onSelect={tree.handleSelectFolder}
          onSelectRoot={tree.handleSelectRoot}
          isSelectable={tree.isSelectable}
          style={{ 'max-height': '280px', 'min-height': '160px' }}
        />

        <Show when={props.onCreateFolder}>
          <NewFolderSection
            parentPath={tree.selectedPath}
            onCreateFolder={props.onCreateFolder!}
          />
        </Show>
      </div>
    </Dialog>
  );
}
