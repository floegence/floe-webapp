import { renderToString } from 'solid-js/web';
import { describe, expect, it } from 'vitest';

import { MonitorPointer, StopFilled } from './index';

describe('MonitorPointer', () => {
  it('renders a monitor and pointer with the requested size and class', () => {
    const markup = renderToString(() => <MonitorPointer class="computer-icon" size={20} />);

    expect(markup).toContain('class="computer-icon"');
    expect(markup).toContain('width="20"');
    expect(markup).toContain('height="20"');
    expect(markup).toContain('M21 11V5');
    expect(markup).toContain('M12.034 12.681');
  });
});

describe('StopFilled', () => {
  it('renders one filled square without a surrounding circle', () => {
    const markup = renderToString(() => <StopFilled class="stop-icon" size={16} />);

    expect(markup).toContain('width="16"');
    expect(markup).toContain('height="16"');
    expect(markup).toContain('fill="currentColor"');
    expect(markup).toContain('<rect');
    expect(markup).not.toContain('<circle');
  });
});
