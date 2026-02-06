import { describe, expect, it } from 'vitest';
import { renderToString } from 'solid-js/web';
import { FloeProvider } from '../src/app/FloeProvider';
import { FloeRegistryRuntime } from '../src/app/FloeRegistryRuntime';
import { ActivityAppsMain } from '../src/app/ActivityAppsMain';
import { LayoutProvider } from '../src/context/LayoutContext';
import type { FloeComponent } from '../src/context/ComponentRegistry';

describe('ActivityAppsMain', () => {
  it('includes sidebar.renderIn="main" components by default', () => {
    const components: FloeComponent[] = [
      {
        id: 'ai',
        name: 'AI',
        component: () => <div>AI_MAIN</div>,
        sidebar: { order: 1, renderIn: 'main' },
      },
    ];

    const html = renderToString(() => (
      <FloeProvider>
        <FloeRegistryRuntime components={components}>
          <ActivityAppsMain activeId={() => 'ai'} />
        </FloeRegistryRuntime>
      </FloeProvider>
    ));

    expect(html).toContain('AI_MAIN');
  });

  it('renders with explicit views without ComponentRegistryProvider', () => {
    const html = renderToString(() => (
      <LayoutProvider>
        <ActivityAppsMain
          activeId={() => 'v1'}
          views={[{ id: 'v1', render: () => <div>EXPLICIT_VIEW</div> }]}
        />
      </LayoutProvider>
    ));

    expect(html).toContain('EXPLICIT_VIEW');
  });

  it('throws when used without registry and without explicit views', () => {
    expect(() =>
      renderToString(() => (
        <LayoutProvider>
          <ActivityAppsMain activeId={() => 'missing'} />
        </LayoutProvider>
      ))
    ).toThrow(/ComponentRegistryProvider/);
  });
});
