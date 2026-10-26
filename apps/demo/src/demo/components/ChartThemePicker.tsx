import { For, Show } from 'solid-js';
import {
  cn,
  floeThemeColorVariables,
  resolveThemeTokenOverrides,
  useTheme,
  type FloeCssVariableName,
  type FloeThemePreset,
} from '@floegence/floe-webapp-core';
import { getDemoChartThemePreset } from '../chartThemePresets';

const chartColorVariables = [
  '--chart-1',
  '--chart-2',
  '--chart-3',
  '--chart-4',
  '--chart-5',
] as const satisfies readonly FloeCssVariableName[];

export interface ChartThemePickerProps {
  compact?: boolean;
  class?: string;
}

interface ChartThemePresetButtonProps {
  compact: boolean;
  active: boolean;
  preset: FloeThemePreset;
  resolvedTheme: 'light' | 'dark';
  onSelect: () => void;
}

function resolveChartPreviewColors(preset: FloeThemePreset, resolvedTheme: 'light' | 'dark') {
  const baseColors = floeThemeColorVariables[resolvedTheme];
  const presetColors = resolveThemeTokenOverrides(preset.tokens, resolvedTheme);
  return chartColorVariables.map((variable) => presetColors[variable] ?? baseColors[variable]);
}

function ChartThemePresetButton(props: ChartThemePresetButtonProps) {
  const presetDetails = () => getDemoChartThemePreset(props.preset.name);
  const previewColors = () => resolveChartPreviewColors(props.preset, props.resolvedTheme);

  return (
    <button
      type="button"
      aria-pressed={props.active}
      class={cn(
        'min-w-0 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        props.compact
          ? props.active
            ? 'rounded-full border border-[var(--floe-accent-line)] bg-[var(--floe-accent-soft)] px-3 py-1.5 text-[var(--floe-ink)] shadow-sm'
            : 'rounded-full border border-[var(--floe-line)] bg-[var(--floe-plane-raised)] px-3 py-1.5 hover:bg-[var(--floe-state-hover)]/40'
          : props.active
            ? 'rounded-group border border-[var(--floe-accent-line)] bg-[var(--floe-accent-soft)] px-3.5 py-3 shadow-sm'
            : 'rounded-group border border-[var(--floe-line)] bg-[var(--floe-plane-raised)]/90 px-3.5 py-3 hover:border-foreground/15 hover:bg-[var(--floe-state-hover)]/20'
      )}
      onClick={() => props.onSelect()}
    >
      <Show
        when={props.compact}
        fallback={
          <>
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-caption font-semibold uppercase tracking-[0.18em] text-[var(--floe-ink-soft)]/70">
                  {presetDetails()?.category ?? 'Theme Preset'}
                </p>
                <p class="mt-1 text-sm font-semibold text-[var(--floe-ink)]">{props.preset.displayName}</p>
              </div>
              <Show when={props.active}>
                <span class="rounded-full border border-[var(--floe-accent-line)] bg-[var(--floe-plane)]/80 px-2 py-0.5 text-caption font-medium text-[var(--floe-accent-ink)]">
                  Active
                </span>
              </Show>
            </div>

            <div class="mt-3 flex items-center gap-1.5">
              <For each={previewColors()}>
                {(color) => (
                  <span
                    class="h-2 flex-1 rounded-full border border-background/70"
                    style={{ background: color }}
                  />
                )}
              </For>
            </div>

            <p class="mt-3 text-caption leading-4 text-[var(--floe-ink)]/85">
              {props.preset.description ?? 'Named chart theme preset.'}
            </p>
            <p class="mt-2 text-caption leading-4 text-[var(--floe-ink-soft)]">
              {presetDetails()?.bestFor}
            </p>

            <div class="mt-3 flex flex-wrap gap-1.5">
              <For each={presetDetails()?.traits ?? []}>
                {(trait) => (
                  <span class="rounded-full border border-[var(--floe-line)]/70 bg-[var(--floe-plane)]/80 px-2 py-0.5 text-caption font-medium text-[var(--floe-ink-soft)]">
                    {trait}
                  </span>
                )}
              </For>
            </div>
          </>
        }
      >
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1">
            <For each={previewColors()}>
              {(color) => (
                <span
                  class="h-2.5 w-2.5 rounded-full border border-background/70"
                  style={{ background: color }}
                />
              )}
            </For>
          </div>
          <span class="text-xs font-medium whitespace-nowrap">{props.preset.displayName}</span>
          <Show when={props.active}>
            <span class="rounded-full bg-[var(--floe-plane)]/80 px-1.5 py-0.5 text-[length:var(--floe-type-micro)] font-medium text-[var(--floe-ink-soft)]">
              Active
            </span>
          </Show>
        </div>
      </Show>
    </button>
  );
}

export function ChartThemePicker(props: ChartThemePickerProps) {
  const theme = useTheme();
  const activePresetName = () => theme.themePreset()?.name;
  const resolvedTheme = () => theme.resolvedTheme();

  return (
    <Show when={theme.themePresets().length > 0}>
      <div
        class={cn(
          props.compact
            ? 'flex flex-wrap gap-1.5'
            : 'grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(10.75rem,1fr))]',
          props.class
        )}
      >
        <For each={theme.themePresets()}>
          {(preset) => (
            <ChartThemePresetButton
              compact={props.compact ?? false}
              active={activePresetName() === preset.name}
              preset={preset}
              resolvedTheme={resolvedTheme()}
              onSelect={() => theme.setThemePreset(preset.name)}
            />
          )}
        </For>
      </div>
    </Show>
  );
}
