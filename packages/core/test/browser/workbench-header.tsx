import { createSignal, For, Show } from 'solid-js';
import { render } from 'solid-js/web';
import { WorkbenchWidget } from '../../src/components/workbench/WorkbenchWidget';
import { WorkbenchWidgetHeader } from '../../src/components/workbench/WorkbenchWidgetHeader';
import type { WorkbenchWidgetDefinition } from '../../src/components/workbench/types';
import '../../src/styles/globals.css';
import '../../src/components/workbench/workbench.css';
import '../../src/components/workbench/workbench-themes.css';

const query = new URLSearchParams(location.search);
const projected = query.get('projected') === '1';
const scale = projected ? 0.8 : 1;
const [width, setWidth] = createSignal(640);
const [actions, setActions] = createSignal(true);
const [path, setPath] = createSignal('/workspace/long-preview-filename.md');
const [clicks, setClicks] = createSignal(0);
let dragStarts = 0;
let mounts = 0;
const definition: WorkbenchWidgetDefinition = {
  type: 'test.preview',
  label: 'Preview',
  icon: () => null,
  defaultTitle: 'Preview',
  defaultSize: { width: 640, height: 400 },
  body: () => {
    mounts++;
    return (
      <>
        <Show when={actions()}>
          <WorkbenchWidgetHeader
            titleTooltip={path()}
            actions={
              <div style={{ display: 'flex', gap: '4px' }}>
                <Show
                  when={width() >= 480}
                  fallback={
                    <button class="probe-action" onClick={() => setClicks((c) => c + 1)}>
                      …
                    </button>
                  }
                >
                  <For each={[1, 2, 3, 4, 5]}>
                    {(id) => (
                      <button class="probe-action" onClick={() => setClicks((c) => c + 1)}>
                        {id}
                      </button>
                    )}
                  </For>
                </Show>
              </div>
            }
          />
        </Show>
        <p data-reading>Selected preview text</p>
        <input aria-label="Draft" value="Keep my draft" />
      </>
    );
  },
};
Object.assign(window, {
  headerFixture: {
    setWidth,
    setActions,
    setPath,
    clicks,
    mounts: () => mounts,
    dragStarts: () => dragStarts,
  },
});
render(
  () => (
    <div class="workbench-surface" data-workbench-theme={query.get('theme') || 'mica'}>
      <style>
        {
          'body { margin: 0; } .probe-action { width:28px; height:28px; cursor:pointer; border:1px solid gray; border-radius:4px; }'
        }
      </style>
      <WorkbenchWidget
        definition={definition}
        widgetId="preview"
        widgetTitle="A very long preview filename that must truncate at narrow widths.md"
        widgetType="test.preview"
        x={20}
        y={20}
        width={width()}
        height={400}
        renderLayer={1}
        topRenderLayer={1}
        itemSnapshot={() => ({
          id: 'preview',
          title: 'Preview',
          type: 'test.preview',
          x: 20,
          y: 20,
          width: width(),
          height: 400,
          z_index: 1,
          created_at_unix_ms: 1,
        })}
        selected
        visualFront
        viewportScale={scale}
        locked={false}
        filtered={false}
        layoutMode={projected ? 'projected_surface' : 'canvas_scaled'}
        projectedViewport={() => ({ x: 0, y: 0, scale })}
        onSelect={() => {}}
        onContextMenu={() => {}}
        onClaimVisualFrontOwner={() => {}}
        onCommitFront={() => {}}
        onCommitMove={() => {}}
        onCommitResize={() => {}}
        onRequestOverview={() => {}}
        onRequestFit={() => {}}
        onRequestDelete={() => {}}
        onLayoutInteractionStart={() => dragStarts++}
      />
    </div>
  ),
  document.getElementById('root')!
);
