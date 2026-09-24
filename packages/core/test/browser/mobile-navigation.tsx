import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { FloeProvider } from '../../src/app';
import { AppViewport, Shell } from '../../src/layout';
import { Dialog } from '../../src/ui';
import '../../src/styles/globals.css';

function Example() {
  const [open, setOpen] = createSignal(false);
  const [modal, setModal] = createSignal(false);
  const [trigger, setTrigger] = createSignal<HTMLButtonElement | null>(null);
  const [query, setQuery] = createSignal('');
  const Icon = () => <span>●</span>;
  return <FloeProvider><AppViewport><Shell fillParent topBarMobileMode="hidden" hideMobileNavigationWhenKeyboardOpen
    sidebarMode="hidden" activityItems={Array.from({ length: 10 }, (_, index) => ({
      id: `page-${index}`, label: `Page ${index}`, icon: Icon, onClick: () => setOpen(false),
    }))}
    mobileNavigationActions={[{ id: 'more', label: 'More', icon: Icon, buttonRef: setTrigger,
      ariaExpanded: open, ariaControls: 'mobile-tools', ariaHasPopup: 'dialog', onClick: () => setOpen(!open()) }]}
    mobileNavigationPanel={{ id: 'mobile-tools', open: open(), title: 'More', trigger: trigger(), onOpenChange: setOpen,
      children: <div class="p-3"><input aria-label="Search tools" value={query()} onInput={event => setQuery(event.currentTarget.value)} style={{ 'font-size': '16px' }} />
        <button onClick={() => setModal(true)}>Confirm action</button>
        <div style={{ height: '900px' }}>Scrollable tools</div><button>Last action</button></div> }}>
    <div style={{ height: '1800px' }}><textarea aria-label="Retained draft" /><button>Page action</button></div>
  </Shell></AppViewport><Dialog open={modal()} onOpenChange={setModal} title="Confirmation"><button>Confirm</button></Dialog></FloeProvider>;
}
render(() => <Example />, document.getElementById('root')!);
