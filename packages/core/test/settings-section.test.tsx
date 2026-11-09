// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { Show, createSignal, onCleanup, untrack, type JSX } from 'solid-js';
import { Portal, render } from 'solid-js/web';
import { SettingRow, SettingsLayout, SettingsList, SettingsNavigation, SettingsSection } from '../src/components/ui/Settings';

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

describe('Settings slot ownership', () => {
  const slots = ['control', 'body', 'search', 'badge', 'actions', 'sectionBody', 'mobileNavigation', 'sidebar', 'layoutBody', 'listBody', 'emptyNavigation'] as const;
  const wrapper = (slot: typeof slots[number], content: () => JSX.Element) =>
    slot === 'control' ? <SettingRow title="Picture" control={content()} />
      : slot === 'body' ? <SettingRow title="Picture">{content()}</SettingRow>
        : slot === 'search' ? <SettingsNavigation label="Settings" groups={[]} value="" onChange={() => {}} search={content()} />
          : slot === 'badge' ? <SettingsSection title="Picture" showHeading={false} badge={content()} />
            : slot === 'actions' ? <SettingsSection title="Picture" showHeading={false} actions={content()} />
              : slot === 'sectionBody' ? <SettingsSection title="Picture">{content()}</SettingsSection>
                : slot === 'mobileNavigation' ? <SettingsLayout sidebar={null} mobileNavigation={content()}>{null}</SettingsLayout>
                  : slot === 'sidebar' ? <SettingsLayout sidebar={content()}>{null}</SettingsLayout>
                    : slot === 'layoutBody' ? <SettingsLayout sidebar={null}>{content()}</SettingsLayout>
                      : slot === 'listBody' ? <SettingsList>{content()}</SettingsList>
                        : <SettingsNavigation label="Settings" groups={[]} value="" onChange={() => {}} empty={content()} />;
  const selector = (slot: typeof slots[number]) => slot === 'search'
    ? '.floe-settings-navigation__search' : `.floe-setting-row__${slot}`;

  it.each(slots)('constructs the %s slot once and disposes its only portal', (slot) => {
    let mounted = 0;
    let cleaned = 0;
    const Slot = () => {
      mounted += 1;
      onCleanup(() => { cleaned += 1; });
      return <><input aria-label="Draft" /><Portal><span data-slot-portal>Choices</span></Portal></>;
    };
    const host = mount(() => wrapper(slot, () => <Slot />));
    expect(mounted).toBe(1);
    expect(host.querySelectorAll('input')).toHaveLength(1);
    expect(document.querySelectorAll('[data-slot-portal]')).toHaveLength(1);
    disposers.pop()?.();
    expect(cleaned).toBe(1);
    expect(document.querySelectorAll('[data-slot-portal]')).toHaveLength(0);
  });

  it.each(['control', 'body', 'search'] as const)('omits a conditional %s wrapper and gives each visible slot one owner', (slot) => {
    const [visible, setVisible] = createSignal(false);
    let mounted = 0;
    let cleaned = 0;
    const Slot = () => {
      mounted += 1;
      onCleanup(() => { cleaned += 1; });
      return <><input /><Portal><span data-slot-portal>Choices</span></Portal></>;
    };
    const host = mount(() => wrapper(slot, () => <Show when={visible()}><Slot /></Show>));
    expect(host.querySelector(selector(slot))).toBeNull();
    expect(mounted).toBe(0);
    setVisible(true);
    expect(host.querySelector(selector(slot))).not.toBeNull();
    expect(mounted).toBe(1);
    expect(document.querySelectorAll('[data-slot-portal]')).toHaveLength(1);
    setVisible(false);
    expect(host.querySelector(selector(slot))).toBeNull();
    expect(cleaned).toBe(1);
    expect(document.querySelectorAll('[data-slot-portal]')).toHaveLength(0);
    setVisible(true);
    expect(mounted).toBe(2);
    disposers.pop()?.();
    expect(cleaned).toBe(2);
    expect(document.querySelectorAll('[data-slot-portal]')).toHaveLength(0);
  });

  it('retains the navigation search input and draft as navigation state changes', () => {
    const [value, setValue] = createSignal('appearance');
    const [label, setLabel] = createSignal('Settings');
    const [query, setQuery] = createSignal('');
    const host = mount(() => <SettingsNavigation label={label()}
      groups={[{ id: 'general', label: 'General', items: [{ id: 'appearance', label: 'Appearance' }, { id: 'terminal', label: 'Terminal' }] }]}
      value={value()} onChange={setValue}
      search={<input aria-label="Search" value={query()} onInput={(event) => setQuery(event.currentTarget.value)} />} />);
    const input = host.querySelector('input')!;
    input.value = 'Retained draft';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    setValue('terminal');
    setLabel('Environment settings');
    expect(host.querySelector('input')).toBe(input);
    expect(input.value).toBe('Retained draft');
    expect(untrack(query)).toBe('Retained draft');
    expect(host.querySelector('[aria-current="page"]')?.textContent).toBe('Terminal');
  });
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
