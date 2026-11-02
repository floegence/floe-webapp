import { createSignal, createUniqueId, onCleanup, onMount, Show } from 'solid-js';
import { useFloeLocale } from '../../context/LocaleContext';
import { useFormControl } from './formFieldContext';
import { createControllableValue } from './controllable';
import { Calendar } from './Calendar';
import { Popover } from './Popover';
import { Button } from './Button';
import { Input } from './Input';

export interface DatePickerProps {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  ariaLabel?: string;
  class?: string;
  clearable?: boolean;
  weekStartsOn?: number;
}
/** YYYY-MM-DD civil date. Hosts explicitly convert it to instants when needed. */
export function DatePicker(props: DatePickerProps) {
  const locale = useFloeLocale(),
    field = useFormControl(),
    uid = createUniqueId();
  const [value, setValue] = createControllableValue({
    value: () => props.value,
    defaultValue: props.defaultValue ?? '',
    onChange: (value) => props.onChange?.(value),
  });
  const [open, setOpen] = createSignal(false);
  let input: HTMLInputElement | undefined;
  onMount(() => {
    const form = input?.form;
    let resetTimer: ReturnType<typeof setTimeout> | undefined;
    const reset = (event: Event) => {
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        if (!event.defaultPrevented) {
          setValue(props.defaultValue ?? '');
          setOpen(false);
          if (input) input.value = value();
        }
      });
    };
    form?.addEventListener('reset', reset);
    onCleanup(() => {
      clearTimeout(resetTimer);
      form?.removeEventListener('reset', reset);
    });
  });
  return (
    <div class={'flex min-w-0 items-center gap-1 ' + (props.class ?? '')} dir={locale.direction}>
      <Input
        ref={input}
        id={props.id ?? field.id ?? 'date-' + uid}
        name={props.name ?? field.name}
        type="date"
        value={value()}
        min={props.min}
        max={props.max}
        disabled={props.disabled ?? field.disabled}
        readOnly={props.readOnly ?? field.readOnly}
        required={props.required ?? field.required}
        aria-label={props.ariaLabel}
        onInput={(event) => setValue(event.currentTarget.value)}
      />
      <Popover
        open={open()}
        onOpenChange={setOpen}
        ariaLabel={props.ariaLabel ?? locale.t('chooseDate')}
        trigger={(triggerProps) => (
          <Button
            {...triggerProps}
            variant="outline"
            size="icon"
            aria-label={locale.t('chooseDate')}
            disabled={(props.disabled ?? field.disabled) || (props.readOnly ?? field.readOnly)}
          >
            <span aria-hidden="true">▦</span>
          </Button>
        )}
      >
        <Calendar
          autoFocus
          value={value()}
          onChange={(date) => {
            setValue(date);
            setOpen(false);
            input?.focus();
          }}
          min={props.min}
          max={props.max}
          weekStartsOn={props.weekStartsOn}
        />
      </Popover>
      <Show when={props.clearable && value()}>
        <Button
          variant="ghost"
          size="sm"
          disabled={(props.disabled ?? field.disabled) || (props.readOnly ?? field.readOnly)}
          onClick={() => {
            setValue('');
            input?.focus();
          }}
        >
          {locale.t('clear')}
        </Button>
      </Show>
    </div>
  );
}
export interface DateRange {
  start: string;
  end: string;
}
export interface DateRangePickerProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  startName?: string;
  endName?: string;
  startLabel?: string;
  endLabel?: string;
  class?: string;
}
export function DateRangePicker(props: DateRangePickerProps) {
  const locale = useFloeLocale(),
    uid = createUniqueId();
  return (
    <div class={'flex flex-wrap items-end gap-3 ' + (props.class ?? '')} dir={locale.direction}>
      <div class="space-y-1 text-caption">
        <label for={uid + '-start'}>{props.startLabel ?? locale.t('startDate')}</label>
        <DatePicker
          id={uid + '-start'}
          name={props.startName}
          ariaLabel={props.startLabel ?? locale.t('startDate')}
          value={props.value.start}
          min={props.min}
          max={
            props.value.end && props.max
              ? props.value.end < props.max
                ? props.value.end
                : props.max
              : props.value.end || props.max
          }
          disabled={props.disabled}
          onChange={(start) => props.onChange({ ...props.value, start })}
        />
      </div>
      <div class="space-y-1 text-caption">
        <label for={uid + '-end'}>{props.endLabel ?? locale.t('endDate')}</label>
        <DatePicker
          id={uid + '-end'}
          name={props.endName}
          ariaLabel={props.endLabel ?? locale.t('endDate')}
          value={props.value.end}
          min={
            props.value.start && props.min
              ? props.value.start > props.min
                ? props.value.start
                : props.min
              : props.value.start || props.min
          }
          max={props.max}
          disabled={props.disabled}
          onChange={(end) => props.onChange({ ...props.value, end })}
        />
      </div>
    </div>
  );
}
