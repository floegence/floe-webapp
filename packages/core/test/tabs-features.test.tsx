import { describe, expect, it } from 'vitest';
import { renderToString } from 'solid-js/web';
import { Tabs, type TabItem } from '../src/components/ui/Tabs';

const baseItems: TabItem[] = [
  { id: 'tab1', label: 'Tab 1' },
  { id: 'tab2', label: 'Tab 2' },
];

describe('Tabs composable features', () => {
  it('should keep default active-border behavior', () => {
    const html = renderToString(() => (
      <Tabs
        items={baseItems}
        activeId="tab1"
      />
    ));

    expect(html).toContain('border-b-2');
    expect(html).toContain('border-primary text-foreground bg-background');
  });

  it('should hide active border when indicator.mode is none', () => {
    const html = renderToString(() => (
      <Tabs
        items={baseItems}
        activeId="tab1"
        features={{ indicator: { mode: 'none' } }}
      />
    ));

    expect(html).toContain('border-transparent text-foreground bg-background');
    expect(html).not.toContain('border-primary text-foreground bg-background');
  });

  it('should keep legacy closable/showAdd behavior to preserve X and + buttons', () => {
    const html = renderToString(() => (
      <Tabs
        items={[{ id: 'tab1', label: 'Tab 1' }]}
        activeId="tab1"
        closable
        showAdd
      />
    ));

    expect(html).toContain('aria-label="Close Tab 1"');
    expect(html).toContain('aria-label="Add new tab"');
  });

  it('should allow features to override legacy closable/showAdd flags', () => {
    const html = renderToString(() => (
      <Tabs
        items={[{ id: 'tab1', label: 'Tab 1' }]}
        activeId="tab1"
        closable
        showAdd
        features={{
          closeButton: { enabledByDefault: false },
          addButton: { enabled: false },
        }}
      />
    ));

    expect(html).not.toContain('aria-label="Close Tab 1"');
    expect(html).not.toContain('aria-label="Add new tab"');
  });

  it('should apply slotClassNames to tab and add-button slots', () => {
    const html = renderToString(() => (
      <Tabs
        items={[{ id: 'tab1', label: 'Tab 1' }]}
        activeId="tab1"
        features={{ addButton: { enabled: true } }}
        slotClassNames={{
          tab: 'my-tab-slot',
          tabActive: 'my-active-slot',
          addButton: 'my-add-slot',
        }}
      />
    ));

    expect(html).toContain('my-tab-slot');
    expect(html).toContain('my-active-slot');
    expect(html).toContain('my-add-slot');
  });
});
