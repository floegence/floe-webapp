import { Show, For, createSignal, createMemo, createEffect, on } from 'solid-js';
import { cn } from '../../utils/cn';
import { Dialog } from './Dialog';
import { Button } from './Button';
import { Input } from './Input';
import type { FileItem } from '../file-browser/types';
import { getFileIcon } from '../file-browser/FileIcons';
import { deferNonBlocking } from '../../utils/defer';
import {
  usePickerTree,
  normalizePath,
  PathInputBar,
  PickerBreadcrumb,
  PickerFolderTree,
  NewFolderSection,
} from './picker/PickerBase';

// ─── Public API ──────────────────────────────────────────────────────────────

export interface FileSavePickerProps {
  /** Whether the picker dialog is open */
  open: boolean;
  onOpenChange: (open: boolean) => void;

  /** Full file tree (same FileItem[] as FileBrowser) */
  files: FileItem[];

  /** Initial directory path (default: '/') */
  initialPath?: string;

  /** Pre-filled filename (e.g. rename scenario) */
  initialFileName?: string;

  /** Dialog title (default: 'Save File') */
  title?: string;

  /** Confirm button text (default: 'Save') */
  confirmText?: string;

  /** Cancel button text (default: 'Cancel') */
  cancelText?: string;

  /** Called when user confirms save */
  onSave: (dirPath: string, fileName: string) => void;

  /**
   * Called when user creates a new folder.
   * When provided, a "New Folder" button is shown.
   */
  onCreateFolder?: (parentPath: string, name: string) => Promise<void>;

  /** Optional: filter which directories are selectable (return false to grey-out) */
  filter?: (item: FileItem) => boolean;

  /**
   * Validate the filename before save.
   * Return an error message string to block, or empty string to allow.
   */
  validateFileName?: (name: string) => string;

  class?: string;
}

/**
 * Modal file-save picker with directory tree, file list, and filename input.
 * Standalone component — does not depend on FileBrowserContext.
 */
export function FileSavePicker(props: FileSavePickerProps) {
  const [fileName, setFileName] = createSignal(props.initialFileName ?? '');
  const [fileNameError, setFileNameError] = createSignal('');

  const tree = usePickerTree({
    initialPath: props.initialPath,
    open: () => props.open,
    files: () => props.files,
    // eslint-disable-next-line solid/reactivity -- filter is a static callback
    filter: props.filter ? (item: FileItem) => props.filter!(item) : undefined,
    onReset: () => {
      setFileName(props.initialFileName ?? '');
      setFileNameError('');
    },
  });

  // Files in the currently selected directory
  const currentFiles = createMemo(() => {
    const path = normalizePath(tree.selectedPath());
    if (path === '/') {
      return props.files.filter((f) => f.type === 'file');
    }
    const folder = tree.folderIndex().get(path);
    if (!folder?.children) return [];
    return folder.children.filter((f) => f.type === 'file');
  });

  // Clear filename error on edit
  createEffect(
    on(fileName, () => {
      setFileNameError('');
    })
  );

  // ── File click → fill filename ────────────────────────────────────────

  const handleFileClick = (file: FileItem) => {
    setFileName(file.name);
    setFileNameError('');
  };

  // ── Save / Cancel ─────────────────────────────────────────────────────

  const handleSave = () => {
    const name = fileName().trim();
    if (!name) {
      setFileNameError('Filename is required');
      return;
    }

    if (props.validateFileName) {
      const err = props.validateFileName(name);
      if (err) {
        setFileNameError(err);
        return;
      }
    }

    const dirPath = tree.selectedPath();
    const onSave = props.onSave;
    // Close UI first, then notify (UI response priority)
    props.onOpenChange(false);
    deferNonBlocking(() => onSave(dirPath, name));
  };

  const handleCancel = () => {
    props.onOpenChange(false);
  };

  const handleFileNameKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  // Full path preview
  const fullPath = createMemo(() => {
    const dir = tree.selectedPath();
    const name = fileName().trim();
    if (!name) return dir;
    return dir === '/' ? `/${name}` : `${dir}/${name}`;
  });

  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={props.title ?? 'Save File'}
      class={cn('max-w-2xl', props.class)}
      footer={
        <div class="flex flex-col w-full gap-2">
          {/* Filename input */}
          <div class="flex items-center gap-1.5">
            <label class="text-xs text-muted-foreground flex-shrink-0">File name:</label>
            <div class="flex-1">
              <Input
                size="sm"
                value={fileName()}
                onInput={(e) => setFileName(e.currentTarget.value)}
                onKeyDown={handleFileNameKeyDown}
                placeholder="filename.ext"
                error={fileNameError()}
              />
            </div>
          </div>

          {/* Full path preview + buttons */}
          <div class="flex items-center gap-2">
            <span class="flex-1 text-[11px] text-muted-foreground truncate" title={fullPath()}>
              {fullPath()}
            </span>
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              {props.cancelText ?? 'Cancel'}
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={!fileName().trim()}>
              {props.confirmText ?? 'Save'}
            </Button>
          </div>
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

        {/* Split view: folder tree + file list */}
        <div class="flex border border-border rounded overflow-hidden" style={{ height: '260px' }}>
          {/* Left: folder tree */}
          <PickerFolderTree
            rootFolders={tree.rootFolders}
            selectedPath={tree.selectedPath}
            expandedPaths={tree.expandedPaths}
            onToggle={tree.toggleExpand}
            onSelect={tree.handleSelectFolder}
            onSelectRoot={tree.handleSelectRoot}
            isSelectable={tree.isSelectable}
            class="w-1/2 min-w-0 border-r border-border border-0 rounded-none"
            style={{ 'max-height': 'none', 'min-height': '0' }}
          />

          {/* Right: file list */}
          <div class="w-1/2 min-w-0 overflow-y-auto">
            <Show
              when={currentFiles().length > 0}
              fallback={
                <div class="flex items-center justify-center h-full text-xs text-muted-foreground">
                  No files in this directory
                </div>
              }
            >
              <For each={currentFiles()}>
                {(file) => {
                  const FileIconComponent = getFileIcon(file.extension);
                  return (
                    <button
                      type="button"
                      onClick={() => handleFileClick(file)}
                      class={cn(
                        'flex items-center gap-1.5 w-full text-left text-xs py-1.5 px-2 cursor-pointer',
                        'transition-colors duration-100',
                        'hover:bg-accent/60',
                        'focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring',
                        fileName() === file.name && 'bg-accent text-accent-foreground font-medium'
                      )}
                    >
                      <FileIconComponent class="w-4 h-4 flex-shrink-0" />
                      <span class="truncate">{file.name}</span>
                      <Show when={file.size != null}>
                        <span class="ml-auto text-[10px] text-muted-foreground/60 flex-shrink-0">
                          {formatFileSize(file.size!)}
                        </span>
                      </Show>
                    </button>
                  );
                }}
              </For>
            </Show>
          </div>
        </div>

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

// ─── Utilities ───────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
