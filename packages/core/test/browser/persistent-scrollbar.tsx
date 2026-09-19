import { createSignal } from 'solid-js';
import { PersistentHorizontalScrollbar } from '../../src/components/ui';
import { render } from 'solid-js/web';
import '../../src/styles/globals.css';

function Fixture() {
  const [wide, setWide] = createSignal(true);
  const [scaled, setScaled] = createSignal(false);
  const [viewport, setViewport] = createSignal<HTMLDivElement>();
  return (
    <>
      <button onClick={() => setWide(!wide())}>Toggle content width</button>
      <button onClick={() => setScaled(!scaled())}>Toggle scale</button>
      <div
        style={{
          width: '480px',
          transform: scaled() ? 'scale(0.65)' : undefined,
          'transform-origin': 'top left',
        }}
      >
        <div id="viewport" ref={setViewport} style={{ height: '240px', overflow: 'auto' }}>
          <div style={{ width: wide() ? '1800px' : '100%', height: '900px' }}>
            Long selectable content
          </div>
        </div>
        <PersistentHorizontalScrollbar
          viewport={viewport()}
          aria-label="Scroll content horizontally"
        />
      </div>
    </>
  );
}
render(() => <Fixture />, document.getElementById('root')!);
