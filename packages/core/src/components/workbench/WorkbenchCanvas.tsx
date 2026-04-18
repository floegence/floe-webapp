import { InfiniteCanvas, type InfiniteCanvasContextMenuEvent } from '../../ui';
import type {
  WorkbenchViewport,
  WorkbenchWidgetDefinition,
  WorkbenchWidgetItem,
  WorkbenchWidgetType,
} from './types';
import { WorkbenchCanvasField } from './WorkbenchCanvasField';

export interface WorkbenchCanvasProps {
  widgetDefinitions: readonly WorkbenchWidgetDefinition[];
  widgets: readonly WorkbenchWidgetItem[];
  viewport: WorkbenchViewport;
  selectedWidgetId: string | null;
  optimisticFrontWidgetId: string | null;
  topZIndex: number;
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

export function WorkbenchCanvas(props: WorkbenchCanvasProps) {
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
      >
        <WorkbenchCanvasField
          widgetDefinitions={props.widgetDefinitions}
          widgets={props.widgets}
          selectedWidgetId={props.selectedWidgetId}
          optimisticFrontWidgetId={props.optimisticFrontWidgetId}
          topZIndex={props.topZIndex}
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
