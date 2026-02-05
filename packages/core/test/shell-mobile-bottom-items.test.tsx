import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'solid-js/web';
import { CommandProvider } from '../src/context/CommandContext';
import { LayoutProvider } from '../src/context/LayoutContext';

// Force Shell into mobile mode for SSR markup assertions.
vi.mock('../src/hooks/useMediaQuery', () => ({
  useMediaQuery: () => () => true,
}));

function renderWithCoreProviders(node: () => unknown): string {
  return renderToString(() => (
    <LayoutProvider>
      <CommandProvider>{node()}</CommandProvider>
    </LayoutProvider>
  ));
}

describe('Shell mobile activityBottomItems', () => {
  it('should render activityBottomItems in TopBar actions when enabled', async () => {
    const { Shell } = await import('../src/components/layout/Shell');
    const DummyIcon = (p: { class?: string }) => <span class={p.class} />;

    const html = renderWithCoreProviders(() => (
      <Shell
        activityItems={[{ id: 'main', icon: DummyIcon, label: 'Main' }]}
        activityBottomItems={[{ id: 'settings', icon: DummyIcon, label: 'Settings' }]}
        activityBottomItemsMobileMode="topBar"
        topBarActions={<div data-test="custom-action" />}
        sidebarContent={() => <div>Sidebar</div>}
      >
        <div>Main</div>
      </Shell>
    ));

    expect(html).toContain('aria-label="Settings"');
    expect(html).toContain('hover:bg-muted/60');
    expect(html).toContain('data-test="custom-action"');
  });

  it('should keep activityBottomItems hidden on mobile by default', async () => {
    const { Shell } = await import('../src/components/layout/Shell');
    const DummyIcon = (p: { class?: string }) => <span class={p.class} />;

    const html = renderWithCoreProviders(() => (
      <Shell
        activityItems={[{ id: 'main', icon: DummyIcon, label: 'Main' }]}
        activityBottomItems={[{ id: 'settings', icon: DummyIcon, label: 'Settings' }]}
        topBarActions={<div data-test="custom-action" />}
        sidebarContent={() => <div>Sidebar</div>}
      >
        <div>Main</div>
      </Shell>
    ));

    expect(html).not.toContain('aria-label="Settings"');
    expect(html).toContain('data-test="custom-action"');
  });
});

