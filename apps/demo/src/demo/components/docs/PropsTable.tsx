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
        <h3 class="text-xs font-medium text-foreground">
          {props.componentName} Props
        </h3>
      </Show>
      <div class="overflow-x-auto rounded-md border border-border">
        <table class="w-full text-xs">
          <thead>
            <tr class="bg-muted/50 border-b border-border">
              <th class="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                Prop
              </th>
              <th class="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                Type
              </th>
              <th class="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                Default
              </th>
              <th class="px-3 py-2 text-left font-medium text-muted-foreground">
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            <For each={props.props}>
              {(prop) => (
                <tr
                  class={cn(
                    'border-b border-border last:border-b-0',
                    'hover:bg-muted/30 transition-colors'
                  )}
                >
                  <td class="px-3 py-2 whitespace-nowrap">
                    <code class="font-mono text-[11px] text-primary">
                      {prop.name}
                    </code>
                    <Show when={prop.required}>
                      <span class="ml-1 text-error text-[10px]">*</span>
                    </Show>
                  </td>
                  <td class="px-3 py-2 whitespace-nowrap">
                    <code class="font-mono text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {prop.type}
                    </code>
                  </td>
                  <td class="px-3 py-2 whitespace-nowrap">
                    <Show
                      when={prop.default !== undefined}
                      fallback={
                        <span class="text-muted-foreground/50">-</span>
                      }
                    >
                      <code class="font-mono text-[11px] text-muted-foreground">
                        {prop.default}
                      </code>
                    </Show>
                  </td>
                  <td class="px-3 py-2 text-muted-foreground">
                    {prop.description}
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
      <Show when={props.props.some(p => p.required)}>
        <p class="text-[10px] text-muted-foreground">
          <span class="text-error">*</span> Required prop
        </p>
      </Show>
    </div>
  );
}
