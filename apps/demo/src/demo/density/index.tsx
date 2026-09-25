import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { FloeProvider } from '@floegence/floe-webapp-core';
import { AffixInput, Button, Input, MonitoringChart, NumberInput, Select, Textarea, SettingRow, SettingsLayout, SettingsNavigation, SettingsSection } from '@floegence/floe-webapp-core/ui';
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
    <section data-testid="interface-scale">
      <p data-testid="reading-scale" style={{ 'font-size': 'var(--floe-type-body)', 'line-height': 'var(--floe-line-body)' }}>Read the workspace and review the changes.</p>
      <SettingsSection title="Workspace settings" variant="page">
        <SettingRow title="Workspace name" description="Used in navigation and project lists." control={<Input aria-label="Workspace name" value="Example" />} />
        <div class="flex flex-wrap gap-2">
          <Button size="sm">Inline action</Button><Button>Primary action</Button>
        </div>
      </SettingsSection>
    </section>
    <section data-testid="navigation-scale">
      <SettingsNavigation label="Workspace navigation" groups={[{ id: 'workspace', label: 'Workspace', items: Array.from({ length: 20 }, (_, index) => ({ id: String(index), label: `Workspace ${index + 1}` })) }]} value="0" onChange={() => undefined} />
    </section>
    <section data-testid="compound-scale" class="flex flex-wrap items-start gap-2">
      <NumberInput value={2} onChange={() => undefined} />
      <AffixInput aria-label="Service address" prefix="https://" value="example.test" />
      <Select aria-label="Environment" onChange={() => undefined} value="local" options={[{ value: 'local', label: 'Local' }]} />
      <Textarea aria-label="Workspace description" value="Draft description" />
    </section>
  </main>;
}

render(() => <FloeProvider><CompactSurfaces /></FloeProvider>, document.getElementById('root')!);
