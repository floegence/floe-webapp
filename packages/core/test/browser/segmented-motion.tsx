import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { SegmentedControl } from '../../src/ui';
import '../../src/styles/globals.css';
render(() => {
  const [value, setValue] = createSignal('time');
  const [wide, setWide] = createSignal(false);
  const [translated, setTranslated] = createSignal(false);
  Object.assign(window, { segmented: { setValue, setWide, setTranslated } });
  return (
    <main style={{ padding: '24px', transform: 'scale(.9)', 'transform-origin': 'top left' }}>
      <SegmentedControl
        role="radiogroup"
        aria-label="View"
        value={value()}
        onChange={setValue}
        style={{ width: wide() ? '360px' : undefined }}
        options={[
          { value: 'time', label: translated() ? 'Creation time' : 'Time' },
          { value: 'directory', label: translated() ? 'Working directory' : 'Directory' },
          { value: 'disabled', label: 'Disabled', disabled: true },
        ]}
      />
    </main>
  );
}, document.getElementById('root')!);
