import { splitProps, type JSX } from 'solid-js';
import { useFormControl } from './formFieldContext';
import { useFloeLocale } from '../../context/LocaleContext';
import { cn } from '../../utils/cn';
export interface SliderProps extends Omit<
  JSX.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'onChange' | 'size'
> {
  onValueChange?: (value: number) => void;
  valueText?: (value: number) => string;
}
/** Native range semantics retain keyboard, pointer, reset and form behavior. */
export function Slider(props: SliderProps) {
  const [local, rest] = splitProps(props, ['onValueChange', 'valueText', 'class']);
  const field = useFormControl(),
    locale = useFloeLocale();
  return (
    <input
      {...field}
      {...rest}
      type="range"
      dir={locale.direction}
      aria-valuetext={
        local.valueText && props.value !== undefined ? local.valueText(Number(props.value)) : undefined
      }
      class={cn('w-full accent-primary cursor-pointer disabled:opacity-50', local.class)}
      onChange={(event) => local.onValueChange?.(event.currentTarget.valueAsNumber)}
    />
  );
}
