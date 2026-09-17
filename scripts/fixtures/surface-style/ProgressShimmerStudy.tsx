import { createSignal, onMount } from 'solid-js';
import { Button } from '@floegence/floe-webapp-core/ui';

export function ProgressShimmerStudy() {
  const [active, setActive] = createSignal(true);
  const [label, setLabel] = createSignal('Waiting for model response…');
  const [open, setOpen] = createSignal(false);
  onMount(() => Object.assign(window, { progressFixture: { setActive, setLabel } }));
  return (
    <main
      data-progress-study
      style={{
        padding: '40px',
        background: 'var(--background)',
        color: 'var(--foreground)',
        'font-family': 'system-ui',
        'max-width': '760px',
      }}
    >
      <h1>Progress feedback</h1>
      <section
        style={{
          padding: '24px',
          background: 'var(--card)',
          'border-radius': '8px',
          display: 'grid',
          gap: '28px',
        }}
      >
        <Button
          data-progress-case="surface"
          data-floe-progress-shimmer={active() ? 'surface' : undefined}
          onClick={() => setOpen(!open())}
          aria-expanded={open()}
        >
          Updating environment…
        </Button>
        <div data-progress-details hidden={!open()}>
          Operation details remain available.
        </div>
        <span
          data-progress-case="status"
          data-floe-progress-shimmer={active() ? 'text' : undefined}
          style={{ 'font-size': '12px', 'font-weight': '600', width: 'fit-content' }}
        >
          {label()}
        </span>
        <button
          data-progress-case="tool"
          onClick={() => setOpen(!open())}
          style={{
            color: 'var(--foreground)',
            'text-align': 'left',
            padding: '8px',
            border: '0',
            'border-radius': '6px',
            background: 'var(--muted)',
            cursor: 'pointer',
            width: '520px',
          }}
        >
          <span
            data-progress-case="title"
            data-floe-progress-shimmer={active() ? 'text' : undefined}
            style={{
              display: 'block',
              overflow: 'hidden',
              'white-space': 'nowrap',
              'text-overflow': 'ellipsis',
              'font-family': 'monospace',
              'font-size': '14px',
            }}
          >
            <strong>Web fetch </strong>
            <span>https://example.com/very/long/path?query=weather-and-forecast</span>
          </span>
        </button>
        <span
          data-progress-case="localized"
          data-floe-progress-shimmer={active() ? 'text' : undefined}
          style={{ 'font-size': '12px', width: 'fit-content' }}
        >
          正在等待模型响应，处理中的状态持续可见…
        </span>
        <span
          data-progress-case="legacy"
          class="processing-text-shimmer"
          style={{ 'font-size': '12px', width: 'fit-content' }}
        >
          Existing processing indicator
        </span>
      </section>
    </main>
  );
}
