import { For, type Component } from 'solid-js';
import { Bookmark, Grid3x3, LayoutDashboard } from '../icons';

export type DisplayMode = 'activity' | 'deck' | 'workbench';

const VALID_MODES: ReadonlySet<DisplayMode> = new Set(['activity', 'deck', 'workbench']);

export function sanitizeDisplayMode(
  value: unknown,
  fallback: DisplayMode = 'activity'
): DisplayMode {
  return typeof value === 'string' && VALID_MODES.has(value as DisplayMode)
    ? (value as DisplayMode)
    : fallback;
}

export interface DisplayModeSwitcherProps {
  mode: DisplayMode;
  onChange: (mode: DisplayMode) => void;
}

interface ModeOption {
  id: DisplayMode;
  label: string;
  icon: Component<{ class?: string }>;
}

const MODES: readonly ModeOption[] = [
  { id: 'activity', label: 'Activity', icon: Bookmark },
  { id: 'deck', label: 'Deck', icon: LayoutDashboard },
  { id: 'workbench', label: 'Workbench', icon: Grid3x3 },
];

export function DisplayModeSwitcher(props: DisplayModeSwitcherProps) {
  return (
    <div class="display-mode-switcher" role="tablist" aria-label="Display mode">
      <For each={MODES}>
        {(option) => {
          const Icon = option.icon;
          const isActive = () => props.mode === option.id;
          return (
            <button
              type="button"
              class="display-mode-switcher__pill"
              classList={{ 'is-active': isActive() }}
              role="tab"
              aria-selected={isActive()}
              onClick={() => props.onChange(option.id)}
            >
              {isActive() ? <span class="display-mode-switcher__pill-bg" /> : null}
              <Icon class="display-mode-switcher__icon" />
              <span class="display-mode-switcher__label">{option.label}</span>
            </button>
          );
        }}
      </For>
    </div>
  );
}
