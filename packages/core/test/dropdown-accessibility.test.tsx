// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { renderToString } from 'solid-js/web';
import {
  Dropdown,
  resolveDropdownTriggerKeyAction,
} from '../src/components/ui/Dropdown';
import {
  focusMenuItem,
  getMenuItems,
  getWrappedMenuItemIndex,
  handleMenuKeyboardNavigation,
} from '../src/components/ui/menuUtils';

describe('Dropdown accessibility', () => {
  it('renders a semantic trigger wrapper with explicit labeling hooks', () => {
    const html = renderToString(() => (
      <Dropdown
        trigger={<span>Actions</span>}
        triggerClass="px-2 py-1"
        triggerAriaLabel="Open actions"
        value="bravo"
        items={[
          { id: 'alpha', label: 'Alpha' },
          { id: 'bravo', label: 'Bravo' },
          { id: 'charlie', label: 'Charlie' },
        ]}
        onSelect={() => {}}
      />
    ));

    expect(html).toContain('data-floe-dropdown-trigger');
    expect(html).toContain('role="button"');
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-label="Open actions"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('px-2 py-1');
  });

  it('maps trigger keys to the expected open and focus behavior', () => {
    expect(resolveDropdownTriggerKeyAction('Enter', { open: false, hasSelection: true })).toEqual({
      nextOpen: true,
      focusMode: 'selected',
    });
    expect(resolveDropdownTriggerKeyAction(' ', { open: true, hasSelection: true })).toEqual({
      nextOpen: false,
    });
    expect(
      resolveDropdownTriggerKeyAction('ArrowDown', { open: false, hasSelection: false })
    ).toEqual({
      nextOpen: true,
      focusMode: 'first',
    });
    expect(
      resolveDropdownTriggerKeyAction('ArrowUp', { open: false, hasSelection: false })
    ).toEqual({
      nextOpen: true,
      focusMode: 'last',
    });
    expect(
      resolveDropdownTriggerKeyAction('Escape', { open: false, hasSelection: false })
    ).toBeNull();
  });

  it('wraps menu focus movement for arrow key navigation', () => {
    expect(getWrappedMenuItemIndex(3, -1, 1)).toBe(0);
    expect(getWrappedMenuItemIndex(3, -1, -1)).toBe(2);
    expect(getWrappedMenuItemIndex(3, 1, 1)).toBe(2);
    expect(getWrappedMenuItemIndex(3, 2, 1)).toBe(0);
    expect(getWrappedMenuItemIndex(3, 0, -1)).toBe(2);
    expect(getWrappedMenuItemIndex(0, -1, 1)).toBeNull();
  });

  it('navigates enabled menu items and exposes dismissal intent', () => {
    const root = document.createElement('div');
    root.setAttribute('role', 'menu');
    root.innerHTML = `
      <button role="menuitem">Alpha</button>
      <button role="menuitem" disabled>Disabled</button>
      <div role="separator"></div>
      <button role="menuitem">Bravo</button>
    `;
    document.body.append(root);

    const items = getMenuItems(root);
    expect(items.map((item) => item.textContent)).toEqual(['Alpha', 'Bravo']);
    expect(focusMenuItem(root, 'first')).toBe(true);
    expect(document.activeElement).toBe(items[0]);

    const dismissReasons: string[] = [];
    const dispatch = (key: string, shiftKey = false) => {
      const event = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true });
      items.find((item) => item === document.activeElement)?.dispatchEvent(event);
      handleMenuKeyboardNavigation(event, {
        onDismiss: (reason) => dismissReasons.push(reason),
      });
      return event;
    };

    const outside = document.createElement('button');
    document.body.append(outside);
    const outsideEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true });
    outside.dispatchEvent(outsideEvent);
    expect(handleMenuKeyboardNavigation(outsideEvent, { onDismiss: () => {} })).toBe(false);
    expect(outsideEvent.defaultPrevented).toBe(false);

    expect(dispatch('ArrowDown').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(items[1]);
    expect(dispatch('ArrowDown').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(items[0]);
    expect(dispatch('End').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(items[1]);
    expect(dispatch('Home').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(items[0]);

    const escapeEvent = dispatch('Escape');
    expect(escapeEvent.defaultPrevented).toBe(true);
    expect(dismissReasons).toEqual(['escape']);

    const tabEvent = dispatch('Tab');
    const shiftTabEvent = dispatch('Tab', true);
    expect(tabEvent.defaultPrevented).toBe(false);
    expect(shiftTabEvent.defaultPrevented).toBe(false);
    expect(dismissReasons).toEqual(['escape', 'tab', 'shift-tab']);

    root.remove();
    outside.remove();
  });
});
