import { For, Show, createMemo, createSignal } from 'solid-js';
import { cn } from '../../utils/cn';
import { deferNonBlocking } from '../../utils/defer';
import { Check } from '../icons';
import { FileItemIcon } from '../file-browser/FileIcons';
import type { FileItem } from '../file-browser/types';
import { Button } from './Button';
import { Dialog } from './Dialog';
import {
  NewFolderSection,
  PathInputBar,
  PickerBreadcrumb,
  PickerFolderTree,
  getParentPath,
  normalizePath,
  type BasePickerProps,
  usePickerTree,
} from './picker/PickerBase';

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
    return firstSelection ? getParentPath(firstSelection) : '/';
  };

  const tree = usePickerTree({
    initialPath: initialDirectory,
    open: () => props.open,
    files: () => props.files,
    // eslint-disable-next-line solid/reactivity -- filter is a static callback
    filter: props.filter ? (item: FileItem) => props.filter!(item) : undefined,
    // eslint-disable-next-line solid/reactivity -- onExpand is a static callback
    onExpand: props.onExpand,
    // eslint-disable-next-line solid/reactivity -- ensurePath is a static callback
    ensurePath: props.ensurePath,
    homeLabel: () => props.homeLabel,
    homePath: () => props.homePath,
    onReset: () => {
      setSelectedPaths(normalizeFileOpenSelection(
        props.initialSelectedPaths,
        selectionMode() === 'single' ? 1 : props.maxSelections,
      ));
    },
  });

  const currentFiles = createMemo(() => {
    const path = normalizePath(tree.selectedPath());
    const items = path === '/'
      ? props.files
      : tree.folderIndex().get(path)?.children ?? [];
    return items.filter((item) => item.type === 'file' && (!props.fileFilter || props.fileFilter(item)));
  });

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
    if (paths.length === 0 || tree.pathPending()) return;
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
              ? 'No files selected'
              : `${selectedPaths().length} selected`}
          </span>
          <Button variant="ghost" size="sm" onClick={() => props.onOpenChange(false)}>
            {props.cancelText ?? 'Cancel'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => confirmSelection()}
            disabled={selectedPaths().length === 0 || tree.pathPending()}
          >
            {props.confirmText ?? 'Select'}
          </Button>
        </div>
      }
    >
      <div class="flex flex-col gap-2 -mt-1">
        <PathInputBar
          value={tree.pathInput}
          onInput={(value) => {
            tree.setPathInput(value);
            tree.setPathInputError('');
          }}
          pending={tree.pathPending}
          error={tree.pathInputError}
          onGo={tree.handlePathInputGo}
          onKeyDown={tree.handlePathInputKeyDown}
        />

        <PickerBreadcrumb segments={tree.breadcrumbSegments} onClick={tree.handleBreadcrumbClick} />

        <div class="flex min-h-[260px] flex-col overflow-hidden rounded border border-border sm:h-[300px] sm:flex-row">
          <PickerFolderTree
            rootFolders={tree.rootFolders}
            selectedPath={tree.selectedPath}
            expandedPaths={tree.expandedPaths}
            revealNonce={tree.revealNonce}
            onToggle={tree.toggleExpand}
            onSelect={tree.handleSelectFolder}
            onSelectRoot={tree.handleSelectRoot}
            isSelectable={tree.isSelectable}
            homeLabel={tree.homeLabel}
            class="min-h-[120px] min-w-0 border-0 border-b border-border rounded-none sm:h-full sm:w-1/2 sm:border-b-0 sm:border-r"
          />

          <div
            class="min-h-[140px] min-w-0 flex-1 overflow-y-auto"
            role="listbox"
            aria-multiselectable={selectionMode() === 'multiple' ? 'true' : undefined}
          >
            <Show
              when={currentFiles().length > 0}
              fallback={
                <div class="flex h-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
                  {props.emptyText ?? 'No matching files in this directory'}
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
                      title={disabled() ? 'Selection limit reached' : file.name}
                      onClick={() => toggleFile(file)}
                      onDblClick={() => {
                        if (selectionMode() === 'single') confirmSelection([normalizePath(file.path)]);
                      }}
                      onKeyDown={(event) => handleFileKeyDown(event, index())}
                      class={cn(
                        'flex min-h-9 w-full items-center gap-2 px-2 py-1.5 text-left text-xs',
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
