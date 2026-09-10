import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { Dialog } from '../../src/components/ui/Dialog';
import { DialogPlacementProvider } from '../../src/components/ui/DialogPlacementContext';
import { Dropdown } from '../../src/components/ui/Dropdown';
import '../../src/styles/globals.css';

function Fixture() {
  const [open, setOpen] = createSignal(false);
  const [present, setPresent] = createSignal(false);
  const [confirm, setConfirm] = createSignal(false);
  const [local, setLocal] = createSignal(false);
  const [count, setCount] = createSignal(0);
  const [filter, setFilter] = createSignal('all');
  return (
    <>
      <main inert={present()} class="relative h-screen bg-background p-10" data-background>
        <div class="relative h-96" data-floe-surface-portal-layer="true">
          <div
            style={{
              transform: 'translate(100px, 80px) scale(0.65)',
              width: '600px',
              height: '360px',
            }}
            data-floe-dialog-surface-host="true"
            class="relative border p-6"
          >
            <button onClick={() => setOpen(true)}>Manage plugins</button>
            <button onClick={() => setLocal(true)}>Local settings</button>
            <Dialog open={local()} onOpenChange={setLocal} title="Local settings">
              <button onClick={() => setCount(count() + 1)}>Local action</button>
            </Dialog>
          </div>
        </div>
        <button class="fixed left-2 top-2" onClick={() => setCount(count() + 1)}>
          Background action
        </button>
        <output data-count>{count()}</output>
      </main>
      <DialogPlacementProvider mode="global" globalZIndex={4000}>
        <Dialog
          open={open()}
          onOpenChange={setOpen}
          onPresenceChange={setPresent}
          title="Plugin Center"
          header={null}
          presentation="bottom-drawer"
          contentClass="p-0 overflow-hidden"
          class="h-[min(820px,82dvh)] w-[min(1400px,calc(100vw-48px))] max-w-none"
        >
          <section class="flex h-full min-h-0 flex-col">
            <header class="flex shrink-0 items-center gap-4 border-b p-4">
              <h1>Plugin Center</h1>
              <input aria-label="Search plugins" class="rounded border p-2" />
              <Dropdown
                trigger={<span>Source filter</span>}
                value={filter()}
                items={[
                  { id: 'all', label: 'All sources' },
                  { id: 'official', label: 'Official sources' },
                ]}
                onSelect={setFilter}
              />
              <button onClick={() => setConfirm(true)}>Review install</button>
              <button onClick={() => setOpen(false)}>Close manager</button>
            </header>
            <div data-scroll class="min-h-0 flex-1 overflow-auto p-4">
              <output data-filter>{filter()}</output>
              <div style={{ height: '1600px' }}>Plugin directory</div>
            </div>
          </section>
          <Dialog open={confirm()} onOpenChange={setConfirm} title="Confirm installation">
            <input aria-label="Confirmation note" />
            <button onClick={() => setConfirm(false)}>Cancel installation</button>
          </Dialog>
        </Dialog>
      </DialogPlacementProvider>
    </>
  );
}
render(Fixture, document.getElementById('root')!);
