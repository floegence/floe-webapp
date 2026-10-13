import '../../src/styles/globals.css';
import { For, createMemo, createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { Tabs, TabPanel } from '../../src/components/ui/Tabs';

function Group(props: { prefix: string }) {
  const [active, setActive] = createSignal('one');
  const items = createMemo(() => ['one', 'two', 'three'].map(id => ({ id, label: id, domId: `${props.prefix}-${id}-tab`, panelId: `${props.prefix}-${id}-panel`, disabled: id === 'two' })));
  return <section data-group={props.prefix}>
    <Tabs ariaLabel={`${props.prefix} workspace`} items={items()} activeId={active()} onChange={setActive} />
    <For each={items()}>{item => <TabPanel id={item.panelId} labelledBy={item.domId} active={active() === item.id} keepMounted inert={active() !== item.id}>{item.label} content</TabPanel>}</For>
  </section>;
}
render(() => <><Group prefix="first" /><Group prefix="second" /></>, document.getElementById('root')!);
