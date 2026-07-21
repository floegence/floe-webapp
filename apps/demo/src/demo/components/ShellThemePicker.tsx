import { For, Show } from 'solid-js';
import {
  cn,
  getShellThemePresetsForMode,
  resolveThemeTokenOverrides,
  useTheme,
  type FloeShellThemeMode,
  type FloeThemePreset,
  type ThemeType,
} from '@floegence/floe-webapp-core';
import { Check, Moon, Sun } from '@floegence/floe-webapp-core/icons';

const themeModes = [
  { value: 'system', label: 'System', icon: undefined },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
] as const satisfies readonly {
  value: ThemeType;
  label: string;
  icon?: typeof Sun;
}[];

interface ThemeTileProps {
  preset: FloeThemePreset;
  mode: FloeShellThemeMode;
  selected: boolean;
  active: boolean;
  onSelect: () => void;
}

function ThemeTile(props: ThemeTileProps) {
  const tokens = () => resolveThemeTokenOverrides(props.preset.tokens, props.mode);
  const preview = () => props.preset.preview;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={props.selected}
      aria-label={`${props.preset.displayName}: ${props.preset.description ?? props.mode}`}
      class={cn(
        'group min-w-0 rounded-md border p-2 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
        props.active
          ? 'border-primary bg-accent/60 shadow-sm'
          : props.selected
            ? 'border-input bg-card/80'
            : 'border-border bg-card/80 hover:border-input hover:bg-accent/40'
      )}
      onClick={() => props.onSelect()}
    >
      <span
        class="relative block h-11 overflow-hidden rounded border"
        style={{
          background: preview()?.background ?? tokens()['--background'],
          'border-color': preview()?.border ?? tokens()['--border'],
        }}
        aria-hidden="true"
      >
        <span
          class="absolute inset-y-1.5 left-1.5 w-3 rounded-sm"
          style={{ background: preview()?.sidebar ?? tokens()['--sidebar'] }}
        />
        <span
          class="absolute inset-y-1.5 right-1.5 left-5.5 rounded-sm border"
          style={{
            background: preview()?.surface ?? tokens()['--card'],
            'border-color': preview()?.border ?? tokens()['--border'],
          }}
        >
          <span
            class="absolute top-1.5 left-1.5 h-2 w-5 rounded-sm"
            style={{ background: preview()?.primary ?? tokens()['--primary'] }}
          />
          <span class="absolute right-1.5 bottom-1.5 left-1.5 flex gap-0.5">
            <For each={(preview()?.colors ?? []).slice(0, 4)}>
              {(color) => <span class="h-1 flex-1 rounded-sm" style={{ background: color }} />}
            </For>
          </span>
        </span>
      </span>

      <span class="mt-2 flex min-w-0 items-start justify-between gap-1.5">
        <span class="min-w-0">
          <span class="block truncate text-xs font-semibold text-foreground">
            {props.preset.displayName}
          </span>
          <span class="mt-0.5 block text-[10px] leading-3.5 text-muted-foreground">
            {props.preset.description}
          </span>
        </span>
        <Show when={props.selected}>
          <span
            class={cn(
              'mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground',
              !props.active && 'opacity-65'
            )}
            aria-hidden="true"
          >
            <Check class="h-2.5 w-2.5" />
          </span>
        </Show>
      </span>
    </button>
  );
}

export function ShellThemePicker() {
  const theme = useTheme();

  const renderThemeGroup = (mode: FloeShellThemeMode, label: string) => {
    const presets = () => getShellThemePresetsForMode(theme.shellPresets(), mode);
    const selectedName = () => theme.shellPresetForMode(mode)?.name;

    return (
      <div>
        <div class="mb-1.5 flex items-center gap-2">
          <span class="text-[10px] font-semibold uppercase text-muted-foreground">{label}</span>
          <span class="h-px flex-1 bg-border" aria-hidden="true" />
        </div>
        <div class="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label={label}>
          <For each={presets()}>
            {(preset) => (
              <ThemeTile
                preset={preset}
                mode={mode}
                selected={selectedName() === preset.name}
                active={theme.resolvedTheme() === mode && theme.shellPreset()?.name === preset.name}
                onSelect={() => theme.selectShellTheme(mode, preset.name)}
              />
            )}
          </For>
        </div>
      </div>
    );
  };

  return (
    <div class="space-y-3">
      <div
        class="grid grid-cols-3 overflow-hidden rounded-md border border-border bg-muted/40 p-0.5"
        role="group"
        aria-label="Color mode"
      >
        <For each={themeModes}>
          {(mode) => {
            const Icon = mode.icon;
            return (
              <button
                type="button"
                aria-pressed={theme.theme() === mode.value}
                class={cn(
                  'inline-flex h-7 min-w-0 items-center justify-center gap-1 rounded-sm px-1.5 text-[11px] font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  theme.theme() === mode.value
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                )}
                onClick={() => theme.setTheme(mode.value)}
              >
                {Icon ? <Icon class="h-3 w-3" /> : null}
                <span class="truncate">{mode.label}</span>
              </button>
            );
          }}
        </For>
      </div>

      {renderThemeGroup('light', 'Light themes')}
      {renderThemeGroup('dark', 'Dark themes')}
    </div>
  );
}
