import { Show, type Component } from 'solid-js';
import { WorkbenchSurface } from '@floegence/floe-webapp-core/workbench';
import { CompositionSampleSurface } from './CompositionSampleSurface';
import type { WorkbenchExampleSample } from './workbenchOverview';
import {
  DEMO_WORKBENCH_TEXT_DEFAULTS,
  REDEVEN_PARITY_LAUNCHER_WIDGET_TYPES,
  REDEVEN_PARITY_WORKBENCH_WIDGETS,
  useWorkbenchDemo,
} from './WorkbenchDemoContext';

/**
 * Workbench display-mode page.
 *
 * Mounted directly inside DisplayModePageShell — there is no modal frame and
 * no portal: this is a permanent display surface, not a transient overlay.
 */
export const WorkbenchPage: Component = () => {
  const demo = useWorkbenchDemo();
  const sample = new URLSearchParams(window.location.search).get('sample') ?? 'overview';
  const activeExample = (): WorkbenchExampleSample =>
    sample === 'regions' ? 'regions' : sample === 'composition' ? 'composition' : 'overview';
  return (
    <div class="workbench-demo-page">
      <Show
        when={sample !== 'workspace'}
        fallback={
          <div class="workbench-demo-scene">
            <WorkbenchSurface
              state={demo.state}
              setState={demo.setState}
              widgetDefinitions={REDEVEN_PARITY_WORKBENCH_WIDGETS}
              launcherWidgetTypes={REDEVEN_PARITY_LAUNCHER_WIDGET_TYPES}
              textAnnotationDefaults={DEMO_WORKBENCH_TEXT_DEFAULTS}
            />
          </div>
        }
      >
        <Show when={activeExample()} keyed>
          {(selected) => <CompositionSampleSurface sample={selected} />}
        </Show>
      </Show>
    </div>
  );
};
