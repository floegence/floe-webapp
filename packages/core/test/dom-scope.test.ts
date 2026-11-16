// @vitest-environment jsdom

import { expect, it } from 'vitest';
import { composedContains, composedEventTarget, deepActiveElement } from '../src/utils';

it('resolves focus and event ownership through nested shadow roots', () => {
  const host = document.createElement('div');
  document.body.append(host);
  try {
    const root = host.attachShadow({ mode: 'open' });
    const innerHost = document.createElement('div');
    root.append(innerHost);
    const inner = innerHost.attachShadow({ mode: 'open' });
    const input = document.createElement('input');
    inner.append(input);
    input.focus();
    expect(deepActiveElement(document)).toBe(input);
    expect(composedContains(host, input)).toBe(true);
    expect(composedContains(input, host)).toBe(false);
    let target: EventTarget | null = null;
    host.addEventListener('click', event => { target = composedEventTarget(event); });
    input.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(target).toBe(input);
  } finally { host.remove(); }
});
