import { For, Show } from 'solid-js';
import { cn, InfoBlock, TipBlock, WarningBlock } from '@floegence/floe-webapp-core';

export interface UsageGuidelinesProps {
  whenToUse?: string[];
  bestPractices?: string[];
  avoid?: string[];
  class?: string;
}

/**
 * UsageGuidelines - Display usage guidance for components.
 * Uses semantic highlight blocks for different types of guidance.
 */
export function UsageGuidelines(props: UsageGuidelinesProps) {
  const hasContent = () =>
    (props.whenToUse && props.whenToUse.length > 0) ||
    (props.bestPractices && props.bestPractices.length > 0) ||
    (props.avoid && props.avoid.length > 0);

  return (
    <Show when={hasContent()}>
      <div class={cn('space-y-3', props.class)}>
        {/* When to Use */}
        <Show when={props.whenToUse && props.whenToUse.length > 0}>
          <InfoBlock title="When to Use">
            <ul class="list-disc list-inside space-y-0.5 text-xs">
              <For each={props.whenToUse}>
                {(item) => <li>{item}</li>}
              </For>
            </ul>
          </InfoBlock>
        </Show>

        {/* Best Practices */}
        <Show when={props.bestPractices && props.bestPractices.length > 0}>
          <TipBlock title="Best Practices">
            <ul class="list-disc list-inside space-y-0.5 text-xs">
              <For each={props.bestPractices}>
                {(item) => <li>{item}</li>}
              </For>
            </ul>
          </TipBlock>
        </Show>

        {/* Avoid */}
        <Show when={props.avoid && props.avoid.length > 0}>
          <WarningBlock title="Avoid">
            <ul class="list-disc list-inside space-y-0.5 text-xs">
              <For each={props.avoid}>
                {(item) => <li>{item}</li>}
              </For>
            </ul>
          </WarningBlock>
        </Show>
      </div>
    </Show>
  );
}
