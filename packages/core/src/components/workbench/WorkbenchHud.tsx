import { Show } from 'solid-js';
import { Minus, Plus } from '../../icons';
import { WorkbenchThemeSelector } from './WorkbenchThemeSelector';
import type { WorkbenchThemeId } from './workbenchThemes';

export interface WorkbenchHudProps {
  scaleLabel: string;
  onZoomOut: () => void;
  onZoomIn: () => void;
  /**
   * Current workbench theme. When provided alongside {@link onSelectTheme},
   * the HUD renders an inline theme selector next to the zoom controls.
   * Omit both to hide the selector entirely (e.g. when the consumer provides
   * its own theming UI elsewhere).
   */
  activeTheme?: WorkbenchThemeId;
  onSelectTheme?: (id: WorkbenchThemeId) => void;
}

export function WorkbenchHud(props: WorkbenchHudProps) {
  return (
    <div class="workbench-hud" data-floe-canvas-interactive="true">
      <Show when={props.activeTheme && props.onSelectTheme}>
        <WorkbenchThemeSelector
          activeTheme={props.activeTheme!}
          onSelect={(id) => props.onSelectTheme?.(id)}
        />
        <div class="workbench-hud__divider" aria-hidden="true" />
      </Show>
      <button
        type="button"
        class="workbench-hud__button"
        aria-label="Zoom out"
        onClick={() => props.onZoomOut()}
      >
        <Minus class="w-3.5 h-3.5" />
      </button>
      <div class="workbench-hud__scale">{props.scaleLabel}</div>
      <button
        type="button"
        class="workbench-hud__button"
        aria-label="Zoom in"
        onClick={() => props.onZoomIn()}
      >
        <Plus class="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
