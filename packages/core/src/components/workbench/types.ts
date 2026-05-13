import type { Accessor, Component } from 'solid-js';
import type { WorkbenchThemeId } from './workbenchThemes';
import type {
  SurfaceInteractionTargetRole,
  SurfaceWheelLocalReason,
  WorkbenchWidgetEventOwnership,
} from '../ui/localInteractionSurface';

export type BuiltinWorkbenchWidgetType =
  | 'terminal'
  | 'file-browser'
  | 'system-monitor'
  | 'log-viewer'
  | 'code-editor';

export type WorkbenchWidgetType = BuiltinWorkbenchWidgetType | (string & {});

export const WORKBENCH_WIDGET_TYPES: readonly WorkbenchWidgetType[] = [
  'terminal',
  'file-browser',
  'system-monitor',
  'log-viewer',
  'code-editor',
];

export type WorkbenchWidgetRenderMode = 'canvas_scaled' | 'projected_surface';
export type WorkbenchProjectedSurfaceScaleBehavior =
  | 'stable_transform'
  | 'settle_sharp_zoom';

export type WorkbenchCanvasOwnerReason =
  | 'initial'
  | 'background_pointer'
  | 'background_focus'
  | 'selection_cleared'
  | (string & {});
export type WorkbenchWidgetOwnerReason = 'pointer' | 'focus' | 'activation' | (string & {});

export type WorkbenchInputOwner =
  | { kind: 'canvas'; reason: WorkbenchCanvasOwnerReason }
  | { kind: 'widget'; widgetId: string; reason: WorkbenchWidgetOwnerReason };

export type WorkbenchWheelLocalReason =
  | SurfaceWheelLocalReason
  | 'selected_widget'
  | (string & {});

export type WorkbenchWheelRoutingDecision =
  | { kind: 'canvas_zoom' }
  | { kind: 'local_surface'; reason: WorkbenchWheelLocalReason }
  | { kind: 'ignore'; reason: 'pan_zoom_disabled' | (string & {}) };

export interface WorkbenchInteractionAdapter {
  surfaceRootAttr?: string;
  widgetRootAttr?: string;
  widgetIdAttr?: string;
  dialogSurfaceHostAttr?: string;
  interactiveSelector?: string;
  panSurfaceSelector?: string;
  wheelInteractiveSelector?: string;
  createInitialInputOwner?: () => WorkbenchInputOwner;
  createCanvasInputOwner?: (reason: WorkbenchCanvasOwnerReason) => WorkbenchInputOwner;
  createWidgetInputOwner?: (
    widgetId: string,
    reason: WorkbenchWidgetOwnerReason,
  ) => WorkbenchInputOwner;
  findWidgetRoot?: (target: EventTarget | null) => HTMLElement | null;
  readWidgetId?: (element: Element | null) => string | null;
  focusWidgetElement?: (root: ParentNode | null | undefined, widgetId: string) => boolean;
  resolveSurfaceTargetRole?: (args: {
    target: EventTarget | null;
    interactiveSelector: string;
    panSurfaceSelector: string;
  }) => SurfaceInteractionTargetRole;
  resolveWidgetEventOwnership?: (args: {
    target: EventTarget | null;
    widgetRoot: Element | EventTarget | null;
    interactiveSelector: string;
    panSurfaceSelector: string;
  }) => WorkbenchWidgetEventOwnership;
  resolveWheelRouting?: (args: {
    target: EventTarget | null;
    disablePanZoom: boolean;
    selectedWidgetId: string | null;
    wheelInteractiveSelector: string;
  }) => WorkbenchWheelRoutingDecision;
  shouldBypassGlobalHotkeys?: (args: {
    root: HTMLElement | null | undefined;
    target: EventTarget | null;
    owner: WorkbenchInputOwner;
    interactiveSelector: string;
  }) => boolean;
}

export interface WorkbenchProjectedRect {
  widgetId: string;
  worldX: number;
  worldY: number;
  worldWidth: number;
  worldHeight: number;
  screenX: number;
  screenY: number;
  screenWidth: number;
  screenHeight: number;
  viewportScale: number;
}

export interface WorkbenchWidgetSurfaceMetrics {
  ready: boolean;
  rect: WorkbenchProjectedRect;
}

export type WorkbenchWidgetBodyActivationSource = 'local_pointer';

export interface WorkbenchWidgetBodyActivation {
  seq: number;
  source: WorkbenchWidgetBodyActivationSource;
  pointerType?: string;
}

export type WorkbenchWidgetLifecycle = 'hot' | 'warm' | 'cold';

export type WorkbenchWidgetMotionPhase = 'enter';

export interface WorkbenchWidgetMotionIntent {
  widgetId: string;
  phase: WorkbenchWidgetMotionPhase;
  reason?: string;
}

export interface WorkbenchWidgetBodyProps<TWidgetType extends string = WorkbenchWidgetType> {
  widgetId: string;
  title: string;
  type: TWidgetType;
  surfaceMetrics?: Accessor<WorkbenchWidgetSurfaceMetrics | undefined>;
  activation?: WorkbenchWidgetBodyActivation;
  lifecycle?: WorkbenchWidgetLifecycle;
  motion?: WorkbenchWidgetMotionIntent | null;
  selected?: boolean;
  filtered?: boolean;
  requestActivate?: () => void;
}

export interface WorkbenchWidgetDefinition<TWidgetType extends string = WorkbenchWidgetType> {
  type: TWidgetType;
  label: string;
  icon: Component<{ class?: string }>;
  body: Component<WorkbenchWidgetBodyProps<TWidgetType>>;
  defaultTitle: string;
  defaultSize: {
    width: number;
    height: number;
  };
  group?: string;
  singleton?: boolean;
  renderMode?: WorkbenchWidgetRenderMode;
  projectedSurfaceScaleBehavior?: WorkbenchProjectedSurfaceScaleBehavior;
}

export interface WorkbenchWidgetItem<TWidgetType extends string = WorkbenchWidgetType> {
  id: string;
  type: TWidgetType;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z_index: number;
  created_at_unix_ms: number;
}

export type WorkbenchInteractionMode = 'work' | 'annotation' | 'background';

export const WORKBENCH_STICKY_FILTER_ID = 'sticky-note';
export const WORKBENCH_TEXT_FILTER_ID = 'text';
export const WORKBENCH_BACKGROUND_REGION_FILTER_ID = 'background-region';

export const WORKBENCH_LAYER_COMPONENT_FILTER_IDS = [
  WORKBENCH_STICKY_FILTER_ID,
  WORKBENCH_TEXT_FILTER_ID,
  WORKBENCH_BACKGROUND_REGION_FILTER_ID,
] as const;

export type WorkbenchLayerComponentFilterId =
  typeof WORKBENCH_LAYER_COMPONENT_FILTER_IDS[number];

export type WorkbenchDockToolId =
  | 'select'
  | 'text'
  | 'sticky-note'
  | 'background-region'
  | (string & {});

export type WorkbenchSelection =
  | { kind: 'widget'; id: string }
  | { kind: 'sticky_note'; id: string }
  | { kind: 'annotation'; id: string }
  | { kind: 'background_layer'; id: string };

export type WorkbenchStickyNoteColor =
  | 'graphite'
  | 'sage'
  | 'amber'
  | 'azure'
  | 'coral'
  | 'rose';

export interface WorkbenchStickyNoteItem {
  id: string;
  kind: 'sticky_note';
  body: string;
  color: WorkbenchStickyNoteColor;
  x: number;
  y: number;
  width: number;
  height: number;
  z_index: number;
  created_at_unix_ms: number;
  updated_at_unix_ms: number;
}

export type WorkbenchStickyNotePatch = Partial<Pick<
  WorkbenchStickyNoteItem,
  'body' | 'color'
>>;

export type WorkbenchTextAnnotationAlign = 'left' | 'center' | 'right';

export interface WorkbenchTextAnnotationItem {
  id: string;
  kind: 'text';
  text: string;
  font_family: string;
  font_size: number;
  font_weight: number;
  color: string;
  align: WorkbenchTextAnnotationAlign;
  x: number;
  y: number;
  width: number;
  height: number;
  z_index: number;
  created_at_unix_ms: number;
  updated_at_unix_ms: number;
}

export type WorkbenchTextAnnotationPatch = Partial<Pick<
  WorkbenchTextAnnotationItem,
  'text' | 'font_family' | 'font_size' | 'font_weight' | 'color' | 'align'
>>;

export type WorkbenchTextAnnotationDefaults = Partial<Pick<
  WorkbenchTextAnnotationItem,
  'font_family' | 'font_size' | 'font_weight' | 'color' | 'align' | 'width' | 'height'
>>;

export type WorkbenchAnnotationItem = WorkbenchTextAnnotationItem;

export type WorkbenchBackgroundMaterial =
  | 'solid'
  | 'dotted'
  | 'grid'
  | 'hatched'
  | 'glass';

export interface WorkbenchBackgroundLayer {
  id: string;
  name: string;
  fill: string;
  opacity: number;
  material: WorkbenchBackgroundMaterial;
  x: number;
  y: number;
  width: number;
  height: number;
  z_index: number;
  created_at_unix_ms: number;
  updated_at_unix_ms: number;
}

export type WorkbenchBackgroundLayerPatch = Partial<Pick<
  WorkbenchBackgroundLayer,
  'fill' | 'opacity' | 'material' | 'name'
>>;

export type WorkbenchBackgroundLayerDefaults = Partial<Pick<
  WorkbenchBackgroundLayer,
  'fill' | 'opacity' | 'material' | 'name' | 'width' | 'height'
>>;

export interface WorkbenchViewport {
  x: number;
  y: number;
  scale: number;
}

export interface WorkbenchState<TWidgetType extends string = WorkbenchWidgetType> {
  version: 1;
  widgets: WorkbenchWidgetItem<TWidgetType>[];
  viewport: WorkbenchViewport;
  locked: boolean;
  filters: Record<string, boolean>;
  selectedWidgetId: string | null;
  theme: WorkbenchThemeId;
  mode?: WorkbenchInteractionMode;
  activeTool?: WorkbenchDockToolId;
  selectedObject?: WorkbenchSelection | null;
  stickyNotes?: WorkbenchStickyNoteItem[];
  annotations?: WorkbenchAnnotationItem[];
  backgroundLayers?: WorkbenchBackgroundLayer[];
}

export type WorkbenchContextMenuTarget =
  | { kind: 'canvas'; mode: WorkbenchInteractionMode }
  | { kind: 'widget'; id: string }
  | { kind: 'sticky_note'; id: string }
  | { kind: 'annotation'; id: string }
  | { kind: 'background_layer'; id: string };

export interface WorkbenchContextMenuState {
  clientX: number;
  clientY: number;
  worldX: number;
  worldY: number;
  target?: WorkbenchContextMenuTarget;
  widgetId?: string | null;
}

export const DEFAULT_WORKBENCH_VIEWPORT: WorkbenchViewport = { x: 80, y: 60, scale: 1 };
