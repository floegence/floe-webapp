import { For, Show, createMemo,
  createUniqueId, createSignal, onCleanup, type Accessor, type JSX } from 'solid-js';
import { startPointerSession, type PointerSessionController } from '../ui/pointerSession';
import { startHotInteraction } from '../../utils/hotInteraction';
import {
  dockSplitWorkspaceItem,
  measureSplitWorkspace,
  resizeSplitWorkspace,
  type SplitWorkspaceDivider,
  type SplitWorkspaceEdge,
  type SplitWorkspaceLayout,
} from './splitWorkspaceModel';

export interface SplitWorkspaceProps {
  layout: SplitWorkspaceLayout | null;
  /** Stable item keys, including retained items currently absent from the layout. */
  itemIds: readonly string[];
  activeId: string | null;
  compact?: boolean;
  maximizedId?: string | null;
  showHeaders?: boolean;
  class?: string;
  resizeLabel: string;
  onLayoutChange: (layout: SplitWorkspaceLayout | null) => void;
  onActivate: (id: string) => void;
  renderItem: (id: string, visible: Accessor<boolean>) => JSX.Element;
  renderHeader?: (id: string) => JSX.Element;
  externalDragType?: string;
  resolveExternalDrag?: (event: DragEvent) => string | null;
}

/** A flat keyed surface keeps expensive content mounted across tree edits. */
export function SplitWorkspace(props: SplitWorkspaceProps) {
  let root!: HTMLDivElement;
  let pointer: PointerSessionController | undefined;
  let finishHot: (() => void) | undefined;
  let frame: number | undefined;
  let draggedId: string | null = null;
  const instanceId = createUniqueId();
  let splitSequence = 0;
  const [preview, setPreview] = createSignal<SplitWorkspaceLayout | null>(null);
  const [drop, setDrop] = createSignal<{ id: string; edge: SplitWorkspaceEdge | 'center' } | null>(
    null
  );
  const geometry = createMemo(() => measureSplitWorkspace(preview() ?? props.layout));
  const soloId = () => (props.compact ? props.activeId : props.maximizedId);
  const isVisible = (id: string) => (soloId() ? soloId() === id : geometry().panes.has(id));
  const dragType = 'application/x-floe-split-workspace';
  const resetDrag = () => {
    draggedId = null;
    setDrop(null);
    finishHot?.();
    finishHot = undefined;
  };
  const stopResize = () => {
    pointer?.stop({ commit: false });
    pointer = undefined;
  };
  const onEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      stopResize();
      resetDrag();
    }
  };
  const beginResize = (event: PointerEvent, divider: SplitWorkspaceDivider) => {
    if (event.button !== 0 || !props.layout) return;
    event.preventDefault();
    event.stopPropagation();
    stopResize();
    const initial = props.layout;
    const box = root.getBoundingClientRect();
    const extent =
      divider.axis === 'x'
        ? (box.width * divider.width) / 100
        : (box.height * divider.height) / 100;
    if (extent <= 0) return;
    const start = divider.axis === 'x' ? event.clientX : event.clientY;
    let ratio = divider.ratio;
    finishHot = startHotInteraction({
      kind: 'resize',
      cursor: divider.axis === 'x' ? 'col-resize' : 'row-resize',
    });
    const update = (x: number, y: number) => {
      ratio = Math.max(
        0.15,
        Math.min(0.85, divider.ratio + ((divider.axis === 'x' ? x : y) - start) / extent)
      );
    };
    document.addEventListener('keydown', onEscape, true);
    pointer = startPointerSession({
      pointerEvent: event,
      captureEl: event.currentTarget as HTMLElement,
      onMove: (move) => {
        update(move.clientX, move.clientY);
        if (frame !== undefined) return;
        frame = requestAnimationFrame(() => {
          frame = undefined;
          setPreview(resizeSplitWorkspace(initial, divider.id, ratio));
        });
      },
      onEnd: (end) => {
        if (frame !== undefined) cancelAnimationFrame(frame);
        frame = undefined;
        if (end.event) update(end.event.clientX, end.event.clientY);
        setPreview(null);
        finishHot?.();
        finishHot = undefined;
        document.removeEventListener('keydown', onEscape, true);
        if (end.commit && props.layout === initial) props.onLayoutChange(resizeSplitWorkspace(initial, divider.id, ratio));
      },
    });
  };
  onCleanup(() => {
    stopResize();
    resetDrag();
    document.removeEventListener('keydown', onEscape, true);
  });
  const acceptsDrag = (event: DragEvent) =>
    Boolean(
      draggedId ||
      event.dataTransfer?.types.includes(dragType) ||
      (props.externalDragType && event.dataTransfer?.types.includes(props.externalDragType))
    );
  const updateDrop = (event: DragEvent, id: string) => {
    if (props.compact || !acceptsDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const distances: [SplitWorkspaceEdge, number][] = [
      ['left', x],
      ['right', 1 - x],
      ['top', y],
      ['bottom', 1 - y],
    ];
    distances.sort((a, b) => a[1] - b[1]);
    setDrop({ id, edge: distances[0][1] < 0.25 ? distances[0][0] : 'center' });
  };
  const commitDrop = (event: DragEvent, id: string) => {
    if (!acceptsDrag(event) || !drop()) return;
    event.preventDefault();
    event.stopPropagation();
    const source =
      draggedId || event.dataTransfer?.getData(dragType) || props.resolveExternalDrag?.(event);
    if (source && props.itemIds.includes(source)) {
      props.onLayoutChange(
        dockSplitWorkspaceItem(
          props.layout,
          source,
          id,
          drop()!.edge,
          'split-' + instanceId + '-' + ++splitSequence
        )
      );
      props.onActivate(source);
    }
    resetDrag();
  };
  return (
    <div
      ref={root}
      class={props.class}
      data-floe-split-workspace=""
      style={{ position: 'relative', height: '100%', 'min-height': '0', overflow: 'hidden' }}
      onDragLeave={(event) => {
        if (!root.contains(event.relatedTarget as Node | null)) setDrop(null);
      }}
      onDragEnd={resetDrag}
    >
      <For each={props.itemIds}>
        {(id) => {
          const visible = () => isVisible(id);
          const rect = () =>
            soloId() ? { x: 0, y: 0, width: 100, height: 100 } : geometry().panes.get(id);
          return (
            <section
              data-floe-split-pane={id}
              data-active={props.activeId === id ? 'true' : 'false'}
              hidden={!visible()}
              ref={(element) => {
                const activate = () => {
                  if (visible() && props.activeId !== id) props.onActivate(id);
                };
                element.addEventListener('pointerdown', activate, true);
                onCleanup(() => element.removeEventListener('pointerdown', activate, true));
              }}
              onFocusIn={() => {
                if (visible() && props.activeId !== id) props.onActivate(id);
              }}
              onDragOver={(event) => updateDrop(event, id)}
              onDrop={(event) => commitDrop(event, id)}
              style={{
                position: 'absolute',
                display: visible() ? 'flex' : 'none',
                'flex-direction': 'column',
                overflow: 'hidden',
                left: (rect()?.x ?? 0) + '%',
                top: (rect()?.y ?? 0) + '%',
                width: (rect()?.width ?? 100) + '%',
                height: (rect()?.height ?? 100) + '%',
              }}
            >
              <Show when={props.showHeaders && props.renderHeader}>
                <div
                  data-floe-split-header={id}
                  draggable={!props.compact}
                  class="flex h-8 shrink-0 items-center gap-1 border-b border-border bg-muted/30 px-2"
                  onDragStart={(event) => {
                    if ((event.target as HTMLElement).closest('button, input, select')) {
                      event.preventDefault();
                      return;
                    }
                    draggedId = id;
                    event.dataTransfer?.setData(dragType, id);
                    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
                    finishHot = startHotInteraction({ kind: 'drag', cursor: 'grabbing' });
                  }}
                >
                  {props.renderHeader?.(id)}
                </div>
              </Show>
              <div
                style={{ flex: '1', 'min-height': '0', position: 'relative', overflow: 'hidden' }}
              >
                {props.renderItem(id, visible)}
              </div>
              <Show when={drop()?.id === id}>
                <div
                  data-floe-split-drop={drop()!.edge}
                  class="pointer-events-none absolute z-30 rounded border-2 border-primary bg-primary/15"
                  style={{
                    left: drop()!.edge === 'right' ? '50%' : '0',
                    right: drop()!.edge === 'left' ? '50%' : '0',
                    top: drop()!.edge === 'bottom' ? '50%' : '0',
                    bottom: drop()!.edge === 'top' ? '50%' : '0',
                  }}
                />
              </Show>
            </section>
          );
        }}
      </For>
      <Show when={!soloId()}>
        <For each={geometry().dividers.map((d) => d.id)}>
          {(id) => {
            const d = () => geometry().dividers.find((candidate) => candidate.id === id)!;
            return (
              <div
                role="separator"
                tabindex="0"
                aria-label={props.resizeLabel}
                aria-orientation={d().axis === 'x' ? 'vertical' : 'horizontal'}
                aria-valuemin={15}
                aria-valuemax={85}
                aria-valuenow={Math.round(d().ratio * 100)}
                data-floe-split-divider={id}
                class="absolute z-20 bg-border hover:bg-primary/50 focus-visible:bg-primary focus-visible:outline-none"
                style={{
                  'touch-action': 'none',
                  cursor: d().axis === 'x' ? 'col-resize' : 'row-resize',
                  left: d().x + (d().axis === 'x' ? d().width * d().ratio : 0) + '%',
                  top: d().y + (d().axis === 'y' ? d().height * d().ratio : 0) + '%',
                  width: d().axis === 'x' ? '4px' : d().width + '%',
                  height: d().axis === 'y' ? '4px' : d().height + '%',
                  transform: d().axis === 'x' ? 'translateX(-2px)' : 'translateY(-2px)',
                }}
                onPointerDown={(event) => beginResize(event, d())}
                onDblClick={() => {
                  if (props.layout)
                    props.onLayoutChange(resizeSplitWorkspace(props.layout, id, 0.5));
                }}
                onKeyDown={(event) => {
                  const keys =
                    d().axis === 'x' ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown'];
                  if (!props.layout || ![...keys, 'Home', 'End', 'Enter'].includes(event.key))
                    return;
                  event.preventDefault();
                  event.stopPropagation();
                  const ratio =
                    event.key === 'Home'
                      ? 0.15
                      : event.key === 'End'
                        ? 0.85
                        : event.key === 'Enter'
                          ? 0.5
                          : d().ratio + (event.key === keys[0] ? -0.05 : 0.05);
                  props.onLayoutChange(resizeSplitWorkspace(props.layout, id, ratio));
                }}
              />
            );
          }}
        </For>
      </Show>
    </div>
  );
}
