import type { Component } from 'solid-js';

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

export interface WorkbenchWidgetBodyProps<TWidgetType extends string = WorkbenchWidgetType> {
  widgetId: string;
  title: string;
  type: TWidgetType;
  surfaceMetrics?: WorkbenchWidgetSurfaceMetrics;
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
}

export interface WorkbenchContextMenuState {
  clientX: number;
  clientY: number;
  worldX: number;
  worldY: number;
  widgetId?: string | null;
}

export const DEFAULT_WORKBENCH_VIEWPORT: WorkbenchViewport = { x: 80, y: 60, scale: 1 };
