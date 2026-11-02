import { For, Show, type JSX } from 'solid-js';
import { useFloeLocale } from '../../context/LocaleContext';
import { cn } from '../../utils/cn';
export interface BreadcrumbItem {
  id: string;
  label: string;
  href?: string;
  onSelect?: () => void;
}
export interface BreadcrumbProps {
  items: readonly BreadcrumbItem[];
  ariaLabel?: string;
  class?: string;
  separator?: JSX.Element;
}
export function Breadcrumb(props: BreadcrumbProps) {
  const locale = useFloeLocale();
  return (
    <nav
      aria-label={props.ariaLabel ?? locale.t('breadcrumb')}
      dir={locale.direction}
      class={props.class}
    >
      <ol class="flex flex-wrap items-center gap-1 text-[length:var(--floe-type-control)]">
        <For each={props.items}>
          {(item, index) => (
            <li class="flex min-w-0 items-center gap-1">
              <Show when={index() > 0}>
                <span aria-hidden="true" class="text-muted-foreground">
                  {props.separator ?? '/'}
                </span>
              </Show>
              <Show
                when={index() < props.items.length - 1}
                fallback={
                  <span aria-current="page" class="break-words">
                    {item.label}
                  </span>
                }
              >
                <Show
                  when={item.href}
                  fallback={
                    <button
                      type="button"
                      onClick={() => item.onSelect?.()}
                      class="rounded-sm px-1 text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2"
                    >
                      {item.label}
                    </button>
                  }
                >
                  <a
                    href={item.href}
                    class={cn(
                      'rounded-sm px-1 text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2'
                    )}
                  >
                    {item.label}
                  </a>
                </Show>
              </Show>
            </li>
          )}
        </For>
      </ol>
    </nav>
  );
}
