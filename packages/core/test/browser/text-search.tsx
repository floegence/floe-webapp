import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { createTextSearch } from '../../src/components/ui/textSearch';
import { TextSearchBar } from '../../src/components/ui/TextSearchBar';
import { RetainedPanel } from '../../src/components/ui/RetainedPanel';
import '../../src/styles/globals.css';

render(() => {
  const [active, setActive] = createSignal(true);
  const [identity, setIdentity] = createSignal(0);
  const [content, setContent] = createSignal<HTMLDivElement>();
  const search = createTextSearch({ content, active, identity });
  return <>
    <button id="switch" onClick={() => setActive(!active())}>Switch document</button>
    <button id="replace" onClick={() => setIdentity(value => value + 1)}>Replace source</button>
    <div style={{ position: 'relative', height: '400px', width: 'min(800px, 100vw)', overflow: 'hidden' }}>
      <RetainedPanel active={active()}>
        <section tabIndex={-1} onKeyDown={search.onKeyDown} style={{ display: 'flex', 'flex-direction': 'column', height: '100%' }}>
          <button id="find" onClick={event => search.show(event.currentTarget)}>Find in file</button>
          <TextSearchBar search={search} labels={{ find: 'Find in file', previous: 'Previous match', next: 'Next match', close: 'Close search', noMatches: 'No matches', matches: (current, total) => `${current} of ${total}` }} />
          <div ref={setContent} tabIndex={0} style={{ overflow: 'auto', flex: '1', 'min-height': '0' }}>
            <p id="first">Hello <strong>World</strong> and hello world.</p>
            <p>Literal [a.b] / 中文 / café</p>
            <button>Hello world excluded</button>
            <p hidden>Hello world hidden</p>
            <p>Hello</p><p>world</p>
            <div style={{ height: '700px' }} />
            <p id="last">hello world</p>
          </div>
        </section>
      </RetainedPanel>
      <RetainedPanel active={!active()}><h1>Other document</h1></RetainedPanel>
    </div>
  </>;
}, document.getElementById('root')!);
