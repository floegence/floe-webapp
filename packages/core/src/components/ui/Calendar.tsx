import { For, createMemo, createSignal, createUniqueId, onMount, untrack } from 'solid-js';
import { useFloeLocale } from '../../context/LocaleContext';
import { cn } from '../../utils/cn';
import { createControllableValue } from './controllable';
import { Button } from './Button';
import {
  addCalendarDays,
  addCalendarMonths,
  calendarDays,
  parseCalendarDate,
} from './calendarModel';

export interface CalendarProps {
  autoFocus?: boolean;
  value?: string;
  defaultValue?: string;
  onChange?: (date: string) => void;
  month?: string;
  defaultMonth?: string;
  onMonthChange?: (month: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  isDateDisabled?: (date: string) => boolean;
  weekStartsOn?: number;
  ariaLabel?: string;
  class?: string;
}
function localToday() {
  const now = new Date();
  return (
    String(now.getFullYear()).padStart(4, '0') +
    '-' +
    String(now.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(now.getDate()).padStart(2, '0')
  );
}
export function Calendar(props: CalendarProps) {
  const locale = useFloeLocale(),
    uid = createUniqueId();
  const initial = untrack(
    () => props.defaultMonth || props.value || props.defaultValue || localToday()
  );
  const [month, setMonth] = createControllableValue({
    value: () => props.month,
    defaultValue: initial,
    onChange: (month) => props.onMonthChange?.(month),
  });
  const [value, setValue] = createControllableValue({
    value: () => props.value,
    defaultValue: props.defaultValue ?? '',
    onChange: (value) => props.onChange?.(value),
  });
  const [focus, setFocus] = createSignal(
    untrack(() => props.value || props.defaultValue || initial)
  );
  const dates = createMemo(() => calendarDays(month(), props.weekStartsOn ?? 0));
  const unavailable = (date: string) =>
    Boolean(
      props.disabled ||
      (props.min && date < props.min) ||
      (props.max && date > props.max) ||
      props.isDateDisabled?.(date)
    );
  const tabDate = () =>
    dates().includes(focus()) && !unavailable(focus())
      ? focus()
      : dates().find((date) => date.startsWith(month().slice(0, 7)) && !unavailable(date));
  let root: HTMLDivElement | undefined;
  onMount(() => {
    if (props.autoFocus) root?.querySelector<HTMLButtonElement>('[tabindex="0"]')?.focus();
  });
  const changeMonth = (delta: number) =>
    setMonth(addCalendarMonths(month().slice(0, 7) + '-01', delta));
  const move = (event: KeyboardEvent, date: string) => {
    let next: string;
    switch (event.key) {
      case 'ArrowLeft':
        next = addCalendarDays(date, locale.direction === 'rtl' ? 1 : -1);
        break;
      case 'ArrowRight':
        next = addCalendarDays(date, locale.direction === 'rtl' ? -1 : 1);
        break;
      case 'ArrowUp':
        next = addCalendarDays(date, -7);
        break;
      case 'ArrowDown':
        next = addCalendarDays(date, 7);
        break;
      case 'PageUp':
        next = addCalendarMonths(date, event.shiftKey ? -12 : -1);
        break;
      case 'PageDown':
        next = addCalendarMonths(date, event.shiftKey ? 12 : 1);
        break;
      case 'Home':
        next = addCalendarDays(
          date,
          -((parseCalendarDate(date).getUTCDay() - (props.weekStartsOn ?? 0) + 7) % 7)
        );
        break;
      case 'End':
        next = addCalendarDays(
          date,
          6 - ((parseCalendarDate(date).getUTCDay() - (props.weekStartsOn ?? 0) + 7) % 7)
        );
        break;
      default:
        return;
    }
    event.preventDefault();
    if (props.min && next < props.min) next = props.min;
    if (props.max && next > props.max) next = props.max;
    setFocus(next);
    setMonth(next.slice(0, 7) + '-01');
    queueMicrotask(() =>
      root?.querySelector<HTMLButtonElement>('[data-date="' + next + '"]')?.focus()
    );
  };
  return (
    <div ref={root} dir={locale.direction} class={cn('w-64 max-w-full p-2', props.class)}>
      <div class="mb-2 flex items-center justify-between gap-2">
        <Button
          size="icon"
          variant="ghost"
          aria-label={locale.t('previousMonth')}
          disabled={props.disabled || (!!props.min && month().slice(0, 7) <= props.min.slice(0, 7))}
          onClick={() => changeMonth(-1)}
        >
          <span aria-hidden="true">{locale.direction === 'rtl' ? '›' : '‹'}</span>
        </Button>
        <span id={uid + '-month'} aria-live="polite" class="text-sm font-medium">
          {locale.date(parseCalendarDate(month().slice(0, 7) + '-01'), {
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC',
            calendar: 'gregory',
          })}
        </span>
        <Button
          size="icon"
          variant="ghost"
          aria-label={locale.t('nextMonth')}
          disabled={props.disabled || (!!props.max && month().slice(0, 7) >= props.max.slice(0, 7))}
          onClick={() => changeMonth(1)}
        >
          <span aria-hidden="true">{locale.direction === 'rtl' ? '‹' : '›'}</span>
        </Button>
      </div>
      <table
        role="grid"
        aria-label={props.ariaLabel}
        aria-labelledby={props.ariaLabel ? undefined : uid + '-month'}
        class="w-full table-fixed border-collapse"
      >
        <thead>
          <tr>
            <For each={dates().slice(0, 7)}>
              {(date) => (
                <th scope="col" class="pb-1 text-caption font-normal text-muted-foreground">
                  <abbr
                    class="no-underline"
                    title={locale.date(parseCalendarDate(date), {
                      weekday: 'long',
                      timeZone: 'UTC',
                    })}
                  >
                    {locale.date(parseCalendarDate(date), { weekday: 'short', timeZone: 'UTC' })}
                  </abbr>
                </th>
              )}
            </For>
          </tr>
        </thead>
        <tbody>
          <For each={[0, 1, 2, 3, 4, 5]}>
            {(week) => (
              <tr>
                <For each={dates().slice(week * 7, week * 7 + 7)}>
                  {(date) => (
                    <td aria-selected={value() === date} class="p-0.5 text-center">
                      <button
                        type="button"
                        data-date={date}
                        tabIndex={tabDate() === date ? 0 : -1}
                        aria-disabled={unavailable(date) || undefined}
                        aria-label={locale.date(parseCalendarDate(date), {
                          dateStyle: 'full',
                          timeZone: 'UTC',
                          calendar: 'gregory',
                        })}
                        class={cn(
                          'h-8 w-full rounded-control text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1',
                          value() === date
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-accent',
                          !date.startsWith(month().slice(0, 7)) && 'text-muted-foreground',
                          unavailable(date) && 'opacity-40'
                        )}
                        onFocus={() => setFocus(date)}
                        onKeyDown={(event) => move(event, date)}
                        onClick={() => {
                          if (!unavailable(date)) {
                            setValue(date);
                            setMonth(date.slice(0, 7) + '-01');
                          }
                        }}
                      >
                        {locale.number(parseCalendarDate(date).getUTCDate())}
                      </button>
                    </td>
                  )}
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}
