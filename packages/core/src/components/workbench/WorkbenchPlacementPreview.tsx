import { Show } from 'solid-js';
import type { WorkbenchViewport } from './types';
import type { WorkbenchPlacementPreviewFrame } from './workbenchPlacement';

export interface WorkbenchPlacementPreviewProps {
  preview: WorkbenchPlacementPreviewFrame | null | undefined;
  projection: 'world' | 'screen';
  viewport: WorkbenchViewport;
}

export function WorkbenchPlacementPreview(props: WorkbenchPlacementPreviewProps) {
  const geometry = () => {
    const preview = props.preview;
    if (!preview) return null;
    if (props.projection === 'screen') {
      const scale =
        Number.isFinite(props.viewport.scale) && props.viewport.scale > 0
          ? props.viewport.scale
          : 1;
      return {
        x: props.viewport.x + preview.x * scale,
        y: props.viewport.y + preview.y * scale,
        width: preview.width * scale,
        height: preview.height * scale,
      };
    }
    return {
      x: preview.x,
      y: preview.y,
      width: preview.width,
      height: preview.height,
    };
  };

  return (
    <Show when={props.preview}>
      {(preview) => (
        <div
          class="workbench-placement-preview"
          classList={{
            'is-widget': preview().kind === 'widget',
            'is-sticky-note': preview().kind === 'sticky-note',
            'is-text': preview().kind === 'text',
            'is-background-region': preview().kind === 'background-region',
            'is-drop-armed': preview().dropAllowed !== false,
          }}
          style={{
            transform: `translate3d(${geometry()?.x ?? 0}px, ${geometry()?.y ?? 0}px, 0)`,
            width: `${geometry()?.width ?? 0}px`,
            height: `${geometry()?.height ?? 0}px`,
          }}
          aria-hidden="true"
        >
          <div class="workbench-placement-preview__crosshair" />
          <div class="workbench-placement-preview__label">{preview().label}</div>
        </div>
      )}
    </Show>
  );
}
