import { For, createMemo } from 'solid-js';
import type {
  WorkbenchWidgetDefinition,
  WorkbenchWidgetItem,
  WorkbenchWidgetType,
} from './types';
import { getWidgetEntry } from './widgets/widgetRegistry';
import { WorkbenchWidget } from './WorkbenchWidget';

export interface WorkbenchCanvasFieldProps {
  widgetDefinitions: readonly WorkbenchWidgetDefinition[];
  widgets: readonly WorkbenchWidgetItem[];
  selectedWidgetId: string | null;
  optimisticFrontWidgetId: string | null;
  topZIndex: number;
  viewportScale: number;
  locked: boolean;
  filters: Record<WorkbenchWidgetType, boolean>;
  onSelectWidget: (widgetId: string) => void;
  onWidgetContextMenu: (event: MouseEvent, item: WorkbenchWidgetItem) => void;
  onStartOptimisticFront: (widgetId: string) => void;
  onCommitFront: (widgetId: string) => void;
  onCommitMove: (widgetId: string, position: { x: number; y: number }) => void;
  onCommitResize: (widgetId: string, size: { width: number; height: number }) => void;
  onRequestDelete: (widgetId: string) => void;
}

interface WorkbenchCanvasWidgetSlotProps extends WorkbenchCanvasFieldProps {
  widgetId: string;
  widgetById: () => Map<string, WorkbenchWidgetItem>;
}

function WorkbenchCanvasWidgetSlot(props: WorkbenchCanvasWidgetSlotProps) {
  const item = createMemo<WorkbenchWidgetItem>((previous) => {
    const current = props.widgetById().get(props.widgetId);
    if (current) return current;
    if (previous) return previous;
    throw new Error(`Workbench widget ${props.widgetId} is missing from the render map.`);
  });
  const definition = createMemo(() => getWidgetEntry(item().type, props.widgetDefinitions));

  return (
    <WorkbenchWidget
      definition={definition()}
      widgetId={props.widgetId}
      widgetTitle={item().title}
      widgetType={item().type}
      x={item().x}
      y={item().y}
      width={item().width}
      height={item().height}
      zIndex={item().z_index}
      itemSnapshot={item}
      selected={props.selectedWidgetId === props.widgetId}
      optimisticFront={props.optimisticFrontWidgetId === props.widgetId}
      topZIndex={props.topZIndex}
      viewportScale={props.viewportScale}
      locked={props.locked}
      filtered={!props.filters[item().type]}
      onSelect={props.onSelectWidget}
      onContextMenu={props.onWidgetContextMenu}
      onStartOptimisticFront={props.onStartOptimisticFront}
      onCommitFront={props.onCommitFront}
      onCommitMove={props.onCommitMove}
      onCommitResize={props.onCommitResize}
      onRequestDelete={props.onRequestDelete}
    />
  );
}

export function WorkbenchCanvasField(props: WorkbenchCanvasFieldProps) {
  const widgetIds = createMemo(() => props.widgets.map((item) => item.id));
  const widgetById = createMemo(() => new Map(props.widgets.map((item) => [item.id, item] as const)));

  return (
    <div class="workbench-canvas__field">
      <div class="workbench-canvas__grid" aria-hidden="true" />
      {/* Keep widget subtree ownership keyed by widget.id so z-index or geometry updates do not remount business widgets. */}
      <For each={widgetIds()}>
        {(widgetId) => (
          <WorkbenchCanvasWidgetSlot
            widgetId={widgetId}
            widgetDefinitions={props.widgetDefinitions}
            widgets={props.widgets}
            widgetById={widgetById}
            selectedWidgetId={props.selectedWidgetId}
            optimisticFrontWidgetId={props.optimisticFrontWidgetId}
            topZIndex={props.topZIndex}
            viewportScale={props.viewportScale}
            locked={props.locked}
            filters={props.filters}
            onSelectWidget={props.onSelectWidget}
            onWidgetContextMenu={props.onWidgetContextMenu}
            onStartOptimisticFront={props.onStartOptimisticFront}
            onCommitFront={props.onCommitFront}
            onCommitMove={props.onCommitMove}
            onCommitResize={props.onCommitResize}
            onRequestDelete={props.onRequestDelete}
          />
        )}
      </For>
    </div>
  );
}
