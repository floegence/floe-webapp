import { createEffect, createMemo, createSignal, createUniqueId, For, on, Show, untrack, type Accessor, type JSX } from 'solid-js';
import { cn } from '../../../utils/cn';
import { FileItemIcon } from '../../file-browser/FileIcons';
import { ChevronRight, FolderOpen } from '../../icons';
import { Button } from '../Button';
import { Input } from '../Input';
import { DirectoryFavoriteButton, PickerDirectoryRow, type DirectoryFavorites } from './DirectoryFavorites';
import { resolveTabNavigationTargetId } from '../Tabs';
import {
  createFilesystemPickerDataSource, defaultPickerCopy, parsePickerPath, PickerNavigationError,
  type FilesystemPickerDataSource, type PickerDataProps,
} from './PickerNavigation';

export interface PickerPanelProps extends PickerDataProps {
  /** Host-owned directory navigation metadata for the current authenticated environment. */
  directoryFavorites?: DirectoryFavorites;
  disabled?: boolean;
  /** Props for the actual constrained scrolling viewport, including host interaction markers. */
  scrollViewportProps?: JSX.HTMLAttributes<HTMLDivElement>;
  treeMaxHeight?: string;
  onCreateFolder?: (parentPath: string, name: string) => Promise<void>;
}

export interface BasePickerProps extends PickerPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string | JSX.Element;
  confirmText?: string;
  cancelText?: string;
  class?: string;
}

export function pickerCopy(config: PickerDataProps) {
  return { ...defaultPickerCopy, ...config.copy };
}

export function pickerErrorMessage(props: PickerDataProps, error: unknown): string {
  const copy = pickerCopy(props);
  if (error instanceof PickerNavigationError) return copy[error.kind];
  return props.formatError?.(error) || (error instanceof Error ? error.message : '') || copy.loadFailed;
}

/** One owner for dialog and embedded pickers. Identity changes close the previous session first. */
export function usePickerNavigation(
  props: PickerPanelProps, open: Accessor<boolean>, onValidated?: (path: string) => void, onReset?: () => void,
  initialView: Accessor<PickerLocation> = () => 'browse',
) {
  const [view, setView] = createSignal<PickerLocation>('browse');
  const source = createFilesystemPickerDataSource(() => props, onValidated);
  createEffect(on(() => [open(), props.scopeKey] as const, ([isOpen]) => {
    source.close();
    if (!isOpen) return;
    setView(initialView());
    void props.directoryFavorites?.onRefresh?.();
    onReset?.();
    void source.open(props.initialPath);
  }));
  createEffect(() => props.onValidityChange?.(source.valid() && view() === 'browse'));
  return { ...source, view, setView };
}

export type PickerLocation = 'browse' | 'suggestions' | 'favorites';

/** Absolute directory navigation shared by all picker presentations. */
export function PickerPanel(props: PickerPanelProps & {
  source: ReturnType<typeof usePickerNavigation>;
  suggestions?: { paths: readonly string[]; label: string };
}) {
  const copy = () => pickerCopy(props);
  const source = untrack(() => props.source);
  const folders = createMemo(() => source.entries().filter((item) => item.type === 'folder'));
  const roots = createMemo(() => source.context()?.roots.filter((root) => !root.hidden) ?? []);
  const panelId = createUniqueId();
  const [filter, setFilter] = createSignal('');
  const [favoriteError, setFavoriteError] = createSignal('');
  const shortcuts = () => source.view() !== 'browse';
  const hasTabs = () => Boolean(props.suggestions?.paths.length || props.directoryFavorites);
  const favoritePaths = createMemo(() => [...new Set((props.directoryFavorites?.paths ?? []).map((path) => parsePickerPath(path)).filter(Boolean))]);
  const shortcutPaths = createMemo(() => source.view() === 'suggestions' ? props.suggestions?.paths ?? []
    : favoritePaths().filter((path) => path.toLocaleLowerCase().includes(filter().trim().toLocaleLowerCase())));
  createEffect(on(() => props.scopeKey, () => { setFilter(''); setFavoriteError(''); }));
  let pathInput: HTMLInputElement | undefined;
  const tabs = createMemo(() => [
    ...(props.suggestions?.paths.length ? [{ id: 'suggestions', label: props.suggestions.label, disabled: props.disabled }] : []),
    ...(props.directoryFavorites ? [{ id: 'favorites', label: copy().favorites, disabled: props.disabled }] : []),
    ...roots().map((root) => ({ id: `root:${root.id}`, label: root.label, path: root.pathAbs,
      disabled: props.disabled || root.permissions?.read === false })),
  ]);
  const activeTab = () => {
    if (shortcuts()) return source.view();
    const path = parsePickerPath(source.pathInput(), source.context()?.homePathAbs);
    const root = roots().filter((item) => path === item.pathAbs || path.startsWith(item.pathAbs.replace(/\/$/, '') + '/'))
      .sort((left, right) => right.pathAbs.length - left.pathAbs.length)[0];
    return `root:${root?.id ?? source.context()?.defaultRootId ?? roots()[0]?.id}`;
  };
  const tabRows = new Map<string, HTMLButtonElement>();
  const suggestionRows: HTMLButtonElement[] = [];
  const focusRow = (event: KeyboardEvent, index: number, rows: HTMLButtonElement[], length: number) => {
    let target: number | undefined;
    if (event.key === 'ArrowDown') target = Math.min(index + 1, length - 1);
    if (event.key === 'ArrowUp') target = Math.max(0, index - 1);
    if (event.key === 'Home') target = 0;
    if (event.key === 'End') target = length - 1;
    if (target === undefined) return;
    event.preventDefault(); event.stopPropagation(); rows[target]?.focus(); rows[target]?.scrollIntoView?.({ block: 'nearest' });
  };
  const breadcrumbs = createMemo(() => {
    const path = source.currentPath();
    if (!path) return [];
    let current = '';
    return [{ path: '/', name: copy().root }, ...path.split('/').filter(Boolean).map((name) => {
      current += `/${name}`;
      return { path: current, name };
    })];
  });
  const rows: HTMLButtonElement[] = [];
  const navigate = (path: string) => { source.setView('browse'); void source.navigate(path); pathInput?.focus(); };
  const go = () => navigate(source.pathInput());

  return (
    <div class="flex min-w-0 flex-col gap-2" data-filesystem-picker="" aria-busy={source.pending()}>
      <Show when={hasTabs()} fallback={
        <div class="flex flex-wrap items-center gap-1" aria-label={copy().roots}>
          <For each={roots()}>{(root) => (
            <Button type="button" size="sm" variant={source.currentPath() === root.pathAbs ? 'secondary' : 'ghost'}
              disabled={props.disabled || root.permissions?.read === false} title={root.pathAbs}
              onClick={() => { void source.navigate(root.pathAbs); }}>
              {root.label}
            </Button>
          )}</For>
        </div>
      }>
        <div role="tablist" aria-label={copy().roots} class="mb-1 flex min-w-0 items-center gap-4 border-b border-border">
          <For each={tabs()}>{(tab) => (
            <button ref={(element) => tabRows.set(tab.id, element)} type="button" role="tab"
              id={`${panelId}-${tab.id}`} aria-controls={panelId} aria-selected={activeTab() === tab.id}
              tabIndex={activeTab() === tab.id ? 0 : -1} disabled={tab.disabled} title={'path' in tab ? tab.path : tab.label}
              class={cn('min-w-0 cursor-pointer truncate border-b-2 px-0.5 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                activeTab() === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}
              onClick={() => {
                if ('path' in tab) navigate(tab.path);
                else { source.setView(tab.id as PickerLocation); if (tab.id === 'favorites') void props.directoryFavorites?.onRefresh?.(); }
              }}
              onKeyDown={(event) => {
                const target = resolveTabNavigationTargetId(tabs(), tab.id, event.key);
                if (!target) return;
                event.preventDefault(); event.stopPropagation(); tabRows.get(target)?.focus();
              }}>{tab.label}</button>
          )}</For>
        </div>
      </Show>
      <div id={panelId} role={hasTabs() ? 'tabpanel' : undefined}
        aria-labelledby={hasTabs() ? `${panelId}-${activeTab()}` : undefined} class="flex min-w-0 flex-col gap-2">
        <Show when={!shortcuts()}>
        <div class="flex min-w-0 items-start gap-1.5">
          <div class="min-w-0 flex-1">
            <Input ref={pathInput} size="sm" aria-label={copy().path} placeholder="/" value={source.pathInput()}
              disabled={props.disabled || !source.context()}
              onInput={(event) => source.setPathInput(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault(); event.stopPropagation(); go();
              }} />
          </div>
          <Button size="sm" variant="outline" onClick={go} disabled={props.disabled || !source.context() || !source.pathInput()}>{copy().go}</Button>
        </div>
        </Show>
        <Show when={favoriteError() || props.directoryFavorites?.error}>
          <div role="alert" class="flex items-center gap-2 text-xs text-error"><span class="min-w-0 flex-1 break-words">{favoriteError() || props.directoryFavorites?.error}</span>
            <Button size="sm" variant="ghost" disabled={props.directoryFavorites?.loading} onClick={() => { setFavoriteError(''); void props.directoryFavorites?.onRefresh?.(); }}>{copy().retry}</Button></div>
        </Show>
        <Show when={source.error() && !shortcuts()}>
          <div class="flex items-start gap-2 rounded border border-error/30 bg-error/5 px-2 py-1.5 text-xs" role="alert">
            <span class="min-w-0 flex-1 break-words">{pickerErrorMessage(props, source.error())}</span>
            <Button size="sm" variant="ghost" onClick={() => { void source.retry(); }} disabled={props.disabled || source.pending()}>{copy().retry}</Button>
          </div>
        </Show>
        <Show when={shortcuts()} fallback={<>
        <nav aria-label={copy().currentDirectory} class="flex min-w-0 flex-wrap items-center gap-0.5 text-xs">
          <For each={breadcrumbs()}>{(segment, index) => <>
            <Show when={index() > 0}><ChevronRight class="h-3 w-3 shrink-0 text-muted-foreground" /></Show>
            <button type="button" class="max-w-full cursor-pointer truncate rounded px-1 py-0.5 hover:bg-muted focus-visible:ring-1 focus-visible:ring-ring"
              title={segment.path} disabled={props.disabled} aria-current={segment.path === source.currentPath() ? 'location' : undefined}
              onClick={() => { void source.navigate(segment.path); }}>{segment.name}</button>
          </>}</For>
          <Show when={props.directoryFavorites}><DirectoryFavoriteButton path={source.currentPath()} favorites={props.directoryFavorites!} copy={copy()} disabled={props.disabled || !source.valid()} onError={setFavoriteError} /></Show>
        </nav>
        <div {...props.scrollViewportProps} class={cn('min-h-[120px] overflow-y-auto rounded border border-border', props.scrollViewportProps?.class)}
          style={{ 'max-height': props.treeMaxHeight ?? '240px' }}>
          <Show when={!source.pending() || source.currentPath()} fallback={<p class="px-3 py-6 text-center text-xs text-muted-foreground" role="status">{copy().loading}</p>}>
            <Show when={folders().length} fallback={<Show when={source.currentPath()}><p class="px-3 py-6 text-center text-xs text-muted-foreground">{copy().empty}</p></Show>}>
              <For each={folders()}>{(item, index) => (
                <PickerDirectoryRow path={item.path} favorites={props.directoryFavorites} copy={copy()} scopeKey={props.scopeKey} disabled={props.disabled || props.filter?.(item) === false} onError={setFavoriteError}>
                <button ref={(element) => { createEffect(() => { rows[index()] = element; }); }} type="button"
                  data-picker-row-path={item.path} disabled={props.disabled || props.filter?.(item) === false}
                  class="flex min-h-8 min-w-0 flex-1 cursor-pointer items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-accent/60 focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => { void source.navigate(item.path); }} onKeyDown={(event) => focusRow(event, index(), rows, folders().length)}>
                  <FileItemIcon item={item} size={16} class="h-4 w-4 shrink-0" /><span class="min-w-0 flex-1 truncate">{item.name}</span><ChevronRight class="h-3 w-3 shrink-0 text-muted-foreground" />
                </button>
                </PickerDirectoryRow>
              )}</For>
            </Show>
          </Show>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <label class="flex cursor-pointer items-center gap-1.5"><input type="checkbox" class="cursor-pointer" checked={source.showHidden()} disabled={props.disabled || !source.context()}
            onChange={(event) => { void source.setShowHidden(event.currentTarget.checked); }} />{copy().showHidden}</label>
          <Show when={source.pending() && source.currentPath()}><span role="status">{copy().loading}</span></Show>
        </div>
        <Show when={props.onCreateFolder}><NewFolderSection {...props} /></Show>
        </>}>
          <Show when={source.view() === 'favorites'}><Input size="sm" aria-label={copy().favoritesFilter} placeholder={copy().favoritesFilter} value={filter()} onInput={(event) => setFilter(event.currentTarget.value)} /></Show>
          <div {...props.scrollViewportProps} data-picker-suggestions={source.view() === 'suggestions' ? '' : undefined}
            data-picker-favorites={source.view() === 'favorites' ? '' : undefined} aria-label={source.view() === 'favorites' ? copy().favorites : props.suggestions?.label}
            aria-busy={source.view() === 'favorites' && props.directoryFavorites?.loading}
            class={cn('min-h-[180px] min-w-0 overflow-y-auto', props.scrollViewportProps?.class)}
            style={{ 'max-height': props.treeMaxHeight ?? '240px' }}>
            <Show when={shortcutPaths().length} fallback={<p class="px-3 py-6 text-center text-xs text-muted-foreground" role="status">{props.directoryFavorites?.loading ? copy().loading : props.directoryFavorites?.error ? copy().favoritesLoadFailed : filter().trim() ? copy().favoritesNoMatches : copy().favoritesEmpty}</p>}>
            <For each={shortcutPaths()}>{(path, index) => (
              <PickerDirectoryRow path={path} favorites={props.directoryFavorites} copy={copy()} scopeKey={props.scopeKey} disabled={props.disabled} onError={setFavoriteError}>
              <button ref={(element) => { createEffect(() => { suggestionRows[index()] = element; }); }} type="button"
                data-picker-suggested-path={source.view() === 'suggestions' ? path : undefined}
                data-picker-favorite-path={source.view() === 'favorites' ? path : undefined} title={path} aria-label={path}
                disabled={props.disabled || !source.context()}
                class="flex min-h-14 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md px-2 py-2.5 text-left hover:bg-accent/60 focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => {
                  navigate(path);
                }}
                onKeyDown={(event) => focusRow(event, index(), suggestionRows, shortcutPaths().length)}>
                <FolderOpen class="h-4 w-4 shrink-0 text-muted-foreground" />
                <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span class="truncate text-xs font-medium">{path.split('/').filter(Boolean).at(-1) ?? copy().root}</span>
                  <span class="truncate text-[11px] text-muted-foreground">{path}</span>
                </span>
                <ChevronRight class="h-3 w-3 shrink-0 text-muted-foreground/60" />
              </button>
              </PickerDirectoryRow>
            )}</For>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  );
}

function NewFolderSection(props: PickerPanelProps & { source: FilesystemPickerDataSource }) {
  const [visible, setVisible] = createSignal(false);
  const [name, setName] = createSignal('');
  const [busy, setBusy] = createSignal(false);
  const [failure, setFailure] = createSignal<unknown>(null);
  const copy = () => pickerCopy(props);
  const create = async () => {
    if (!name().trim() || !props.source.valid() || !props.onCreateFolder || busy()) return;
    const target = props.source.currentPath();
    setBusy(true); setFailure(null);
    try {
      await props.onCreateFolder(target, name().trim());
      setName(''); setVisible(false);
      if (props.source.active() && target === props.source.currentPath()) await props.source.navigate(target);
    } catch (error) { setFailure(error); }
    finally { setBusy(false); }
  };
  return <div>
    <Show when={visible()} fallback={<Button size="sm" variant="ghost" disabled={props.disabled || !props.source.valid()} onClick={() => setVisible(true)}><FolderOpen class="mr-1 h-3.5 w-3.5" />{copy().newFolder}</Button>}>
      <div class="flex items-center gap-1.5">
        <Input size="sm" aria-label={copy().folderName} value={name()} onInput={(event) => setName(event.currentTarget.value)} disabled={props.disabled || busy()} />
        <Button size="sm" disabled={props.disabled || busy() || !name().trim() || !props.source.valid()} onClick={() => { void create(); }}>{copy().create}</Button>
        <Button size="sm" variant="ghost-destructive" disabled={props.disabled || busy()} onClick={() => setVisible(false)}>{copy().cancel}</Button>
      </div>
    </Show>
    <Show when={failure()}><p role="alert" class="text-xs text-error">{pickerErrorMessage(props, failure())}</p></Show>
  </div>;
}

export const normalizePath = parsePickerPath;
export { pickerParentPath as getParentPath } from './PickerNavigation';
