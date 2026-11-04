import { For, createSignal } from 'solid-js';
import { Dynamic, render } from 'solid-js/web';
import {
  FloeProvider,
  builtInShellThemePresets,
  BUILT_IN_SHELL_THEME_DEFAULTS,
  useTheme,
} from '@floegence/floe-webapp-core';
import { ActivityBar, MobileTabBar } from '@floegence/floe-webapp-core/layout';
import { ActivityRailIcons, RailLaunchpad } from '@floegence/floe-webapp-core/icons';
import '../../index.css';

function Fixture() {
  const theme = useTheme();
  const [active, setActive] = createSignal('files');
  const [expanded, setExpanded] = createSignal(false);
  const items = Object.entries(ActivityRailIcons).map(([id, icon]) => ({
    id,
    icon,
    label: id,
    collapseBehavior: 'preserve' as const,
  }));
  const disclosure = {
    id: 'plugins',
    icon: RailLaunchpad,
    label: 'Plugins',
    ariaExpanded: expanded,
    ariaHasPopup: 'dialog' as const,
    onClick: () => setExpanded((value) => !value),
  };
  Object.assign(window, {
    activityIconFixture: { theme, presets: builtInShellThemePresets, setActive },
  });
  return (
    <main class="min-h-screen bg-background text-foreground flex">
      <ActivityBar
        items={items}
        bottomItems={[disclosure]}
        activeId={active()}
        onActiveChange={setActive}
        ariaLabel="Desktop activities"
      />
      <div class="flex-1 min-w-0 p-6">
        <h1 class="text-lg font-semibold">Floe light face / solid selection</h1>
        <p class="text-sm text-muted-foreground mt-2 mb-6">
          Rounded shapes, transparent cutouts, and shared navigation state.
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-icon-gallery>
          <For each={items}>
            {(item) => (
              <div
                class="rounded-md border border-border p-4 flex items-center gap-4"
                data-icon-pair={item.id}
              >
                <Dynamic component={item.icon} size={20} class="text-activity-bar-foreground" />
                <Dynamic
                  component={item.icon}
                  size={20}
                  active
                  class="text-activity-bar-foreground-active"
                />
                <span class="text-xs">{item.label}</span>
              </div>
            )}
          </For>
        </div>
        <div class="mt-8 max-w-md">
          <MobileTabBar
            items={items.slice(0, 4)}
            actions={[disclosure]}
            activeId={active()}
            onSelect={setActive}
            ariaLabel="Mobile activities"
          />
        </div>
      </div>
    </main>
  );
}

render(
  () => (
    <FloeProvider
      config={{
        storage: { namespace: 'floe-activity-icons' },
        theme: {
          shellPresets: builtInShellThemePresets,
          defaultShellPreset: BUILT_IN_SHELL_THEME_DEFAULTS,
        },
      }}
    >
      <Fixture />
    </FloeProvider>
  ),
  document.getElementById('root')!
);
