import { untrack } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'solid-js/web';
import { LayoutProvider, useLayout } from '../src/context/LayoutContext';
import { SidebarPane } from '../src/components/layout/SidebarPane';

function ForceMobile(props: { mobile: boolean; children: unknown }) {
  const layout = useLayout();
  const mobile = untrack(() => props.mobile);
  layout.setIsMobile(mobile);
  return <>{props.children}</>;
}

function renderSidebarPane(params: { mobile?: boolean; resizable?: boolean } = {}): string {
  return renderToString(() => (
    <LayoutProvider>
      <ForceMobile mobile={params.mobile === true}>
        <div class="relative h-80">
          <SidebarPane
            title="Explorer"
            width={240}
            headerActions={<button type="button">History</button>}
            resizable={params.resizable}
            onResize={() => {}}
            onClose={() => {}}
            bodyClass="py-1"
          >
            <div>Sidebar body</div>
          </SidebarPane>
        </div>
      </ForceMobile>
    </LayoutProvider>
  ));
}

describe('SidebarPane markup', () => {
  it('should render the file-browser style header and desktop resizer', () => {
    const html = renderSidebarPane({ resizable: true });

    expect(html).toContain('Explorer');
    expect(html).toContain('History');
    expect(html).toContain('border-sidebar-border');
    expect(html).toContain('cursor-col-resize');
    expect(html).not.toContain('aria-label="Close sidebar"');
  });

  it('should render as a mobile drawer with close affordances', () => {
    const html = renderSidebarPane({ mobile: true });

    expect(html).toContain('absolute inset-y-0 left-0 z-10 shadow-lg');
    expect(html).toContain('aria-label="Close sidebar"');
    expect(html).toContain('absolute inset-0 bg-background/60 backdrop-blur-sm z-[9]');
  });
});
