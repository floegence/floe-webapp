import { For, Show } from 'solid-js';
import { cn } from '@floegence/floe-webapp-core';

export interface PropDefinition {
  name: string;
  type: string;
  default?: string;
  required?: boolean;
  description: string;
}

export interface PropsTableProps {
  props: PropDefinition[];
  componentName?: string;
  class?: string;
}

/**
 * PropsTable - Display component props in a professional table format.
 * Mobile-friendly with horizontal scrolling support.
 */
export function PropsTable(props: PropsTableProps) {
  return (
    <div class={cn('space-y-2', props.class)}>
      <Show when={props.componentName}>
        <h3 class="text-[length:var(--floe-type-supporting)] font-medium text-[var(--floe-ink-soft)]">
          {props.componentName} Props
        </h3>
      </Show>
      <div class="overflow-x-auto rounded-[var(--floe-radius-group)] border border-[var(--floe-line)]">
        <table class="w-full text-[length:var(--floe-type-caption)]">
          <thead>
            <tr class="bg-[var(--floe-well)] border-b border-[var(--floe-line)]">
              <th class="px-3 py-2 text-left font-medium text-[var(--floe-ink-quiet)] whitespace-nowrap">
                Prop
              </th>
              <th class="px-3 py-2 text-left font-medium text-[var(--floe-ink-quiet)] whitespace-nowrap">
                Type
              </th>
              <th class="px-3 py-2 text-left font-medium text-[var(--floe-ink-quiet)] whitespace-nowrap">
                Default
              </th>
              <th class="px-3 py-2 text-left font-medium text-[var(--floe-ink-quiet)]">
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            <For each={props.props}>
              {(prop) => (
                <tr
                  class={cn(
                    'border-b border-[var(--floe-line-quiet)] last:border-b-0',
                    'hover:bg-[var(--floe-state-hover)]',
                    'transition-colors duration-[var(--floe-duration-fast)] ease-[var(--floe-ease-out)]'
                  )}
                >
                  <td class="px-3 py-2 whitespace-nowrap">
                    <code class="font-mono text-[length:var(--floe-type-caption)] text-[var(--floe-ink)]">
                      {prop.name}
                    </code>
                    <Show when={prop.required}>
                      <span class="ml-1 text-error text-[length:var(--floe-type-caption)]">*</span>
                    </Show>
                  </td>
                  <td class="px-3 py-2 whitespace-nowrap">
                    <code class="font-mono text-[length:var(--floe-type-caption)] px-1.5 py-0.5 rounded-[var(--floe-radius-xs)] border border-[var(--floe-line)] bg-[var(--floe-well)] text-[var(--floe-ink-soft)]">
                      {prop.type}
                    </code>
                  </td>
                  <td class="px-3 py-2 whitespace-nowrap">
                    <Show
                      when={prop.default !== undefined}
                      fallback={
                        <span class="text-[var(--floe-ink-ghost)]">-</span>
                      }
                    >
                      <code class="font-mono text-[length:var(--floe-type-caption)] text-[var(--floe-ink-soft)]">
                        {prop.default}
                      </code>
                    </Show>
                  </td>
                  <td class="px-3 py-2 text-[var(--floe-ink-soft)]">
                    {prop.description}
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
      <Show when={props.props.some(p => p.required)}>
        <p class="text-[length:var(--floe-type-caption)] text-[var(--floe-ink-quiet)]">
          <span class="text-error">*</span> Required prop
        </p>
      </Show>
    </div>
  );
}
