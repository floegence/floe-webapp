import { For, Show, createMemo, type Accessor } from 'solid-js';
import {
  InfiniteCanvas,
  type InfiniteCanvasContextMenuEvent,
  type InfiniteCanvasPoint,
} from '../../ui';
import {
  resolveWorkbenchInteractionAdapter,
  type ResolvedWorkbenchInteractionAdapter,
} from './workbenchInteractionAdapter';
import {
  WORKBENCH_STICKY_FILTER_ID,
  type WorkbenchAnnotationItem,
  type WorkbenchBackgroundLayer,
  type WorkbenchInteractionMode,
  type WorkbenchInteractionAdapter,
  type WorkbenchSelection,
  type WorkbenchStickyNoteItem,
  type WorkbenchTextAnnotationPatch,
  type WorkbenchViewport,
  type WorkbenchWidgetDefinition,
  type WorkbenchWidgetItem,
} from './types';
import { WorkbenchCanvasField } from './WorkbenchCanvasField';
import { WorkbenchStickyNote } from './WorkbenchLayerObjects';
import { WorkbenchWidget } from './WorkbenchWidget';
import {
  WORKBENCH_MIN_SCALE,
  createWorkbenchRenderLayerMap,
  resolveWorkbenchWidgetRenderMode,
} from './workbenchHelpers';
import { getWidgetEntry } from './widgets/widgetRegistry';

export interface WorkbenchCanvasProps {
  widgetDefinitions: readonly WorkbenchWidgetDefinition[];
  widgets: readonly WorkbenchWidgetItem[];
  stickyNotes?: readonly WorkbenchStickyNoteItem[];
  annotations?: readonly WorkbenchAnnotationItem[];
  backgroundLayers?: readonly WorkbenchBackgroundLayer[];
  viewport: WorkbenchViewport;
  canvasFrameSize: { width: number; height: number };
  selectedWidgetId: string | null;
  selectedObject?: WorkbenchSelection | null;
  mode?: WorkbenchInteractionMode;
  optimisticFrontWidgetId: string | null;
  locked: boolean;
  filters: Record<string, boolean>;
  interactionAdapter?: WorkbenchInteractionAdapter | ResolvedWorkbenchInteractionAdapter;
  setCanvasFrameRef: (el: HTMLDivElement | undefined) => void;
  onViewportCommit: (viewport: WorkbenchViewport) => void;
  onViewportInteractionStart?: (kind: 'wheel' | 'pan') => void;
  onCanvasContextMenu: (event: InfiniteCanvasContextMenuEvent) => void;
  onCanvasPointerDown?: (event: PointerEvent) => void;
  onSelectWidget: (widgetId: string) => void;
  onWidgetContextMenu: (event: MouseEvent, item: WorkbenchWidgetItem) => void;
  onStartOptimisticFront: (widgetId: string) => void;
  onCommitFront: (widgetId: string) => void;
  onCommitMove: (widgetId: string, position: { x: number; y: number }) => void;
  onCommitResize: (widgetId: string, size: { width: number; height: number }) => void;
  onSelectStickyNote?: (noteId: string) => void;
  onStickyNoteContextMenu?: (event: MouseEvent, item: WorkbenchStickyNoteItem) => void;
  onStartStickyOptimisticFront?: (noteId: string) => void;
  onCommitStickyFront?: (noteId: string) => void;
  onCommitStickyMove?: (noteId: string, position: { x: number; y: number }) => void;
  onCommitStickyResize?: (noteId: string, size: { width: number; height: number }) => void;
  onUpdateStickyNote?: (noteId: string, patch: Partial<Pick<WorkbenchStickyNoteItem, 'body' | 'color'>>) => void;
  onDeleteStickyNote?: (noteId: string) => void;
  onSelectAnnotation?: (annotationId: string) => void;
  onAnnotationContextMenu?: (event: MouseEvent, item: WorkbenchAnnotationItem) => void;
  onCommitAnnotationMove?: (annotationId: string, position: { x: number; y: number }) => void;
  onCommitAnnotationResize?: (annotationId: string, size: { width: number; height: number }) => void;
  onUpdateTextAnnotation?: (
    annotationId: string,
    patch: WorkbenchTextAnnotationPatch,
  ) => void;
  onDeleteAnnotation?: (annotationId: string) => void;
  onSelectBackgroundLayer?: (layerId: string) => void;
  onBackgroundLayerContextMenu?: (event: MouseEvent, item: WorkbenchBackgroundLayer) => void;
  onCommitBackgroundMove?: (layerId: string, position: { x: number; y: number }) => void;
  onCommitBackgroundResize?: (layerId: string, size: { width: number; height: number }) => void;
  onUpdateBackgroundLayer?: (
    layerId: string,
    patch: Partial<Pick<WorkbenchBackgroundLayer, 'fill' | 'opacity' | 'material' | 'name'>>,
  ) => void;
  onDeleteBackgroundLayer?: (layerId: string) => void;
  onRequestOverview: (item: WorkbenchWidgetItem) => void;
  onRequestFit: (item: WorkbenchWidgetItem) => void;
  onRequestDelete: (widgetId: string) => void;
  onLayoutInteractionStart?: () => void;
  onLayoutInteractionEnd?: () => void;
}

interface WorkbenchProjectedWidgetSlotProps extends Omit<
  WorkbenchCanvasProps,
  'viewport' | 'widgets'
> {
  widgetId: string;
  widgetById: () => Map<string, WorkbenchWidgetItem>;
  renderLayers: () => ReturnType<typeof createWorkbenchRenderLayerMap>;
  projectedViewport: Accessor<InfiniteCanvasPoint>;
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
      viewportScale={props.projectedViewport().scale}
      locked={props.locked}
      filtered={props.mode !== 'background' && props.filters[item().type] === false}
      interactionAdapter={props.interactionAdapter}
      layoutMode="projected_surface"
      viewport={props.projectedViewport()}
      projectedViewport={props.projectedViewport}
      surfaceReady={props.surfaceReady}
      onSelect={props.onSelectWidget}
      onContextMenu={props.onWidgetContextMenu}
      onStartOptimisticFront={props.onStartOptimisticFront}
      onCommitFront={props.onCommitFront}
      onCommitMove={props.onCommitMove}
      onCommitResize={props.onCommitResize}
      onViewportCommit={props.onViewportCommit}
      onViewportInteractionStart={props.onViewportInteractionStart}
      onRequestOverview={props.onRequestOverview}
      onRequestFit={props.onRequestFit}
      onRequestDelete={props.onRequestDelete}
      onLayoutInteractionStart={props.onLayoutInteractionStart}
      onLayoutInteractionEnd={props.onLayoutInteractionEnd}
    />
  );
}

interface WorkbenchProjectedStickyNoteSlotProps {
  noteId: string;
  stickyNoteById: () => Map<string, WorkbenchStickyNoteItem>;
  selectedObject?: WorkbenchSelection | null;
  renderLayers: () => ReturnType<typeof createWorkbenchRenderLayerMap>;
  projectedViewport: Accessor<InfiniteCanvasPoint>;
  optimisticFrontWidgetId: string | null;
  locked: boolean;
  filtered: boolean;
  onSelectStickyNote?: (noteId: string) => void;
  onStickyNoteContextMenu?: (event: MouseEvent, item: WorkbenchStickyNoteItem) => void;
  onStartStickyOptimisticFront?: (noteId: string) => void;
  onCommitStickyFront?: (noteId: string) => void;
  onCommitStickyMove?: (noteId: string, position: { x: number; y: number }) => void;
  onCommitStickyResize?: (noteId: string, size: { width: number; height: number }) => void;
  onUpdateStickyNote?: (noteId: string, patch: Partial<Pick<WorkbenchStickyNoteItem, 'body' | 'color'>>) => void;
  onDeleteStickyNote?: (noteId: string) => void;
  onLayoutInteractionStart?: () => void;
  onLayoutInteractionEnd?: () => void;
  surfaceReady?: boolean;
}

function WorkbenchProjectedStickyNoteSlot(props: WorkbenchProjectedStickyNoteSlotProps) {
  const item = createMemo<WorkbenchStickyNoteItem>((previous) => {
    const current = props.stickyNoteById().get(props.noteId);
    if (current) return current;
    if (previous) return previous;
    throw new Error(`Workbench sticky note ${props.noteId} is missing from the projected render map.`);
  });

  return (
    <WorkbenchStickyNote
      item={item()}
      selected={props.selectedObject?.kind === 'sticky_note' && props.selectedObject.id === props.noteId}
      viewportScale={props.projectedViewport().scale}
      projectedViewport={props.projectedViewport}
      surfaceReady={props.surfaceReady}
      renderLayer={props.renderLayers().byWidgetId.get(props.noteId) ?? props.renderLayers().topRenderLayer}
      topRenderLayer={props.renderLayers().topRenderLayer}
      locked={props.locked}
      filtered={props.filtered}
      optimisticFront={props.optimisticFrontWidgetId === props.noteId}
      onSelect={(noteId) => props.onSelectStickyNote?.(noteId)}
      onContextMenu={(event, note) => props.onStickyNoteContextMenu?.(event, note)}
      onStartOptimisticFront={(noteId) => props.onStartStickyOptimisticFront?.(noteId)}
      onCommitFront={(noteId) => props.onCommitStickyFront?.(noteId)}
      onCommitMove={(noteId, position) => props.onCommitStickyMove?.(noteId, position)}
      onCommitResize={(noteId, size) => props.onCommitStickyResize?.(noteId, size)}
      onUpdate={(noteId, patch) => props.onUpdateStickyNote?.(noteId, patch)}
      onDelete={(noteId) => props.onDeleteStickyNote?.(noteId)}
      onLayoutInteractionStart={props.onLayoutInteractionStart}
      onLayoutInteractionEnd={props.onLayoutInteractionEnd}
    />
  );
}

export function WorkbenchCanvas(props: WorkbenchCanvasProps) {
  const interactionAdapter = createMemo(() =>
    resolveWorkbenchInteractionAdapter(props.interactionAdapter)
  );
  const widgetById = createMemo(
    () => new Map(props.widgets.map((item) => [item.id, item] as const))
  );
  const stickyNoteIds = createMemo(() => (props.stickyNotes ?? []).map((item) => item.id));
  const stickyNoteById = createMemo(
    () => new Map((props.stickyNotes ?? []).map((item) => [item.id, item] as const))
  );
  const renderLayers = createMemo(() =>
    createWorkbenchRenderLayerMap([...props.widgets, ...(props.stickyNotes ?? [])])
  );
  const workLayerLocked = createMemo(() => props.mode === 'background');
  const backgroundLayerEditable = createMemo(() => props.mode === 'background');
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
  const hasProjectedWidgets = createMemo(() => projectedWidgetIds().length > 0);
  const canvasLayerStickyNotes = createMemo(() =>
    hasProjectedWidgets() ? [] : props.stickyNotes ?? []
  );
  const projectedSurfaceReady = () =>
    props.canvasFrameSize.width > 0 && props.canvasFrameSize.height > 0;

  return (
    <div
      class="workbench-canvas"
      classList={{
        'is-locked': props.locked,
        'is-background-mode': workLayerLocked(),
      }}
      ref={props.setCanvasFrameRef}
    >
      <div class="workbench-canvas__atmosphere" aria-hidden="true" />
      <InfiniteCanvas
        ariaLabel="Workbench canvas"
        class="workbench-canvas__infinite"
        viewport={props.viewport}
        minScale={WORKBENCH_MIN_SCALE}
        onViewportChange={props.onViewportCommit}
        onViewportInteractionStart={props.onViewportInteractionStart}
        onCanvasContextMenu={props.onCanvasContextMenu}
        onCanvasPointerDown={props.onCanvasPointerDown}
        resolveTargetRole={(args) => interactionAdapter().resolveSurfaceTargetRole({
          target: args.target,
          interactiveSelector: args.interactiveSelector,
          panSurfaceSelector: args.panSurfaceSelector,
        })}
        resolveWheelRouting={(args) => interactionAdapter().resolveWheelRouting({
          target: args.target,
          disablePanZoom: args.disablePanZoom,
          selectedWidgetId: props.selectedObject?.kind === 'widget' || props.selectedObject?.kind === 'sticky_note'
            ? props.selectedObject.id
            : props.selectedWidgetId,
          wheelInteractiveSelector: args.wheelInteractiveSelector,
        })}
        disablePanZoom={props.locked}
        overlay={(liveViewport) => (
          <Show when={hasProjectedWidgets()}>
            <div
              class="workbench-canvas__projected-layer"
              classList={{ 'is-work-layer-locked': workLayerLocked() }}
            >
              <For each={projectedWidgetIds()}>
                {(widgetId) => (
                  <WorkbenchProjectedWidgetSlot
                    widgetId={widgetId}
                    widgetDefinitions={props.widgetDefinitions}
                    canvasFrameSize={props.canvasFrameSize}
                    widgetById={widgetById}
                    renderLayers={renderLayers}
                    selectedWidgetId={props.selectedObject?.kind === 'widget' ? props.selectedObject.id : props.selectedWidgetId}
                    optimisticFrontWidgetId={props.optimisticFrontWidgetId}
                    locked={props.locked || workLayerLocked()}
                    filters={props.filters}
                    interactionAdapter={interactionAdapter()}
                    setCanvasFrameRef={props.setCanvasFrameRef}
                    onViewportCommit={props.onViewportCommit}
                    onCanvasContextMenu={props.onCanvasContextMenu}
                    onSelectWidget={props.onSelectWidget}
                    onWidgetContextMenu={props.onWidgetContextMenu}
                    onStartOptimisticFront={props.onStartOptimisticFront}
                    onCommitFront={props.onCommitFront}
                    onCommitMove={props.onCommitMove}
                    onCommitResize={props.onCommitResize}
                    onRequestOverview={props.onRequestOverview}
                    onRequestFit={props.onRequestFit}
                    onRequestDelete={props.onRequestDelete}
                    onLayoutInteractionStart={props.onLayoutInteractionStart}
                    onLayoutInteractionEnd={props.onLayoutInteractionEnd}
                    projectedViewport={liveViewport}
                    surfaceReady={projectedSurfaceReady()}
                  />
                )}
              </For>
              <For each={stickyNoteIds()}>
                {(noteId) => (
                  <WorkbenchProjectedStickyNoteSlot
                    noteId={noteId}
                    stickyNoteById={stickyNoteById}
                    selectedObject={props.selectedObject}
                    renderLayers={renderLayers}
                    projectedViewport={liveViewport}
                    optimisticFrontWidgetId={props.optimisticFrontWidgetId}
                    locked={props.locked || workLayerLocked()}
                    filtered={!workLayerLocked() && props.filters[WORKBENCH_STICKY_FILTER_ID] === false}
                    onSelectStickyNote={props.onSelectStickyNote}
                    onStickyNoteContextMenu={props.onStickyNoteContextMenu}
                    onStartStickyOptimisticFront={props.onStartStickyOptimisticFront}
                    onCommitStickyFront={props.onCommitStickyFront}
                    onCommitStickyMove={props.onCommitStickyMove}
                    onCommitStickyResize={props.onCommitStickyResize}
                    onUpdateStickyNote={props.onUpdateStickyNote}
                    onDeleteStickyNote={props.onDeleteStickyNote}
                    onLayoutInteractionStart={props.onLayoutInteractionStart}
                    onLayoutInteractionEnd={props.onLayoutInteractionEnd}
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
          stickyNotes={canvasLayerStickyNotes()}
          annotations={props.annotations ?? []}
          backgroundLayers={props.backgroundLayers ?? []}
          viewport={props.viewport}
          selectedWidgetId={props.selectedWidgetId}
          selectedObject={props.selectedObject}
          optimisticFrontWidgetId={props.optimisticFrontWidgetId}
          workLayerLocked={workLayerLocked()}
          annotationLayerEditable={backgroundLayerEditable()}
          backgroundLayerEditable={backgroundLayerEditable()}
          viewportScale={props.viewport.scale}
          locked={props.locked}
          filters={props.filters}
          interactionAdapter={interactionAdapter()}
          onSelectWidget={props.onSelectWidget}
          onWidgetContextMenu={props.onWidgetContextMenu}
          onStartOptimisticFront={props.onStartOptimisticFront}
          onCommitFront={props.onCommitFront}
          onCommitMove={props.onCommitMove}
          onCommitResize={props.onCommitResize}
          onSelectStickyNote={props.onSelectStickyNote}
          onStickyNoteContextMenu={props.onStickyNoteContextMenu}
          onStartStickyOptimisticFront={props.onStartStickyOptimisticFront}
          onCommitStickyFront={props.onCommitStickyFront}
          onCommitStickyMove={props.onCommitStickyMove}
          onCommitStickyResize={props.onCommitStickyResize}
          onUpdateStickyNote={props.onUpdateStickyNote}
          onDeleteStickyNote={props.onDeleteStickyNote}
          onSelectAnnotation={props.onSelectAnnotation}
          onAnnotationContextMenu={props.onAnnotationContextMenu}
          onCommitAnnotationMove={props.onCommitAnnotationMove}
          onCommitAnnotationResize={props.onCommitAnnotationResize}
          onUpdateTextAnnotation={props.onUpdateTextAnnotation}
          onDeleteAnnotation={props.onDeleteAnnotation}
          onSelectBackgroundLayer={props.onSelectBackgroundLayer}
          onBackgroundLayerContextMenu={props.onBackgroundLayerContextMenu}
          onCommitBackgroundMove={props.onCommitBackgroundMove}
          onCommitBackgroundResize={props.onCommitBackgroundResize}
          onUpdateBackgroundLayer={props.onUpdateBackgroundLayer}
          onDeleteBackgroundLayer={props.onDeleteBackgroundLayer}
          onViewportCommit={props.onViewportCommit}
          onViewportInteractionStart={props.onViewportInteractionStart}
          onRequestOverview={props.onRequestOverview}
          onRequestFit={props.onRequestFit}
          onRequestDelete={props.onRequestDelete}
          onLayoutInteractionStart={props.onLayoutInteractionStart}
          onLayoutInteractionEnd={props.onLayoutInteractionEnd}
        />
      </InfiniteCanvas>
    </div>
  );
}
