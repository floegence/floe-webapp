import { For, Show, type Component } from 'solid-js';
import { usePersisted, useTheme } from '@floegence/floe-webapp-core';
import { Tabs } from '@floegence/floe-webapp-core/ui';
import { WorkbenchSurface } from '@floegence/floe-webapp-core/workbench';
import { CompositionSampleSurface } from './CompositionSampleSurface';
import type { CompositionSample } from './parity/compositionSamples';
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
  const theme = useTheme();
  const [sample, setSample] = usePersisted('demo.workbench.sample.v1', 'workspace');
  const requestedSample = new URLSearchParams(window.location.search).get('sample');
  if (
    requestedSample === 'workspace' ||
    requestedSample === 'composition' ||
    requestedSample === 'regions'
  ) {
    setSample(requestedSample);
  }
  const selectSample = (id: string) => {
    setSample(id);
    const url = new URL(window.location.href);
    url.searchParams.set('sample', id);
    window.history.replaceState(null, '', url);
  };
  const compositionSample = (): CompositionSample =>
    sample() === 'regions' ? 'regions' : 'composition';
  const comparisonUrl = () =>
    `/workbench-comparison.html?${new URLSearchParams({
      theme: theme.shellPreset()?.name ?? 'paper',
      sample: compositionSample(),
      object: sample() === 'regions' ? 'blank-region' : 'principle',
      tools: 'style',
      lang: 'en-US',
    })}`;
  return (
    <div class="workbench-demo-page">
      <div class="workbench-demo-examples">
        <Tabs
          ariaLabel="Workbench examples"
          items={[
            { id: 'workspace', label: 'Workspace' },
            { id: 'composition', label: 'Composition' },
            { id: 'regions', label: 'Regions' },
          ]}
          activeId={sample()}
          onChange={selectSample}
          size="sm"
          features={{
            containerBorder: false,
            indicator: { colorToken: 'muted-foreground', animated: false },
          }}
        />
        <div class="workbench-demo-examples__actions">
          <select
            aria-label="Application theme"
            class="workbench-demo-theme"
            value={theme.shellPreset()?.name}
            onChange={(event) => {
              const preset = theme
                .shellPresets()
                .find((item) => item.name === event.currentTarget.value);
              if (preset?.mode === 'light' || preset?.mode === 'dark') {
                theme.selectShellTheme(preset.mode, preset.name);
              }
            }}
          >
            <For each={['light', 'dark'] as const}>
              {(mode) => (
                <optgroup label={mode === 'light' ? 'Light themes' : 'Dark themes'}>
                  <For each={theme.shellPresets().filter((preset) => preset.mode === mode)}>
                    {(preset) => <option value={preset.name}>{preset.displayName}</option>}
                  </For>
                </optgroup>
              )}
            </For>
          </select>
          <a
            class="workbench-demo-comparison"
            href={comparisonUrl()}
            target="_blank"
            rel="noreferrer"
          >
            A/B comparison <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
      <Show
        when={sample() !== 'workspace'}
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
        <Show when={compositionSample()} keyed>
          {(selected) => <CompositionSampleSurface sample={selected} />}
        </Show>
      </Show>
    </div>
  );
};
