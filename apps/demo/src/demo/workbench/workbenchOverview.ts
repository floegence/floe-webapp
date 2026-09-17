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
        name: 'Ideas & exploration',
        fill: '#9da8a1',
        material: 'solid',
        opacity: 1,
      },
      {
        ...geometry('build-region', 532, 312, 724, 672),
        name: 'Build & refine',
        fill: '#8fa1aa',
        material: 'frame',
        opacity: 1,
      },
      {
        ...geometry('runtime-region', 1288, 312, 520, 672),
        name: 'Run & observe',
        fill: '#a78f86',
        material: 'hatched',
        opacity: 1,
      },
    ],
    annotations: [
      text('overview-title', 'A place for every part of the work.', 80, 96, 1728, 78, 48, 560),
      text(
        'overview-subtitle',
        'Ideas, files, and live signals — together, with room to think.',
        84,
        196,
        1700,
        42,
        18
      ),
      text('ideas-heading', 'Make room for ideas.', 110, 348, 360, 45, 28, 560),
      text(
        'ideas-description',
        'Capture a thought. Keep the next step close.',
        110,
        410,
        360,
        74,
        18
      ),
      text('build-heading', 'From intent to implementation.', 560, 348, 668, 45, 28, 560),
      text('build-description', 'The files behind the next good idea.', 560, 410, 668, 32, 18),
      text('runtime-heading', 'Keep a clear view.', 1316, 348, 464, 45, 28, 560),
      text('runtime-description', 'Run, observe, and keep moving.', 1316, 398, 464, 32, 18),
    ],
    stickyNotes: [
      {
        ...geometry('overview-idea', 110, 514, 360, 188),
        kind: 'sticky_note',
        title: 'Give the work room to breathe.',
        body: 'A calm canvas helps every window, note, and idea find its place.',
        color: 'amber',
        material: 'tab',
      },
      {
        ...geometry('overview-next', 110, 730, 360, 224),
        kind: 'sticky_note',
        title: 'Small steps. Clear direction.',
        body: 'Review the details.\nMake one thoughtful change.\nLeave a note for what comes next.',
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
