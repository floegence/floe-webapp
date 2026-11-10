import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { SegmentedControl } from '../../src/ui';
import { Clock, Folder } from '../../src/components/icons';
import '../../src/styles/globals.css';
render(() => {
  const [value, setValue] = createSignal('time');
  const [wide, setWide] = createSignal(false);
  const [translated, setTranslated] = createSignal(false);
  Object.assign(window, { segmented: { setValue, setWide, setTranslated } });
  return (
    <main style={{ padding: '24px', transform: 'scale(.9)', 'transform-origin': 'top left' }}>
      <style>{`
        .segmented-fixture { container: segmented-fixture / inline-size; width: 540px; }
        @container segmented-fixture (max-width: 260px) {
          .segmented-fixture .inline-flex:has(> svg) > .floe-segmented-control__label { display: none; }
        }
        @media (pointer: coarse) {
          .segmented-fixture button { min-width: 44px; min-height: 44px; }
          @container segmented-fixture (max-width: 360px) {
            .segmented-fixture .inline-flex:has(> svg) > .floe-segmented-control__label { display: none; }
          }
        }
      `}</style>
      <div class="segmented-fixture">
        <SegmentedControl
          role="radiogroup"
          aria-label="View"
          value={value()}
          onChange={setValue}
          style={{ width: wide() ? '360px' : undefined }}
          options={[
            { value: 'time', label: translated() ? 'Creation time' : 'Time', icon: Clock },
            {
              value: 'directory',
              label: translated() ? 'Working directory' : 'Directory',
              icon: Folder,
            },
            { value: 'disabled', label: 'Disabled', disabled: true },
          ]}
        />
      </div>
    </main>
  );
}, document.getElementById('root')!);
