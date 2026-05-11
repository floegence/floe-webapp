import { For, createMemo, createSignal } from 'solid-js';
import {
  resolveWorkbenchInteractionAdapter,
  type ResolvedWorkbenchInteractionAdapter,
} from './workbenchInteractionAdapter';
import {
  WORKBENCH_STICKY_FILTER_ID,
  WORKBENCH_TEXT_FILTER_ID,
  WORKBENCH_BACKGROUND_REGION_FILTER_ID,
  type WorkbenchWidgetItem,
  type WorkbenchAnnotationItem,
  type WorkbenchBackgroundLayer,
  type WorkbenchInteractionAdapter,
  type WorkbenchSelection,
  type WorkbenchStickyNoteItem,
  type WorkbenchTextAnnotationPatch,
  type WorkbenchViewport,
  type WorkbenchWidgetDefinition,
} from './types';
import { createWorkbenchRenderLayerMap } from './workbenchHelpers';
import { getWidgetEntry } from './widgets/widgetRegistry';
import { WorkbenchWidget } from './WorkbenchWidget';
import {
  WorkbenchAnnotationLayerView,
  WorkbenchBackgroundLayerView,
  WorkbenchLayerControlOverlayView,
  WorkbenchStickyNote,
  createWorkbenchTextEditorRegistry,
  type WorkbenchLayerGeometryPreview,
} from './WorkbenchLayerObjects';

export interface WorkbenchCanvasFieldProps {
  widgetDefinitions: readonly WorkbenchWidgetDefinition[];
  widgets: readonly WorkbenchWidgetItem[];
  stickyNotes?: readonly WorkbenchStickyNoteItem[];
  annotations?: readonly WorkbenchAnnotationItem[];
  backgroundLayers?: readonly WorkbenchBackgroundLayer[];
  viewport: WorkbenchViewport;
  selectedObject?: WorkbenchSelection | null;
  selectedWidgetId: string | null;
  optimisticFrontWidgetId: string | null;
  workLayerLocked?: boolean;
  annotationLayerEditable?: boolean;
  backgroundLayerEditable?: boolean;
  viewportScale: number;
  locked: boolean;
  filters: Record<string, boolean>;
  interactionAdapter?: WorkbenchInteractionAdapter | ResolvedWorkbenchInteractionAdapter;
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
  onViewportCommit: (viewport: WorkbenchViewport) => void;
  onViewportInteractionStart?: (kind: 'pan') => void;
  onRequestOverview: (item: WorkbenchWidgetItem) => void;
  onRequestFit: (item: WorkbenchWidgetItem) => void;
  onRequestDelete: (widgetId: string) => void;
  onLayoutInteractionStart?: () => void;
  onLayoutInteractionEnd?: () => void;
}

interface WorkbenchCanvasWidgetSlotProps extends WorkbenchCanvasFieldProps {
  widgetId: string;
  widgetById: () => Map<string, WorkbenchWidgetItem>;
  renderLayers: () => ReturnType<typeof createWorkbenchRenderLayerMap>;
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
      renderLayer={props.renderLayers().byWidgetId.get(props.widgetId) ?? 1}
      itemSnapshot={item}
      selected={props.selectedWidgetId === props.widgetId}
      optimisticFront={props.optimisticFrontWidgetId === props.widgetId}
      topRenderLayer={props.renderLayers().topRenderLayer}
      viewportScale={props.viewportScale}
      locked={props.locked}
      filtered={!props.workLayerLocked && props.filters[item().type] === false}
      interactionAdapter={props.interactionAdapter}
      viewport={props.viewport}
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

interface WorkbenchCanvasStickyNoteSlotProps {
  noteId: string;
  stickyNoteById: () => Map<string, WorkbenchStickyNoteItem>;
  renderLayers: () => ReturnType<typeof createWorkbenchRenderLayerMap>;
  selectedObject?: WorkbenchSelection | null;
  optimisticFrontWidgetId: string | null;
  viewportScale: number;
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
}

function WorkbenchCanvasStickyNoteSlot(props: WorkbenchCanvasStickyNoteSlotProps) {
  const item = createMemo<WorkbenchStickyNoteItem>((previous) => {
    const current = props.stickyNoteById().get(props.noteId);
    if (current) return current;
    if (previous) return previous;
    throw new Error(`Workbench sticky note ${props.noteId} is missing from the render map.`);
  });

  return (
    <WorkbenchStickyNote
      item={item()}
      selected={props.selectedObject?.kind === 'sticky_note' && props.selectedObject.id === props.noteId}
      viewportScale={props.viewportScale}
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

export function WorkbenchCanvasField(props: WorkbenchCanvasFieldProps) {
  const interactionAdapter = createMemo(() =>
    resolveWorkbenchInteractionAdapter(props.interactionAdapter)
  );
  const widgetIds = createMemo(() => props.widgets.map((item) => item.id));
  const widgetById = createMemo(
    () => new Map(props.widgets.map((item) => [item.id, item] as const))
  );
  const stickyNoteIds = createMemo(() => (props.stickyNotes ?? []).map((item) => item.id));
  const stickyNoteById = createMemo(
    () => new Map((props.stickyNotes ?? []).map((item) => [item.id, item] as const))
  );
  const textEditorRegistry = createWorkbenchTextEditorRegistry();
  const renderLayers = createMemo(() =>
    createWorkbenchRenderLayerMap([...props.widgets, ...(props.stickyNotes ?? [])])
  );
  const selectedWidgetId = createMemo(() =>
    props.selectedObject?.kind === 'widget' ? props.selectedObject.id : props.selectedWidgetId
  );
  const workLocked = createMemo(() => props.locked || Boolean(props.workLayerLocked));
  const [layerGeometryPreview, setLayerGeometryPreview] = createSignal<WorkbenchLayerGeometryPreview | null>(null);

  return (
    <div
      class="workbench-canvas__field"
      classList={{ 'is-work-layer-muted': Boolean(props.workLayerLocked) }}
    >
      <div class="workbench-canvas__grid" aria-hidden="true" />
      <WorkbenchBackgroundLayerView
        items={props.backgroundLayers ?? []}
        selectedObject={props.selectedObject ?? null}
        editable={Boolean(props.backgroundLayerEditable) && !props.locked}
        filtered={props.filters[WORKBENCH_BACKGROUND_REGION_FILTER_ID] === false}
        preview={layerGeometryPreview()}
        onPreviewGeometry={setLayerGeometryPreview}
        viewport={props.viewport}
        onSelect={(layerId) => props.onSelectBackgroundLayer?.(layerId)}
        onContextMenu={(event, item) => props.onBackgroundLayerContextMenu?.(event, item)}
        onCommitMove={(layerId, position) => props.onCommitBackgroundMove?.(layerId, position)}
      />
      <WorkbenchAnnotationLayerView
        items={props.annotations ?? []}
        selectedObject={props.selectedObject ?? null}
        editable={Boolean(props.annotationLayerEditable) && !props.locked}
        filtered={props.filters[WORKBENCH_TEXT_FILTER_ID] === false}
        preview={layerGeometryPreview()}
        onPreviewGeometry={setLayerGeometryPreview}
        textEditorRegistry={textEditorRegistry}
        viewport={props.viewport}
        onSelect={(annotationId) => props.onSelectAnnotation?.(annotationId)}
        onContextMenu={(event, item) => props.onAnnotationContextMenu?.(event, item)}
        onCommitMove={(annotationId, position) => props.onCommitAnnotationMove?.(annotationId, position)}
        onUpdate={(annotationId, patch) => props.onUpdateTextAnnotation?.(annotationId, patch)}
      />
      <div class="workbench-work-layer">
        {/* Keep widget subtree ownership keyed by widget.id so z-index or geometry updates do not remount business widgets. */}
        <For each={widgetIds()}>
          {(widgetId) => (
            <WorkbenchCanvasWidgetSlot
              widgetId={widgetId}
              widgetDefinitions={props.widgetDefinitions}
              widgets={props.widgets}
              widgetById={widgetById}
              renderLayers={renderLayers}
              viewport={props.viewport}
              selectedWidgetId={selectedWidgetId()}
              optimisticFrontWidgetId={props.optimisticFrontWidgetId}
              viewportScale={props.viewportScale}
              locked={workLocked()}
              filters={props.filters}
              interactionAdapter={interactionAdapter()}
              onSelectWidget={props.onSelectWidget}
              onWidgetContextMenu={props.onWidgetContextMenu}
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
          )}
        </For>
        <For each={stickyNoteIds()}>
          {(noteId) => (
            <WorkbenchCanvasStickyNoteSlot
              noteId={noteId}
              stickyNoteById={stickyNoteById}
              selectedObject={props.selectedObject}
              optimisticFrontWidgetId={props.optimisticFrontWidgetId}
              viewportScale={props.viewportScale}
              locked={workLocked()}
              filtered={!props.workLayerLocked && props.filters[WORKBENCH_STICKY_FILTER_ID] === false}
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
              renderLayers={renderLayers}
            />
          )}
        </For>
      </div>
      <WorkbenchLayerControlOverlayView
        annotations={props.annotations ?? []}
        backgroundLayers={props.backgroundLayers ?? []}
        selectedObject={props.selectedObject ?? null}
        editable={(Boolean(props.annotationLayerEditable) || Boolean(props.backgroundLayerEditable)) && !props.locked}
        viewport={props.viewport}
        preview={layerGeometryPreview()}
        onPreviewGeometry={setLayerGeometryPreview}
        textEditorRegistry={textEditorRegistry}
        onCommitAnnotationMove={(annotationId, position) => props.onCommitAnnotationMove?.(annotationId, position)}
        onCommitAnnotationResize={(annotationId, size) => props.onCommitAnnotationResize?.(annotationId, size)}
        onUpdateTextAnnotation={(annotationId, patch) => props.onUpdateTextAnnotation?.(annotationId, patch)}
        onDeleteAnnotation={(annotationId) => props.onDeleteAnnotation?.(annotationId)}
        onCommitBackgroundResize={(layerId, size) => props.onCommitBackgroundResize?.(layerId, size)}
        onUpdateBackgroundLayer={(layerId, patch) => props.onUpdateBackgroundLayer?.(layerId, patch)}
        onDeleteBackgroundLayer={(layerId) => props.onDeleteBackgroundLayer?.(layerId)}
      />
    </div>
  );
}
