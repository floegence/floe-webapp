import {
  createDefaultWorkbenchState,
  type WorkbenchState,
  type WorkbenchTextAnnotationItem,
} from '@floegence/floe-webapp-core/workbench';

export type WorkbenchExampleSample = 'overview' | 'composition' | 'regions';

/** A working studio: quiet regions organize real windows and editable notes. */
export function createWorkbenchOverview(): WorkbenchState {
  const geometry = (id: string, x: number, y: number, width: number, height: number) => ({
    id,
    x,
    y,
    width,
    height,
    z_index: 1,
    created_at_unix_ms: 1,
    updated_at_unix_ms: 1,
  });
  const text = (
    id: string,
    content: string,
    x: number,
    y: number,
    width: number,
    height: number,
    size: number,
    weight = 400
  ): WorkbenchTextAnnotationItem => ({
    ...geometry(id, x, y, width, height),
    kind: 'text',
    text: content,
    font_family: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    font_size: size,
    font_weight: weight,
    color: '#6b7280',
    align: 'left',
  });
  return {
    ...createDefaultWorkbenchState(),
    mode: 'work',
    selectedObject: null,
    selectedWidgetId: null,
    viewport: { x: 0, y: 0, scale: 1 },
    backgroundLayers: [
      {
        ...geometry('ideas-region', 80, 312, 420, 672),
        name: 'Release checklist',
        fill: '#9da8a1',
        material: 'solid',
        opacity: 1,
      },
      {
        ...geometry('build-region', 532, 312, 724, 672),
        name: 'Project files',
        fill: '#999999',
        material: 'solid',
        opacity: 1,
      },
      {
        ...geometry('runtime-region', 1288, 312, 520, 672),
        name: 'Runtime',
        fill: '#a79d8e',
        material: 'dotted',
        opacity: 1,
      },
    ],
    annotations: [
      text('overview-title', 'Floe Studio · Release workspace', 80, 96, 1728, 78, 36, 560),
      text(
        'overview-subtitle',
        'Review the checklist, inspect project files, and check the local runtime.',
        84,
        196,
        1700,
        42,
        18
      ),
      text('ideas-heading', 'Release checklist', 110, 348, 360, 45, 24, 560),
      text('ideas-description', 'Keep the next action beside the work.', 110, 410, 360, 74, 18),
      text('build-heading', 'Project files', 560, 348, 668, 45, 24, 560),
      text(
        'build-description',
        'Inspect the files in this example workspace.',
        560,
        410,
        668,
        32,
        18
      ),
      text('runtime-heading', 'Runtime', 1316, 348, 464, 45, 24, 560),
      text(
        'runtime-description',
        'Local example output and health signals.',
        1316,
        398,
        464,
        32,
        18
      ),
    ],
    stickyNotes: [
      {
        ...geometry('overview-idea', 110, 514, 360, 188),
        kind: 'sticky_note',
        title: 'Before the release',
        body: 'Review file changes. Check runtime output. Verify keyboard navigation.',
        color: 'amber',
        material: 'tab',
      },
      {
        ...geometry('overview-next', 110, 730, 360, 224),
        kind: 'sticky_note',
        title: 'Acceptance notes',
        body: 'Record what you tested. Your layout and notes stay in this browser.',
        color: 'graphite',
        material: 'ruled',
      },
    ],
    widgets: [
      {
        ...geometry('overview-files', 560, 466, 668, 488),
        type: 'redeven.files',
        title: 'Project files',
      },
      {
        ...geometry('overview-terminal', 1316, 456, 464, 200),
        type: 'redeven.terminal',
        title: 'Development terminal',
      },
      {
        ...geometry('overview-monitor', 1316, 682, 464, 272),
        type: 'redeven.monitor',
        title: 'Runtime health',
      },
    ],
  };
}
