import { createSignal, Show } from 'solid-js';
import { render } from 'solid-js/web';
import { Select, Combobox, MultiSelect, FloatingWindow } from '../../src/ui';
import '../../src/styles/globals.css';
const [kind, setKind] = createSignal('Select');
const [open, setOpen] = createSignal(false);
const [top, setTop] = createSignal(200);
const [nested, setNested] = createSignal(false);
const [windowOpen, setWindowOpen] = createSignal(true);
const options = Array.from({ length: 5 }, (_, i) => ({
  value: String(i),
  label: `Environment ${i}`,
}));
Object.assign(window, { selectMotion: { setKind, setOpen, setTop, setNested, setWindowOpen } });
const selection = () => (
  <>
    {kind() === 'Select' ? (
      <Select ariaLabel="Nested choice" value="0" options={options} />
    ) : kind() === 'Combobox' ? (
      <Combobox ariaLabel="Nested choice" value="0" options={options} />
    ) : (
      <MultiSelect ariaLabel="Nested choice" value={['0']} options={options} />
    )}
  </>
);
render(
  () => (
    <main>
      <button id="outside">Outside</button>
      <Show
        when={nested()}
        fallback={
          <div style={{ position: 'fixed', left: '24px', top: `${top()}px`, width: '280px' }}>
            <Show when={kind() === 'Select'}>
              <Select
                ariaLabel="Choice"
                value="0"
                options={options}
                open={open()}
                onOpenChange={setOpen}
              />
            </Show>
            <Show when={kind() === 'Combobox'}>
              <Combobox
                ariaLabel="Choice"
                value="0"
                options={options}
                open={open()}
                onOpenChange={setOpen}
              />
            </Show>
            <Show when={kind() === 'MultiSelect'}>
              <MultiSelect
                ariaLabel="Choice"
                value={['0']}
                options={options}
                open={open()}
                onOpenChange={setOpen}
              />
            </Show>
          </div>
        }
      >
        <FloatingWindow open={windowOpen()} onOpenChange={setWindowOpen} title="Nested choice">
          {selection()}
        </FloatingWindow>
      </Show>
    </main>
  ),
  document.getElementById('root')!
);
