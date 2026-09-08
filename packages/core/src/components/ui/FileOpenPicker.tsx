import { For, Show, createMemo, createSignal, mergeProps } from 'solid-js';
import { cn } from '../../utils/cn';
import { deferNonBlocking } from '../../utils/defer';
import { Check } from '../icons';
import { FileItemIcon } from '../file-browser/FileIcons';
import type { FileItem } from '../file-browser/types';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { PickerPanel, pickerCopy, usePickerNavigation, getParentPath, normalizePath, type BasePickerProps } from './picker/PickerBase';

export type FileOpenPickerSelectionMode = 'single' | 'multiple';

export interface FileOpenPickerProps extends BasePickerProps {
  /** Select one file or an ordered set of files. */
  selectionMode?: FileOpenPickerSelectionMode;
  /** Selected file paths restored whenever the picker opens. */
  initialSelectedPaths?: readonly string[];
  /** Maximum number of files accepted in multiple mode. */
  maxSelections?: number;
  /** Filters files without affecting directory navigation. */
  fileFilter?: (item: FileItem) => boolean;
  /** Called with selected paths in user selection order. */
  onSelect: (paths: string[]) => void;
  /** Empty-state copy for the current directory. */
  emptyText?: string;
}

export function normalizeFileOpenSelection(
  paths: readonly string[] | undefined,
  maxSelections?: number,
): string[] {
  const max = normalizeSelectionLimit(maxSelections);
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const rawPath of paths ?? []) {
    const path = normalizePath(rawPath);
    if (path === '/' || seen.has(path)) continue;
    seen.add(path);
    normalized.push(path);
    if (normalized.length >= max) break;
  }
  return normalized;
}

export function updateFileOpenSelection(
  current: readonly string[],
  path: string,
  mode: FileOpenPickerSelectionMode,
  maxSelections?: number,
): string[] {
  const normalizedPath = normalizePath(path);
  if (normalizedPath === '/') return [...current];
  if (mode === 'single') return [normalizedPath];

  const index = current.indexOf(normalizedPath);
  if (index >= 0) {
    return current.filter((_, currentIndex) => currentIndex !== index);
  }
  if (current.length >= normalizeSelectionLimit(maxSelections)) {
    return [...current];
  }
  return [...current, normalizedPath];
}

function normalizeSelectionLimit(maxSelections?: number): number {
  if (maxSelections == null || !Number.isFinite(maxSelections)) return Number.POSITIVE_INFINITY;
  return Math.max(1, Math.floor(maxSelections));
}

/** Modal file picker with ordered single or multiple selection. */
export function FileOpenPicker(props: FileOpenPickerProps) {
  const selectionMode = () => props.selectionMode ?? 'single';
  const [selectedPaths, setSelectedPaths] = createSignal<string[]>([]);

  const initialDirectory = () => {
    if (props.initialPath) return props.initialPath;
    const firstSelection = props.initialSelectedPaths?.[0];
    return firstSelection ? getParentPath(firstSelection) : undefined;
  };

  const navigationProps = mergeProps(props, {
    get initialPath() { return initialDirectory(); },
    get scopeKey() { return props.scopeKey; },
  });
  const source = usePickerNavigation(navigationProps, () => props.open, undefined, () => {
    setSelectedPaths(normalizeFileOpenSelection(props.initialSelectedPaths, selectionMode() === 'single' ? 1 : props.maxSelections));
  });
  const currentFiles = createMemo(() => source.entries().filter((item) => item.type === 'file' && (!props.fileFilter || props.fileFilter(item))));

  const selectionIndex = (path: string) => selectedPaths().indexOf(normalizePath(path));
  const selectionLimitReached = () => (
    selectionMode() === 'multiple'
    && selectedPaths().length >= normalizeSelectionLimit(props.maxSelections)
  );

  const toggleFile = (file: FileItem) => {
    setSelectedPaths((current) => updateFileOpenSelection(
      current,
      file.path,
      selectionMode(),
      props.maxSelections,
    ));
  };

  const confirmSelection = (paths = selectedPaths()) => {
    if (paths.length === 0 || !source.valid()) return;
    const onSelect = props.onSelect;
    props.onOpenChange(false);
    deferNonBlocking(() => onSelect([...paths]));
  };

  const handleFileKeyDown = (event: KeyboardEvent, index: number) => {
    let nextIndex: number | undefined;
    if (event.key === 'ArrowDown') nextIndex = Math.min(index + 1, currentFiles().length - 1);
    if (event.key === 'ArrowUp') nextIndex = Math.max(index - 1, 0);
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = currentFiles().length - 1;
    if (nextIndex == null || nextIndex < 0) return;
    event.preventDefault();
    fileButtons[nextIndex]?.focus();
  };

  const fileButtons: HTMLButtonElement[] = [];

  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={props.title ?? 'Select File'}
      class={cn('max-w-2xl', props.class)}
      footer={
        <div class="flex items-center w-full gap-2">
          <span class="flex-1 text-[11px] text-muted-foreground truncate">
            {selectedPaths().length === 0
              ? pickerCopy(props).noFilesSelected
              : pickerCopy(props).selectedCount(selectedPaths().length)}
          </span>
          <Button variant="ghost" size="sm" onClick={() => props.onOpenChange(false)}>
            {props.cancelText ?? pickerCopy(props).cancel}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => confirmSelection()}
            disabled={selectedPaths().length === 0 || !source.valid()}
          >
            {props.confirmText ?? 'Select'}
          </Button>
        </div>
      }
    >
      <div class="flex flex-col gap-2 -mt-1">
        <PickerPanel {...props} source={source} />
        <div class="flex min-h-[140px] overflow-hidden rounded border border-border">
          <div
            {...props.scrollViewportProps}
            class="max-h-[200px] min-h-[140px] min-w-0 flex-1 overflow-y-auto"
            role="listbox"
            aria-multiselectable={selectionMode() === 'multiple' ? 'true' : undefined}
          >
            <Show
              when={currentFiles().length > 0}
              fallback={
                <div class="flex h-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
                  {props.emptyText ?? pickerCopy(props).emptyFiles}
                </div>
              }
            >
              <For each={currentFiles()}>
                {(file, index) => {
                  const selectedIndex = () => selectionIndex(file.path);
                  const disabled = () => selectionLimitReached() && selectedIndex() < 0;
                  return (
                    <button
                      ref={(element) => { fileButtons[index()] = element; }}
                      type="button"
                      role="option"
                      aria-selected={selectedIndex() >= 0}
                      disabled={disabled()}
                      title={disabled() ? pickerCopy(props).selectionLimit : file.name}
                      onClick={() => toggleFile(file)}
                      onDblClick={() => {
                        if (selectionMode() === 'single') confirmSelection([normalizePath(file.path)]);
                      }}
                      onKeyDown={(event) => handleFileKeyDown(event, index())}
                      class={cn(
                        'flex min-h-9 w-full cursor-pointer items-center gap-2 px-2 py-1.5 text-left text-xs',
                        'transition-colors duration-100 hover:bg-accent/60',
                        'focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring',
                        'disabled:cursor-not-allowed disabled:opacity-45',
                        selectedIndex() >= 0 && 'bg-accent text-accent-foreground font-medium',
                      )}
                    >
                      <FileItemIcon item={file} class="w-4 h-4 flex-shrink-0" />
                      <span class="truncate">{file.name}</span>
                      <Show when={selectedIndex() >= 0}>
                        <span class="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
                          <Show when={selectionMode() === 'multiple'} fallback={<Check class="h-3 w-3" />}>
                            {selectedIndex() + 1}
                          </Show>
                        </span>
                      </Show>
                    </button>
                  );
                }}
              </For>
            </Show>
          </div>
        </div>


      </div>
    </Dialog>
  );
}
