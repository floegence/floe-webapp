import { For, Show } from 'solid-js';
import { cn } from '@floegence/floe-webapp-core';

export interface UsageGuidelinesProps {
  whenToUse?: string[];
  bestPractices?: string[];
  avoid?: string[];
  class?: string;
}
/** Guidance remains visible without borrowing success, warning or error colors. */
export function UsageGuidelines(props: UsageGuidelinesProps) {
  const groups = () =>
    [
      { title: 'When to use', items: props.whenToUse },
      { title: 'Good defaults', items: props.bestPractices },
      { title: 'Keep in mind', items: props.avoid },
    ].filter((group) => group.items?.length);
  return (
    <Show when={groups().length}>
      <aside
        aria-label="Usage guidance"
        class={cn(
          'grid gap-4 border-t border-[var(--floe-line-quiet)] pt-4 lg:grid-cols-3',
          props.class
        )}
      >
        <For each={groups()}>
          {(group) => (
            <section class="space-y-2">
              <h3 class="text-[length:var(--floe-type-supporting)] font-medium">{group.title}</h3>
              <ul class="list-disc space-y-1.5 pl-4 text-caption leading-relaxed text-[var(--floe-ink-soft)]">
                <For each={group.items}>{(item) => <li>{item}</li>}</For>
              </ul>
            </section>
          )}
        </For>
      </aside>
    </Show>
  );
}
