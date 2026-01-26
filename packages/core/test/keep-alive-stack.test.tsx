import { describe, expect, it } from 'vitest';
import { renderToString } from 'solid-js/web';
import { KeepAliveStack, type KeepAliveView } from '../src/components/layout/KeepAliveStack';

describe('KeepAliveStack', () => {
  it('should display the stack and render the active view', () => {
    const views: KeepAliveView[] = [
      {
        id: 'a',
        render: () => <div data-testid="view-a">A</div>,
      },
    ];

    const html = renderToString(() => <KeepAliveStack views={views} activeId="a" />);

    expect(html).toContain('data-testid="view-a"');
    expect(html).toMatch(/display:\s*block/);
  });

  it('should not occupy layout when activeId is not in views (even if views are mounted)', () => {
    const views: KeepAliveView[] = [
      {
        id: 'a',
        class: 'test-view-class',
        render: () => <div>Mounted view</div>,
      },
    ];

    // lazyMount=false forces the view to be mounted even when it is not active.
    const html = renderToString(() => <KeepAliveStack views={views} activeId="missing" lazyMount={false} />);

    // The stack container should not take layout space in this case.
    expect(html).toMatch(/display:\s*none/);
    // Views are still mounted and kept in the DOM.
    expect(html).toContain('Mounted view');
    // Per-view class is applied on the view wrapper.
    expect(html).toContain('test-view-class');
    // KeepAliveStack uses absolute stacking to avoid layout accumulation.
    expect(html).toContain('absolute');
    expect(html).toContain('inset-0');
  });
});

