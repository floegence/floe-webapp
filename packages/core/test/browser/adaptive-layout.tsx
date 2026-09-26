import { render } from 'solid-js/web';
import { FloeProvider } from '../../src/app';
import { useLayout } from '../../src/context/LayoutContext';
import { Shell } from '../../src/layout';
import '../../src/styles/globals.css';

const params = new URLSearchParams(location.search);
const mobileQuery = params.get('host') === 'desktop' ? 'not all'
  : '(max-width: 767px) and (pointer: coarse) and (hover: none)';
const Icon = () => <span>F</span>;
function Probe() {
  const layout = useLayout();
  return <output data-interaction-mode={layout.isMobile() ? 'mobile' : 'desktop'} data-sidebar-collapsed={String(layout.sidebarCollapsed())} />;
}
function Example() {
  return <FloeProvider config={{ storage: { enabled: false }, layout: { mobileQuery, sidebar: { defaultWidth: 272, defaultActiveTab: 'files' } } }}>
    <Probe />
    {params.has('standalone') ? <p>Standalone provider</p> : <Shell sidebarMinContentWidth={480}
      activityItems={[{ id: 'files', label: 'Files', icon: Icon }]}
      sidebarContent={() => <div><input aria-label="Directory search" /><div style={{ height: '1000px' }}>Directories</div></div>}>
      <textarea aria-label="Retained draft" /><button>Main action</button>
    </Shell>}
  </FloeProvider>;
}
render(() => <Example />, document.getElementById('root')!);
