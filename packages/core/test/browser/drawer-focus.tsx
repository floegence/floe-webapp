import { createSignal, For } from 'solid-js';
import { render } from 'solid-js/web';
import { Dialog } from '../../src/components/ui/Dialog';
import { DialogPlacementProvider } from '../../src/components/ui/DialogPlacementContext';
import '../../src/styles/globals.css';

function Fixture() {
  const [open, setOpen] = createSignal(false);
  const [present, setPresent] = createSignal(false);
  const projected = new URLSearchParams(location.search).has('projected');
  return (
    <main class="flex h-full flex-col overflow-hidden bg-background">
      <header class="h-12 shrink-0">Application toolbar</header>
      <div data-page-clip class="relative min-h-0 flex-1 overflow-hidden">
        <div
          data-page-surface
          data-floe-dialog-surface-host="true"
          data-floe-surface-portal-layer="true"
          class="relative h-full"
          style={
            projected
              ? {
                  transform: 'translate(12px, 12px) scale(0.75)',
                  'transform-origin': 'top left',
                  width: '125%',
                  height: '125%',
                }
              : undefined
          }
        >
          <section inert={present()} class="flex h-full flex-col">
            <header data-page-header class="flex h-16 shrink-0 items-center gap-2">
              <button
                data-header-trigger
                class="h-11 px-3"
                onClick={(event) => {
                  event.currentTarget.focus({ preventScroll: true });
                  setOpen(true);
                }}
              >
                Conversations
              </button>
              <h1>Conversation detail</h1>
            </header>
            <div class="min-h-0 flex-1 overflow-auto">Retained detail content</div>
            <textarea aria-label="Message" class="h-20 shrink-0" />
          </section>
          <DialogPlacementProvider mode="auto">
            <Dialog
              open={open()}
              onOpenChange={setOpen}
              onPresenceChange={setPresent}
              title="Conversations"
              header={null}
              presentation="bottom-drawer"
              class="h-[calc(100%-32px)] w-full max-w-none"
              contentClass="flex min-h-0 flex-col overflow-hidden p-0"
            >
              <header class="flex h-16 shrink-0 items-center justify-between px-3">
                <h2>Conversations</h2>
                <button data-floe-autofocus class="h-11 px-3" onClick={() => setOpen(false)}>
                  Close conversations
                </button>
              </header>
              <input aria-label="Search conversations" class="h-11 shrink-0 text-base" />
              <div data-list-scroll class="min-h-0 flex-1 overflow-auto">
                <For each={Array.from({ length: 40 }, (_, index) => index)}>
                  {(index) => <button class="block h-11 w-full">Conversation {index + 1}</button>}
                </For>
              </div>
            </Dialog>
          </DialogPlacementProvider>
        </div>
      </div>
      <button
        data-tab-trigger
        class="h-14 shrink-0"
        onClick={(event) => {
          event.currentTarget.focus({ preventScroll: true });
          setOpen(!open());
        }}
      >
        Toggle conversations
      </button>
    </main>
  );
}

render(() => <Fixture />, document.getElementById('root')!);
