import { describe, expect, it } from 'vitest';
import { createReloadPlaceholderScript, getReloadPlaceholder } from '../src/reload-placeholder';

describe('document reload presentation', () => {
  it('produces an inline classic script without a framework or module request', () => {
    const script = createReloadPlaceholderScript({ storageKey: 'layout' });
    expect(script).toContain('sessionStorage');
    expect(script).not.toMatch(/\bimport\s|\bexport\s/);
    expect(() => new Function(script)).not.toThrow();
  });

  it('cannot terminate a host script with option text', () => {
    const script = createReloadPlaceholderScript({ storageKey: '</script><script>alert(1)</script>' });
    expect(script).not.toContain('</script>');
    expect(() => new Function(script)).not.toThrow();
  });

  it('has no browser side effect when imported on the server', () => {
    expect(getReloadPlaceholder()).toBeUndefined();
  });
});
