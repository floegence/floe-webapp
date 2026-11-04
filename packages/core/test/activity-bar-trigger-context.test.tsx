// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';

import { ActivityBar } from '../src/components/layout/ActivityBar';
import { MobileTabBar } from '../src/components/layout/MobileTabBar';

const disposers: Array<() => void> = [];

afterEach(() => {
  while (disposers.length > 0) disposers.pop()?.();
  document.body.innerHTML = '';
});

describe('ActivityBar disclosure trigger context', () => {
  it.each([false, true])(
    'passes navigation and disclosure state into the glyph (mobile=%s)',
    (mobile) => {
      const host = document.createElement('div');
      document.body.append(host);
      const [active, setActive] = createSignal('files');
      const [expanded, setExpanded] = createSignal(false);
      const Icon = (props: { class?: string; active?: boolean }) => (
        <svg class={props.class} data-icon-active={String(!!props.active)} />
      );
      const items = [
        { id: 'files', icon: Icon, label: 'Files' },
        {
          id: 'plugins',
          icon: Icon,
          label: 'Plugins',
          ariaExpanded: expanded,
          ariaHasPopup: 'dialog' as const,
        },
      ];
      disposers.push(
        render(
          () =>
            mobile ? (
              <MobileTabBar items={items} activeId={active()} onSelect={setActive} />
            ) : (
              <ActivityBar items={items} activeId={active()} onActiveChange={setActive} />
            ),
          host
        )
      );
      const glyph = (label: string) => host.querySelector('[aria-label="' + label + '"] svg');
      expect(glyph('Files')?.getAttribute('data-icon-active')).toBe('true');
      expect(glyph('Plugins')?.getAttribute('data-icon-active')).toBe('false');
      setExpanded(true);
      expect(glyph('Plugins')?.getAttribute('data-icon-active')).toBe('true');
      setExpanded(false);
      expect(glyph('Plugins')?.getAttribute('data-icon-active')).toBe('false');
      setActive('plugins');
      expect(glyph('Files')?.getAttribute('data-icon-active')).toBe('false');
      expect(glyph('Plugins')?.getAttribute('data-icon-active')).toBe('true');
    }
  );

  it.each([false, true])(
    'publishes the trigger element and reactive disclosure semantics (mobile=%s)',
    (mobile) => {
      const host = document.createElement('div');
      document.body.append(host);
      const [expanded, setExpanded] = createSignal(false);
      const triggerUpdates: Array<HTMLButtonElement | null> = [];
      const Icon = (props: { class?: string }) => <span class={props.class} />;

      const items = [
        {
          id: 'plugins',
          icon: Icon,
          label: 'Plugins',
          buttonRef: (button: HTMLButtonElement | null) => triggerUpdates.push(button),
          ariaExpanded: expanded,
          ariaControls: 'plugin-switcher',
          ariaHasPopup: 'dialog' as const,
        },
      ];
      disposers.push(
        render(
          () =>
            mobile ? (
              <MobileTabBar items={items} activeId="terminal" onSelect={() => undefined} />
            ) : (
              <ActivityBar items={items} activeId="terminal" onActiveChange={() => undefined} />
            ),
          host
        )
      );

      const trigger = host.querySelector('button[aria-label="Plugins"]') as HTMLButtonElement;
      expect(triggerUpdates).toEqual([trigger]);
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(trigger.getAttribute('aria-controls')).toBe('plugin-switcher');
      expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');

      setExpanded(true);
      expect(trigger.getAttribute('aria-expanded')).toBe('true');

      disposers.pop()?.();
      expect(triggerUpdates).toEqual([trigger, null]);
    }
  );

  it('reports pointer and keyboard context-menu anchors from the concrete trigger', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const onContextMenu = vi.fn();
    const Icon = (props: { class?: string }) => <span class={props.class} />;

    disposers.push(
      render(
        () => (
          <ActivityBar
            items={[
              {
                id: 'plugin',
                icon: Icon,
                label: 'Plugin',
                onContextMenu,
              },
            ]}
            activeId="files"
            onActiveChange={() => undefined}
          />
        ),
        host
      )
    );

    const trigger = host.querySelector('button[aria-label="Plugin"]') as HTMLButtonElement;
    Object.defineProperty(trigger, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 10, top: 20, width: 40, height: 60 }),
    });
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');

    const pointerRequest = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 31,
      clientY: 47,
    });
    trigger.dispatchEvent(pointerRequest);
    expect(pointerRequest.defaultPrevented).toBe(true);
    expect(onContextMenu).toHaveBeenNthCalledWith(1, {
      trigger,
      clientX: 31,
      clientY: 47,
      source: 'pointer',
    });

    const keyboardRequest = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'ContextMenu',
    });
    trigger.dispatchEvent(keyboardRequest);
    expect(keyboardRequest.defaultPrevented).toBe(true);
    expect(onContextMenu).toHaveBeenNthCalledWith(2, {
      trigger,
      clientX: 30,
      clientY: 50,
      source: 'keyboard',
    });
  });
});
