import { describe, expect, it } from 'vitest';
import { renderToString } from 'solid-js/web';
import { CommandProvider } from '../src/context/CommandContext';
import { LayoutProvider } from '../src/context/LayoutContext';
import { TopBar } from '../src/components/layout/TopBar';
import { TopBarIconButton } from '../src/components/layout/TopBarIconButton';
import { MobileTabBar } from '../src/components/layout/MobileTabBar';
import { Shell } from '../src/components/layout/Shell';
import { Sidebar } from '../src/components/layout/Sidebar';

function renderWithCoreProviders(node: () => unknown): string {
  return renderToString(() => (
    <LayoutProvider>
      <CommandProvider>{node()}</CommandProvider>
    </LayoutProvider>
  ));
}

describe('layout markup', () => {
  it('Shell has no desktop bottom bar slot', () => {
    const html = renderWithCoreProviders(() => (
      <Shell>
        <div>Main</div>
      </Shell>
    ));

    // Shell-wide chrome ends at the content area; per-widget and per-page
    // affordances own everything below it.
    expect(html).not.toContain('data-floe-shell-slot="bottom-bar"');
    expect(html).toContain('data-floe-shell-slot="main"');
  });

  it('TopBar should not squeeze content when using safe-area padding', () => {
    const html = renderWithCoreProviders(() => <TopBar />);

    // The safe-area padding lives on the outer wrapper, while the visual bar keeps a fixed height.
    expect(html).toContain('safe-top');
    expect(html).toContain('h-10');
  });

  it('MobileTabBar should keep a stable 56px content height and add safe-area padding outside', () => {
    const DummyIcon = (p: { class?: string }) => <span class={p.class} />;

    const html = renderWithCoreProviders(() => (
      <MobileTabBar
        items={[{ id: 'files', icon: DummyIcon, label: 'Files' }]}
        activeId="files"
        onSelect={() => {}}
      />
    ));

    expect(html).toContain('safe-bottom');
    expect(html).toContain('h-14');
  });

  it('TopBarIconButton should provide a stable 32px hit area with muted hover feedback', () => {
    const html = renderWithCoreProviders(() => (
      <TopBarIconButton label="Settings">
        <span class="w-4 h-4" />
      </TopBarIconButton>
    ));

    expect(html).toContain('w-[var(--floe-control-height-md)] h-[var(--floe-control-height-md)]');
    expect(html).toContain('hover:bg-[var(--floe-state-hover)]');
  });

  it('TopBarIconButton should omit the tooltip host wrapper when tooltip={false}', () => {
    const html = renderWithCoreProviders(() => (
      <TopBarIconButton label="Settings" tooltip={false}>
        <span class="w-4 h-4" />
      </TopBarIconButton>
    ));

    expect(html).toContain('aria-label="Settings"');
    expect(html).not.toContain('relative inline-block');
  });

  it('Shell should include dvh + min-* utilities to avoid flex overflow and layout jumps', () => {
    const DummyIcon = (p: { class?: string }) => <span class={p.class} />;

    const html = renderWithCoreProviders(() => (
      <Shell
        activityItems={[{ id: 'files', icon: DummyIcon, label: 'Files' }]}
        sidebarContent={() => <div>Sidebar</div>}
      >
        <div>Main</div>
      </Shell>
    ));

    expect(html).toContain('h-[100dvh]');
    expect(html).toContain('min-h-0');
    expect(html).toContain('min-w-0');
  });

  it('Shell should expose stable data-* hooks and slotClassNames for shell chrome containers', () => {
    const DummyIcon = (p: { class?: string }) => <span class={p.class} />;

    const html = renderWithCoreProviders(() => (
      <Shell
        activityItems={[{ id: 'files', icon: DummyIcon, label: 'Files' }]}
        sidebarContent={() => <div>Sidebar</div>}
        slotClassNames={{
          root: 'shell-root-class',
          topBar: 'shell-top-bar-class',
          activityBar: 'shell-activity-bar-class',
          sidebar: 'shell-sidebar-class',
          contentArea: 'shell-content-area-class',
          main: 'shell-main-class',
        }}
      >
        <div>Main</div>
      </Shell>
    ));

    expect(html).toContain('data-floe-shell');
    expect(html).toContain('data-floe-shell-slot="top-bar"');
    expect(html).toContain('data-floe-shell-slot="activity-bar"');
    expect(html).toContain('data-floe-shell-slot="sidebar"');
    expect(html).toContain('data-floe-shell-slot="content-area"');
    expect(html).toContain('data-floe-shell-slot="main"');
    expect(html).toContain('shell-root-class');
    expect(html).toContain('shell-top-bar-class');
    expect(html).toContain('shell-activity-bar-class');
    expect(html).toContain('shell-sidebar-class');
    expect(html).toContain('shell-content-area-class');
    expect(html).toContain('shell-main-class');
  });

  it('Sidebar should expose visibility-motion markup and drop width transitions for instant motion', () => {
    const html = renderWithCoreProviders(() => (
      <Sidebar visibilityMotion="instant">
        <div>Sidebar</div>
      </Sidebar>
    ));

    expect(html).toContain('data-floe-sidebar-visibility-motion="instant"');
    expect(html).not.toContain('transition-[width] duration-150 ease-out');
  });
});
