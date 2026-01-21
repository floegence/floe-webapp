import { Show, onMount } from 'solid-js';
import {
  FloeProvider,
  useTheme,
  useCommand,
  useNotification,
  useComponentRegistry,
  useComponentContextFactory,
  Shell,
  CommandPalette,
  NotificationContainer,
  Button,
  type FloeComponent,
  SidebarSection,
  SidebarItem,
  BottomBarItem,
  StatusIndicator,
  Files,
  Search,
  Settings,
  Terminal,
  Sun,
  Moon,
  GitBranch,
  Bell,
} from '@floegence/floe-webapp-core';
import {
  ProtocolProvider,
  useProtocol,
  type ConnectConfig,
} from '@floegence/floe-webapp-protocol';

// Demo sidebar components
function FileExplorer() {
  return (
    <div>
      <SidebarSection title="Explorer">
        <SidebarItem icon={<Files class="w-4 h-4" />}>src</SidebarItem>
        <SidebarItem icon={<Files class="w-4 h-4" />} indent={1}>components</SidebarItem>
        <SidebarItem icon={<Files class="w-4 h-4" />} indent={2}>Button.tsx</SidebarItem>
        <SidebarItem icon={<Files class="w-4 h-4" />} indent={2}>Input.tsx</SidebarItem>
        <SidebarItem icon={<Files class="w-4 h-4" />} indent={1}>utils</SidebarItem>
        <SidebarItem icon={<Files class="w-4 h-4" />} indent={1}>index.ts</SidebarItem>
      </SidebarSection>
    </div>
  );
}

function SearchPanel() {
  return (
    <div class="p-3">
      <p class="text-sm text-muted-foreground">Search across your workspace</p>
    </div>
  );
}

function SettingsPanel() {
  const theme = useTheme();
  const notifications = useNotification();
  const protocol = useProtocol();

  const connect = async () => {
    const baseUrl = import.meta.env.VITE_FLOE_CONTROLPLANE_BASE_URL;
    const endpointId = import.meta.env.VITE_FLOE_ENDPOINT_ID;

    if (!baseUrl || !endpointId) {
      notifications.warning(
        'Missing protocol config',
        'Set VITE_FLOE_CONTROLPLANE_BASE_URL and VITE_FLOE_ENDPOINT_ID in your environment.'
      );
      return;
    }

    try {
      const config: ConnectConfig = {
        mode: 'tunnel',
        controlplane: { baseUrl, endpointId },
      };
      await protocol.connect(config);
      notifications.success('Connected', 'Flowersec tunnel established.');
    } catch (e) {
      notifications.error('Connection failed', e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div class="p-3 space-y-4">
      <div>
        <h3 class="text-sm font-medium mb-2">Connection</h3>
        <div class="flex items-center gap-2">
          <span class="text-sm text-muted-foreground">Status: {protocol.status()}</span>
          <Button
            size="sm"
            variant={protocol.status() === 'connected' ? 'outline' : 'default'}
            disabled={protocol.status() === 'connecting'}
            onClick={() => {
              if (protocol.status() === 'connected') {
                protocol.disconnect();
                notifications.info('Disconnected', 'Connection closed.');
              } else {
                void connect();
              }
            }}
          >
            {protocol.status() === 'connected' ? 'Disconnect' : 'Connect'}
          </Button>
        </div>
        <p class="mt-2 text-xs text-muted-foreground">
          Configure with <code class="font-mono">VITE_FLOE_CONTROLPLANE_BASE_URL</code> and{' '}
          <code class="font-mono">VITE_FLOE_ENDPOINT_ID</code>.
        </p>
        <Show when={protocol.error()}>
          <p class="mt-2 text-xs text-error">
            {protocol.error()?.message}
          </p>
        </Show>
      </div>
      <div>
        <h3 class="text-sm font-medium mb-2">Appearance</h3>
        <div class="flex gap-2">
          <Button
            variant={theme.resolvedTheme() === 'light' ? 'default' : 'outline'}
            size="sm"
            icon={Sun}
            onClick={() => theme.setTheme('light')}
          >
            Light
          </Button>
          <Button
            variant={theme.resolvedTheme() === 'dark' ? 'default' : 'outline'}
            size="sm"
            icon={Moon}
            onClick={() => theme.setTheme('dark')}
          >
            Dark
          </Button>
        </div>
      </div>
    </div>
  );
}

function DemoBranchItem() {
  return (
    <BottomBarItem icon={<GitBranch class="w-3 h-3" />}>
      main
    </BottomBarItem>
  );
}

function DemoProtocolStatus() {
  const protocol = useProtocol();
  return <StatusIndicator status={protocol.status()} />;
}

function DemoEncodingItem() {
  return <BottomBarItem>UTF-8</BottomBarItem>;
}

function DemoCursorItem() {
  return <BottomBarItem>Ln 1, Col 1</BottomBarItem>;
}

function DemoLanguageItem() {
  return <BottomBarItem>TypeScript</BottomBarItem>;
}

// Main app content
function AppContent() {
  const command = useCommand();
  const theme = useTheme();
  const registry = useComponentRegistry();
  const createCtx = useComponentContextFactory();
  const protocol = useProtocol();

  const demoComponents: FloeComponent[] = [
    {
      id: 'files',
      name: 'Files',
      icon: Files,
      description: 'Browse project files',
      component: FileExplorer,
      sidebar: { order: 1 },
      commands: [
        {
          id: 'file.new',
          title: 'New File',
          keybind: 'mod+n',
          category: 'File',
          execute: ({ notifications }) => {
            notifications.info('New File', 'Creating a new file...');
          },
        },
        {
          id: 'file.save',
          title: 'Save File',
          keybind: 'mod+s',
          category: 'File',
          execute: ({ notifications }) => {
            notifications.success('Saved', 'File saved successfully');
          },
        },
      ],
      statusBar: [
        { id: 'status.connection', position: 'left', order: 0, component: DemoProtocolStatus },
        { id: 'status.branch', position: 'left', order: 10, component: DemoBranchItem },
        { id: 'status.lang', position: 'right', order: 0, component: DemoLanguageItem },
        { id: 'status.cursor', position: 'right', order: 10, component: DemoCursorItem },
        { id: 'status.encoding', position: 'right', order: 20, component: DemoEncodingItem },
      ],
    },
    {
      id: 'search',
      name: 'Search',
      icon: Search,
      description: 'Search across your workspace',
      component: SearchPanel,
      sidebar: { order: 2 },
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: Settings,
      description: 'Preferences and appearance',
      component: SettingsPanel,
      sidebar: { order: 3 },
      commands: [
        {
          id: 'protocol.toggle',
          title: 'Connect / Disconnect',
          description: 'Toggle Flowersec tunnel connection',
          category: 'Connection',
          execute: async (ctx) => {
            const p = ctx.protocol as undefined | {
              status: () => 'disconnected' | 'connecting' | 'connected' | 'error';
              connect: (config: ConnectConfig) => Promise<void>;
              disconnect: () => void;
            };

            if (!p) {
              ctx.notifications.warning('Protocol', 'Protocol service is not available.');
              return;
            }

            if (p.status() === 'connected') {
              p.disconnect();
              ctx.notifications.info('Disconnected', 'Connection closed.');
              return;
            }

            const baseUrl = import.meta.env.VITE_FLOE_CONTROLPLANE_BASE_URL;
            const endpointId = import.meta.env.VITE_FLOE_ENDPOINT_ID;
            if (!baseUrl || !endpointId) {
              ctx.notifications.warning(
                'Missing protocol config',
                'Set VITE_FLOE_CONTROLPLANE_BASE_URL and VITE_FLOE_ENDPOINT_ID in your environment.'
              );
              return;
            }

            try {
              await p.connect({ mode: 'tunnel', controlplane: { baseUrl, endpointId } });
              ctx.notifications.success('Connected', 'Flowersec tunnel established.');
            } catch (e) {
              ctx.notifications.error('Connection failed', e instanceof Error ? e.message : String(e));
            }
          },
        },
        {
          id: 'theme.toggle',
          title: 'Toggle Theme',
          description: 'Switch between light and dark mode',
          icon: Moon,
          keybind: 'mod+shift+t',
          category: 'Appearance',
          execute: ({ theme }) => theme.toggleTheme(),
        },
        {
          id: 'notification.test',
          title: 'Show Test Notification',
          description: 'Display a test notification',
          icon: Bell,
          category: 'Debug',
          execute: ({ notifications }) => {
            notifications.success('Hello!', 'This is a test notification');
          },
        },
      ],
    },
  ];

  // Register and mount components once
  onMount(() => {
    registry.registerAll(demoComponents);
    void registry.mountAll((id) => createCtx(id, { protocol }));
  });

  return (
    <>
      <Shell
        logo={
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-bold text-sm">
            F
          </div>
        }
        topBarActions={
          <div class="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => theme.toggleTheme()}
              title="Toggle theme"
            >
              {theme.resolvedTheme() === 'light' ? <Moon class="w-4 h-4" /> : <Sun class="w-4 h-4" />}
            </Button>
          </div>
        }
        terminalPanel={
          <div class="h-full flex items-center justify-center text-muted-foreground">
            <Terminal class="w-6 h-6 mr-2" />
            Terminal placeholder
          </div>
        }
      >
        {/* Main content area */}
        <div class="h-full flex flex-col items-center justify-center p-8">
          <div class="max-w-2xl text-center space-y-6">
            <h1 class="text-4xl font-bold">Welcome to Floe Webapp</h1>
            <p class="text-lg text-muted-foreground">
              A professional VSCode-style web application framework built with Solid.js
            </p>
            <div class="flex flex-wrap justify-center gap-4">
              <Button onClick={() => command.open()}>
                Open Command Palette ({command.getKeybindDisplay('mod+k')})
              </Button>
              <Button variant="outline" onClick={() => theme.toggleTheme()}>
                Toggle Theme
              </Button>
            </div>
            <div class="pt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              <div class="p-4 rounded-lg border border-border bg-card">
                <h3 class="font-semibold mb-2">VSCode Layout</h3>
                <p class="text-sm text-muted-foreground">
                  Activity bar, sidebar, panels, and status bar
                </p>
              </div>
              <div class="p-4 rounded-lg border border-border bg-card">
                <h3 class="font-semibold mb-2">Mobile First</h3>
                <p class="text-sm text-muted-foreground">
                  Responsive design with mobile tab bar
                </p>
              </div>
              <div class="p-4 rounded-lg border border-border bg-card">
                <h3 class="font-semibold mb-2">Theme System</h3>
                <p class="text-sm text-muted-foreground">
                  Light and dark themes with CSS variables
                </p>
              </div>
            </div>
          </div>
        </div>
      </Shell>

      <CommandPalette />
      <NotificationContainer />
    </>
  );
}

export function App() {
  return (
    <FloeProvider wrapAfterTheme={(children) => <ProtocolProvider>{children}</ProtocolProvider>}>
      <AppContent />
    </FloeProvider>
  );
}
