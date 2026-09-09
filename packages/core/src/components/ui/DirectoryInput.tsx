import { createSignal, mergeProps, Show } from 'solid-js';
import { cn } from '../../utils/cn';
import { Folder, ChevronRight } from '../icons';
import { formatPickerPath } from './picker/PickerNavigation';
import { PickerPanel, usePickerNavigation, type PickerPanelProps } from './picker/PickerBase';

export type DirectoryInputSize = 'sm' | 'md' | 'lg';
export interface DirectoryInputProps extends PickerPanelProps {
  value?: string;
  onChange?: (absolutePath: string) => void;
  /** The containing form's lifecycle; close invalidates outstanding loads. */
  open?: boolean;
  placeholder?: string;
  disabled?: boolean;
  size?: DirectoryInputSize;
  error?: string;
  helperText?: string;
  class?: string;
  defaultExpanded?: boolean;
}

/** Inline picker keeps the surrounding form visible and commits only validated absolute paths. */
export function DirectoryInput(props: DirectoryInputProps) {
  const [expanded, setExpanded] = createSignal(props.defaultExpanded !== false);
  const navigationProps = mergeProps(props, {
    get initialPath() { return props.value || props.initialPath; },
  });
  const source = usePickerNavigation(navigationProps, () => props.open ?? true, (path) => props.onChange?.(path));
  const displayValue = () => formatPickerPath(props.value ?? '', source.context()?.homePathAbs ?? props.homePath);
  return <div class={props.class}>
    <button data-floe-input-surface aria-invalid={props.error ? true : undefined} type="button" onClick={() => setExpanded((value) => !value)} disabled={props.disabled}
      aria-expanded={expanded()} title={props.value} class={cn(
        'flex w-full cursor-pointer items-center gap-2 rounded border border-input bg-background px-2 text-left shadow-sm disabled:cursor-not-allowed disabled:opacity-50',
        props.size === 'lg' ? 'h-9 text-sm' : props.size === 'md' ? 'h-8 text-xs' : 'h-7 text-xs',
      )}>
      <Folder class="h-4 w-4 shrink-0 text-muted-foreground" /><span class="min-w-0 flex-1 truncate">{displayValue() || props.placeholder || 'Select a directory…'}</span>
      <ChevronRight class={cn('h-3.5 w-3.5 shrink-0 transition-transform', expanded() && 'rotate-90')} />
    </button>
    <Show when={expanded()}><div class="mt-2"><PickerPanel {...props} source={source} /></div></Show>
    <Show when={props.error}><p role="alert" class="mt-1 text-xs text-error">{props.error}</p></Show>
    <Show when={props.helperText && !props.error}><p class="mt-1 text-xs text-muted-foreground">{props.helperText}</p></Show>
  </div>;
}
