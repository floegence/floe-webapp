import { For, Show, createMemo } from 'solid-js';
import {
  InfiniteCanvas,
  type InfiniteCanvasContextMenuEvent,
  type InfiniteCanvasPoint,
} from '../../ui';
import type {
  WorkbenchViewport,
  WorkbenchWidgetDefinition,
  WorkbenchWidgetItem,
  WorkbenchWidgetType,
} from './types';
import { WorkbenchCanvasField } from './WorkbenchCanvasField';
import { WorkbenchWidget } from './WorkbenchWidget';
import {
  createWorkbenchRenderLayerMap,
  resolveWorkbenchWidgetRenderMode,
} from './workbenchHelpers';
import { getWidgetEntry } from './widgets/widgetRegistry';

export interface WorkbenchCanvasProps {
  widgetDefinitions: readonly WorkbenchWidgetDefinition[];
  widgets: readonly WorkbenchWidgetItem[];
  viewport: WorkbenchViewport;
  canvasFrameSize: { width: number; height: number };
  selectedWidgetId: string | null;
  optimisticFrontWidgetId: string | null;
  locked: boolean;
  filters: Record<WorkbenchWidgetType, boolean>;
  setCanvasFrameRef: (el: HTMLDivElement | undefined) => void;
  onViewportCommit: (viewport: WorkbenchViewport) => void;
  onCanvasContextMenu: (event: InfiniteCanvasContextMenuEvent) => void;
  onSelectWidget: (widgetId: string) => void;
  onWidgetContextMenu: (event: MouseEvent, item: WorkbenchWidgetItem) => void;
  onStartOptimisticFront: (widgetId: string) => void;
  onCommitFront: (widgetId: string) => void;
  onCommitMove: (widgetId: string, position: { x: number; y: number }) => void;
  onCommitResize: (widgetId: string, size: { width: number; height: number }) => void;
  onRequestDelete: (widgetId: string) => void;
}

interface WorkbenchProjectedWidgetSlotProps extends Omit<WorkbenchCanvasProps, 'viewport' | 'widgets'> {
  widgetId: string;
  widgetById: () => Map<string, WorkbenchWidgetItem>;
  renderLayers: () => ReturnType<typeof createWorkbenchRenderLayerMap>;
  projectedViewport: InfiniteCanvasPoint;
  surfaceReady: boolean;
}

function WorkbenchProjectedWidgetSlot(props: WorkbenchProjectedWidgetSlotProps) {
  const item = createMemo<WorkbenchWidgetItem>((previous) => {
    const current = props.widgetById().get(props.widgetId);
    if (current) return current;
    if (previous) return previous;
    throw new Error(`Workbench widget ${props.widgetId} is missing from the projected render map.`);
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
      renderLayer={props.renderLayers().byWidgetId.get(props.widgetId) ?? 1}
      itemSnapshot={item}
      selected={props.selectedWidgetId === props.widgetId}
      optimisticFront={props.optimisticFrontWidgetId === props.widgetId}
      topRenderLayer={props.renderLayers().topRenderLayer}
      viewportScale={props.projectedViewport.scale}
      locked={props.locked}
      filtered={!props.filters[item().type]}
      layoutMode="projected_surface"
      projectedViewport={props.projectedViewport}
      surfaceReady={props.surfaceReady}
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

export function WorkbenchCanvas(props: WorkbenchCanvasProps) {
  const widgetById = createMemo(() => new Map(props.widgets.map((item) => [item.id, item] as const)));
  const renderLayers = createMemo(() => createWorkbenchRenderLayerMap(props.widgets));
  const canvasWidgets = createMemo(() =>
    props.widgets.filter((item) => {
      const definition = getWidgetEntry(item.type, props.widgetDefinitions);
      return resolveWorkbenchWidgetRenderMode(definition) === 'canvas_scaled';
    })
  );
  const projectedWidgetIds = createMemo(() =>
    props.widgets
      .filter((item) => {
        const definition = getWidgetEntry(item.type, props.widgetDefinitions);
        return resolveWorkbenchWidgetRenderMode(definition) === 'projected_surface';
      })
      .map((item) => item.id)
  );
  const projectedSurfaceReady = () =>
    props.canvasFrameSize.width > 0 && props.canvasFrameSize.height > 0;

  return (
    <div
      class="workbench-canvas"
      classList={{ 'is-locked': props.locked }}
      ref={props.setCanvasFrameRef}
    >
      <InfiniteCanvas
        ariaLabel="Workbench canvas"
        class="workbench-canvas__infinite"
        viewport={props.viewport}
        onViewportChange={props.onViewportCommit}
        onCanvasContextMenu={props.onCanvasContextMenu}
        disablePanZoom={props.locked}
        overlay={(liveViewport) => (
          <Show when={projectedWidgetIds().length > 0}>
            <div class="workbench-canvas__projected-layer">
              <For each={projectedWidgetIds()}>
                {(widgetId) => (
                  <WorkbenchProjectedWidgetSlot
                    widgetId={widgetId}
                    widgetDefinitions={props.widgetDefinitions}
                    canvasFrameSize={props.canvasFrameSize}
                    widgetById={widgetById}
                    renderLayers={renderLayers}
                    selectedWidgetId={props.selectedWidgetId}
                    optimisticFrontWidgetId={props.optimisticFrontWidgetId}
                    locked={props.locked}
                    filters={props.filters}
                    setCanvasFrameRef={props.setCanvasFrameRef}
                    onViewportCommit={props.onViewportCommit}
                    onCanvasContextMenu={props.onCanvasContextMenu}
                    onSelectWidget={props.onSelectWidget}
                    onWidgetContextMenu={props.onWidgetContextMenu}
                    onStartOptimisticFront={props.onStartOptimisticFront}
                    onCommitFront={props.onCommitFront}
                    onCommitMove={props.onCommitMove}
                    onCommitResize={props.onCommitResize}
                    onRequestDelete={props.onRequestDelete}
                    projectedViewport={liveViewport}
                    surfaceReady={projectedSurfaceReady()}
                  />
                )}
              </For>
            </div>
          </Show>
        )}
      >
        <WorkbenchCanvasField
          widgetDefinitions={props.widgetDefinitions}
          widgets={canvasWidgets()}
          selectedWidgetId={props.selectedWidgetId}
          optimisticFrontWidgetId={props.optimisticFrontWidgetId}
          viewportScale={props.viewport.scale}
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
      </InfiniteCanvas>
    </div>
  );
}
