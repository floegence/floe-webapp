import { createSignal, onMount } from 'solid-js';
import { render } from 'solid-js/web';
import { FloeProvider, useTheme, builtInShellThemePresets } from '@floegence/floe-webapp-core';
import { Input, SettingsLayout, SettingsNavigation, SettingsSection, SettingsList, SettingRow } from '@floegence/floe-webapp-core/ui';
import '../../index.css';

function SettingsDemo() {
  const theme = useTheme();
  const [selected, setSelected] = createSignal('general');
  const [query, setQuery] = createSignal('');
  const groups = [{ id: 'workspace', label: 'Workspace', items: [{ id: 'general', label: 'General' }, { id: 'security', label: 'Security & permissions' }] }];
  onMount(() => Object.assign(window, { settingsFixture: { theme, themes: builtInShellThemePresets } }));
  return (
    <div style={{ height: '100dvh', display: 'flex' }}>
      <SettingsLayout sidebar={<SettingsNavigation label="Settings" groups={groups.map((group) => ({ ...group, items: group.items.filter((item) => item.label.toLowerCase().includes(query().toLowerCase())) }))} value={selected()} onChange={setSelected} search={<Input aria-label="Search settings" value={query()} onInput={(event) => setQuery(event.currentTarget.value)} />} empty={<p>No settings found</p>} />}
        mobileNavigation={<select aria-label="Settings page" value={selected()} onChange={(event) => setSelected(event.currentTarget.value)}><option value="general">General</option><option value="security">Security & permissions</option></select>}>
        <div class="absolute inset-0 overflow-auto"><div class="floe-settings-page">
          <SettingsSection variant="page" title={selected() === 'general' ? 'General' : 'Security & permissions'} description="A clear, accessible workspace for your preferences.">
            <SettingsList>
              <SettingRow title="Workspace directory" description="Choose the default working directory for new sessions." control={<Input aria-label="Workspace directory" value="/workspace" />} />
              <SettingRow title="Long localized setting label that must wrap without squeezing the editable control" description="Detailed explanations remain readable when the workspace is narrow." control={<Input aria-label="Shell" value="/bin/zsh" />} />
            </SettingsList>
            <SettingsSection title="Details" description="Configuration paths stay readable."><SettingRow title="Configuration"><code style={{ 'overflow-wrap': 'anywhere' }}>/workspace/long-directory-name/project-with-a-descriptive-name/settings/runtime-config.json</code></SettingRow></SettingsSection>
          </SettingsSection>
        </div></div>
      </SettingsLayout>
    </div>
  );
}
render(() => <FloeProvider><SettingsDemo /></FloeProvider>, document.getElementById('root')!);
