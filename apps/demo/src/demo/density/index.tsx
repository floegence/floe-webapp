import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { FloeProvider } from '@floegence/floe-webapp-core';
import { MonitoringChart, SettingsLayout } from '@floegence/floe-webapp-core/ui';
import '../../index.css';

function CompactSurfaces() {
  const [navigation, setNavigation] = createSignal(false);
  const [reading, setReading] = createSignal('12.5% · 8 cores');
  return <main style={{ padding: '12px' }}>
    <button onClick={() => setNavigation(!navigation())}>Toggle navigation</button>
    <button onClick={() => setReading('25.0% · 8 cores')}>Update reading</button>
    <section data-testid="settings" style={{ height: '100px', position: 'relative', display: 'flex' }}>
      <SettingsLayout sidebar={null} mobileNavigation={navigation() && <select aria-label="Settings section"><option>General</option></select>}>
        <input aria-label="Retained setting" value="draft" />
      </SettingsLayout>
    </section>
    <section data-testid="chart">
      <MonitoringChart title="CPU usage with a long descriptive title" headerMeta={<span data-testid="reading">{reading()}</span>}
        series={[{ name: 'CPU', data: [12, 25, 18] }]} labels={['1', '2', '3']} realtime height={140} showLegend={false} />
    </section>
    <section data-testid="untitled-chart">
      <MonitoringChart series={[]} labels={[]} height={140} />
    </section>
  </main>;
}

render(() => <FloeProvider><CompactSurfaces /></FloeProvider>, document.getElementById('root')!);
