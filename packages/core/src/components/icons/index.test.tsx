import { renderToString } from 'solid-js/web';
import { describe, expect, it } from 'vitest';

import { StopFilled } from './index';

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
