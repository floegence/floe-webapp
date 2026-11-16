import { For, createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { FloeProvider } from '@floegence/floe-webapp-core';
import { ActivityBar } from '@floegence/floe-webapp-core/layout';
import { RailFiles, RailTerminal, RailLaunchpad } from '@floegence/floe-webapp-core/icons';
import { WorkbenchDock } from '../../../../../packages/core/src/components/workbench/WorkbenchFilterBar';
import '../../index.css';

function Fixture() {
  const [rail, setRail] = createSignal(['files', 'terminal', 'plugins']);
  const [dock, setDock] = createSignal(['widget:files', 'widget:terminal', 'action:plugins', 'host:weather', 'tool:sticky-note']);
  const [hidden, setHidden] = createSignal<string[]>([]);
  const [active, setActive] = createSignal('files');
  const [created, setCreated] = createSignal(0);
  const [activations, setActivations] = createSignal(0);
  const icons = { files: RailFiles, terminal: RailTerminal, plugins: RailLaunchpad };
  return <div class="flex h-screen bg-background text-foreground">
    <ActivityBar activeId={active()} onActiveChange={setActive} onReorder={setRail}
      items={rail().map(id => ({ id, label: id, icon: icons[id as keyof typeof icons], onContextMenu: () => setRail(current => current.filter(key => key !== id)) }))} />
    <div class="workbench-surface relative flex-1" style={{ height: '100vh' }}>
      <div data-floe-workbench-canvas-frame="true" style={{ position: 'absolute', inset: '0 0 100px' }} />
      <output data-active>{active()}</output><output data-created>{created()}</output><output data-activated>{activations()}</output>
      <WorkbenchDock widgets={[]} filters={{}} onSoloFilter={() => setActivations(value => value + 1)}
        onCreateAt={() => setCreated(value => value + 1)}
        widgetDefinitions={['files', 'terminal'].map(id => ({ type: id, label: id, icon: icons[id as 'files' | 'terminal'], body: () => null, defaultTitle: id, defaultSize: { width: 300, height: 200 } }))}
        dockActions={[{ id: 'plugins', label: 'plugins', icon: RailLaunchpad, onActivate: () => setActivations(value => value + 1) }]}
        dockItems={[{ id: 'weather', label: 'weather', icon: RailLaunchpad, onActivate: () => setActivations(value => value + 1) }]}
        customization={{ order: dock(), onOrderChange: setDock, hidden: hidden(),
          onContextMenu: entry => setHidden(current => [...current, entry.key]),
          overflow: props => <For each={props.entries}>{entry => <button data-restore={entry.key} onClick={() => setHidden(current => current.filter(key => key !== entry.key))}>Restore {entry.label}</button>}</For>,
        }} />
    </div>
  </div>;
}
render(() => <FloeProvider><Fixture /></FloeProvider>, document.getElementById('root')!);
