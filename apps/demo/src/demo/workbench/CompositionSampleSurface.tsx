import { onMount, untrack } from 'solid-js';
import {
  WorkbenchSurface,
  createWorkbenchFilterState,
  sanitizeWorkbenchState,
  type WorkbenchState,
} from '@floegence/floe-webapp-core/workbench';
import {
  REDEVEN_PARITY_LAUNCHER_WIDGET_TYPES,
  REDEVEN_PARITY_WORKBENCH_WIDGETS,
  useWorkbenchDemo,
} from './WorkbenchDemoContext';
import { createCompositionSample } from './parity/compositionSamples';
import { createWorkbenchOverview, type WorkbenchExampleSample } from './workbenchOverview';

/** Each example keeps its own edits and viewport when switching pages or modes. */
export function CompositionSampleSurface(props: { sample: WorkbenchExampleSample }) {
  // The keyed parent remounts this surface when the sample changes.
  const sample = untrack(() => props.sample);
  const { state: stored, setState: setStored } = useWorkbenchDemo().examples[sample];
  const firstVisit = stored() === null;
  const createSeed = () => ({
    ...(sample === 'overview' ? createWorkbenchOverview() : createCompositionSample(sample)),
    mode: 'work' as const,
    filters: createWorkbenchFilterState(REDEVEN_PARITY_WORKBENCH_WIDGETS),
  });
  setStored(
    sanitizeWorkbenchState(stored(), {
      widgetDefinitions: REDEVEN_PARITY_WORKBENCH_WIDGETS,
      createFallbackState: createSeed,
    })
  );
  const state = () => stored()!;
  const setState = (updater: (previous: WorkbenchState) => WorkbenchState) =>
    setStored(updater(state()));
  let container!: HTMLDivElement;

  onMount(() => {
    // Frame only a new example. Editing, resizing, and returning never move the canvas.
    if (!firstVisit) return;
    const { width, height } = container.getBoundingClientRect();
    const objects = [
      ...state().widgets,
      ...state().backgroundLayers!,
      ...state().stickyNotes!,
      ...state().annotations!,
    ];
    const left = Math.min(...objects.map((item) => item.x));
    const top = Math.min(...objects.map((item) => item.y)) - 40;
    const right = Math.max(...objects.map((item) => item.x + item.width));
    const bottom = Math.max(...objects.map((item) => item.y + item.height));
    const scale = Math.max(
      0.2,
      Math.min(1, (width - 64) / (right - left), (height - 160) / (bottom - top))
    );
    setState((previous) => ({
      ...previous,
      viewport: {
        x: (width - (right - left) * scale) / 2 - left * scale,
        y: (height - 80 - (bottom - top) * scale) / 2 - top * scale,
        scale,
      },
    }));
  });

  return (
    <div ref={container} class="workbench-demo-scene">
      <WorkbenchSurface
        state={state}
        setState={setState}
        widgetDefinitions={REDEVEN_PARITY_WORKBENCH_WIDGETS}
        launcherWidgetTypes={REDEVEN_PARITY_LAUNCHER_WIDGET_TYPES}
      />
    </div>
  );
}
