import { lazy, Suspense } from 'solid-js';
import { KeepAliveStack } from '@floegence/floe-webapp-core/layout';
import { Tabs, Tag } from '@floegence/floe-webapp-core/ui';
import { ShowcaseFrame } from '../components/docs';

const Overview = lazy(() =>
  import('../scenarios/OverviewScenario').then((m) => ({ default: m.OverviewScenario }))
);
const Files = lazy(() =>
  import('../scenarios/FileScenario').then((m) => ({ default: m.FileScenario }))
);
const Task = lazy(() =>
  import('../scenarios/TaskScenario').then((m) => ({ default: m.TaskScenario }))
);
const Compositions = lazy(() =>
  import('../scenarios/CompositionExamples').then((m) => ({ default: m.CompositionExamples }))
);

export function ScenariosPage(props: {
  activeScenario: string;
  onSelectScenario: (id: string) => void;
}) {
  const active = () => props.activeScenario;
  const select = (id: string) => props.onSelectScenario(id);
  const views = [
    {
      id: 'compositions',
      render: () => (
        <Suspense fallback={<p role="status">Loading compositions…</p>}>
          <Compositions />
        </Suspense>
      ),
    },
    {
      id: 'overview',
      render: () => (
        <Suspense fallback={<p role="status">Loading overview…</p>}>
          <Overview />
        </Suspense>
      ),
    },
    {
      id: 'files',
      render: () => (
        <Suspense fallback={<p role="status">Loading files…</p>}>
          <Files />
        </Suspense>
      ),
    },
    {
      id: 'task',
      render: () => (
        <Suspense fallback={<p role="status">Loading task…</p>}>
          <Task />
        </Suspense>
      ),
    },
  ];
  return (
    <ShowcaseFrame class="space-y-5">
      <header class="space-y-2">
        <div class="flex flex-wrap items-center gap-3">
          <h1 class="text-xl font-semibold tracking-[var(--floe-tracking-tight)]">
            Try a complete workflow
          </h1>
          <Tag size="sm" tone="soft">
            Local examples
          </Tag>
        </div>
        <p class="max-w-2xl text-sm text-[var(--floe-ink-soft)]">
          Explore data, keep an editing session, or follow a task through success and recovery.
          Every control uses the public Floe components.
        </p>
      </header>
      <Tabs
        activeId={active()}
        onChange={select}
        items={[
          {
            id: 'overview',
            label: 'Overview',
            domId: 'scenario-tab-overview',
            panelId: 'scenario-panel-overview',
          },
          {
            id: 'files',
            label: 'Files',
            domId: 'scenario-tab-files',
            panelId: 'scenario-panel-files',
          },
          {
            id: 'task',
            label: 'Tasks',
            domId: 'scenario-tab-task',
            panelId: 'scenario-panel-task',
          },
          {
            id: 'compositions',
            label: 'Examples',
            domId: 'scenario-tab-compositions',
            panelId: 'scenario-panel-compositions',
          },
        ]}
      />
      <KeepAliveStack
        class="h-auto"
        views={views.map((view) => ({
          ...view,
          class: 'relative inset-auto',
          render: () => (
            <div
              id={'scenario-panel-' + view.id}
              role="tabpanel"
              aria-labelledby={'scenario-tab-' + view.id}
            >
              {view.render()}
            </div>
          ),
        }))}
        activeId={active()}
      />
    </ShowcaseFrame>
  );
}
