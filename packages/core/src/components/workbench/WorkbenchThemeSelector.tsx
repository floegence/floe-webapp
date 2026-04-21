import { For, createMemo } from 'solid-js';
import { Sparkles } from '../../icons';
import { Dropdown, type DropdownItem } from '../ui/Dropdown';
import {
  WORKBENCH_THEMES,
  workbenchThemeMeta,
  type WorkbenchThemeId,
  type WorkbenchThemeMeta,
} from './workbenchThemes';

export interface WorkbenchThemeSelectorProps {
  activeTheme: WorkbenchThemeId;
  onSelect: (id: WorkbenchThemeId) => void;
}

export function WorkbenchThemeSelector(props: WorkbenchThemeSelectorProps) {
  const activeLabel = createMemo(() => workbenchThemeMeta(props.activeTheme).label);

  const items = createMemo<DropdownItem[]>(() => [
    {
      id: 'theme-grid',
      label: 'Theme',
      keepOpen: true,
      content: () => (
        <ThemeGrid
          activeTheme={props.activeTheme}
          onSelect={(id) => props.onSelect(id)}
        />
      ),
    },
  ]);

  return (
    <div class="workbench-theme-selector" data-floe-canvas-interactive="true">
      <Dropdown
        trigger={
          <span class="workbench-theme-selector__trigger-inner">
            <Sparkles class="w-3.5 h-3.5" />
          </span>
        }
        triggerAriaLabel={`Workbench theme · ${activeLabel()}`}
        triggerClass="workbench-theme-selector__trigger"
        items={items()}
        onSelect={() => {
          /* Selection happens inside ThemeGrid via props.onSelect. */
        }}
        align="end"
      />
    </div>
  );
}

interface ThemeGridProps {
  activeTheme: WorkbenchThemeId;
  onSelect: (id: WorkbenchThemeId) => void;
}

function ThemeGrid(props: ThemeGridProps) {
  return (
    <div class="workbench-theme-grid" role="radiogroup" aria-label="Workbench theme">
      <div class="workbench-theme-grid__header">Workbench theme</div>
      <div class="workbench-theme-grid__items">
        <For each={WORKBENCH_THEMES}>
          {(theme) => (
            <ThemeTile
              theme={theme}
              active={theme.id === props.activeTheme}
              onClick={() => props.onSelect(theme.id)}
            />
          )}
        </For>
      </div>
    </div>
  );
}

interface ThemeTileProps {
  theme: WorkbenchThemeMeta;
  active: boolean;
  onClick: () => void;
}

function ThemeTile(props: ThemeTileProps) {
  return (
    <button
      type="button"
      class="workbench-theme-tile"
      classList={{ 'is-active': props.active }}
      aria-pressed={props.active}
      role="radio"
      aria-checked={props.active}
      onClick={() => props.onClick()}
    >
      <span
        class="workbench-theme-tile__canvas"
        style={{ background: props.theme.preview.canvas }}
        aria-hidden="true"
      >
        <span
          class="workbench-theme-tile__widget"
          style={{ background: props.theme.preview.widget }}
        />
        <span
          class="workbench-theme-tile__dot"
          style={{ background: props.theme.preview.accent }}
        />
      </span>
      <span class="workbench-theme-tile__meta">
        <span class="workbench-theme-tile__label">{props.theme.label}</span>
        <span class="workbench-theme-tile__description">{props.theme.description}</span>
      </span>
    </button>
  );
}
