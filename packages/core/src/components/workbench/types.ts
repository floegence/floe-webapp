export type WorkbenchWidgetType =
  | 'terminal'
  | 'file-browser'
  | 'system-monitor'
  | 'log-viewer'
  | 'code-editor';

export const WORKBENCH_WIDGET_TYPES: readonly WorkbenchWidgetType[] = [
  'terminal',
  'file-browser',
  'system-monitor',
  'log-viewer',
  'code-editor',
];

export interface WorkbenchWidgetItem {
  id: string;
  type: WorkbenchWidgetType;
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

export interface WorkbenchState {
  version: 1;
  widgets: WorkbenchWidgetItem[];
  viewport: WorkbenchViewport;
  locked: boolean;
  filters: Record<WorkbenchWidgetType, boolean>;
  selectedWidgetId: string | null;
}

export interface WorkbenchContextMenuState {
  clientX: number;
  clientY: number;
  worldX: number;
  worldY: number;
  widgetId?: string | null;
}

export const DEFAULT_WIDGET_DIMENSIONS: Readonly<
  Record<WorkbenchWidgetType, { width: number; height: number }>
> = {
  'terminal': { width: 480, height: 320 },
  'file-browser': { width: 360, height: 400 },
  'system-monitor': { width: 340, height: 280 },
  'log-viewer': { width: 500, height: 300 },
  'code-editor': { width: 520, height: 380 },
};

export const DEFAULT_WORKBENCH_VIEWPORT: WorkbenchViewport = { x: 80, y: 60, scale: 1 };

export const DEFAULT_FILTERS: Record<WorkbenchWidgetType, boolean> = {
  'terminal': true,
  'file-browser': true,
  'system-monitor': true,
  'log-viewer': true,
  'code-editor': true,
};
