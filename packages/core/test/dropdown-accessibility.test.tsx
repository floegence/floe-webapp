import { describe, expect, it } from 'vitest';
import { renderToString } from 'solid-js/web';
import {
  Dropdown,
  getWrappedMenuItemIndex,
  resolveDropdownTriggerKeyAction,
} from '../src/components/ui/Dropdown';

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
});
