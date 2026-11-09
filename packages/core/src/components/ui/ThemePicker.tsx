import { For, Show, createUniqueId, createEffect, onCleanup, type JSX } from 'solid-js';
import { Check } from '../../icons';
import type { FloeThemePreset } from '../../themes';

export interface ThemePickerProps {
  mode: string;
  modes: readonly { value: string; label: string }[];
  modeLabel: string;
  presets: readonly FloeThemePreset[];
  selectedPreset: string | undefined;
  presetLabel: (preset: FloeThemePreset) => string;
  presetsLabel: string;
  pending?: string;
  pendingLabel: string;
  error?: string;
  onModeChange: (mode: string) => void;
  onPresetChange: (preset: FloeThemePreset) => void;
}

/** Controlled appearance fields. The host owns persistence and request admission. */
export function ThemePicker(props: ThemePickerProps) {
  const id = createUniqueId();
  let presetGroup: HTMLDivElement | undefined;
  let focusedPreset: string | undefined;
  let disposed = false;
  onCleanup(() => { disposed = true; });
  createEffect(() => {
    const names = props.presets.map(preset => preset.name);
    if (!focusedPreset || names.includes(focusedPreset)) return;
    // Keep keyboard focus in the group when system mode replaces its choices.
    queueMicrotask(() => {
      if (disposed) return;
      const selected = presetGroup?.querySelector<HTMLButtonElement>('[aria-checked="true"]');
      selected?.focus({ preventScroll: true });
    });
  });
  const rove: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = event => {
    const controls = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
    const index = controls.indexOf(event.target as HTMLButtonElement);
    if (index < 0) return;
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? controls.length - 1
      : ['ArrowRight', 'ArrowDown'].includes(event.key) ? (index + 1) % controls.length
      : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? (index - 1 + controls.length) % controls.length : null;
    if (next === null) return;
    event.preventDefault(); controls[next]?.focus(); controls[next]?.click();
  };
  return <div class="floe-theme-picker">
    <div class="floe-theme-picker__toolbar">
      <div role="radiogroup" aria-label={props.modeLabel} class="floe-theme-picker__modes" onKeyDown={rove}>
        <For each={props.modes}>{mode => <button type="button" role="radio" aria-checked={props.mode === mode.value}
          tabindex={props.mode === mode.value ? 0 : -1} aria-disabled={!!props.pending} aria-busy={props.pending === `mode-${mode.value}`}
          onClick={() => { if (!props.pending) props.onModeChange(mode.value); }}>{mode.label}</button>}</For>
      </div>
      <span role="status" aria-live="polite" class="floe-theme-picker__status">{props.pending ? props.pendingLabel : ''}</span>
    </div>
    <div ref={presetGroup} onFocusIn={event => { focusedPreset = (event.target as HTMLElement).closest<HTMLElement>('[data-theme-preset]')?.dataset.themePreset; }}
      onFocusOut={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) focusedPreset = undefined; }}
      role="radiogroup" aria-label={props.presetsLabel} class="floe-theme-picker__presets" onKeyDown={rove}>
      <For each={props.presets}>{preset => <button type="button" role="radio" data-theme-preset={preset.name}
        aria-label={props.presetLabel(preset)} aria-checked={props.selectedPreset === preset.name} tabindex={props.selectedPreset === preset.name ? 0 : -1}
        aria-disabled={!!props.pending} aria-busy={props.pending === preset.name}
        onClick={() => { if (!props.pending) props.onPresetChange(preset); }}>
        <span class="floe-theme-picker__preview" aria-hidden="true" style={{ '--theme-preview-bg': preset.preview?.background, '--theme-preview-surface': preset.preview?.surface, '--theme-preview-sidebar': preset.preview?.sidebar, '--theme-preview-border': preset.preview?.border, '--theme-preview-primary': preset.preview?.primary }}>
          <span class="floe-theme-picker__preview-sidebar" /><span class="floe-theme-picker__preview-body"><i /><span><For each={preset.preview?.colors?.slice(0, 4)}>{color => <i style={{ background: color }} />}</For></span></span>
        </span>
        <span class="floe-theme-picker__caption"><span>{props.presetLabel(preset)}</span><Check aria-hidden="true" style={{ visibility: props.selectedPreset === preset.name ? 'visible' : 'hidden' }} /></span>
      </button>}</For>
    </div>
    <Show when={props.error}><p role="alert" id={`${id}-error`} class="floe-theme-picker__error">{props.error}</p></Show>
  </div>;
}
