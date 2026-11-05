import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  onCleanup,
  onMount,
  untrack,
  type JSX,
} from 'solid-js';
import { cn } from '../../utils/cn';
import { useFloeLocale } from '../../context/LocaleContext';
import { useOverlayMask } from '../../hooks/useOverlayMask';
import { SurfaceFloatingLayer } from './SurfaceFloatingLayer';
import { createFloatingPresence } from './floatingPresence';
import { calculateMenuPosition } from './menuUtils';
import { resolveSurfacePortalBoundaryRect, resolveSurfacePortalHost } from './surfacePortalScope';
import { useFormControl, joinAriaIds } from './formFieldContext';
import { createControllableValue } from './controllable';
import { Check, ChevronDown } from '../icons';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  keywords?: string[];
}
export interface SelectBaseProps {
  id?: string;
  name?: string;
  form?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  invalid?: boolean;
  options: readonly SelectOption[];
  placeholder?: string;
  class?: string;
  /** Optional layer for choices nested in elevated overlays. */
  zIndex?: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Runs after an enabled option is chosen, including reselecting its current value. */
  onOptionSelect?: (option: SelectOption) => void;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  onQueryChange?: (query: string) => void;
  /** Disable local filtering when the host supplies remote search results. */
  filter?: boolean;
  renderOption?: (option: SelectOption) => JSX.Element;
  ref?: (control: HTMLButtonElement | HTMLInputElement) => void;
}
export interface SelectProps extends SelectBaseProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
}
export interface MultiSelectProps extends SelectBaseProps {
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
}
interface ChoiceProps extends SelectBaseProps {
  values: string[];
  onValuesChange: (values: string[]) => void;
  resetValues: string[];
  multiple?: boolean;
  searchable?: boolean;
}

function Choice(props: ChoiceProps) {
  const locale = useFloeLocale();
  const field = useFormControl();
  const uid = createUniqueId();
  const id = () => props.id ?? field.id ?? 'select-' + uid;
  const listId = 'options-' + uid;
  const disabled = () => props.disabled ?? field.disabled;
  const readOnly = () => props.readOnly ?? field.readOnly;
  const [open, changeOpen] = createControllableValue({
    value: () => props.open,
    defaultValue: props.defaultOpen ?? false,
    onChange: (value) => props.onOpenChange?.(value),
  });
  const [query, setQuery] = createSignal('');
  const [active, setActive] = createSignal(-1);
  const [position, setPosition] = createSignal({ x: 0, y: 0 });
  const [width, setWidth] = createSignal(200);
  let control: HTMLButtonElement | HTMLInputElement | undefined;
  let native: HTMLSelectElement | undefined;
  let panel: HTMLDivElement | undefined;
  let layer: HTMLDivElement | undefined;
  const presence = createFloatingPresence({ open, element: () => panel });
  const [side, setSide] = createSignal<'top' | 'bottom'>('bottom');
  let typeahead = '';
  let typedAt = 0;
  const options = createMemo(() => {
    if (!props.searchable || props.filter === false || !query()) return props.options;
    const text = query().toLocaleLowerCase(locale.locale);
    return props.options.filter((option) =>
      [option.label, ...(option.keywords ?? [])].some((value) =>
        value.toLocaleLowerCase(locale.locale).includes(text)
      )
    );
  });
  const selectedText = () =>
    props.values
      .map((value) => props.options.find((option) => option.value === value)?.label ?? value)
      .join(', ');
  const setOpen = (next: boolean) => {
    if (next && (disabled() || readOnly())) return;
    changeOpen(next);
    if (!next) setQuery('');
  };
  const select = (option: SelectOption) => {
    if (disabled() || readOnly() || option.disabled) return;
    props.onValuesChange(
      props.multiple
        ? props.values.includes(option.value)
          ? props.values.filter((value) => value !== option.value)
          : [...props.values, option.value]
        : [option.value]
    );
    if (!props.multiple) setOpen(false);
    control?.focus({ preventScroll: true });
    props.onOptionSelect?.(option);
  };
  const move = (delta: number, edge?: 'first' | 'last') => {
    const enabled = options()
      .map((option, index) => (option.disabled ? -1 : index))
      .filter((index) => index >= 0);
    if (!enabled.length) {
      setActive(-1);
      return;
    }
    const previous = enabled.indexOf(active());
    const index =
      edge === 'first'
        ? 0
        : edge === 'last'
          ? enabled.length - 1
          : previous < 0
            ? delta < 0
              ? enabled.length - 1
              : 0
            : (previous + delta + enabled.length) % enabled.length;
    setActive(enabled[index]);
    panel
      ?.querySelector('[id="' + listId + '-' + enabled[index] + '"]')
      ?.scrollIntoView({ block: 'nearest' });
  };
  const measure = () => {
    if (!control || !panel) return;
    const rect = control.getBoundingClientRect();
    setWidth(rect.width);
    const bounds = resolveSurfacePortalBoundaryRect(resolveSurfacePortalHost({ owner: control }));
    const next = calculateMenuPosition(
      rect,
      // The position layer is never transformed; motion belongs to its child.
      layer?.getBoundingClientRect() ?? panel.getBoundingClientRect(),
      locale.direction === 'rtl' ? 'end' : 'start',
      bounds
    );
    setSide(next.y < rect.top ? 'top' : 'bottom');
    setPosition(next);
  };
  createEffect(() => {
    if (!open()) return;
    const current = untrack(active);
    if (current < 0 || !options()[current] || options()[current].disabled) {
      const selected = options().findIndex(
        (option) => !option.disabled && props.values.includes(option.value)
      );
      setActive(selected >= 0 ? selected : options().findIndex((option) => !option.disabled));
    }
  });
  createEffect(() => {
    if (!presence.mounted() || presence.exiting() || typeof window === 'undefined') return;
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };
    schedule();
    const observer = new ResizeObserver(schedule);
    if (control) observer.observe(control);
    if (layer) observer.observe(layer);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    onCleanup(() => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
    });
  });
  useOverlayMask({
    open,
    root: () => panel,
    containsTarget: (target) =>
      target instanceof Node && Boolean(panel?.contains(target) || control?.contains(target)),
    onClose: () => setOpen(false),
    onInteractOutside: () => setOpen(false),
    onEscapeOutside: () => setOpen(false),
    lockBodyScroll: false,
    trapFocus: false,
    autoFocus: false,
    restoreFocus: false,
    blockHotkeys: false,
    closeOnEscape: 'inside',
    escapeKeyPhase: 'bubble',
  });
  onMount(() => {
    const form = native?.form;
    let resetTimer: ReturnType<typeof setTimeout> | undefined;
    const reset = (event: Event) => {
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        if (event.defaultPrevented) return;
        props.onValuesChange([...props.resetValues]);
        setOpen(false);
        if (native)
          for (const option of native.options)
            option.selected = props.values.includes(option.value);
      });
    };
    form?.addEventListener('reset', reset);
    onCleanup(() => {
      clearTimeout(resetTimer);
      form?.removeEventListener('reset', reset);
    });
  });
  createEffect(() => {
    const values = props.values;
    void props.options;
    if (native)
      for (const option of native.options) option.selected = values.includes(option.value);
  });
  const keydown = (event: KeyboardEvent) => {
    if (disabled() || readOnly() || event.isComposing) return;
    if (event.key === 'Escape' && open()) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      return;
    }
    if (event.key === 'Tab') {
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const wasOpen = open();
      setOpen(true);
      if (wasOpen) move(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (open() && (event.key === 'Home' || event.key === 'End') && !props.searchable) {
      event.preventDefault();
      move(0, event.key === 'Home' ? 'first' : 'last');
      return;
    }
    if (event.key === 'Enter' || (!props.searchable && event.key === ' ')) {
      event.preventDefault();
      if (open() && options()[active()]) select(options()[active()]);
      else setOpen(true);
      return;
    }
    if (
      !props.searchable &&
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      const now = Date.now();
      typeahead = now - typedAt > 700 ? event.key : typeahead + event.key;
      typedAt = now;
      const option = props.options.find(
        (item) =>
          !item.disabled &&
          item.label
            .toLocaleLowerCase(locale.locale)
            .startsWith(typeahead.toLocaleLowerCase(locale.locale))
      );
      if (option) {
        event.preventDefault();
        if (open()) setActive(options().indexOf(option));
        else select(option);
      }
    }
  };
  const controlProps = {
    get id() {
      return id();
    },
    get disabled() {
      return disabled();
    },
    get 'aria-readonly'() {
      return readOnly();
    },
    role: 'combobox' as const,
    'aria-haspopup': 'listbox' as const,
    get 'aria-expanded'() {
      return open();
    },
    get 'aria-controls'() {
      return open() ? listId : undefined;
    },
    get 'aria-activedescendant'() {
      return open() && options()[active()] ? listId + '-' + active() : undefined;
    },
    get 'aria-label'() {
      return props.ariaLabel;
    },
    get 'aria-labelledby'() {
      return props.ariaLabelledBy;
    },
    get 'aria-describedby'() {
      return joinAriaIds(field['aria-describedby'], props.ariaDescribedBy);
    },
    get 'aria-invalid'() {
      return props.invalid || field['aria-invalid'];
    },
    get 'aria-required'() {
      return props.required ?? field.required;
    },
    'data-floe-input-surface': 'true',
    'data-floe-control': 'select',
    'data-floe-dropdown-trigger': '',
    'data-floe-surface': 'inset',
    get class() {
      return cn(
        'floe-field flex w-full min-w-0 items-center justify-between gap-2 h-[var(--floe-control-height-md)] px-2.5 text-[length:var(--floe-type-control)]',
        props.class
      );
    },
    onKeyDown: keydown,
    ref: (node: HTMLButtonElement | HTMLInputElement) => {
      control = node;
      props.ref?.(node);
    },
  };
  return (
    <div class="relative min-w-0" dir={locale.direction}>
      <Show
        when={props.searchable}
        fallback={
          <button {...controlProps} type="button" onClick={() => setOpen(!open())}>
            <span class="truncate">
              {selectedText() || props.placeholder || locale.t('selectPlaceholder')}
            </span>
            <ChevronDown class="h-3.5 w-3.5 shrink-0" />
          </button>
        }
      >
        <input
          {...controlProps}
          type="text"
          autocomplete="off"
          readOnly={readOnly()}
          aria-autocomplete="list"
          placeholder={props.placeholder ?? locale.t('searchPlaceholder')}
          value={open() ? query() : selectedText()}
          onClick={() => setOpen(true)}
          onInput={(event) => {
            setQuery(event.currentTarget.value);
            setActive(-1);
            setOpen(true);
            props.onQueryChange?.(event.currentTarget.value);
          }}
        />
      </Show>
      <select
        ref={native}
        name={props.name ?? field.name}
        form={props.form}
        required={props.required ?? field.required}
        disabled={disabled()}
        multiple={props.multiple}
        tabIndex={-1}
        aria-hidden="true"
        class="sr-only pointer-events-none"
        onInvalid={(event) => {
          event.preventDefault();
          control?.focus();
        }}
        onChange={(event) =>
          props.onValuesChange(
            Array.from(event.currentTarget.selectedOptions, (option) => option.value)
          )
        }
      >
        <Show when={!props.multiple && !props.options.some((option) => option.value === '')}>
          <option value="" selected={!props.values.length || props.values[0] === ''} />
        </Show>
        <For
          each={props.values.filter(
            (value) => value !== '' && !props.options.some((option) => option.value === value)
          )}
        >
          {(value) => (
            <option value={value} selected>
              {value}
            </option>
          )}
        </For>
        <For each={props.options}>
          {(option) => (
            <option
              value={option.value}
              selected={props.values.includes(option.value)}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          )}
        </For>
      </select>
      <Show when={presence.mounted()}>
        <SurfaceFloatingLayer
          owner={control}
          position={position()}
          layerRef={(node) => {
            layer = node;
          }}
          dir={locale.direction}
          style={{
            'z-index': props.zIndex,
            width: 'max-content',
            'min-width': width() + 'px',
            'max-width': 'calc(100vw - 24px)',
          }}
        >
          <div
            ref={panel}
            class="floe-floating-presence floe-floating-menu rounded-panel border border-[var(--floe-line)] bg-popover text-popover-foreground shadow-[var(--floe-elevation-float)] p-1"
            data-floating-presence={presence.state()}
            data-floating-side={side()}
            inert={presence.exiting()}
            aria-hidden={presence.exiting() ? 'true' : undefined}
            data-floe-surface="floating"
          >
            <Show when={props.loading}>
              <div role="status" class="px-2 py-2 text-caption">
                {locale.t('loading')}
              </div>
            </Show>
            <Show when={props.error}>
              <div role="alert" class="p-2 text-error">
                {props.error}
                <Show when={props.onRetry}>
                  <button type="button" onClick={() => props.onRetry?.()}>
                    {locale.t('retry')}
                  </button>
                </Show>
              </div>
            </Show>
            <div
              id={listId}
              role="listbox"
              aria-label={props.ariaLabel}
              aria-labelledby={props.ariaLabelledBy ?? (props.ariaLabel ? undefined : id())}
              aria-multiselectable={props.multiple || undefined}
              class="max-h-64 overflow-y-auto"
              data-floe-local-interaction-surface="true"
            >
              <For each={options()}>
                {(option, index) => (
                  <div
                    id={listId + '-' + index()}
                    role="option"
                    aria-selected={props.values.includes(option.value)}
                    aria-disabled={option.disabled || undefined}
                    data-floe-selected={props.values.includes(option.value) ? 'true' : undefined}
                    class={cn(
                      'flex min-h-[var(--floe-row-height)] items-center gap-2 rounded-sm px-2 text-[length:var(--floe-type-control)]',
                      active() === index() && 'bg-accent text-accent-foreground',
                      option.disabled ? 'opacity-50' : 'cursor-pointer'
                    )}
                    onPointerDown={(event) => event.preventDefault()}
                    onPointerMove={() => !option.disabled && setActive(index())}
                    onClick={() => select(option)}
                  >
                    <span class="h-3.5 w-3.5 shrink-0">
                      <Show when={props.values.includes(option.value)}>
                        <Check class="h-3.5 w-3.5" />
                      </Show>
                    </span>
                    {props.renderOption ? props.renderOption(option) : option.label}
                  </div>
                )}
              </For>
            </div>
            <Show when={!options().length && !props.loading && !props.error}>
              <div role="status" class="p-2 text-caption">
                {locale.t('noResults')}
              </div>
            </Show>
          </div>
        </SurfaceFloatingLayer>
      </Show>
    </div>
  );
}

export function Select(props: SelectProps) {
  const [value, setValue] = createControllableValue({
    value: () => props.value,
    defaultValue: props.defaultValue ?? '',
    onChange: (value) => props.onChange?.(value),
  });
  return (
    <Choice
      {...props}
      values={[value()]}
      resetValues={[props.defaultValue ?? '']}
      onValuesChange={(values) => setValue(values[0] ?? '')}
    />
  );
}
export function Combobox(props: SelectProps) {
  const [value, setValue] = createControllableValue({
    value: () => props.value,
    defaultValue: props.defaultValue ?? '',
    onChange: (value) => props.onChange?.(value),
  });
  return (
    <Choice
      {...props}
      searchable
      values={[value()]}
      resetValues={[props.defaultValue ?? '']}
      onValuesChange={(values) => setValue(values[0] ?? '')}
    />
  );
}
export function MultiSelect(props: MultiSelectProps) {
  const [value, setValue] = createControllableValue({
    value: () => props.value,
    defaultValue: props.defaultValue ?? [],
    onChange: (value) => props.onChange?.(value),
  });
  return (
    <Choice
      {...props}
      multiple
      values={value()}
      resetValues={props.defaultValue ?? []}
      onValuesChange={setValue}
    />
  );
}
