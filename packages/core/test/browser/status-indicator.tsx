import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import {
  FeedbackIndicator,
  type FeedbackIndicatorEntry,
} from '../../src/components/ui/FeedbackIndicator';
import '../../src/styles/globals.css';

function Fixture() {
  const mode = new URLSearchParams(location.search).get('mode');
  const [entries, setEntries] = createSignal<readonly FeedbackIndicatorEntry[]>([]);
  let refresh: HTMLButtonElement | undefined;
  const fail = () =>
    setEntries([
      {
        id: 'inventory',
        severity: 'error',
        summary: 'Refresh failed',
        detail: 'Full diagnostic detail. '.repeat(100),
        actions: (
          <button
            onClick={() => setEntries((items) => items.filter((item) => item.id !== 'inventory'))}
          >
            Retry inventory
          </button>
        ),
      },
      {
        id: 'update',
        severity: 'warning',
        summary: 'Update available',
        detail: 'An independent update',
        actions: <button onClick={() => setEntries([])}>Resolve update</button>,
      },
    ]);
  return (
    <div
      data-floe-surface-portal-layer={mode === 'projected' ? 'true' : undefined}
      style={{ position: 'relative' }}
    >
      <main
        data-boundary
        data-floe-dialog-surface-host={mode ? 'true' : undefined}
        class="p-4"
        style={{
          width: 'min(100%, 600px)',
          position: 'relative',
          transform: mode ? 'scale(0.65)' : undefined,
          'transform-origin': 'top left',
        }}
      >
        <div data-toolbar class="flex items-center gap-2" style={{ height: '32px' }}>
          <h1 class="flex-1">Inventory</h1>
          <FeedbackIndicator
            label="Inventory feedback"
            closeLabel="Close feedback"
            entries={entries()}
            restoreFocus={() => refresh}
          />
          <button ref={refresh} onClick={fail}>
            Refresh
          </button>
        </div>
        <div data-content style={{ height: '300px', 'overflow-y': 'auto' }}>
          <p>Retained records</p>
        </div>
        <input aria-label="Search inventory" style={{ display: 'block', 'margin-top': '140px' }} />
        <button data-outside onClick={() => setEntries([])}>
          Clear all
        </button>
      </main>
      <input
        aria-label="Outside target"
        style={{ position: 'fixed', bottom: '4px', left: '4px' }}
      />
    </div>
  );
}
render(Fixture, document.getElementById('root')!);
