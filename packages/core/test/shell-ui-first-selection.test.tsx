// @vitest-environment jsdom

import { render } from 'solid-js/web';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Shell, type ActivitySelectionMetadata } from '../src/components/layout/Shell';
import { CommandProvider } from '../src/context/CommandContext';
import { LayoutProvider, useLayout } from '../src/context/LayoutContext';
import type { UIFirstSelectionEvent } from '../src/utils/uiFirstSelection';

vi.mock('../src/hooks/useMediaQuery', () => ({ useMediaQuery: () => () => false }));

describe('Shell UI-first activity selection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('reports desktop input source while visual selection leads canonical layout state', async () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: false,
      media: '',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
    })));
    const events: Array<UIFirstSelectionEvent<string, ActivitySelectionMetadata>> = [];
    const host = document.createElement('div');
    document.body.append(host);

    render(() => (
      <LayoutProvider>
        <CommandProvider>
          {(() => {
            const layout = useLayout();
            const Icon = () => null;
            return (
              <>
                <Shell
                  activitySelectionMode="ui-first"
                  activityItems={[
                    { id: 'files', icon: Icon, label: 'Files' },
                    { id: 'terminal', icon: Icon, label: 'Terminal' },
                  ]}
                  sidebarContent={() => <div>Sidebar</div>}
                  onActivitySelectionEvent={(event) => events.push(event)}
                >
                  <div>Main</div>
                </Shell>
                <output data-testid="canonical-activity">{layout.sidebarActiveTab()}</output>
              </>
            );
          })()}
        </CommandProvider>
      </LayoutProvider>
    ), host);

    await Promise.resolve();
    const files = host.querySelector('button[aria-label="Files"]') as HTMLButtonElement;
    const terminal = host.querySelector('button[aria-label="Terminal"]') as HTMLButtonElement;
    expect(files.getAttribute('aria-pressed')).toBe('true');

    terminal.click();
    await Promise.resolve();
    expect(terminal.getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[data-testid="canonical-activity"]')?.textContent).toBe('files');
    expect(events.map((event) => event.phase)).toEqual(['requested']);
    expect(events[0]?.metadata?.source).toBe('activity-bar');

    frames.shift()?.(16);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(host.querySelector('[data-testid="canonical-activity"]')?.textContent).toBe('terminal');
  });
});
