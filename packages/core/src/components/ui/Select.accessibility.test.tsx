import { describe, expect, it } from 'vitest';
import { renderToString } from 'solid-js/web';
import { Select } from './Dropdown';

describe('Select field identity', () => {
  it('keeps the field name independent of the selected option', () => {
    const html = renderToString(() => (
      <Select
        ariaLabel="Deployment destination"
        value="local"
        options={[{ value: 'local', label: 'Local' }]}
        onChange={() => undefined}
      />
    ));
    expect(html).toContain('aria-label="Deployment destination"');
    expect(html).toContain('Local');
    expect(html).toContain('data-floe-input-surface="true"');
  });
  it('connects the existing trigger to visible labels and help', () => {
    const html = renderToString(() => (
      <Select
        ariaLabelledBy="destination-label"
        ariaDescribedBy="destination-help"
        value="local"
        options={[{ value: 'local', label: 'Local' }]}
        onChange={() => undefined}
      />
    ));
    expect(html).toContain('aria-labelledby="destination-label"');
    expect(html).toContain('aria-describedby="destination-help"');
  });
});
