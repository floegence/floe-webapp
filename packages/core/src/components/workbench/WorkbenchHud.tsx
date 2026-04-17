import { Minus, Plus } from '../../icons';

export interface WorkbenchHudProps {
  scaleLabel: string;
  onZoomOut: () => void;
  onZoomIn: () => void;
}

export function WorkbenchHud(props: WorkbenchHudProps) {
  return (
    <div class="workbench-hud" data-floe-canvas-interactive="true">
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
