import {
  Show,
  Suspense,
  createMemo,
  batch,
  createSignal,
  createEffect,
  onMount,
  onCleanup,
  lazy,
  type Component,
  type JSX,
} from 'solid-js';
import {
  FileBrowserDragProvider,
  FloeProvider,
  NotificationContainer,
  BUILT_IN_SHELL_THEME_DEFAULTS,
  builtInShellThemePresets,
  deferAfterPaint,
  useComponentContextFactory,
  useComponentRegistry,
  useLayout,
  useNotification,
  usePersisted,
  useTheme,
  cn,
  type FloeComponent,
} from '@floegence/floe-webapp-core';
import { ActivityAppsMain } from '@floegence/floe-webapp-core/app';
import {
  createMarkdownWorker,
  configureMarkdownWorker,
  createDiffWorker,
  configureDiffWorker,
  terminateMarkdownWorker,
  terminateDiffWorker,
} from '@floegence/floe-webapp-core/chat';
import {
  DisplayModePageShell,
  DisplayModeSwitcher,
  KeepAliveStack,
  Shell,
  ThemeToggle,
  sanitizeDisplayMode,
  type KeepAliveView,
} from '@floegence/floe-webapp-core/layout';
import { CommandPalette, Select } from '@floegence/floe-webapp-core/ui';
import {
  Bookmark,
  Files,
  Grid3x3,
  Layers,
  LayoutDashboard,
  MessageSquare,
  Moon,
  RailChat,
  RailDesignTokens,
  RailFiles,
  RailLaunchpad,
  RailNotes,
  RailSearch,
  RailSettings,
  RailShowcase,
  Search,
  Sun,
  Terminal,
} from '@floegence/floe-webapp-core/icons';
import { LaunchpadModal, type LaunchpadItemData } from '@floegence/floe-webapp-core/launchpad';
import {
  ProtocolProvider,
  useProtocol,
  type ProtocolContract,
} from '@floegence/floe-webapp-protocol';

import { FloeLogo } from './demo/components/FloeLogo';
import { ensureDemoHighlighting } from './demo/highlighting';
import { demoFiles } from './demo/workspace';
import { FileExplorer } from './demo/sidebar/FileExplorer';
import { SearchSidebar } from './demo/sidebar/SearchSidebar';
import { SettingsPanel } from './demo/sidebar/SettingsPanel';
import { ShowcaseSidebar } from './demo/sidebar/ShowcaseSidebar';
import { DEFAULT_SHOWCASE_SECTION, SHOWCASE_BY_ID } from './demo/showcaseCatalog';
import { ChatSidebar } from './demo/sidebar/ChatSidebar';
import { demoChartThemePresets } from './demo/chartThemePresets';
import { NotesDemoProvider } from './demo/notes/NotesDemoContext';
import { WorkbenchDemoProvider } from './demo/workbench/WorkbenchDemoContext';
import type { DisplayMode } from '@floegence/floe-webapp-core/layout';

const demoProtocolContract: ProtocolContract = {
  id: 'demo_v1',
  createRpc: () => ({}),
};

const FileViewerPage = lazy(() =>
  import('./demo/pages/FileViewerPage').then((m) => ({ default: m.FileViewerPage }))
);
const SearchPage = lazy(() =>
  import('./demo/pages/SearchPage').then((m) => ({ default: m.SearchPage }))
);
const ShowcasePage = lazy(() =>
  import('./demo/pages/ShowcasePage').then((m) => ({ default: m.ShowcasePage }))
);
const HomePage = lazy(() => import('./demo/pages/HomePage').then((m) => ({ default: m.HomePage })));
const ScenariosPage = lazy(() =>
  import('./demo/pages/ScenariosPage').then((m) => ({ default: m.ScenariosPage }))
);
const DeckPage = lazy(() => import('./demo/pages/DeckPage').then((m) => ({ default: m.DeckPage })));
const ChatPage = lazy(() => import('./demo/pages/ChatPage').then((m) => ({ default: m.ChatPage })));
const DesignTokensPage = lazy(() =>
  import('./demo/pages/DesignTokensPage').then((m) => ({ default: m.DesignTokensPage }))
);
const NotesPage = lazy(() =>
  import('./demo/notes/NotesPage').then((m) => ({ default: m.NotesPage }))
);
const WorkbenchPage = lazy(() =>
  import('./demo/workbench/WorkbenchPage').then((m) => ({ default: m.WorkbenchPage }))
);

const renderLazyPage = (view: JSX.Element, label: string): JSX.Element => (
  <Suspense
    fallback={
      <div class="h-full min-h-[240px] w-full flex items-center justify-center text-xs text-[var(--floe-ink-soft)]">
        Loading {label}...
      </div>
    }
  >
    {view}
  </Suspense>
);

function AppContent() {
  const theme = useTheme();
  const notifications = useNotification();
  const registry = useComponentRegistry();
  const createCtx = useComponentContextFactory();
  const protocol = useProtocol();
  const layout = useLayout();

  const [activeFileId, setActiveFileId] = createSignal(demoFiles[0]?.id ?? 'readme');
  const activeFile = createMemo(
    () => demoFiles.find((f) => f.id === activeFileId()) ?? demoFiles[0]!
  );

  const [searchQuery, setSearchQuery] = createSignal('');
  const [searchQueryApplied, setSearchQueryApplied] = createSignal('');
  let searchApplyJob = 0;
  createEffect(() => {
    const next = searchQuery().trim();
    searchApplyJob += 1;
    const jobId = searchApplyJob;

    if (!next) {
      setSearchQueryApplied('');
      return;
    }

    // UI-first search: let the input paint first, then compute results.
    deferAfterPaint(() => {
      if (jobId !== searchApplyJob) return;
      setSearchQueryApplied(next.toLowerCase());
    });
  });

  const searchResults = createMemo(() => {
    const q = searchQueryApplied();
    if (!q) return [];
    return demoFiles.filter((f) => f.path.toLowerCase().includes(q)).slice(0, 50);
  });

  // The showcase is a set of pages, not one long scroll. This is the page the
  // sidebar and the catalog grid both select.
  const [showcaseSection, setShowcaseSection] = usePersisted<string>(
    'demo.showcaseSection.v1',
    DEFAULT_SHOWCASE_SECTION
  );
  const [scenario, setScenario] = usePersisted<string>('demo.scenario.v1', 'overview');
  const selectShowcaseSection = (id: string) =>
    batch(() => {
      if (!SHOWCASE_BY_ID.has(id)) return;
      setShowcaseSection(id);
      setDisplayMode('activity');
      if (layout.sidebarActiveTab() !== 'showcase') setSidebarActiveTab('showcase');
    });

  const openScenario = (id: string) =>
    batch(() => {
      if (!['overview', 'files', 'task', 'compositions'].includes(id)) return;
      setScenario(id);
      selectShowcaseSection('scenarios');
    });

  const openFile = (id: string) => {
    setActiveFileId(id);
    layout.setSidebarActiveTab('files');
  };

  const [launchpadOpen, setLaunchpadOpen] = createSignal(false);
  const [notesOverlayOpen, setNotesOverlayOpen] = createSignal(false);

  // Top-level display mode. Activity = the standard Shell with activity bar +
  // sidebar + main; Deck and Workbench are full-page display modes that own
  // the whole viewport and never render the activity bar. Persisted across
  // reloads so the user stays in whichever mode they last selected.
  const [persistedDisplayMode, setPersistedDisplayMode] = usePersisted<DisplayMode>(
    'demo.displayMode.v1',
    'activity'
  );
  const displayMode = () => sanitizeDisplayMode(persistedDisplayMode());
  const setDisplayMode = (mode: DisplayMode) => setPersistedDisplayMode(mode);
  const openDisplayMode = (mode: DisplayMode) => setDisplayMode(mode);
  const [routeReady, setRouteReady] = createSignal(false);
  const currentRoute = () => {
    const url = new URL(location.href);
    const mode = displayMode();
    const tab = layout.sidebarActiveTab();
    url.searchParams.set('view', mode === 'activity' && tab === 'showcase' ? 'showcase' : mode);
    for (const key of ['tab', 'section', 'scenario']) url.searchParams.delete(key);
    if (mode === 'activity') {
      if (tab === 'showcase') {
        url.searchParams.set('section', showcaseSection());
        if (showcaseSection() === 'scenarios') url.searchParams.set('scenario', scenario());
      } else url.searchParams.set('tab', tab);
    }
    return url;
  };
  createEffect(() => {
    if (!routeReady()) return;
    const url = currentRoute();
    if (url.href !== location.href) history.pushState(null, '', url);
  });

  const demoLaunchpadItems: LaunchpadItemData[] = [
    {
      id: 'notes',
      name: 'Notes',
      icon: RailNotes,
      description: 'Endless sticky-note canvas demo',
      color: 'linear-gradient(135deg, #f2dfad 0%, #c98d55 100%)',
    },
    {
      id: 'workbench',
      name: 'Workbench',
      icon: Grid3x3,
      description: 'Infinite widget canvas demo',
      color: 'linear-gradient(135deg, #5b86e5 0%, #36d1dc 100%)',
    },
    {
      id: 'showcase',
      name: 'Showcase',
      icon: RailShowcase,
      description: 'View all UI components',
      color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    {
      id: 'files',
      name: 'Files',
      icon: RailFiles,
      description: 'Browse project files',
      color: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    },
    {
      id: 'search',
      name: 'Search',
      icon: RailSearch,
      description: 'Search the workspace',
      color: 'linear-gradient(135deg, #fc4a1a 0%, #f7b733 100%)',
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: RailSettings,
      description: 'Configure preferences',
      color: 'linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%)',
    },
    {
      id: 'chat',
      name: 'Chat',
      icon: RailChat,
      description: 'AI chat interface demo',
      color: 'linear-gradient(135deg, #1d2671 0%, #c33764 100%)',
    },
    {
      id: 'deck',
      name: 'Deck',
      icon: LayoutDashboard,
      description: 'Grafana-style deck layout editor',
      color: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
    },
    {
      id: 'design-tokens',
      name: 'Design Tokens',
      icon: RailDesignTokens,
      description: 'Design system tokens reference',
      color: 'linear-gradient(135deg, #4b6cb7 0%, #182848 100%)',
    },
    {
      id: 'theme-light',
      name: 'Light Mode',
      icon: Sun,
      description: 'Switch to light theme',
      color: 'linear-gradient(135deg, #f5af19 0%, #f12711 100%)',
    },
    {
      id: 'theme-dark',
      name: 'Dark Mode',
      icon: Moon,
      description: 'Switch to dark theme',
      color: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
    },
  ];

  const setSidebarActiveTab = (id: string) => {
    const comp = registry.getComponent(id);
    const fullScreen = comp?.sidebar?.fullScreen ?? false;
    const renderInMain = comp?.sidebar?.renderIn === 'main';
    layout.setSidebarActiveTab(id, { openSidebar: !(fullScreen || renderInMain) });
  };

  const switchDisplayMode = (mode: DisplayMode, label?: string) => {
    setDisplayMode(mode);
    if (label) {
      notifications.success('Display mode', `Switched to ${label}`);
    }
  };

  const handleLaunchpadSelect = (item: LaunchpadItemData) => {
    switch (item.id) {
      case 'notes':
        setNotesOverlayOpen(true);
        notifications.success('Launched', 'Opening Notes');
        return;
      case 'workbench':
        switchDisplayMode('workbench', 'Workbench');
        return;
      case 'deck':
        switchDisplayMode('deck', 'Deck');
        return;
      case 'theme-light':
        theme.setTheme('light');
        notifications.success('Theme', 'Switched to light mode');
        return;
      case 'theme-dark':
        theme.setTheme('dark');
        notifications.success('Theme', 'Switched to dark mode');
        return;
    }

    // For non-mode items, ensure we're back in Activity mode before
    // navigating to a sidebar tab.
    if (displayMode() !== 'activity') {
      setDisplayMode('activity');
    }

    const comp = registry.getComponent(item.id);
    if (comp) {
      notifications.success('Launched', `Opening ${item.name}`);
      setSidebarActiveTab(item.id);
      return;
    }

    notifications.info('Not implemented', `${item.name} is a demo item`);
  };

  const shellActivityItems = createMemo(() => {
    // Activity-mode-only items. Deck and Workbench are top-level display
    // modes (switched via the header bar) and intentionally absent here.
    return [
      {
        id: 'launchpad-modal',
        icon: RailLaunchpad,
        label: 'Launchpad',
        onClick: () => setLaunchpadOpen(true),
      },
      {
        id: 'notes',
        icon: RailNotes,
        label: 'Notes',
        onClick: () => setNotesOverlayOpen((open) => !open),
      },
      { id: 'showcase', icon: RailShowcase, label: 'Showcase' },
      { id: 'files', icon: RailFiles, label: 'Files' },
      { id: 'search', icon: RailSearch, label: 'Search' },
      { id: 'chat', icon: RailChat, label: 'Chat' },
      {
        id: 'design-tokens',
        icon: RailDesignTokens,
        label: 'Design Tokens',
        collapseBehavior: 'preserve' as const,
      },
    ];
  });

  // Demo state migration: Launchpad is now a modal, not an activity tab.
  createEffect(() => {
    if (layout.sidebarActiveTab() !== 'launchpad') return;
    layout.setSidebarActiveTab('showcase', { openSidebar: false });
  });

  // Notes is an overlay, not a main-content view.
  createEffect(() => {
    if (layout.sidebarActiveTab() !== 'notes') return;
    setSidebarActiveTab('files');
  });

  const ShowcaseView: Component = () => (
    <ShowcaseSidebar
      activeSection={showcaseSection()}
      onSelectSection={selectShowcaseSection}
      onOpenFile={openFile}
    />
  );

  // The showcase tab holds three kinds of page: the introduction, the scenario
  // gallery, and the component catalog. The sidebar selects which one, so the
  // render has to follow the persisted section rather than mount once.
  const ShowcaseRoute: Component = () => (
    <KeepAliveStack
      activeId={
        showcaseSection() === 'home'
          ? 'home'
          : showcaseSection() === 'scenarios'
            ? 'scenarios'
            : 'catalog'
      }
      views={[
        {
          id: 'home',
          render: () => (
            <HomePage
              onSelectSection={selectShowcaseSection}
              onOpenFile={openFile}
              onOpenMode={openDisplayMode}
              onOpenScenario={openScenario}
            />
          ),
        },
        {
          id: 'scenarios',
          render: () => (
            <ScenariosPage activeScenario={scenario()} onSelectScenario={openScenario} />
          ),
        },
        {
          id: 'catalog',
          render: () => (
            <ShowcasePage
              section={showcaseSection()}
              onOpenFile={openFile}
              onSelectSection={selectShowcaseSection}
            />
          ),
        },
      ]}
    />
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

  const NotesRegistrationView: Component = () => null;
  const WorkbenchRegistrationView: Component = () => null;
  const DeckRegistrationView: Component = () => null;

  const DesignTokensView: Component = () => renderLazyPage(<DesignTokensPage />, 'design tokens');

  const demoComponents: FloeComponent[] = [
    {
      id: 'notes',
      name: 'Notes',
      icon: Bookmark,
      description: 'Infinite sticky-note capture board overlay',
      component: NotesRegistrationView,
      commands: [
        {
          id: 'demo.open.notes',
          title: 'Demo: Open Notes',
          keybind: 'mod+7',
          category: 'Demo',
          execute: () => {
            setNotesOverlayOpen(true);
          },
        },
      ],
    },
    {
      id: 'workbench',
      name: 'Workbench',
      icon: Grid3x3,
      description: 'Switch to Workbench display mode',
      component: WorkbenchRegistrationView,
      commands: [
        {
          id: 'demo.mode.workbench',
          title: 'Display: Switch to Workbench',
          keybind: 'mod+8',
          category: 'Display Modes',
          execute: () => switchDisplayMode('workbench', 'Workbench'),
        },
      ],
    },
    {
      id: 'deck',
      name: 'Deck',
      icon: LayoutDashboard,
      description: 'Switch to Deck display mode',
      component: DeckRegistrationView,
      commands: [
        {
          id: 'demo.mode.deck',
          title: 'Display: Switch to Deck',
          keybind: 'mod+d',
          category: 'Display Modes',
          execute: () => switchDisplayMode('deck', 'Deck'),
        },
        {
          id: 'demo.mode.activity',
          title: 'Display: Switch to Activity',
          keybind: 'mod+9',
          category: 'Display Modes',
          execute: () => switchDisplayMode('activity', 'Activity'),
        },
      ],
    },
    {
      id: 'showcase',
      name: 'Showcase',
      icon: Terminal,
      description: 'All core UI components in one place',
      component: ShowcaseView,
      sidebar: { order: 2 },
      commands: [
        {
          id: 'demo.open.launchpad',
          title: 'Demo: Open Launchpad',
          keybind: 'mod+0',
          category: 'Demo',
          execute: () => setLaunchpadOpen(true),
        },
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
      sidebar: { order: 3 },
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
    },
    {
      id: 'search',
      name: 'Search',
      icon: Search,
      description: 'Search the demo workspace',
      component: SearchView,
      sidebar: { order: 4 },
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
      description: 'Protocol connection + shell theme + chart themes',
      component: SettingsView,
      sidebar: { order: 5 },
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
      sidebar: { order: 6 },
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
      sidebar: { order: 7, fullScreen: true },
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

  onMount(() => {
    const preview = new URLSearchParams(window.location.search);
    const colorMode = preview.get('mode');
    if (colorMode === 'light' || colorMode === 'dark') theme.setTheme(colorMode);
    const shellPreset = theme.shellPresets().find((preset) => preset.name === preview.get('theme'));
    if (shellPreset?.mode === 'light' || shellPreset?.mode === 'dark') {
      theme.selectShellTheme(shellPreset.mode, shellPreset.name);
    }
    const applyRoute = () =>
      batch(() => {
        const route = new URLSearchParams(location.search);
        const view = route.get('view');
        if (view === 'workbench' || view === 'deck') {
          setDisplayMode(view);
        } else if (view === 'showcase') {
          const selectedScenario = route.get('scenario');
          if (
            selectedScenario &&
            ['overview', 'files', 'task', 'compositions'].includes(selectedScenario)
          )
            setScenario(selectedScenario);
          const section = route.get('section');
          if (section && SHOWCASE_BY_ID.has(section)) setShowcaseSection(section);
          setDisplayMode('activity');
          setSidebarActiveTab('showcase');
        } else if (view === 'activity') {
          const tab = route.get('tab');
          if (tab && registry.getComponent(tab)) setSidebarActiveTab(tab);
          setDisplayMode('activity');
        }
      });
    applyRoute();
    history.replaceState(null, '', currentRoute());
    setRouteReady(true);
    window.addEventListener('popstate', applyRoute);
    onCleanup(() => window.removeEventListener('popstate', applyRoute));

    void registry.mountAll((id) => createCtx(id, { protocol }));
  });

  let contentRuntimeStarted = false;
  let disposed = false;
  onCleanup(() => {
    disposed = true;
    if (contentRuntimeStarted) {
      terminateMarkdownWorker();
      terminateDiffWorker();
    }
  });
  createEffect(() => {
    if (contentRuntimeStarted || !['files', 'chat'].includes(layout.sidebarActiveTab())) return;
    contentRuntimeStarted = true;
    deferAfterPaint(() => {
      if (disposed) return;
      void ensureDemoHighlighting();
      const md = createMarkdownWorker();
      if (md)
        void configureMarkdownWorker(md).catch((error) =>
          console.error('Markdown initialization failed', error)
        );
      const diff = createDiffWorker();
      if (diff)
        void configureDiffWorker(diff).catch((error) =>
          console.error('Diff initialization failed', error)
        );
    });
  });

  const desktopMainViews: KeepAliveView[] = [
    {
      id: 'showcase',
      render: () => renderLazyPage(<ShowcaseRoute />, 'showcase'),
    },
    {
      id: 'files',
      render: () => renderLazyPage(<FileViewerPage file={activeFile} />, 'file viewer'),
    },
    {
      id: 'search',
      render: () =>
        renderLazyPage(
          <SearchPage query={searchQuery} results={searchResults} onOpenFile={openFile} />,
          'search'
        ),
    },
    {
      id: 'settings',
      render: () => (
        <div class="p-4 max-w-2xl mx-auto space-y-3">
          <h1 class="text-lg font-semibold">Settings</h1>
          <p class="text-xs text-[var(--floe-ink-soft)]">
            Settings are rendered in the sidebar. Use the command palette to discover demo commands.
          </p>
          <div class="max-w-sm">
            <SettingsPanel />
          </div>
        </div>
      ),
    },
    { id: 'chat', render: () => renderLazyPage(<ChatPage />, 'chat') },
  ];

  const mobileMainViews: KeepAliveView[] = [
    {
      id: 'showcase',
      render: () => renderLazyPage(<ShowcaseRoute />, 'showcase'),
    },
    {
      id: 'files',
      render: () =>
        renderLazyPage(
          <>
            <div class="p-3 border-b border-[var(--floe-line)] bg-[var(--floe-plane)] sticky top-0 z-10">
              <Select
                value={activeFileId()}
                onChange={setActiveFileId}
                options={demoFiles.map((f) => ({ value: f.id, label: f.path }))}
              />
            </div>
            <div class="p-4" style={{ height: 'calc(100vh - 180px)', 'min-height': '300px' }}>
              <FileViewerPage file={activeFile} />
            </div>
          </>,
          'file viewer'
        ),
    },
    {
      id: 'search',
      render: () =>
        renderLazyPage(
          <SearchPage query={searchQuery} results={searchResults} onOpenFile={openFile} />,
          'search'
        ),
    },
    {
      id: 'settings',
      render: () => (
        <div class="p-4 max-w-md mx-auto space-y-3">
          <h1 class="text-lg font-semibold">Settings</h1>
          <SettingsPanel />
        </div>
      ),
    },
    { id: 'chat', render: () => renderLazyPage(<ChatPage />, 'chat') },
  ];

  const DesktopMain: Component = () => (
    <>
      <ActivityAppsMain activationMode="after-paint" />
      <KeepAliveStack
        views={desktopMainViews}
        activeId={layout.sidebarActiveTab()}
        activationMode="after-paint"
      />
    </>
  );

  const MobileMain: Component = () => (
    <>
      <ActivityAppsMain activationMode="after-paint" />
      <KeepAliveStack
        views={mobileMainViews}
        activeId={layout.sidebarActiveTab()}
        activationMode="after-paint"
      />
    </>
  );

  // The shell has no global status bar any more, so the connection state lives
  // with the other shell-level controls instead of a strip under the content.
  const DemoConnectionChip: Component = () => {
    const state = () => protocol.status();
    const tone = () =>
      state() === 'connected'
        ? 'var(--success)'
        : state() === 'connecting' || state() === 'waiting'
          ? 'var(--warning)'
          : state() === 'idle'
            ? 'var(--floe-ink-quiet)'
            : 'var(--error)';
    const label = () =>
      state() === 'connected'
        ? 'Connected'
        : state() === 'connecting' || state() === 'waiting'
          ? 'Connecting'
          : state() === 'failed'
            ? 'Error'
            : state() === 'idle'
              ? 'Local demo'
              : 'Disconnected';
    return (
      <span class="hidden items-center gap-1.5 text-[length:var(--floe-type-caption)] text-[var(--floe-ink-soft)] sm:inline-flex">
        <span
          class={cn(
            'h-1.5 w-1.5 rounded-full',
            (state() === 'connecting' || state() === 'waiting') && 'animate-pulse'
          )}
          style={{ 'background-color': tone() }}
        />
        {label()}
      </span>
    );
  };

  // Shared header actions: rendered in every display mode's top bar so the
  // user can switch modes (and toggle the theme) without losing context.
  const HeaderActions: Component = () => (
    <div class="flex items-center gap-2">
      <DemoConnectionChip />
      <DisplayModeSwitcher mode={displayMode()} onChange={openDisplayMode} />
      <ThemeToggle />
    </div>
  );

  const Logo = FloeLogo;

  return (
    <>
      <KeepAliveStack
        activeId={displayMode() === 'activity' ? 'activity' : ''}
        views={[
          {
            id: 'activity',
            render: () => (
              <Shell
                logo={<Logo />}
                activitySelectionMode="ui-first"
                activityItems={shellActivityItems()}
                activityBottomItemsMobileMode="topBar"
                activityBottomItems={[
                  {
                    id: 'settings',
                    icon: RailSettings,
                    label: 'Settings',
                    onClick: () => layout.setSidebarActiveTab('settings'),
                  },
                ]}
                topBarActions={<HeaderActions />}
                terminalPanel={
                  <div class="h-full flex items-center justify-center text-[var(--floe-ink-soft)] text-xs">
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
            ),
          },
        ]}
      />

      <Show when={displayMode() === 'deck'}>
        <DisplayModePageShell logo={<Logo />} actions={<HeaderActions />}>
          {renderLazyPage(<DeckPage />, 'deck')}
        </DisplayModePageShell>
      </Show>

      <Show when={displayMode() === 'workbench'}>
        <DisplayModePageShell logo={<Logo />} actions={<HeaderActions />}>
          {renderLazyPage(<WorkbenchPage />, 'workbench')}
        </DisplayModePageShell>
      </Show>

      <CommandPalette />
      <NotificationContainer />

      <LaunchpadModal
        open={launchpadOpen()}
        onOpenChange={setLaunchpadOpen}
        items={demoLaunchpadItems}
        onSelect={handleLaunchpadSelect}
        itemsPerPage={12}
        columns={4}
        showSearch={true}
      />
      <Show when={notesOverlayOpen()}>
        {renderLazyPage(
          <NotesPage onRequestClose={() => setNotesOverlayOpen(false)} />,
          'notes overlay'
        )}
      </Show>
    </>
  );
}

export function App() {
  const demoFloeConfig = {
    storage: { namespace: 'floe-demo-notes' },
    layout: {
      sidebar: { defaultActiveTab: 'showcase' },
    },
    theme: {
      defaultPreset: 'default',
      presets: demoChartThemePresets,
      shellPresets: builtInShellThemePresets,
      defaultShellPreset: BUILT_IN_SHELL_THEME_DEFAULTS,
    },
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
            {
              id: 'w-files',
              type: 'file-browser',
              position: { col: 0, row: 0, colSpan: 12, rowSpan: 12 },
            },
            {
              id: 'w-terminal',
              type: 'terminal',
              position: { col: 12, row: 0, colSpan: 12, rowSpan: 12 },
            },
          ],
        },
        {
          id: 'demo-layout-monitoring',
          name: 'Monitoring',
          isPreset: true,
          widgets: [
            {
              id: 'w-metrics-1',
              type: 'metrics',
              position: { col: 0, row: 0, colSpan: 12, rowSpan: 6 },
            },
            {
              id: 'w-metrics-2',
              type: 'metrics',
              position: { col: 12, row: 0, colSpan: 12, rowSpan: 6 },
            },
            {
              id: 'w-terminal',
              type: 'terminal',
              position: { col: 0, row: 6, colSpan: 24, rowSpan: 6 },
            },
          ],
        },
      ],
    },
  } as const;

  return (
    <FloeProvider
      config={demoFloeConfig}
      wrapAfterTheme={(renderChildren) => (
        <ProtocolProvider contract={demoProtocolContract}>{renderChildren()}</ProtocolProvider>
      )}
    >
      <FileBrowserDragProvider>
        <NotesDemoProvider>
          <WorkbenchDemoProvider>
            <AppContent />
          </WorkbenchDemoProvider>
        </NotesDemoProvider>
      </FileBrowserDragProvider>
    </FloeProvider>
  );
}
