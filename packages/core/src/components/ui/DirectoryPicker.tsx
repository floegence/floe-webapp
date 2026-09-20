import { createMemo, For, Show } from 'solid-js';
import { cn } from '../../utils/cn';
import { FolderOpen } from '../icons';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { PickerPanel, pickerCopy, usePickerNavigation, type BasePickerProps } from './picker/PickerBase';
import { parsePickerPath } from './picker/PickerNavigation';

export interface DirectoryPickerProps extends BasePickerProps {
  /** Ordered absolute navigation suggestions. They never grant filesystem access or auto-confirm. */
  suggestedPaths?: readonly string[];
  /** Localized heading for host-provided suggestions. */
  suggestedPathsLabel?: string;
  /** Receives the validated absolute directory path. */
  onSelect: (path: string) => void;
}

export function DirectoryPicker(props: DirectoryPickerProps) {
  const source = usePickerNavigation(props, () => props.open);
  const suggestedPaths = createMemo(() => [...new Set(
    (props.suggestedPaths ?? []).map((path) => parsePickerPath(path)).filter(Boolean),
  )]);
  const confirm = () => {
    if (!source.valid()) return;
    const path = source.currentPath();
    props.onSelect(path);
    props.onOpenChange(false);
  };
  return <Dialog open={props.open} onOpenChange={props.onOpenChange} title={props.title ?? 'Select Directory'}
    class={cn('max-w-lg', props.class)} footer={<div class="flex w-full items-center gap-2">
      <span class="min-w-0 flex-1 truncate text-[11px] text-muted-foreground" title={source.currentPath()}>{source.currentPath()}</span>
      <Button variant="ghost" size="sm" onClick={() => props.onOpenChange(false)}>{props.cancelText ?? pickerCopy(props).cancel}</Button>
      <Button variant="primary" size="sm" onClick={confirm} disabled={!source.valid()}>{props.confirmText ?? 'Select'}</Button>
    </div>}>
    <Show when={suggestedPaths().length > 0}>
      <section data-picker-suggestions="" aria-label={props.suggestedPathsLabel ?? 'Suggested directories'} class="mb-3 min-w-0">
        <p class="mb-1 px-2 text-[11px] font-medium text-muted-foreground">{props.suggestedPathsLabel ?? 'Suggested directories'}</p>
        <For each={suggestedPaths()}>{(path) => (
          <button type="button" data-picker-suggested-path={path} title={path} aria-label={path}
            aria-current={source.currentPath() === path ? 'location' : undefined}
            disabled={props.disabled || !source.context()}
            class="flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent/60 focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => { void source.navigate(path); }}>
            <FolderOpen class="h-4 w-4 shrink-0 text-muted-foreground" />
            <span class="flex min-w-0 flex-1 flex-col">
              <span class="truncate text-xs font-medium">{path.split('/').filter(Boolean).at(-1) ?? pickerCopy(props).root}</span>
              <span class="truncate text-[11px] text-muted-foreground">{path}</span>
            </span>
          </button>
        )}</For>
      </section>
    </Show>
    <PickerPanel {...props} source={source} />
  </Dialog>;
}
