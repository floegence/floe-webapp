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

export type WorkbenchCanvasOwnerReason = 'initial' | 'background_pointer' | 'background_focus' | (string & {});
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

export interface WorkbenchWidgetBodyProps<TWidgetType extends string = WorkbenchWidgetType> {
  widgetId: string;
  title: string;
  type: TWidgetType;
  surfaceMetrics?: Accessor<WorkbenchWidgetSurfaceMetrics | undefined>;
  activation?: WorkbenchWidgetBodyActivation;
  lifecycle?: WorkbenchWidgetLifecycle;
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
  filters: Record<TWidgetType, boolean>;
  selectedWidgetId: string | null;
  theme: WorkbenchThemeId;
}

export interface WorkbenchContextMenuState {
  clientX: number;
  clientY: number;
  worldX: number;
  worldY: number;
  widgetId?: string | null;
}

export const DEFAULT_WORKBENCH_VIEWPORT: WorkbenchViewport = { x: 80, y: 60, scale: 1 };
