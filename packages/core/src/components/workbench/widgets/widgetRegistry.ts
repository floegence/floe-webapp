import type { Component } from 'solid-js';
import { Terminal, Folder, Cpu, FileCode, Activity } from '../../../icons';
import type {
  WorkbenchWidgetDefinition,
  WorkbenchWidgetType,
} from '../types';
import { TerminalWidget } from './TerminalWidget';
import { FileBrowserWidget } from './FileBrowserWidget';
import { SystemMonitorWidget } from './SystemMonitorWidget';
import { LogViewerWidget } from './LogViewerWidget';
import { CodeEditorWidget } from './CodeEditorWidget';

export interface WidgetRegistryEntry extends WorkbenchWidgetDefinition {
  label: string;
  icon: Component<{ class?: string }>;
  defaultTitle: string;
}

export const WIDGET_REGISTRY: readonly WidgetRegistryEntry[] = [
  {
    type: 'terminal',
    label: 'Terminal',
    icon: Terminal,
    body: TerminalWidget,
    defaultTitle: 'Terminal',
    defaultSize: { width: 480, height: 320 },
  },
  {
    type: 'file-browser',
    label: 'File Browser',
    icon: Folder,
    body: FileBrowserWidget,
    defaultTitle: 'File Browser',
    defaultSize: { width: 360, height: 400 },
  },
  {
    type: 'system-monitor',
    label: 'System Monitor',
    icon: Cpu,
    body: SystemMonitorWidget,
    defaultTitle: 'System Monitor',
    defaultSize: { width: 340, height: 280 },
  },
  {
    type: 'log-viewer',
    label: 'Log Viewer',
    icon: Activity,
    body: LogViewerWidget,
    defaultTitle: 'Log Viewer',
    defaultSize: { width: 500, height: 300 },
  },
  {
    type: 'code-editor',
    label: 'Code Editor',
    icon: FileCode,
    body: CodeEditorWidget,
    defaultTitle: 'Code Editor',
    defaultSize: { width: 520, height: 380 },
  },
];

export function resolveWorkbenchWidgetDefinitions(
  widgetDefinitions?: readonly WorkbenchWidgetDefinition[]
): readonly WorkbenchWidgetDefinition[] {
  return widgetDefinitions && widgetDefinitions.length > 0 ? widgetDefinitions : WIDGET_REGISTRY;
}

export function createWorkbenchFilterState(
  widgetDefinitions?: readonly WorkbenchWidgetDefinition[],
  filters?: Partial<Record<WorkbenchWidgetType, boolean>>
): Record<WorkbenchWidgetType, boolean> {
  const resolved = resolveWorkbenchWidgetDefinitions(widgetDefinitions);
  const next = {} as Record<WorkbenchWidgetType, boolean>;

  for (const entry of resolved) {
    next[entry.type] = typeof filters?.[entry.type] === 'boolean' ? Boolean(filters[entry.type]) : true;
  }

  return next;
}

export function isValidWorkbenchWidgetType(
  type: unknown,
  widgetDefinitions?: readonly WorkbenchWidgetDefinition[]
): type is WorkbenchWidgetType {
  return (
    typeof type === 'string'
    && resolveWorkbenchWidgetDefinitions(widgetDefinitions).some((entry) => entry.type === type)
  );
}

export function getWidgetEntry(
  type: WorkbenchWidgetType,
  widgetDefinitions?: readonly WorkbenchWidgetDefinition[]
): WorkbenchWidgetDefinition {
  const resolved = resolveWorkbenchWidgetDefinitions(widgetDefinitions);
  return resolved.find((entry) => entry.type === type) ?? resolved[0]!;
}
