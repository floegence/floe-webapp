import { createMemo } from 'solid-js';
import { cn } from '../../utils/cn';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { PickerPanel, pickerCopy, usePickerNavigation, type BasePickerProps } from './picker/PickerBase';
import { parsePickerPath } from './picker/PickerNavigation';

export interface DirectoryPickerProps extends BasePickerProps {
  /** Ordered absolute navigation suggestions. They never grant filesystem access or auto-confirm. */
  suggestedPaths?: readonly string[];
  /** Localized tab label for host-provided suggestions. */
  suggestedPathsLabel?: string;
  /** Receives the validated absolute directory path. */
  onSelect: (path: string) => void;
}

export function DirectoryPicker(props: DirectoryPickerProps) {
  const suggestedPaths = createMemo(() => [...new Set(
    (props.suggestedPaths ?? []).map((path) => parsePickerPath(path)).filter(Boolean),
  )]);
  const source = usePickerNavigation(props, () => props.open, undefined, undefined, () => suggestedPaths().length ? 'suggestions' : 'browse');
  const confirm = () => {
    if (props.disabled || source.view() !== 'browse' || !source.valid()) return;
    const path = source.currentPath();
    props.onSelect(path);
    props.onOpenChange(false);
  };
  return <Dialog escapeKeyPhase="bubble" open={props.open} onOpenChange={props.onOpenChange} title={props.title ?? 'Select Directory'}
    class={cn('max-w-lg', props.class)} footer={<div class="flex w-full items-center gap-2">
      <span class="min-w-0 flex-1 truncate text-[length:var(--floe-type-caption)] text-[var(--floe-ink-soft)]" title={source.currentPath()}>{source.currentPath()}</span>
      <Button variant="ghost" size="sm" onClick={() => props.onOpenChange(false)}>{props.cancelText ?? pickerCopy(props).cancel}</Button>
      <Button variant="primary" size="sm" onClick={confirm} disabled={props.disabled || source.view() !== 'browse' || !source.valid()}>{props.confirmText ?? 'Select'}</Button>
    </div>}>
    <PickerPanel {...props} source={source} suggestions={{
      get paths() { return suggestedPaths(); },
      get label() { return props.suggestedPathsLabel ?? 'Suggested directories'; },
    }} />
  </Dialog>;
}
