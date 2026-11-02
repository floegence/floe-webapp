import { For, createUniqueId, type JSX } from 'solid-js';
import { createControllableValue } from './controllable';
import { useFloeLocale } from '../../context/LocaleContext';
export interface AccordionItem {
  id: string;
  title: JSX.Element;
  content: JSX.Element;
  disabled?: boolean;
}
export interface AccordionProps {
  items: readonly AccordionItem[];
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  multiple?: boolean;
  class?: string;
}
export function Accordion(props: AccordionProps) {
  const locale = useFloeLocale(),
    uid = createUniqueId();
  const [value, setValue] = createControllableValue({
    value: () => props.value,
    defaultValue: props.defaultValue ?? [],
    onChange: (value) => props.onValueChange?.(value),
  });
  let root: HTMLDivElement | undefined;
  const navigate = (event: KeyboardEvent) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const buttons = Array.from(
      root?.querySelectorAll<HTMLButtonElement>('[data-accordion-trigger]:not(:disabled)') ?? []
    );
    const index = buttons.indexOf(event.target as HTMLButtonElement);
    if (index < 0) return;
    event.preventDefault();
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? buttons.length - 1
          : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next]?.focus();
  };
  return (
    <div ref={root} dir={locale.direction} class={props.class} onKeyDown={navigate}>
      <For each={props.items}>
        {(item, index) => {
          const id = () => uid + '-' + index();
          const expanded = () => value().includes(item.id);
          return (
            <section class="border-b border-border">
              <h3>
                <button
                  type="button"
                  id={id() + '-trigger'}
                  data-accordion-trigger
                  disabled={item.disabled}
                  aria-expanded={expanded()}
                  aria-controls={id() + '-panel'}
                  class="flex w-full items-center justify-between gap-3 py-3 text-start font-medium focus-visible:outline focus-visible:outline-2 disabled:opacity-50"
                  onClick={() =>
                    setValue(
                      expanded()
                        ? value().filter((id) => id !== item.id)
                        : props.multiple
                          ? [...value(), item.id]
                          : [item.id]
                    )
                  }
                >
                  {item.title}
                  <span aria-hidden="true">{expanded() ? '−' : '+'}</span>
                </button>
              </h3>
              <div id={id() + '-panel'} aria-labelledby={id() + '-trigger'} hidden={!expanded()}>
                <div class="pb-3">{item.content}</div>
              </div>
            </section>
          );
        }}
      </For>
    </div>
  );
}
