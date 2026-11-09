// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { Show, createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { SettingsSection } from '../src/components/ui/Settings';

const disposers: Array<() => void> = [];
function mount(view: () => unknown) {
  const host = document.createElement('div');
  document.body.append(host);
  disposers.push(render(view, host));
  return host;
}

afterEach(() => {
  while (disposers.length > 0) disposers.pop()?.();
  document.body.innerHTML = '';
});

describe('SettingsSection heading ownership', () => {
  it('keeps standalone page and subordinate headings visible by default', () => {
    const host = mount(() => (
      <SettingsSection title="Terminal" variant="page">
        <SettingsSection title="Appearance"><input /></SettingsSection>
      </SettingsSection>
    ));
    expect(host.querySelector('h1')?.textContent).toBe('Terminal');
    expect(host.querySelector('h2')?.textContent).toBe('Appearance');
  });

  it('omits the empty header while keeping the hidden-heading section named', () => {
    const host = mount(() => (
      <SettingsSection title="Terminal" variant="page" showHeading={false}>
        <input aria-label="Shell" />
      </SettingsSection>
    ));
    expect(host.querySelector('h1, h2, header')).toBeNull();
    expect(host.querySelector('section')?.getAttribute('aria-label')).toBe('Terminal');
    expect(host.querySelector('input')).not.toBeNull();
  });

  it('preserves explicit accessible names and external heading references', () => {
    const host = mount(() => (
      <>
        <h1 id="dialog-title">Terminal settings</h1>
        <SettingsSection title="Terminal" showHeading={false} aria-labelledby="dialog-title" />
        <SettingsSection title="Terminal" showHeading={false} aria-label="Session defaults" />
      </>
    ));
    expect(host.querySelectorAll('section')[0].getAttribute('aria-labelledby')).toBe('dialog-title');
    expect(host.querySelectorAll('section')[1].getAttribute('aria-label')).toBe('Session defaults');
  });

  it.each(['description', 'badge', 'actions'] as const)(
    'preserves %s without rendering a duplicate heading',
    (metadata) => {
      const host = mount(() => (
        <SettingsSection title="Terminal" showHeading={false}
          description={metadata === 'description' ? 'Default session preferences' : undefined}
          badge={metadata === 'badge' ? <span>Managed</span> : undefined}
          actions={metadata === 'actions' ? <button type="button">Reset</button> : undefined}>
          <input />
        </SettingsSection>
      ));
      expect(host.querySelector('h1, h2')).toBeNull();
      expect(host.querySelector('header')?.textContent).toBe(
        metadata === 'description' ? 'Default session preferences' : metadata === 'badge' ? 'Managed' : 'Reset'
      );
      expect(host.querySelector('input')).not.toBeNull();
    }
  );

  it('reacts to conditional metadata and heading changes without replacing the body', () => {
    const [showHeading, setShowHeading] = createSignal(false);
    const [metadata, setMetadata] = createSignal(false);
    const [title, setTitle] = createSignal('Terminal');
    const host = mount(() => (
      <SettingsSection title={title()} variant="page" showHeading={showHeading()}
        description={metadata() ? 'Session preferences' : undefined}
        badge={<Show when={metadata()}><span>Managed</span></Show>}
        actions={<Show when={metadata()}><button type="button">Reset</button></Show>}>
        <input />
      </SettingsSection>
    ));
    const input = host.querySelector('input')!;
    input.value = 'Retained draft';
    expect(host.querySelector('header')).toBeNull();
    setMetadata(true);
    expect(host.querySelector('header')?.textContent).toBe('ManagedSession preferencesReset');
    expect(host.querySelector('h1')).toBeNull();
    setShowHeading(true);
    expect(host.querySelector('h1')?.textContent).toBe('Terminal');
    setTitle('Host applications');
    expect(host.querySelector('h1')?.textContent).toBe('Host applications');
    setShowHeading(false);
    setMetadata(false);
    expect(host.querySelector('header')).toBeNull();
    expect(host.querySelector('section')?.getAttribute('aria-label')).toBe('Host applications');
    expect(host.querySelector('input')).toBe(input);
    expect(input.value).toBe('Retained draft');
  });
});
