import { Match, Show, Switch, createMemo, createSignal, onMount, type Component } from 'solid-js';
import { createHighlighter } from 'shiki';
import {
  ActivityAppsMain,
  BottomBarItem,
  Button,
  CommandPalette,
  configureSyncHighlighter,
  FloeProvider,
  type FloeComponent,
  Files,
  GitBranch,
  Grid3x3,
  Layers,
  LayoutDashboard,
  MessageSquare,
  Moon,
  NotificationContainer,
  Select,
  Search,
  Settings,
  Shell,
  StatusIndicator,
  Sun,
  Terminal,
  useComponentContextFactory,
  useComponentRegistry,
  useLayout,
  useTheme,
} from '@floegence/floe-webapp-core';
import { ProtocolProvider, useProtocol } from '@floegence/floe-webapp-protocol';
import { demoFiles } from './demo/workspace';
import { FileViewerPage } from './demo/pages/FileViewerPage';
import { SearchPage } from './demo/pages/SearchPage';
import { ShowcasePage } from './demo/pages/ShowcasePage';
import { DeckPage } from './demo/pages/DeckPage';
import { LaunchpadPage } from './demo/pages/LaunchpadPage';
import { ChatPage } from './demo/pages/ChatPage';
import { DesignTokensPage } from './demo/pages/DesignTokensPage';
import { FileExplorer } from './demo/sidebar/FileExplorer';
import { SearchSidebar } from './demo/sidebar/SearchSidebar';
import { SettingsPanel } from './demo/sidebar/SettingsPanel';
import { ShowcaseSidebar } from './demo/sidebar/ShowcaseSidebar';
import { ChatSidebar } from './demo/sidebar/ChatSidebar';

function AppContent() {
  const theme = useTheme();
  const registry = useComponentRegistry();
  const createCtx = useComponentContextFactory();
  const protocol = useProtocol();
  const layout = useLayout();

  const [activeFileId, setActiveFileId] = createSignal(demoFiles[0]?.id ?? 'readme');
  const activeFile = createMemo(() => demoFiles.find((f) => f.id === activeFileId()) ?? demoFiles[0]!);

  const [searchQuery, setSearchQuery] = createSignal('');
  const searchResults = createMemo(() => {
    const q = searchQuery().trim().toLowerCase();
    if (!q) return [];
    return demoFiles
      .filter((f) => f.path.toLowerCase().includes(q))
      .slice(0, 50);
  });

  const jumpTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openFile = (id: string) => {
    setActiveFileId(id);
    layout.setSidebarActiveTab('files');
  };

  const DemoBranchItem: Component = () => (
    <BottomBarItem icon={<GitBranch class="w-3 h-3" />}>main</BottomBarItem>
  );

  const DemoProtocolStatus: Component = () => <StatusIndicator status={protocol.status()} />;

  const DemoActiveFileItem: Component = () => (
    <BottomBarItem>{activeFile().path.split('/').slice(-1)[0]}</BottomBarItem>
  );

  const DemoLanguageItem: Component = () => (
    <BottomBarItem>{activeFile().language}</BottomBarItem>
  );

  const ShowcaseView: Component = () => (
    <ShowcaseSidebar onJumpTo={jumpTo} onOpenFile={openFile} />
  );

  const FilesView: Component = () => (
    <FileExplorer files={demoFiles} activeFileId={activeFileId} onSelectFile={setActiveFileId} />
  );

  const SearchView: Component = () => (
    <SearchSidebar
      query={searchQuery}
      results={searchResults}
      onQueryChange={setSearchQuery}
      onOpenFile={openFile}
    />
  );

  const SettingsView: Component = () => <SettingsPanel />;

  const ChatView: Component = () => <ChatSidebar />;

  const DeckView: Component = () => <DeckPage />;

  const DesignTokensView: Component = () => <DesignTokensPage />;

  const LaunchpadView: Component = () => (
    <LaunchpadPage
      onClose={() => layout.setSidebarActiveTab('showcase')}
      onNavigate={(id) => layout.setSidebarActiveTab(id)}
    />
  );

  const demoComponents: FloeComponent[] = [
    {
      id: 'launchpad',
      name: 'Launchpad',
      icon: Grid3x3,
      description: 'macOS-style app launcher',
      component: LaunchpadView,
      sidebar: { order: -1, fullScreen: true },
      commands: [
        {
          id: 'demo.open.launchpad',
          title: 'Demo: Open Launchpad',
          keybind: 'mod+0',
          category: 'Demo',
          execute: () => layout.setSidebarActiveTab('launchpad'),
        },
      ],
    },
    {
      id: 'deck',
      name: 'Deck',
      icon: LayoutDashboard,
      description: 'Grafana-style deck layout editor',
      component: DeckView,
      sidebar: { order: 0, fullScreen: true, hiddenOnMobile: true },
      commands: [
        {
          id: 'demo.open.deck',
          title: 'Demo: Open Deck',
          keybind: 'mod+d',
          category: 'Demo',
          execute: () => layout.setSidebarActiveTab('deck'),
        },
      ],
    },
    {
      id: 'showcase',
      name: 'Showcase',
      icon: Terminal,
      description: 'All core UI components in one place',
      component: ShowcaseView,
      sidebar: { order: 1 },
      commands: [
        {
          id: 'demo.open.showcase',
          title: 'Demo: Open Showcase',
          keybind: 'mod+1',
          category: 'Demo',
          execute: () => layout.setSidebarActiveTab('showcase'),
        },
        {
          id: 'demo.open.getting-started',
          title: 'Demo: Open Getting Started (source)',
          category: 'Demo',
          execute: () => openFile('docs.getting-started'),
        },
      ],
    },
    {
      id: 'files',
      name: 'Files',
      icon: Files,
      description: 'File viewer (Monaco integration)',
      component: FilesView,
      sidebar: { order: 2 },
      commands: [
        {
          id: 'demo.open.files',
          title: 'Demo: Open File Viewer',
          keybind: 'mod+2',
          category: 'Demo',
          execute: () => layout.setSidebarActiveTab('files'),
        },
        {
          id: 'demo.open.readme',
          title: 'Demo: Open README.md',
          category: 'Demo',
          execute: () => openFile('readme'),
        },
        {
          id: 'demo.open.shell-source',
          title: 'Demo: Open Shell.tsx (source)',
          category: 'Demo',
          execute: () => openFile('core.shell'),
        },
      ],
      statusBar: [
        { id: 'status.connection', position: 'left', order: 0, component: DemoProtocolStatus },
        { id: 'status.branch', position: 'left', order: 10, component: DemoBranchItem },
        { id: 'status.file', position: 'right', order: 0, component: DemoActiveFileItem },
        { id: 'status.lang', position: 'right', order: 10, component: DemoLanguageItem },
      ],
    },
    {
      id: 'search',
      name: 'Search',
      icon: Search,
      description: 'Search the demo workspace',
      component: SearchView,
      sidebar: { order: 3 },
      commands: [
        {
          id: 'demo.open.search',
          title: 'Demo: Open Search',
          keybind: 'mod+3',
          category: 'Demo',
          execute: () => layout.setSidebarActiveTab('search'),
        },
      ],
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: Settings,
      description: 'Protocol connection + theme',
      component: SettingsView,
      sidebar: { order: 4 },
      commands: [
        {
          id: 'demo.open.settings',
          title: 'Demo: Open Settings',
          keybind: 'mod+4',
          category: 'Demo',
          execute: () => layout.setSidebarActiveTab('settings'),
        },
        {
          id: 'demo.toggle.theme',
          title: 'Demo: Toggle Theme',
          keybind: 'mod+shift+t',
          category: 'Demo',
          execute: () => theme.toggleTheme(),
        },
      ],
    },
    {
      id: 'chat',
      name: 'Chat',
      icon: MessageSquare,
      description: 'AI chat interface demo',
      component: ChatView,
      sidebar: { order: 5 },
      commands: [
        {
          id: 'demo.open.chat',
          title: 'Demo: Open Chat',
          keybind: 'mod+5',
          category: 'Demo',
          execute: () => layout.setSidebarActiveTab('chat'),
        },
      ],
    },
    {
      id: 'design-tokens',
      name: 'Design Tokens',
      icon: Layers,
      description: 'Design system tokens reference',
      component: DesignTokensView,
      sidebar: { order: 6, fullScreen: true },
      commands: [
        {
          id: 'demo.open.design-tokens',
          title: 'Demo: Open Design Tokens',
          keybind: 'mod+6',
          category: 'Demo',
          execute: () => layout.setSidebarActiveTab('design-tokens'),
        },
      ],
    },
  ];

  registry.registerAll(demoComponents);

  // Initialize Shiki highlighter globally for CodeSnippet components
  const initShiki = async () => {
    try {
      const highlighter = await createHighlighter({
        themes: ['github-dark', 'github-light'],
        langs: ['typescript', 'javascript', 'tsx', 'jsx', 'python', 'json', 'html', 'css', 'bash', 'text', 'shell'],
      });

      configureSyncHighlighter({
        codeToHtml: (code: string, options: { lang: string; theme: string }) => {
          try {
            const loadedLangs = highlighter.getLoadedLanguages();
            const lang = loadedLangs.includes(options.lang as never) ? options.lang : 'text';
            return highlighter.codeToHtml(code, {
              lang,
              theme: options.theme,
            });
          } catch {
            const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `<pre class="shiki"><code>${escaped}</code></pre>`;
          }
        },
      });
    } catch (error) {
      console.error('Failed to initialize Shiki:', error);
      configureSyncHighlighter({
        codeToHtml: (code: string) => {
          const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          return `<pre class="shiki"><code>${escaped}</code></pre>`;
        },
      });
    }
  };

  onMount(() => {
    void initShiki();
    void registry.mountAll((id) => createCtx(id, { protocol }));
  });

  const isFullScreenActive = createMemo(() => {
    const comp = registry.getComponent(layout.sidebarActiveTab());
    return comp?.sidebar?.fullScreen === true;
  });

  const DesktopMain: Component = () => (
    <>
      <ActivityAppsMain />
      <Show when={!isFullScreenActive()}>
        <Switch fallback={<ShowcasePage onOpenFile={openFile} onJumpTo={jumpTo} />}>
          <Match when={layout.sidebarActiveTab() === 'files'}>
            <FileViewerPage file={activeFile} />
          </Match>
          <Match when={layout.sidebarActiveTab() === 'search'}>
            <SearchPage query={searchQuery} results={searchResults} onOpenFile={openFile} />
          </Match>
          <Match when={layout.sidebarActiveTab() === 'settings'}>
            <div class="p-4 max-w-2xl mx-auto space-y-3">
              <h1 class="text-lg font-semibold">Settings</h1>
              <p class="text-xs text-muted-foreground">
                Settings are rendered in the sidebar. Use the command palette to discover demo commands.
              </p>
              <div class="max-w-sm">
                <SettingsPanel />
              </div>
            </div>
          </Match>
          <Match when={layout.sidebarActiveTab() === 'chat'}>
            <ChatPage />
          </Match>
        </Switch>
      </Show>
    </>
  );

  const MobileMain: Component = () => (
    <>
      <ActivityAppsMain />
      <Show when={!isFullScreenActive()}>
        <Switch fallback={<ShowcasePage onOpenFile={openFile} onJumpTo={jumpTo} />}>
          <Match when={layout.sidebarActiveTab() === 'files'}>
            <div class="p-3 border-b border-border bg-background sticky top-0 z-10">
              <Select
                value={activeFileId()}
                onChange={setActiveFileId}
                options={demoFiles.map((f) => ({ value: f.id, label: f.path }))}
              />
            </div>
            <div class="p-4" style={{ height: 'calc(100vh - 180px)', "min-height": '300px' }}>
              <FileViewerPage file={activeFile} />
            </div>
          </Match>
          <Match when={layout.sidebarActiveTab() === 'search'}>
            <SearchPage query={searchQuery} results={searchResults} onOpenFile={openFile} />
          </Match>
          <Match when={layout.sidebarActiveTab() === 'settings'}>
            <div class="p-4 max-w-md mx-auto space-y-3">
              <h1 class="text-lg font-semibold">Settings</h1>
              <SettingsPanel />
            </div>
          </Match>
          <Match when={layout.sidebarActiveTab() === 'chat'}>
            <ChatPage />
          </Match>
        </Switch>
      </Show>
    </>
  );

  return (
    <>
      <Shell
        logo={
          <img src="/logo.svg" alt="Floe" class="w-7 h-7" />
        }
        topBarActions={
          <div class="flex items-center gap-1">
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
          <div class="h-full flex items-center justify-center text-muted-foreground text-xs">
            <Terminal class="w-4 h-4 mr-1.5" />
            Terminal placeholder
          </div>
        }
      >
        <Show when={!layout.isMobile()}>
          <DesktopMain />
        </Show>
        <Show when={layout.isMobile()}>
          <MobileMain />
        </Show>
      </Shell>

      <CommandPalette />
      <NotificationContainer />
    </>
  );
}

export function App() {
  const demoFloeConfig = {
    storage: { namespace: 'floe-demo' },
    deck: {
      storageKey: 'deck',
      defaultActiveLayoutId: 'demo-layout-files-terminal',
      presets: [
        {
          id: 'demo-layout-files-terminal',
          name: 'Files + Terminal',
          // Allow users to rename/delete the default demo layout for experimentation.
          isPreset: false,
          widgets: [
            { id: 'w-files', type: 'file-browser', position: { col: 0, row: 0, colSpan: 12, rowSpan: 12 } },
            { id: 'w-terminal', type: 'terminal', position: { col: 12, row: 0, colSpan: 12, rowSpan: 12 } },
          ],
        },
        {
          id: 'demo-layout-monitoring',
          name: 'Monitoring',
          isPreset: true,
          widgets: [
            { id: 'w-metrics-1', type: 'metrics', position: { col: 0, row: 0, colSpan: 12, rowSpan: 6 } },
            { id: 'w-metrics-2', type: 'metrics', position: { col: 12, row: 0, colSpan: 12, rowSpan: 6 } },
            { id: 'w-terminal', type: 'terminal', position: { col: 0, row: 6, colSpan: 24, rowSpan: 6 } },
          ],
        },
      ],
    },
  } as const;

  return (
    <FloeProvider
      config={demoFloeConfig}
      wrapAfterTheme={(renderChildren) => <ProtocolProvider>{renderChildren()}</ProtocolProvider>}
    >
      <AppContent />
    </FloeProvider>
  );
}
