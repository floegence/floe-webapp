import { createSignal, onCleanup } from 'solid-js';
import { render } from 'solid-js/web';
import { SplitWorkspace } from '../../src/components/layout/SplitWorkspace';
import { presetSplitWorkspace, splitWorkspaceItems, type SplitWorkspaceLayout, type SplitWorkspacePreset } from '../../src/components/layout/splitWorkspaceModel';
import '../../src/styles/globals.css';
let seq = 0;
const ids = ['a', 'b', 'c', 'd'];
const [layout, setLayout] = createSignal<SplitWorkspaceLayout | null>(presetSplitWorkspace('grid', ids, () => 'split-' + ++seq));
const [active, setActive] = createSignal<string | null>('a');
const [compact, setCompact] = createSignal(false);
const [maximized, setMaximized] = createSignal<string | null>(null);
let mounts = 0, cleanups = 0, commits = 0;
Object.assign(window, { workspace: {
  preset: (preset: SplitWorkspacePreset) => setLayout(presetSplitWorkspace(preset, ids, () => 'split-' + ++seq)),
  compact: setCompact, maximize: setMaximized,
  state: () => ({ layout: layout(), ids: splitWorkspaceItems(layout()), active: active(), mounts, cleanups, commits }),
} });
render(() => <div style={{height: '90vh', padding: '8px'}}><SplitWorkspace itemIds={ids} layout={layout()} activeId={active()} compact={compact()} maximizedId={maximized()} showHeaders
  resizeLabel="Resize panes" onActivate={setActive} onLayoutChange={next => { commits++; setLayout(next); }} renderHeader={id => <span>{id}</span>}
  renderItem={id => { mounts++; onCleanup(() => cleanups++); return <textarea aria-label={id} style={{width: '100%', height: '100%'}} />; }} /></div>, document.getElementById('root')!);
