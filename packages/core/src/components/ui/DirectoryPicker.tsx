import { cn } from '../../utils/cn';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { PickerPanel, pickerCopy, usePickerNavigation, type BasePickerProps } from './picker/PickerBase';

export interface DirectoryPickerProps extends BasePickerProps {
  /** Receives the validated absolute directory path. */
  onSelect: (path: string) => void;
}

export function DirectoryPicker(props: DirectoryPickerProps) {
  const source = usePickerNavigation(props, () => props.open);
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
    <PickerPanel {...props} source={source} />
  </Dialog>;
}
