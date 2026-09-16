import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import {
  WorkbenchSurface,
  createDefaultWorkbenchState,
  type WorkbenchState,
  type WorkbenchSurfaceApi,
  type WorkbenchWidgetDefinition,
} from '../../src/components/workbench';
import { builtInShellThemePresets } from '../../src/styles/themes';
import '../../src/styles/globals.css';
import '../../src/components/workbench/workbench.css';

const [state, setState] = createSignal<WorkbenchState>({
  ...createDefaultWorkbenchState(),
  mode: 'background',
  viewport: { x: 0, y: 0, scale: 1 },
  widgets: [
    {
      id: 'panel',
      type: 'test.panel',
      title: 'Workspace',
      x: 850,
      y: 180,
      width: 340,
      height: 280,
      z_index: 1,
      created_at_unix_ms: 1,
    },
  ],
  stickyNotes: [
    {
      id: 'note',
      kind: 'sticky_note',
      body: 'Click here to edit.\nDrag text to select words.',
      color: 'sage',
      material: 'tint',
      x: 120,
      y: 220,
      width: 290,
      height: 210,
      z_index: 2,
      created_at_unix_ms: 1,
      updated_at_unix_ms: 1,
    },
  ],
  backgroundLayers: [
    {
      id: 'region',
      name: 'Project area',
      fill: '#8fa1aa',
      material: 'solid',
      opacity: 0.8,
      x: 80,
      y: 140,
      width: 650,
      height: 390,
      z_index: 1,
      created_at_unix_ms: 1,
      updated_at_unix_ms: 1,
    },
  ],
  annotations: [
    {
      id: 'text',
      kind: 'text',
      text: 'A quieter canvas',
      font_family: 'ui-serif, Georgia, serif',
      font_size: 30,
      font_weight: 600,
      color: '#6b7280',
      align: 'left',
      x: 480,
      y: 230,
      width: 290,
      height: 100,
      z_index: 3,
      created_at_unix_ms: 1,
      updated_at_unix_ms: 1,
    },
  ],
  selectedObject: { kind: 'sticky_note', id: 'note' },
  selectedWidgetId: null,
});
const widgetDefinitions: readonly WorkbenchWidgetDefinition[] = [
  {
    renderMode:
      new URLSearchParams(window.location.search).get('projected') === '1'
        ? 'projected_surface'
        : 'canvas_scaled',
    type: 'test.panel',
    label: 'Workspace',
    icon: () => null,
    body: () => (
      <div style={{ padding: '20px' }}>
        A separate work surface
        <input aria-label="Widget input" />
      </div>
    ),
    defaultTitle: 'Workspace',
    defaultSize: { width: 340, height: 280 },
  },
];
let api: WorkbenchSurfaceApi | null = null;
Object.assign(window, {
  workbenchFixture: { state, setState, themes: builtInShellThemePresets, api: () => api },
});
render(
  () => (
    <div style={{ width: '100vw', height: '100vh' }}>
      <WorkbenchSurface
        widgetDefinitions={widgetDefinitions}
        state={state}
        setState={setState}
        onApiReady={(value) => (api = value)}
      />
    </div>
  ),
  document.getElementById('root')!
);
