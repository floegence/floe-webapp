import { describe, expect, it } from 'vitest';
import { renderToString } from 'solid-js/web';
import { CommandProvider } from '../src/context/CommandContext';
import { LayoutProvider } from '../src/context/LayoutContext';
import { TopBar } from '../src/components/layout/TopBar';
import { MobileTabBar } from '../src/components/layout/MobileTabBar';
import { Shell } from '../src/components/layout/Shell';

function renderWithCoreProviders(node: () => unknown): string {
  return renderToString(() => (
    <LayoutProvider>
      <CommandProvider>{node()}</CommandProvider>
    </LayoutProvider>
  ));
}

describe('layout markup', () => {
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
});
