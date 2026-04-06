import { For, Show, type JSX } from 'solid-js';
import { Minus, Plus, X } from '../../icons';
import type { NotesOverviewNavigationState } from './notesOverlayHelpers';

export interface NotesOverviewItemView {
  id: string;
  className: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NotesOverviewPanelProps {
  mode: 'desktop' | 'mobile';
  items: readonly NotesOverviewItemView[];
  boardScaleLabel: string;
  viewportStyle: JSX.CSSProperties;
  navigationState: NotesOverviewNavigationState | null;
  onPointerDown: JSX.EventHandler<HTMLDivElement, PointerEvent>;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onClose?: () => void;
}

export function NotesOverviewPanel(props: NotesOverviewPanelProps) {
  return (
    <div
      class={`notes-overview notes-overview--${props.mode}`}
      data-floe-canvas-interactive="true"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div
        class="notes-overview__surface"
        classList={{ 'is-navigating': props.navigationState !== null }}
        data-floe-canvas-interactive="true"
        onPointerDown={(event) => props.onPointerDown(event)}
      >
        <div class="notes-overview__grid" aria-hidden="true" />
        <For each={props.items}>
          {(item) => (
            <div
              class={`notes-overview__note ${item.className}`}
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                width: `${item.width}%`,
                height: `${item.height}%`,
              }}
            />
          )}
        </For>
        <div class="notes-overview__viewport" style={props.viewportStyle} />

        <div class="notes-overview__hud" aria-hidden="true">
          <div class="notes-overview__scale">{props.boardScaleLabel}</div>
        </div>

        <Show when={props.mode === 'mobile'}>
          <div class="notes-overview__controls">
            <div class="notes-overview__zoom-group">
              <button
                type="button"
                class="notes-overview__zoom-button"
                aria-label="Zoom out"
                onClick={() => props.onZoomOut()}
              >
                <Minus class="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                class="notes-overview__zoom-button"
                aria-label="Zoom in"
                onClick={() => props.onZoomIn()}
              >
                <Plus class="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              type="button"
              class="notes-overview__close"
              aria-label="Close overview"
              onClick={() => props.onClose?.()}
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        </Show>
      </div>
    </div>
  );
}
