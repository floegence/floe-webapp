import type { Component } from 'solid-js';
import { Terminal, Folder, Cpu, FileCode, Activity } from '../../../icons';
import type { WorkbenchWidgetType } from '../types';
import { TerminalWidget } from './TerminalWidget';
import { FileBrowserWidget } from './FileBrowserWidget';
import { SystemMonitorWidget } from './SystemMonitorWidget';
import { LogViewerWidget } from './LogViewerWidget';
import { CodeEditorWidget } from './CodeEditorWidget';

export interface WidgetRegistryEntry {
  type: WorkbenchWidgetType;
  label: string;
  icon: Component<{ class?: string }>;
  body: Component;
  defaultTitle: string;
}

export const WIDGET_REGISTRY: readonly WidgetRegistryEntry[] = [
  {
    type: 'terminal',
    label: 'Terminal',
    icon: Terminal,
    body: TerminalWidget,
    defaultTitle: 'Terminal',
  },
  {
    type: 'file-browser',
    label: 'File Browser',
    icon: Folder,
    body: FileBrowserWidget,
    defaultTitle: 'File Browser',
  },
  {
    type: 'system-monitor',
    label: 'System Monitor',
    icon: Cpu,
    body: SystemMonitorWidget,
    defaultTitle: 'System Monitor',
  },
  {
    type: 'log-viewer',
    label: 'Log Viewer',
    icon: Activity,
    body: LogViewerWidget,
    defaultTitle: 'Log Viewer',
  },
  {
    type: 'code-editor',
    label: 'Code Editor',
    icon: FileCode,
    body: CodeEditorWidget,
    defaultTitle: 'Code Editor',
  },
];

export function getWidgetEntry(type: WorkbenchWidgetType): WidgetRegistryEntry {
  return WIDGET_REGISTRY.find((entry) => entry.type === type) ?? WIDGET_REGISTRY[0]!;
}
