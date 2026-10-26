import { Show, For, createSignal, createMemo, createEffect, on } from 'solid-js';
import { cn } from '../../utils/cn';
import { Dialog } from './Dialog';
import { Button } from './Button';
import { Input } from './Input';
import type { FileItem } from '../file-browser/types';
import { FileItemIcon } from '../file-browser/FileIcons';
import { deferNonBlocking } from '../../utils/defer';
import { PickerPanel, pickerCopy, usePickerNavigation, type BasePickerProps } from './picker/PickerBase';

// ─── Public API ──────────────────────────────────────────────────────────────

export interface FileSavePickerProps extends BasePickerProps {
  /** Pre-filled filename (e.g. rename scenario) */
  initialFileName?: string;
  /** Called when user confirms save */
  onSave: (dirPath: string, fileName: string) => void;
  /**
   * Validate the filename before save.
   * Return an error message string to block, or empty string to allow.
   */
  validateFileName?: (name: string) => string;
}

/**
 * Modal file-save picker with directory tree, file list, and filename input.
 * Standalone component — does not depend on FileBrowserContext.
 */
export function FileSavePicker(props: FileSavePickerProps) {
  const [fileName, setFileName] = createSignal(props.initialFileName ?? '');
  const [fileNameError, setFileNameError] = createSignal('');

  const source = usePickerNavigation(props, () => props.open, undefined, () => {
    setFileName(props.initialFileName ?? '');
    setFileNameError('');
  });
  const currentFiles = createMemo(() => source.entries().filter((item) => item.type === 'file'));

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
    if (props.disabled || source.view() !== 'browse' || !source.valid()) return;
    const name = fileName().trim();
    if (!name) {
      setFileNameError(pickerCopy(props).fileNameRequired);
      return;
    }

    if (props.validateFileName) {
      const err = props.validateFileName(name);
      if (err) {
        setFileNameError(err);
        return;
      }
    }

    const dirPath = source.currentPath();
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

  // Full path preview (display path for user)
  const fullPath = createMemo(() => {
    const dir = source.currentPath();
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
            <label class="text-[length:var(--floe-type-supporting)] text-[var(--floe-ink-soft)] flex-shrink-0">{pickerCopy(props).fileName}</label>
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
            <span class="flex-1 text-[length:var(--floe-type-caption)] text-[var(--floe-ink-soft)] truncate" title={fullPath()}>
              {fullPath()}
            </span>
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              {props.cancelText ?? pickerCopy(props).cancel}
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={!fileName().trim() || source.view() !== 'browse' || !source.valid()}>
              {props.confirmText ?? 'Save'}
            </Button>
          </div>
        </div>
      }
    >
      <div class="flex flex-col gap-2 -mt-1">
        <PickerPanel {...props} source={source} />
        <Show when={source.view() === 'browse'}><div class="flex min-h-[100px] overflow-hidden rounded-xs border border-[var(--floe-line)]">
          <div {...props.scrollViewportProps} class="max-h-[160px] w-full min-w-0 overflow-y-auto">
            <Show
              when={currentFiles().length > 0}
              fallback={
                <div class="flex items-center justify-center h-full text-[length:var(--floe-type-supporting)] text-[var(--floe-ink-soft)]">
                  {pickerCopy(props).emptyFiles}
                </div>
              }
            >
              <For each={currentFiles()}>
                {(file) => (
                  <button
                    type="button"
                    onClick={() => handleFileClick(file)}
                    class={cn(
                      'flex items-center gap-1.5 w-full text-left text-xs py-1.5 px-2 cursor-pointer',
                      'transition-colors duration-[var(--floe-duration-instant)]',
                      'hover:bg-[var(--floe-state-hover)]',
                      'focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring',
                      fileName() === file.name && 'bg-[var(--floe-state-selected)] text-foreground font-medium'
                    )}
                  >
                    <FileItemIcon item={file} size={16} class="w-4 h-4 flex-shrink-0" />
                    <span class="truncate">{file.name}</span>
                    <Show when={file.size != null}>
                      <span class="ml-auto text-[length:var(--floe-type-caption)] text-[var(--floe-ink-ghost)] flex-shrink-0">
                        {formatFileSize(file.size!)}
                      </span>
                    </Show>
                  </button>
                )}
              </For>
            </Show>
          </div>
        </div></Show>


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
