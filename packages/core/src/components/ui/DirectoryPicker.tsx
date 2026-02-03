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
  type BasePickerProps,
} from './picker/PickerBase';

// ─── Public API ──────────────────────────────────────────────────────────────

export interface DirectoryPickerProps extends BasePickerProps {
  /** Called when user confirms selection */
  onSelect: (path: string) => void;
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
    // eslint-disable-next-line solid/reactivity -- onExpand is a static callback
    onExpand: props.onExpand,
    homeLabel: () => props.homeLabel,
    homePath: () => props.homePath,
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
          <span class="flex-1 text-[11px] text-muted-foreground truncate" title={tree.toDisplayPath(tree.selectedPath())}>
            {tree.toDisplayPath(tree.selectedPath())}
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
          homeLabel={tree.homeLabel}
          style={{ 'max-height': '280px', 'min-height': '160px' }}
        />

        <Show when={props.onCreateFolder}>
          <NewFolderSection
            parentPath={tree.selectedPath}
            onCreateFolder={props.onCreateFolder!}
            toDisplayPath={tree.toDisplayPath}
          />
        </Show>
      </div>
    </Dialog>
  );
}
