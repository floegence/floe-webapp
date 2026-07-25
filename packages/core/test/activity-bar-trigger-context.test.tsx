// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';

import { ActivityBar } from '../src/components/layout/ActivityBar';

const disposers: Array<() => void> = [];

afterEach(() => {
  while (disposers.length > 0) disposers.pop()?.();
  document.body.innerHTML = '';
});

describe('ActivityBar disclosure trigger context', () => {
  it('publishes the trigger element and reactive disclosure semantics', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const [expanded, setExpanded] = createSignal(false);
    const triggerUpdates: Array<HTMLButtonElement | null> = [];
    const Icon = (props: { class?: string }) => <span class={props.class} />;

    disposers.push(render(() => (
      <ActivityBar
        items={[{
          id: 'plugins',
          icon: Icon,
          label: 'Plugins',
          buttonRef: (button) => triggerUpdates.push(button),
          ariaExpanded: expanded,
          ariaControls: 'plugin-switcher',
          ariaHasPopup: 'dialog',
        }]}
        activeId="terminal"
        onActiveChange={() => undefined}
      />
    ), host));

    const trigger = host.querySelector('button[aria-label="Plugins"]') as HTMLButtonElement;
    expect(triggerUpdates).toEqual([trigger]);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBe('plugin-switcher');
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');

    setExpanded(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    disposers.pop()?.();
    expect(triggerUpdates).toEqual([trigger, null]);
  });
});
