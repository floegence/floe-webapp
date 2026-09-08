import { createEffect, createMemo, createSignal, For, on, Show, untrack, type Accessor, type JSX } from 'solid-js';
import { cn } from '../../../utils/cn';
import { FileItemIcon } from '../../file-browser/FileIcons';
import { ChevronRight, FolderOpen } from '../../icons';
import { Button } from '../Button';
import { Input } from '../Input';
import {
  createFilesystemPickerDataSource, defaultPickerCopy, parsePickerPath, PickerNavigationError,
  type FilesystemPickerDataSource, type PickerDataProps,
} from './PickerNavigation';

export interface PickerPanelProps extends PickerDataProps {
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
  props: PickerDataProps, open: Accessor<boolean>, onValidated?: (path: string) => void, onReset?: () => void,
) {
  const source = createFilesystemPickerDataSource(() => props, onValidated);
  createEffect(on(() => [open(), props.scopeKey] as const, ([isOpen]) => {
    source.close();
    if (!isOpen) return;
    onReset?.();
    void source.open(props.initialPath);
  }));
  createEffect(() => props.onValidityChange?.(source.valid()));
  return source;
}

/** Absolute directory navigation shared by all picker presentations. */
export function PickerPanel(props: PickerPanelProps & { source: FilesystemPickerDataSource }) {
  const copy = () => pickerCopy(props);
  const source = untrack(() => props.source);
  const folders = createMemo(() => source.entries().filter((item) => item.type === 'folder'));
  const roots = createMemo(() => source.context()?.roots.filter((root) => !root.hidden) ?? []);
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
  const keyDown = (event: KeyboardEvent, index: number) => {
    let target: number | undefined;
    if (event.key === 'ArrowDown') target = Math.min(index + 1, folders().length - 1);
    if (event.key === 'ArrowUp') target = Math.max(0, index - 1);
    if (event.key === 'Home') target = 0;
    if (event.key === 'End') target = folders().length - 1;
    if (target === undefined) return;
    event.preventDefault(); event.stopPropagation(); rows[target]?.focus();
  };
  const go = () => { void source.navigate(source.pathInput()); };

  return (
    <div class="flex min-w-0 flex-col gap-2" data-filesystem-picker="" aria-busy={source.pending()}>
      <div class="flex flex-wrap items-center gap-1" aria-label={copy().roots}>
        <For each={roots()}>{(root) => (
          <Button type="button" size="sm" variant={source.currentPath() === root.pathAbs ? 'secondary' : 'ghost'}
            disabled={props.disabled || root.permissions?.read === false} title={root.pathAbs}
            onClick={() => { void source.navigate(root.pathAbs); }}>
            {root.label}
          </Button>
        )}</For>
      </div>
      <div class="flex min-w-0 items-start gap-1.5">
        <div class="min-w-0 flex-1">
          <Input size="sm" aria-label={copy().path} placeholder="/" value={source.pathInput()}
            disabled={props.disabled || !source.context()}
            onInput={(event) => source.setPathInput(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault(); event.stopPropagation(); go();
            }} />
        </div>
        <Button size="sm" variant="outline" onClick={go} disabled={props.disabled || !source.context() || !source.pathInput()}>{copy().go}</Button>
      </div>
      <Show when={source.error()}>
        <div class="flex items-start gap-2 rounded border border-error/30 bg-error/5 px-2 py-1.5 text-xs" role="alert">
          <span class="min-w-0 flex-1 break-words">{pickerErrorMessage(props, source.error())}</span>
          <Button size="sm" variant="ghost" onClick={() => { void source.retry(); }} disabled={props.disabled || source.pending()}>{copy().retry}</Button>
        </div>
      </Show>
      <nav aria-label={copy().currentDirectory} class="flex min-w-0 flex-wrap items-center gap-0.5 text-xs">
        <For each={breadcrumbs()}>{(segment, index) => <>
          <Show when={index() > 0}><ChevronRight class="h-3 w-3 shrink-0 text-muted-foreground" /></Show>
          <button type="button" class="max-w-full cursor-pointer truncate rounded px-1 py-0.5 hover:bg-muted focus-visible:ring-1 focus-visible:ring-ring"
            title={segment.path} disabled={props.disabled} aria-current={segment.path === source.currentPath() ? 'location' : undefined}
            onClick={() => { void source.navigate(segment.path); }}>{segment.name}</button>
        </>}</For>
      </nav>
      <div {...props.scrollViewportProps} class={cn('min-h-[120px] overflow-y-auto rounded border border-border', props.scrollViewportProps?.class)}
        style={{ 'max-height': props.treeMaxHeight ?? '240px' }}>
        <Show when={!source.pending() || source.currentPath()} fallback={<p class="px-3 py-6 text-center text-xs text-muted-foreground" role="status">{copy().loading}</p>}>
          <Show when={folders().length} fallback={<Show when={source.currentPath()}><p class="px-3 py-6 text-center text-xs text-muted-foreground">{copy().empty}</p></Show>}>
            <For each={folders()}>{(item, index) => (
              <button ref={(element) => { rows[index()] = element; }} type="button"
                data-picker-row-path={item.path} disabled={props.disabled || props.filter?.(item) === false}
                class="flex min-h-8 w-full cursor-pointer items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-accent/60 focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => { void source.navigate(item.path); }} onKeyDown={(event) => keyDown(event, index())}>
                <FileItemIcon item={item} class="h-4 w-4 shrink-0" /><span class="min-w-0 flex-1 truncate">{item.name}</span><ChevronRight class="h-3 w-3 shrink-0 text-muted-foreground" />
              </button>
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
        <Button size="sm" variant="ghost" disabled={props.disabled || busy()} onClick={() => setVisible(false)}>{copy().cancel}</Button>
      </div>
    </Show>
    <Show when={failure()}><p role="alert" class="text-xs text-error">{pickerErrorMessage(props, failure())}</p></Show>
  </div>;
}

export const normalizePath = parsePickerPath;
export { pickerParentPath as getParentPath } from './PickerNavigation';
