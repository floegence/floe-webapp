import { describe, expect, it } from 'vitest';
import { resolveActivityBarClick } from '../src/components/layout/activityBarBehavior';

describe('resolveActivityBarClick', () => {
  it('toggle: clicking active tab collapses the sidebar', () => {
    const res = resolveActivityBarClick({
      clickedId: 'files',
      activeId: 'files',
      collapsed: false,
      behavior: 'toggle',
    });
    expect(res.nextActiveId).toBe('files');
    expect(res.nextCollapsed).toBe(true);
  });

  it('toggle: clicking active tab while collapsed reopens the sidebar', () => {
    const res = resolveActivityBarClick({
      clickedId: 'files',
      activeId: 'files',
      collapsed: true,
      behavior: 'toggle',
    });
    expect(res.nextActiveId).toBe('files');
    expect(res.nextCollapsed).toBe(false);
  });

  it('toggle: switching tabs opens the sidebar', () => {
    const res = resolveActivityBarClick({
      clickedId: 'search',
      activeId: 'files',
      collapsed: true,
      behavior: 'toggle',
    });
    expect(res.nextActiveId).toBe('search');
    expect(res.nextCollapsed).toBe(false);
    expect(res.openSidebar).toBe(true);
  });

  it('preserve: switching tabs should not mutate collapsed state', () => {
    const res = resolveActivityBarClick({
      clickedId: 'deck',
      activeId: 'files',
      collapsed: false,
      behavior: 'preserve',
    });
    expect(res.nextActiveId).toBe('deck');
    expect(res.nextCollapsed).toBeUndefined();
    expect(res.openSidebar).toBe(false);
  });

  it('preserve: clicking active tab should be a no-op', () => {
    const res = resolveActivityBarClick({
      clickedId: 'deck',
      activeId: 'deck',
      collapsed: false,
      behavior: 'preserve',
    });
    expect(res.nextActiveId).toBe('deck');
    expect(res.nextCollapsed).toBeUndefined();
    expect(res.openSidebar).toBeUndefined();
  });
});

