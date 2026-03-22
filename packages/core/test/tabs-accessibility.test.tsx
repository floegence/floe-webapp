import { describe, expect, it } from 'vitest';
import { renderToString } from 'solid-js/web';
import { Tabs, resolveTabNavigationTargetId } from '../src/components/ui/Tabs';

describe('Tabs accessibility', () => {
  it('renders a tablist with roving tabindex semantics', () => {
    const html = renderToString(() => (
      <Tabs
        ariaLabel="Workspace tabs"
        items={[
          { id: 'one', label: 'One' },
          { id: 'two', label: 'Two' },
          { id: 'three', label: 'Three' },
        ]}
        activeId="one"
      />
    ));

    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-label="Workspace tabs"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('tabindex="-1"');
  });

  it('computes the next enabled tab for arrow and boundary key navigation', () => {
    const items = [
      { id: 'one', label: 'One' },
      { id: 'two', label: 'Two', disabled: true },
      { id: 'three', label: 'Three' },
      { id: 'four', label: 'Four' },
    ];

    expect(resolveTabNavigationTargetId(items, 'one', 'ArrowRight')).toBe('three');
    expect(resolveTabNavigationTargetId(items, 'three', 'ArrowLeft')).toBe('one');
    expect(resolveTabNavigationTargetId(items, 'four', 'ArrowRight')).toBe('one');
    expect(resolveTabNavigationTargetId(items, 'three', 'Home')).toBe('one');
    expect(resolveTabNavigationTargetId(items, 'one', 'End')).toBe('four');
    expect(resolveTabNavigationTargetId(items, 'one', 'PageDown')).toBeNull();
  });
});
