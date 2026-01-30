import { For, Show, createMemo, createSignal, type JSX } from 'solid-js';
import {
  AnimatedBorderCard,
  Bell,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  Dialog,
  DirectoryPicker,
  Dropdown,
  type DropdownItem,
  FileBrowser,
  type FileItem,
  Files,
  FileSavePicker,
  FloatingWindow,
  GitBranch,
  Input,
  Interactive3DCard,
  Loader2,
  LoadingOverlay,
  Moon,
  MorphCard,
  NeonCard,
  Panel,
  PanelContent,
  Search,
  Select,
  Settings,
  Skeleton,
  SnakeLoader,
  Sun,
  Tabs,
  type TabItem,
  TabPanel,
  Terminal,
  Textarea,
  Tooltip,
  useCommand,
  useLayout,
  useNotification,
  useTheme,
  // New components
  QuoteBlock,
  InfoBlock,
  WarningBlock,
  SuccessBlock,
  ErrorBlock,
  NoteBlock,
  TipBlock,
  ProcessingIndicator,
  // More icons
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Home,
  Star,
  Heart,
  Play,
  Pause,
  Database,
  Cloud,
  Clock,
  Lock,
  Eye,
  Zap,
  Sparkles,
  Code,
  Globe,
  Mail,
  // Colored icons
  SuccessIcon,
  ErrorIcon,
  WarningIcon,
  InfoIcon,
  SparkleIcon,
  HeartIcon,
  StarIcon,
  BellIcon,
  CloudIcon,
  DatabaseIcon,
  TerminalIcon,
  MailIcon,
  LockIcon,
  ShieldIcon,
  ZapIcon,
  GlobeIcon,
  ClockIcon,
  CalendarIcon,
  CameraIcon,
  MicIcon,
  SettingsIcon,
  UserIcon,
  HomeIcon,
  SearchIcon,
  DownloadIcon,
  UploadIcon,
  GitBranchIcon,
  BookmarkIcon,
  PlayIcon,
  PauseIcon,
  SendIcon,
  TrashIcon,
  CopyIcon,
  CodeIcon,
  ImageIcon,
  VideoIcon,
  PackageIcon,
  LayersIcon,
  // New colored icons
  CheckIcon,
  CloseIcon,
  PlusIcon,
  MinusIcon,
  EditIcon,
  RefreshIcon,
  LinkIcon,
  EyeIcon,
  FilterIcon,
  PinIcon,
  TagIcon,
  MessageIcon,
  HelpIcon,
  BugIcon,
  RocketIcon,
  FireIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
  ShareIcon,
  SaveIcon,
  WifiIcon,
  WifiOffIcon,
  BatteryIcon,
  MapPinIcon,
  SunIcon,
  MoonIcon,
  FolderPlusIcon,
  FilePlusIcon,
  ArchiveIcon,
  CreditCardIcon,
  DollarIcon,
  ChartIcon,
  ActivityIcon,
  HeadphonesIcon,
  VolumeIcon,
  MuteIcon,
  PowerIcon,
  AwardIcon,
  GiftIcon,
  TargetIcon,
  CompassIcon,
  KeyIcon,
  PrinterIcon,
  BotIcon,
  MagicIcon,
  // File browser icons (colored)
  FolderIcon,
  FolderOpenIcon,
  CodeFileIcon,
  ImageFileIcon,
  DocumentFileIcon,
  ConfigFileIcon,
  StyleFileIcon,
} from '@floegence/floe-webapp-core';

export interface ShowcasePageProps {
  onOpenFile: (id: string) => void;
  onJumpTo: (id: string) => void;
}

function SectionHeader(props: {
  id: string;
  title: string;
  description?: string;
  actions?: JSX.Element;
}) {
  return (
    <div id={props.id} class="scroll-mt-4">
      <div class="flex flex-wrap items-end justify-between gap-2">
        <div class="space-y-0.5">
          <h2 class="text-sm font-medium">{props.title}</h2>
          <Show when={props.description}>
            <p class="text-[11px] text-muted-foreground">{props.description}</p>
          </Show>
        </div>
        <Show when={props.actions}>
          <div class="flex items-center gap-1.5">{props.actions}</div>
        </Show>
      </div>
    </div>
  );
}

// Demo data for FileBrowser component
const demoFileBrowserData: FileItem[] = [
  {
    id: 'src',
    name: 'src',
    type: 'folder',
    path: '/src',
    modifiedAt: new Date('2025-01-20'),
    children: [
      {
        id: 'src-components',
        name: 'components',
        type: 'folder',
        path: '/src/components',
        modifiedAt: new Date('2025-01-19'),
        children: [
          {
            id: 'src-components-ui',
            name: 'ui',
            type: 'folder',
            path: '/src/components/ui',
            modifiedAt: new Date('2025-01-19'),
            children: [
              {
                id: 'src-components-ui-primitives',
                name: 'primitives',
                type: 'folder',
                path: '/src/components/ui/primitives',
                modifiedAt: new Date('2025-01-18'),
                children: [
                  { id: 'ui-button', name: 'Button.tsx', type: 'file', path: '/src/components/ui/primitives/Button.tsx', extension: 'tsx', size: 2048, modifiedAt: new Date('2025-01-18') },
                  { id: 'ui-input', name: 'Input.tsx', type: 'file', path: '/src/components/ui/primitives/Input.tsx', extension: 'tsx', size: 1824, modifiedAt: new Date('2025-01-17') },
                  { id: 'ui-checkbox', name: 'Checkbox.tsx', type: 'file', path: '/src/components/ui/primitives/Checkbox.tsx', extension: 'tsx', size: 1536, modifiedAt: new Date('2025-01-16') },
                ],
              },
              { id: 'ui-index', name: 'index.ts', type: 'file', path: '/src/components/ui/index.ts', extension: 'ts', size: 512, modifiedAt: new Date('2025-01-18') },
            ],
          },
          { id: 'src-button', name: 'Button.tsx', type: 'file', path: '/src/components/Button.tsx', extension: 'tsx', size: 2048, modifiedAt: new Date('2025-01-18') },
          { id: 'src-card', name: 'Card.tsx', type: 'file', path: '/src/components/Card.tsx', extension: 'tsx', size: 3512, modifiedAt: new Date('2025-01-17') },
          { id: 'src-dialog', name: 'Dialog.tsx', type: 'file', path: '/src/components/Dialog.tsx', extension: 'tsx', size: 4096, modifiedAt: new Date('2025-01-16') },
          { id: 'src-input', name: 'Input.tsx', type: 'file', path: '/src/components/Input.tsx', extension: 'tsx', size: 1824, modifiedAt: new Date('2025-01-15') },
        ],
      },
      {
        id: 'src-hooks',
        name: 'hooks',
        type: 'folder',
        path: '/src/hooks',
        modifiedAt: new Date('2025-01-18'),
        children: [
          { id: 'src-use-theme', name: 'useTheme.ts', type: 'file', path: '/src/hooks/useTheme.ts', extension: 'ts', size: 1024, modifiedAt: new Date('2025-01-17') },
          { id: 'src-use-media', name: 'useMediaQuery.ts', type: 'file', path: '/src/hooks/useMediaQuery.ts', extension: 'ts', size: 768, modifiedAt: new Date('2025-01-16') },
        ],
      },
      { id: 'src-app', name: 'App.tsx', type: 'file', path: '/src/App.tsx', extension: 'tsx', size: 5120, modifiedAt: new Date('2025-01-20') },
      { id: 'src-index', name: 'index.ts', type: 'file', path: '/src/index.ts', extension: 'ts', size: 256, modifiedAt: new Date('2025-01-14') },
      { id: 'src-styles', name: 'styles.css', type: 'file', path: '/src/styles.css', extension: 'css', size: 8192, modifiedAt: new Date('2025-01-19') },
    ],
  },
  {
    id: 'docs',
    name: 'docs',
    type: 'folder',
    path: '/docs',
    modifiedAt: new Date('2025-01-15'),
    children: [
      { id: 'docs-readme', name: 'README.md', type: 'file', path: '/docs/README.md', extension: 'md', size: 4096, modifiedAt: new Date('2025-01-15') },
      { id: 'docs-api', name: 'API.md', type: 'file', path: '/docs/API.md', extension: 'md', size: 8192, modifiedAt: new Date('2025-01-14') },
      { id: 'docs-guide', name: 'getting-started.md', type: 'file', path: '/docs/getting-started.md', extension: 'md', size: 6144, modifiedAt: new Date('2025-01-13') },
    ],
  },
  {
    id: 'public',
    name: 'public',
    type: 'folder',
    path: '/public',
    modifiedAt: new Date('2025-01-10'),
    children: [
      { id: 'public-logo', name: 'logo.svg', type: 'file', path: '/public/logo.svg', extension: 'svg', size: 2048, modifiedAt: new Date('2025-01-10') },
      { id: 'public-favicon', name: 'favicon.ico', type: 'file', path: '/public/favicon.ico', extension: 'ico', size: 1024, modifiedAt: new Date('2025-01-09') },
    ],
  },
  { id: 'root-readme', name: 'README.md', type: 'file', path: '/README.md', extension: 'md', size: 2048, modifiedAt: new Date('2025-01-20') },
  { id: 'root-package', name: 'package.json', type: 'file', path: '/package.json', extension: 'json', size: 1536, modifiedAt: new Date('2025-01-19') },
  { id: 'root-tsconfig', name: 'tsconfig.json', type: 'file', path: '/tsconfig.json', extension: 'json', size: 512, modifiedAt: new Date('2025-01-18') },
  { id: 'root-vite', name: 'vite.config.ts', type: 'file', path: '/vite.config.ts', extension: 'ts', size: 1024, modifiedAt: new Date('2025-01-17') },
];

export function ShowcasePage(props: ShowcasePageProps) {
  const command = useCommand();
  const notifications = useNotification();
  const theme = useTheme();
  const layout = useLayout();

  const [dialogOpen, setDialogOpen] = createSignal(false);
  const [confirmOpen, setConfirmOpen] = createSignal(false);
  const [confirmLoading, setConfirmLoading] = createSignal(false);
  const [overlayVisible, setOverlayVisible] = createSignal(false);
  const [floatingWindowOpen, setFloatingWindowOpen] = createSignal(false);
  const [directoryPickerOpen, setDirectoryPickerOpen] = createSignal(false);
  const [fileSavePickerOpen, setFileSavePickerOpen] = createSignal(false);

  const [dropdownValue, setDropdownValue] = createSignal('profile');
  const dropdownItems: DropdownItem[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'billing', label: 'Billing' },
    { id: 'separator-1', label: '', separator: true },
    { id: 'team', label: 'Switch team' },
    { id: 'disabled', label: 'Disabled item', disabled: true },
  ];

  const [selectValue, setSelectValue] = createSignal('system');

  // Tabs demo state
  const [basicTabsActive, setBasicTabsActive] = createSignal('tab1');
  const [cardTabsActive, setCardTabsActive] = createSignal('home');
  const [dynamicTabs, setDynamicTabs] = createSignal<TabItem[]>([
    { id: 'file1', label: 'index.ts', closable: true },
    { id: 'file2', label: 'App.tsx', closable: true },
    { id: 'file3', label: 'styles.css', closable: true },
  ]);
  const [dynamicActiveTab, setDynamicActiveTab] = createSignal('file1');
  const [scrollableTabsActive, setScrollableTabsActive] = createSignal('tab1');
  let tabCounter = 3;

  const handleAddTab = () => {
    tabCounter++;
    const newTab: TabItem = {
      id: `file${tabCounter}`,
      label: `NewFile${tabCounter}.tsx`,
      closable: true,
    };
    setDynamicTabs([...dynamicTabs(), newTab]);
    setDynamicActiveTab(newTab.id);
    notifications.info('Tab Added', `Created ${newTab.label}`);
  };

  const handleCloseTab = (id: string) => {
    const tabs = dynamicTabs();
    const index = tabs.findIndex((t) => t.id === id);
    const newTabs = tabs.filter((t) => t.id !== id);
    setDynamicTabs(newTabs);

    // If closing active tab, switch to adjacent tab
    if (dynamicActiveTab() === id && newTabs.length > 0) {
      const newIndex = Math.min(index, newTabs.length - 1);
      setDynamicActiveTab(newTabs[newIndex].id);
    }
    notifications.info('Tab Closed', `Removed tab`);
  };

  // Generate many tabs for scroll demo
  const scrollableTabs: TabItem[] = Array.from({ length: 15 }, (_, i) => ({
    id: `tab${i + 1}`,
    label: `Tab ${i + 1}`,
  }));

  const icons = createMemo(() => [
    { name: 'Files', icon: Files },
    { name: 'Search', icon: Search },
    { name: 'Terminal', icon: Terminal },
    { name: 'Settings', icon: Settings },
    { name: 'Sun', icon: Sun },
    { name: 'Moon', icon: Moon },
    { name: 'GitBranch', icon: GitBranch },
    { name: 'Bell', icon: Bell },
    { name: 'Loader2', icon: Loader2 },
    { name: 'ArrowUp', icon: ArrowUp },
    { name: 'ArrowDown', icon: ArrowDown },
    { name: 'ArrowLeft', icon: ArrowLeft },
    { name: 'ArrowRight', icon: ArrowRight },
    { name: 'AlertCircle', icon: AlertCircle },
    { name: 'AlertTriangle', icon: AlertTriangle },
    { name: 'Info', icon: Info },
    { name: 'CheckCircle', icon: CheckCircle },
    { name: 'XCircle', icon: XCircle },
    { name: 'Home', icon: Home },
    { name: 'Star', icon: Star },
    { name: 'Heart', icon: Heart },
    { name: 'Play', icon: Play },
    { name: 'Pause', icon: Pause },
    { name: 'Database', icon: Database },
    { name: 'Cloud', icon: Cloud },
    { name: 'Clock', icon: Clock },
    { name: 'Lock', icon: Lock },
    { name: 'Eye', icon: Eye },
    { name: 'Zap', icon: Zap },
    { name: 'Sparkles', icon: Sparkles },
    { name: 'Code', icon: Code },
    { name: 'Globe', icon: Globe },
    { name: 'Mail', icon: Mail },
  ]);

  const coloredIcons = createMemo(() => [
    // Status icons
    { name: 'SuccessIcon', icon: SuccessIcon },
    { name: 'ErrorIcon', icon: ErrorIcon },
    { name: 'WarningIcon', icon: WarningIcon },
    { name: 'InfoIcon', icon: InfoIcon },
    { name: 'SparkleIcon', icon: SparkleIcon },
    { name: 'CheckIcon', icon: CheckIcon },
    { name: 'CloseIcon', icon: CloseIcon },
    // File browser icons
    { name: 'FolderIcon', icon: FolderIcon },
    { name: 'FolderOpenIcon', icon: FolderOpenIcon },
    { name: 'FolderPlusIcon', icon: FolderPlusIcon },
    { name: 'FilePlusIcon', icon: FilePlusIcon },
    { name: 'CodeFileIcon', icon: CodeFileIcon },
    { name: 'ImageFileIcon', icon: ImageFileIcon },
    { name: 'DocumentFileIcon', icon: DocumentFileIcon },
    { name: 'ConfigFileIcon', icon: ConfigFileIcon },
    { name: 'StyleFileIcon', icon: StyleFileIcon },
    // Common UI icons
    { name: 'HeartIcon', icon: HeartIcon },
    { name: 'StarIcon', icon: StarIcon },
    { name: 'BellIcon', icon: BellIcon },
    { name: 'CloudIcon', icon: CloudIcon },
    { name: 'DatabaseIcon', icon: DatabaseIcon },
    { name: 'TerminalIcon', icon: TerminalIcon },
    { name: 'MailIcon', icon: MailIcon },
    { name: 'LockIcon', icon: LockIcon },
    { name: 'ShieldIcon', icon: ShieldIcon },
    { name: 'ZapIcon', icon: ZapIcon },
    { name: 'GlobeIcon', icon: GlobeIcon },
    { name: 'ClockIcon', icon: ClockIcon },
    { name: 'CalendarIcon', icon: CalendarIcon },
    { name: 'CameraIcon', icon: CameraIcon },
    { name: 'MicIcon', icon: MicIcon },
    { name: 'SettingsIcon', icon: SettingsIcon },
    { name: 'UserIcon', icon: UserIcon },
    { name: 'HomeIcon', icon: HomeIcon },
    { name: 'SearchIcon', icon: SearchIcon },
    { name: 'DownloadIcon', icon: DownloadIcon },
    { name: 'UploadIcon', icon: UploadIcon },
    { name: 'GitBranchIcon', icon: GitBranchIcon },
    { name: 'BookmarkIcon', icon: BookmarkIcon },
    { name: 'PlayIcon', icon: PlayIcon },
    { name: 'PauseIcon', icon: PauseIcon },
    { name: 'SendIcon', icon: SendIcon },
    { name: 'TrashIcon', icon: TrashIcon },
    { name: 'CopyIcon', icon: CopyIcon },
    { name: 'CodeIcon', icon: CodeIcon },
    { name: 'ImageIcon', icon: ImageIcon },
    { name: 'VideoIcon', icon: VideoIcon },
    { name: 'PackageIcon', icon: PackageIcon },
    { name: 'LayersIcon', icon: LayersIcon },
    // Action icons
    { name: 'PlusIcon', icon: PlusIcon },
    { name: 'MinusIcon', icon: MinusIcon },
    { name: 'EditIcon', icon: EditIcon },
    { name: 'RefreshIcon', icon: RefreshIcon },
    { name: 'LinkIcon', icon: LinkIcon },
    { name: 'EyeIcon', icon: EyeIcon },
    { name: 'FilterIcon', icon: FilterIcon },
    { name: 'PinIcon', icon: PinIcon },
    { name: 'TagIcon', icon: TagIcon },
    { name: 'MessageIcon', icon: MessageIcon },
    { name: 'HelpIcon', icon: HelpIcon },
    { name: 'ShareIcon', icon: ShareIcon },
    { name: 'SaveIcon', icon: SaveIcon },
    { name: 'ArchiveIcon', icon: ArchiveIcon },
    { name: 'PrinterIcon', icon: PrinterIcon },
    // Feedback icons
    { name: 'ThumbsUpIcon', icon: ThumbsUpIcon },
    { name: 'ThumbsDownIcon', icon: ThumbsDownIcon },
    { name: 'BugIcon', icon: BugIcon },
    // Fun icons
    { name: 'RocketIcon', icon: RocketIcon },
    { name: 'FireIcon', icon: FireIcon },
    { name: 'AwardIcon', icon: AwardIcon },
    { name: 'GiftIcon', icon: GiftIcon },
    { name: 'TargetIcon', icon: TargetIcon },
    { name: 'CompassIcon', icon: CompassIcon },
    { name: 'MagicIcon', icon: MagicIcon },
    { name: 'BotIcon', icon: BotIcon },
    // System icons
    { name: 'WifiIcon', icon: WifiIcon },
    { name: 'WifiOffIcon', icon: WifiOffIcon },
    { name: 'BatteryIcon', icon: BatteryIcon },
    { name: 'PowerIcon', icon: PowerIcon },
    { name: 'VolumeIcon', icon: VolumeIcon },
    { name: 'MuteIcon', icon: MuteIcon },
    { name: 'HeadphonesIcon', icon: HeadphonesIcon },
    { name: 'SunIcon', icon: SunIcon },
    { name: 'MoonIcon', icon: MoonIcon },
    // Location & Finance
    { name: 'MapPinIcon', icon: MapPinIcon },
    { name: 'CreditCardIcon', icon: CreditCardIcon },
    { name: 'DollarIcon', icon: DollarIcon },
    { name: 'ChartIcon', icon: ChartIcon },
    { name: 'ActivityIcon', icon: ActivityIcon },
    { name: 'KeyIcon', icon: KeyIcon },
  ]);

  const openConfirm = () => {
    setConfirmOpen(true);
    setConfirmLoading(false);
  };

  const confirmAction = async () => {
    if (confirmLoading()) return;
    setConfirmLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setConfirmLoading(false);
    setConfirmOpen(false);
    notifications.success('Confirmed', 'The async action has completed.');
  };

  const handleDemoCreateFolder = async (parentPath: string, name: string) => {
    await new Promise((r) => setTimeout(r, 800));
    notifications.info('Folder Created', `${parentPath}/${name}`);
  };

  return (
    <div class="p-4 max-w-5xl mx-auto space-y-6">
      <div id="overview" class="space-y-3 scroll-mt-4">
        <div class="space-y-1">
          <h1 class="text-lg font-bold">Floe Webapp Demo</h1>
          <p class="text-[11px] text-muted-foreground">
            This playground showcases all core UI components, layout primitives, and loading states.
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <Button onClick={() => command.open()}>
            Open Command Palette ({command.getKeybindDisplay('mod+k')})
          </Button>
          <Button variant="outline" onClick={() => theme.toggleTheme()}>
            Toggle Theme ({theme.resolvedTheme()})
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              layout.toggleTerminal();
              notifications.info('Terminal', layout.terminalOpened() ? 'Opened' : 'Closed');
            }}
          >
            Toggle Terminal Panel
          </Button>
        </div>

        <div class="flex flex-wrap gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => props.onJumpTo('ui-buttons')}>
            Jump: Buttons
          </Button>
          <Button size="sm" variant="ghost" onClick={() => props.onJumpTo('ui-tabs')}>
            Jump: Tabs
          </Button>
          <Button size="sm" variant="ghost" onClick={() => props.onJumpTo('ui-cards')}>
            Jump: Cards
          </Button>
          <Button size="sm" variant="ghost" onClick={() => props.onJumpTo('ui-dialogs')}>
            Jump: Dialogs
          </Button>
          <Button size="sm" variant="ghost" onClick={() => props.onJumpTo('loading-overlay')}>
            Jump: Loading
          </Button>
        </div>
      </div>

      <div class="space-y-4">
        <SectionHeader
          id="ui-buttons"
          title="Buttons"
          description="Variants, sizes, disabled and loading states."
          actions={
            <Button size="sm" variant="outline" onClick={() => props.onOpenFile('core.button')}>
              View Source
            </Button>
          }
        />
        <Panel class="border border-border rounded-md overflow-hidden">
          <PanelContent class="space-y-4">
            <div class="flex flex-wrap gap-1.5">
              <Button variant="default">Default</Button>
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button size="icon" title="Icon button">
                <Bell class="w-3.5 h-3.5" />
              </Button>
              <Button loading>Loading</Button>
              <Button disabled>Disabled</Button>
            </div>
          </PanelContent>
        </Panel>
      </div>

      <div class="space-y-4">
        <SectionHeader
          id="ui-tabs"
          title="Tabs"
          description="Scrollable tabs with add/close functionality, multiple variants, mobile-friendly."
          actions={
            <Button size="sm" variant="outline" onClick={() => props.onOpenFile('core.tabs')}>
              View Source
            </Button>
          }
        />
        <Panel class="border border-border rounded-md overflow-hidden">
          <PanelContent class="space-y-6">
            {/* Basic Tabs */}
            <div class="space-y-2">
              <p class="text-[11px] text-muted-foreground font-medium">Default Variant</p>
              <Tabs
                items={[
                  { id: 'tab1', label: 'Overview' },
                  { id: 'tab2', label: 'Analytics' },
                  { id: 'tab3', label: 'Reports' },
                  { id: 'tab4', label: 'Disabled', disabled: true },
                ]}
                activeId={basicTabsActive()}
                onChange={setBasicTabsActive}
              />
              <TabPanel active={basicTabsActive() === 'tab1'} class="p-3 text-xs text-muted-foreground bg-muted/30 rounded">
                Overview content - This is the first tab panel.
              </TabPanel>
              <TabPanel active={basicTabsActive() === 'tab2'} class="p-3 text-xs text-muted-foreground bg-muted/30 rounded">
                Analytics content - View your metrics here.
              </TabPanel>
              <TabPanel active={basicTabsActive() === 'tab3'} class="p-3 text-xs text-muted-foreground bg-muted/30 rounded">
                Reports content - Generate and export reports.
              </TabPanel>
            </div>

            {/* Card Variant */}
            <div class="space-y-2">
              <p class="text-[11px] text-muted-foreground font-medium">Card Variant</p>
              <Tabs
                variant="card"
                items={[
                  { id: 'home', label: 'Home', icon: <Files class="w-3 h-3" /> },
                  { id: 'settings', label: 'Settings', icon: <Settings class="w-3 h-3" /> },
                  { id: 'terminal', label: 'Terminal', icon: <Terminal class="w-3 h-3" /> },
                ]}
                activeId={cardTabsActive()}
                onChange={setCardTabsActive}
              />
              <div class="p-3 text-xs text-muted-foreground border border-border border-t-0 rounded-b bg-background">
                Active: {cardTabsActive()}
              </div>
            </div>

            {/* Underline Variant */}
            <div class="space-y-2">
              <p class="text-[11px] text-muted-foreground font-medium">Underline Variant (Small Size)</p>
              <Tabs
                variant="underline"
                size="sm"
                items={[
                  { id: 'all', label: 'All' },
                  { id: 'active', label: 'Active' },
                  { id: 'archived', label: 'Archived' },
                ]}
                activeId="all"
                onChange={(id) => notifications.info('Tab Changed', `Selected: ${id}`)}
              />
            </div>

            {/* Dynamic Tabs with Add/Close */}
            <div class="space-y-2">
              <p class="text-[11px] text-muted-foreground font-medium">Dynamic Tabs (Add/Close)</p>
              <p class="text-[10px] text-muted-foreground">
                Click + to add new tabs. Close button has red background.
              </p>
              <Tabs
                items={dynamicTabs()}
                activeId={dynamicActiveTab()}
                onChange={setDynamicActiveTab}
                onClose={handleCloseTab}
                onAdd={handleAddTab}
                showAdd
                closable
              />
              <TabPanel active class="p-3 text-xs text-muted-foreground bg-muted/30 rounded">
                Currently editing: {dynamicTabs().find((t) => t.id === dynamicActiveTab())?.label || 'None'}
              </TabPanel>
            </div>

            {/* Scrollable Tabs */}
            <div class="space-y-2">
              <p class="text-[11px] text-muted-foreground font-medium">Scrollable Tabs (15 tabs)</p>
              <p class="text-[10px] text-muted-foreground">
                Scroll arrows appear when tabs overflow. Touch-friendly on mobile.
              </p>
              <Tabs
                items={scrollableTabs}
                activeId={scrollableTabsActive()}
                onChange={setScrollableTabsActive}
              />
              <div class="p-3 text-xs text-muted-foreground bg-muted/30 rounded">
                Selected: {scrollableTabsActive()}
              </div>
            </div>
          </PanelContent>
        </Panel>
      </div>

      <div class="space-y-4">
        <SectionHeader
          id="ui-cards"
          title="Advanced Cards"
          description="Stunning card effects with 3D transforms, gradients, glow, and interactive animations."
          actions={
            <Button size="sm" variant="outline" onClick={() => props.onOpenFile('core.card')}>
              View Source
            </Button>
          }
        />

        {/* Basic Card Variants */}
        <div class="space-y-2">
          <p class="text-[11px] text-muted-foreground font-medium">Basic Variants</p>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card variant="default">
              <CardHeader>
                <CardTitle>Default Card</CardTitle>
                <CardDescription>Simple card with subtle shadow on hover</CardDescription>
              </CardHeader>
              <CardContent>
                <p class="text-xs text-muted-foreground">Clean and minimal design.</p>
              </CardContent>
            </Card>

            <Card variant="hover-lift">
              <CardHeader>
                <CardTitle>Hover Lift</CardTitle>
                <CardDescription>Elevates on hover with shadow</CardDescription>
              </CardHeader>
              <CardContent>
                <p class="text-xs text-muted-foreground">Hover to see the lift effect.</p>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader>
                <CardTitle>Glass Card</CardTitle>
                <CardDescription>Glassmorphism effect</CardDescription>
              </CardHeader>
              <CardContent>
                <p class="text-xs text-muted-foreground">Frosted glass appearance.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Animated Border Cards */}
        <div class="space-y-2">
          <p class="text-[11px] text-muted-foreground font-medium">Animated Effects</p>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card variant="gradient-border">
              <CardHeader>
                <CardTitle>Gradient Border</CardTitle>
                <CardDescription>Animated gradient border effect</CardDescription>
              </CardHeader>
              <CardContent>
                <p class="text-xs text-muted-foreground">Smooth gradient animation.</p>
              </CardContent>
            </Card>

            <Card variant="shimmer">
              <CardHeader>
                <CardTitle>Shimmer Card</CardTitle>
                <CardDescription>Continuous shimmer animation</CardDescription>
              </CardHeader>
              <CardContent>
                <p class="text-xs text-muted-foreground">Watch the light sweep across.</p>
              </CardContent>
            </Card>

            <Card variant="glow" glowColor="var(--primary)">
              <CardHeader>
                <CardTitle>Glow Card</CardTitle>
                <CardDescription>Ambient glow effect</CardDescription>
              </CardHeader>
              <CardContent>
                <p class="text-xs text-muted-foreground">Soft ambient lighting.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Interactive 3D Cards */}
        <div class="space-y-2">
          <p class="text-[11px] text-muted-foreground font-medium">Interactive 3D Cards</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Interactive3DCard intensity={15} shine borderGlow>
              <CardHeader>
                <CardTitle>3D Interactive Card</CardTitle>
                <CardDescription>Mouse-tracking 3D tilt with shine effect</CardDescription>
              </CardHeader>
              <CardContent>
                <p class="text-xs text-muted-foreground">
                  Move your mouse over this card to see the 3D perspective effect.
                  The card follows your cursor with realistic depth.
                </p>
              </CardContent>
              <CardFooter class="gap-2">
                <Button size="sm" variant="primary">Action</Button>
                <Button size="sm" variant="ghost">Learn More</Button>
              </CardFooter>
            </Interactive3DCard>

            <Card variant="spotlight" enableTilt>
              <CardHeader>
                <CardTitle>Spotlight Card</CardTitle>
                <CardDescription>Spotlight follows cursor with 3D tilt</CardDescription>
              </CardHeader>
              <CardContent>
                <p class="text-xs text-muted-foreground">
                  Hover to reveal the spotlight effect that tracks your mouse position.
                </p>
              </CardContent>
              <CardFooter class="gap-2">
                <Button size="sm" variant="outline">Details</Button>
              </CardFooter>
            </Card>
          </div>
        </div>

        {/* Special Effect Cards */}
        <div class="space-y-2">
          <p class="text-[11px] text-muted-foreground font-medium">Special Effects</p>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatedBorderCard duration={4} borderWidth={2}>
              <CardHeader>
                <CardTitle>Rotating Border</CardTitle>
                <CardDescription>Conic gradient animation</CardDescription>
              </CardHeader>
              <CardContent>
                <p class="text-xs text-muted-foreground">Continuous rotating gradient border.</p>
              </CardContent>
            </AnimatedBorderCard>

            <NeonCard color="oklch(0.7 0.2 280)">
              <CardHeader>
                <CardTitle>Neon Glow</CardTitle>
                <CardDescription>Cyberpunk neon aesthetic</CardDescription>
              </CardHeader>
              <CardContent>
                <p class="text-xs text-muted-foreground">Vibrant neon glow effect.</p>
              </CardContent>
            </NeonCard>

            <MorphCard>
              <CardHeader>
                <CardTitle>Morph Card</CardTitle>
                <CardDescription>Animated blob background</CardDescription>
              </CardHeader>
              <CardContent>
                <p class="text-xs text-muted-foreground">Organic morphing shapes.</p>
              </CardContent>
            </MorphCard>
          </div>
        </div>

        {/* Feature Card Example */}
        <div class="space-y-2">
          <p class="text-[11px] text-muted-foreground font-medium">Feature Card Example</p>
          <Interactive3DCard intensity={8} shine class="max-w-md">
            <div class="p-6 space-y-4">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Terminal class="w-6 h-6 text-primary-foreground" />
              </div>
              <div class="space-y-2">
                <h3 class="text-base font-bold">Terminal Integration</h3>
                <p class="text-xs text-muted-foreground leading-relaxed">
                  Powerful terminal integration with syntax highlighting,
                  command history, and multi-tab support for seamless development workflow.
                </p>
              </div>
              <div class="flex items-center gap-3 pt-2">
                <Button size="sm" variant="primary">Get Started</Button>
                <Button size="sm" variant="ghost">Documentation</Button>
              </div>
            </div>
          </Interactive3DCard>
        </div>
      </div>

      <div class="space-y-4">
        <SectionHeader
          id="ui-inputs"
          title="Inputs"
          description="Input + Textarea with sizes, icons and error state."
          actions={
            <div class="flex items-center gap-1.5">
              <Button size="sm" variant="outline" onClick={() => props.onOpenFile('core.input')}>
                View Source
              </Button>
            </div>
          }
        />
        <Panel class="border border-border rounded-md overflow-hidden">
          <PanelContent class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Input size="sm" placeholder="Small input" />
              <Input size="md" placeholder="Medium input" />
              <Input size="lg" placeholder="Large input" />
            </div>
            <div class="space-y-2">
              <Input
                placeholder="Search with icon"
                leftIcon={<Search class="w-3.5 h-3.5" />}
              />
              <Input placeholder="Error state" error="Something went wrong" />
              <Textarea placeholder="Textarea (resizable)" />
            </div>
          </PanelContent>
        </Panel>
      </div>

      <div class="space-y-4">
        <SectionHeader
          id="ui-menus"
          title="Dropdown & Select"
          description="Menu items, separators, disabled items, and a Select wrapper."
          actions={
            <Button size="sm" variant="outline" onClick={() => props.onOpenFile('core.dropdown')}>
              View Source
            </Button>
          }
        />
        <Panel class="border border-border rounded-md overflow-hidden">
          <PanelContent class="flex flex-wrap items-start gap-4">
            <div class="space-y-1.5">
              <p class="text-[11px] text-muted-foreground">Dropdown</p>
              <Dropdown
                value={dropdownValue()}
                onSelect={setDropdownValue}
                items={dropdownItems}
                trigger={
                  <Button variant="outline">
                    Menu ({dropdownValue()})
                  </Button>
                }
              />
            </div>
            <div class="space-y-1.5 w-56">
              <p class="text-[11px] text-muted-foreground">Select</p>
              <Select
                value={selectValue()}
                onChange={setSelectValue}
                placeholder="Choose a theme"
                options={[
                  { value: 'system', label: 'System' },
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                ]}
              />
              <p class="text-[11px] text-muted-foreground">Selected: {selectValue()}</p>
            </div>
          </PanelContent>
        </Panel>
      </div>

      <div class="space-y-4">
        <SectionHeader
          id="ui-tooltips"
          title="Tooltip"
          description="Hover or focus to show tooltips (placements + custom content)."
          actions={
            <Button size="sm" variant="outline" onClick={() => props.onOpenFile('core.tooltip')}>
              View Source
            </Button>
          }
        />
        <Panel class="border border-border rounded-md overflow-hidden">
          <PanelContent class="flex flex-wrap gap-3 items-center">
            <Tooltip content="Top tooltip" placement="top">
              <Button variant="outline">Top</Button>
            </Tooltip>
            <Tooltip content="Bottom tooltip" placement="bottom">
              <Button variant="outline">Bottom</Button>
            </Tooltip>
            <Tooltip content="Left tooltip" placement="left">
              <Button variant="outline">Left</Button>
            </Tooltip>
            <Tooltip content={<span class="font-mono text-[10px]">Custom JSX content</span>} placement="right">
              <Button variant="outline">Right</Button>
            </Tooltip>
          </PanelContent>
        </Panel>
      </div>

      <div class="space-y-4">
        <SectionHeader
          id="ui-dialogs"
          title="Dialogs"
          description="Dialog + ConfirmDialog (async confirm) with non-blocking flows."
          actions={
            <Button size="sm" variant="outline" onClick={() => props.onOpenFile('core.dialog')}>
              View Source
            </Button>
          }
        />
        <Panel class="border border-border rounded-md overflow-hidden">
          <PanelContent class="flex flex-wrap gap-2 items-center">
            <Button onClick={() => setDialogOpen(true)}>Open Dialog</Button>
            <Button variant="outline" onClick={openConfirm}>Open Confirm Dialog</Button>
            <Button
              variant="outline"
              onClick={() => {
                notifications.info('Heads up', 'Notifications are non-blocking toasts.');
              }}
            >
              Trigger Notification
            </Button>
          </PanelContent>
        </Panel>

        <Dialog
          open={dialogOpen()}
          onOpenChange={setDialogOpen}
          title="Example Dialog"
          description="This dialog demonstrates header/footer + scrollable content."
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setDialogOpen(false);
                  notifications.success('Saved', 'Changes have been saved.');
                }}
              >
                Save
              </Button>
            </>
          }
        >
          <div class="space-y-2">
            <Input placeholder="Type something..." />
            <Textarea placeholder="Longer content..." />
            <div class="space-y-1.5">
              <p class="text-[11px] text-muted-foreground">
                Tip: press <kbd class="font-mono text-[10px] px-1 py-0.5 rounded bg-muted border border-border">Esc</kbd>{' '}
                to close.
              </p>
              <div class="h-32 rounded border border-border bg-muted/30" />
            </div>
          </div>
        </Dialog>

        <ConfirmDialog
          open={confirmOpen()}
          onOpenChange={setConfirmOpen}
          title="Confirm action"
          description="This confirm dialog simulates an async operation."
          confirmText="Run"
          cancelText="Cancel"
          loading={confirmLoading()}
          onConfirm={confirmAction}
        />
      </div>

      <div class="space-y-4">
        <SectionHeader
          id="ui-directory-picker"
          title="Directory Picker"
          description="Modal directory selector with tree navigation, path input, breadcrumb, and new folder creation."
        />
        <Panel class="border border-border rounded-md overflow-hidden">
          <PanelContent class="flex flex-wrap gap-2 items-center">
            <Button onClick={() => setDirectoryPickerOpen(true)}>Open Directory Picker</Button>
            <p class="text-[11px] text-muted-foreground">
              Features: folder tree, path input with Go, breadcrumb, new folder, filter prop
            </p>
          </PanelContent>
        </Panel>

        <DirectoryPicker
          open={directoryPickerOpen()}
          onOpenChange={setDirectoryPickerOpen}
          files={demoFileBrowserData}
          initialPath="/src"
          onSelect={(path) => {
            notifications.success('Directory Selected', path);
          }}
          onCreateFolder={handleDemoCreateFolder}
        />
      </div>

      <div class="space-y-4">
        <SectionHeader
          id="ui-file-save-picker"
          title="File Save Picker"
          description="Save-as dialog with directory tree, file list panel, and filename input."
        />
        <Panel class="border border-border rounded-md overflow-hidden">
          <PanelContent class="flex flex-wrap gap-2 items-center">
            <Button onClick={() => setFileSavePickerOpen(true)}>Open File Save Picker</Button>
            <p class="text-[11px] text-muted-foreground">
              Features: split view (folder tree + file list), click file to fill name, filename validation, new folder
            </p>
          </PanelContent>
        </Panel>

        <FileSavePicker
          open={fileSavePickerOpen()}
          onOpenChange={setFileSavePickerOpen}
          files={demoFileBrowserData}
          initialPath="/src"
          initialFileName="report.pdf"
          onSave={(dirPath, fileName) => {
            notifications.success('File Saved', `${dirPath}/${fileName}`);
          }}
          onCreateFolder={handleDemoCreateFolder}
          validateFileName={(name) => {
            if (name.includes(' ')) return 'Filename must not contain spaces';
            return '';
          }}
        />
      </div>

      <div class="space-y-4">
        <SectionHeader
          id="ui-floating-window"
          title="Floating Window"
          description="Draggable, resizable window with maximize/restore and close buttons."
          actions={
            <Button size="sm" variant="outline" onClick={() => props.onOpenFile('core.floating-window')}>
              View Source
            </Button>
          }
        />
        <Panel class="border border-border rounded-md overflow-hidden">
          <PanelContent class="flex flex-wrap gap-2 items-center">
            <Button onClick={() => setFloatingWindowOpen(true)}>Open Floating Window</Button>
            <p class="text-[11px] text-muted-foreground">
              Features: drag title bar, resize edges/corners, maximize/restore, close with X or Esc
            </p>
          </PanelContent>
        </Panel>

        <FloatingWindow
          open={floatingWindowOpen()}
          onOpenChange={setFloatingWindowOpen}
          title="Floating Window Demo"
          defaultSize={{ width: 450, height: 320 }}
          minSize={{ width: 280, height: 200 }}
          footer={
            <>
              <Button variant="ghost" onClick={() => setFloatingWindowOpen(false)}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setFloatingWindowOpen(false);
                  notifications.success('Done', 'Window action completed.');
                }}
              >
                Confirm
              </Button>
            </>
          }
        >
          <div class="space-y-3">
            <p class="text-xs text-muted-foreground">
              This is a floating window component. Try these interactions:
            </p>
            <ul class="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Drag the title bar to move the window</li>
              <li>Drag edges or corners to resize</li>
              <li>Double-click title bar to maximize/restore</li>
              <li>Click the maximize button in the title bar</li>
              <li>Press Escape or click X to close</li>
            </ul>
            <div class="pt-2">
              <Input placeholder="Type something..." />
            </div>
          </div>
        </FloatingWindow>
      </div>

      <div class="space-y-4">
        <SectionHeader
          id="ui-command-palette"
          title="Command Palette"
          description="Press Mod+K (or click the top search bar) to open it."
          actions={
            <Button size="sm" variant="outline" onClick={() => props.onOpenFile('core.command-palette')}>
              View Source
            </Button>
          }
        />
        <Panel class="border border-border rounded-md overflow-hidden">
          <PanelContent class="flex flex-wrap gap-2 items-center">
            <Button onClick={() => command.open()}>Open</Button>
            <Button
              variant="outline"
              onClick={() => notifications.success('Tip', 'Try searching for "demo" commands.')}
            >
              Show tip
            </Button>
          </PanelContent>
        </Panel>
      </div>

      <div class="space-y-4">
        <SectionHeader
          id="ui-file-browser"
          title="File Browser"
          description="Professional file browser with list/grid views, directory tree, and breadcrumb navigation."
          actions={
            <Button size="sm" variant="outline" onClick={() => props.onOpenFile('core.file-browser')}>
              View Source
            </Button>
          }
        />
        <div class="h-[420px] border border-border rounded-lg overflow-hidden">
          <FileBrowser
            files={demoFileBrowserData}
            initialPath="/src/components/ui/primitives"
            initialViewMode="list"
            onNavigate={(path) => notifications.info('Navigate', `Path: ${path}`)}
            onSelect={(items) => {
              if (items.length > 0) {
                notifications.info('Selected', items.map((i) => i.name).join(', '));
              }
            }}
            onOpen={(item) => notifications.success('Opened', item.name)}
          />
        </div>
        <p class="text-[11px] text-muted-foreground">
          Features: List/Grid view toggle, collapsible sidebar tree, <strong>breadcrumb with path folding</strong> (click "…" to see collapsed segments), sortable columns, multi-select (Cmd/Ctrl+click), mobile responsive.
        </p>
      </div>

      <div class="space-y-4">
        <SectionHeader
          id="loading-overlay"
          title="Loading"
          description="SnakeLoader + Skeleton + LoadingOverlay."
          actions={
            <div class="flex items-center gap-1.5">
              <Button size="sm" variant="outline" onClick={() => props.onOpenFile('core.loading-overlay')}>
                View Overlay Source
              </Button>
            </div>
          }
        />

        <Panel class="border border-border rounded-md overflow-hidden">
          <PanelContent class="space-y-4">
            <div class="flex flex-wrap items-center gap-4">
              <div class="space-y-1.5">
                <p class="text-[11px] text-muted-foreground">SnakeLoader</p>
                <div class="flex items-center gap-3">
                  <SnakeLoader size="sm" />
                  <SnakeLoader size="md" />
                  <SnakeLoader size="lg" />
                </div>
              </div>

              <div class="space-y-1.5 flex-1 min-w-64">
                <p class="text-[11px] text-muted-foreground">Skeleton</p>
                <div class="space-y-1.5">
                  <Skeleton class="h-3 w-1/3" />
                  <Skeleton class="h-3 w-2/3" />
                  <Skeleton class="h-16 w-full" />
                </div>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <Button onClick={() => setOverlayVisible(true)}>Show fullscreen overlay</Button>
              <Button variant="outline" onClick={() => setOverlayVisible(false)}>Hide</Button>
            </div>
          </PanelContent>
        </Panel>

        <LoadingOverlay visible={overlayVisible()} fullscreen message="Loading something..." />
      </div>

      <div class="space-y-4">
        <SectionHeader
          id="icons"
          title="Icons"
          description="All built-in icons shipped with @floegence/floe-webapp-core (monochrome and colored)."
        />
        <Panel class="border border-border rounded-md overflow-hidden">
          <PanelContent class="space-y-4">
            <div>
              <p class="text-[11px] text-muted-foreground font-medium mb-2">Monochrome Icons</p>
              <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                <For each={icons()}>
                  {(item) => (
                    <div class="flex items-center gap-2 rounded border border-border bg-muted/20 px-2 py-1.5">
                      <item.icon class="w-4 h-4" />
                      <span class="text-[10px] truncate">{item.name}</span>
                    </div>
                  )}
                </For>
              </div>
            </div>
            <div>
              <p class="text-[11px] text-muted-foreground font-medium mb-2">Colored Icons (Status, Files, UI)</p>
              <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                <For each={coloredIcons()}>
                  {(item) => (
                    <div class="flex items-center gap-2 rounded border border-border bg-muted/20 px-2 py-1.5">
                      <item.icon class="w-5 h-5" />
                      <span class="text-[10px] truncate">{item.name}</span>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </PanelContent>
        </Panel>
      </div>

      <div class="space-y-4">
        <SectionHeader
          id="ui-quote-block"
          title="Quote Block"
          description="Clean blockquote component for documentation and code comments."
        />
        <Panel class="border border-border rounded-md overflow-hidden">
          <PanelContent class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <p class="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wide">Default</p>
                <QuoteBlock>
                  Functions should do one thing. They should do it well. They should do it only.
                </QuoteBlock>
              </div>

              <div class="space-y-1.5">
                <p class="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wide">Subtle</p>
                <QuoteBlock variant="subtle" author="Rob Pike">
                  Simplicity is complicated.
                </QuoteBlock>
              </div>

              <div class="space-y-1.5">
                <p class="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wide">Bordered</p>
                <QuoteBlock variant="bordered" author="Donald Knuth" citation="The Art of Programming">
                  Premature optimization is the root of all evil.
                </QuoteBlock>
              </div>

              <div class="space-y-1.5">
                <p class="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wide">Code</p>
                <QuoteBlock variant="code">
                  // TODO: Refactor this function to use async/await
                </QuoteBlock>
              </div>
            </div>

            <div class="space-y-1.5">
              <p class="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wide">Inline</p>
              <div class="flex flex-wrap gap-2 items-center text-xs text-muted-foreground">
                <span>See the documentation:</span>
                <QuoteBlock variant="inline" class="my-0">Returns undefined if key not found</QuoteBlock>
              </div>
            </div>
          </PanelContent>
        </Panel>
      </div>

      <div class="space-y-4">
        <SectionHeader
          id="ui-highlight-block"
          title="Highlight Block"
          description="Callout/admonition component for highlighting important content with semantic variants."
        />
        <Panel class="border border-border rounded-md overflow-hidden">
          <PanelContent class="space-y-3">
            <InfoBlock title="Information">
              This is an informational callout. Use it to provide additional context or helpful tips.
            </InfoBlock>

            <WarningBlock title="Warning">
              Be careful with this operation. It may have unintended side effects.
            </WarningBlock>

            <SuccessBlock title="Success">
              Operation completed successfully! Your changes have been saved.
            </SuccessBlock>

            <ErrorBlock title="Error">
              Something went wrong. Please check your input and try again.
            </ErrorBlock>

            <NoteBlock title="Note">
              This is a note block. Use it to highlight important information.
            </NoteBlock>

            <TipBlock title="Pro Tip">
              Use keyboard shortcuts to improve your productivity: Cmd+K to open command palette.
            </TipBlock>
          </PanelContent>
        </Panel>
      </div>

      <div class="space-y-4">
        <SectionHeader
          id="ui-processing-indicator"
          title="Processing Indicator"
          description="Premium status indicators with sophisticated animations for AI states, workflows, and background tasks."
        />
        <Panel class="border border-border rounded-md overflow-hidden">
          <PanelContent class="space-y-6">
            {/* Premium Variants */}
            <div class="space-y-2">
              <p class="text-[11px] text-muted-foreground font-medium">Aurora Variant - Flowing Northern Lights</p>
              <div class="flex flex-wrap gap-6">
                <ProcessingIndicator variant="aurora" status="thinking" />
                <ProcessingIndicator
                  variant="aurora"
                  status="analyzing"
                  description="Deep analysis in progress..."
                  showElapsed
                />
              </div>
            </div>

            <div class="space-y-2">
              <p class="text-[11px] text-muted-foreground font-medium">Neural Variant - AI Network Visualization</p>
              <div class="flex flex-wrap gap-6">
                <ProcessingIndicator variant="neural" status="thinking" />
                <ProcessingIndicator
                  variant="neural"
                  status="processing"
                  description="Neural network processing..."
                  showElapsed
                />
              </div>
            </div>

            <div class="space-y-2">
              <p class="text-[11px] text-muted-foreground font-medium">Orbit Variant - Multi-layer Orbital System</p>
              <div class="flex flex-wrap gap-6">
                <ProcessingIndicator variant="orbit" status="working" />
                <ProcessingIndicator
                  variant="orbit"
                  status="analyzing"
                  description="Scanning dependencies..."
                  showElapsed
                />
              </div>
            </div>

            <div class="space-y-2">
              <p class="text-[11px] text-muted-foreground font-medium">Quantum Variant - Dot Grid Wave</p>
              <div class="flex flex-wrap gap-6">
                <ProcessingIndicator variant="quantum" status="thinking" />
                <ProcessingIndicator
                  variant="quantum"
                  status="processing"
                  description="Processing data..."
                  showElapsed
                />
              </div>
            </div>

            <div class="space-y-2">
              <p class="text-[11px] text-muted-foreground font-medium">Pulse Variant - Expanding Rings</p>
              <div class="flex flex-wrap gap-6">
                <ProcessingIndicator variant="pulse" status="thinking" />
                <ProcessingIndicator
                  variant="pulse"
                  status="working"
                  description="Scanning..."
                  showElapsed
                />
              </div>
            </div>

            <div class="space-y-2">
              <p class="text-[11px] text-muted-foreground font-medium">Atom Variant - 3D Electron Orbits</p>
              <div class="flex flex-wrap gap-6">
                <ProcessingIndicator variant="atom" status="thinking" />
                <ProcessingIndicator
                  variant="atom"
                  status="analyzing"
                  description="Computing quantum states..."
                  showElapsed
                />
              </div>
            </div>

            {/* Classic Variants */}
            <div class="space-y-2">
              <p class="text-[11px] text-muted-foreground font-medium">Default Variant - Animated Rings</p>
              <div class="flex flex-wrap gap-6">
                <ProcessingIndicator status="thinking" />
                <ProcessingIndicator status="working" description="Processing your request..." />
                <ProcessingIndicator status="analyzing" showElapsed />
              </div>
            </div>

            <div class="space-y-2">
              <p class="text-[11px] text-muted-foreground font-medium">Elegant Variant - Layered Orb</p>
              <div class="flex flex-wrap gap-6">
                <ProcessingIndicator variant="elegant" status="thinking" />
                <ProcessingIndicator
                  variant="elegant"
                  status="working"
                  description="Generating response..."
                  showElapsed
                />
              </div>
            </div>

            <div class="space-y-2">
              <p class="text-[11px] text-muted-foreground font-medium">Card Variant - Glassmorphism</p>
              <div class="max-w-md">
                <ProcessingIndicator
                  variant="card"
                  status="processing"
                  description="Analyzing code structure and dependencies..."
                  showElapsed
                />
              </div>
            </div>

            <div class="space-y-2">
              <p class="text-[11px] text-muted-foreground font-medium">Pill Variant - Gradient Border</p>
              <div class="flex flex-wrap gap-3">
                <ProcessingIndicator variant="pill" status="thinking" />
                <ProcessingIndicator variant="pill" status="working" showElapsed />
                <ProcessingIndicator variant="pill" status="analyzing" />
              </div>
            </div>

            <div class="space-y-2">
              <p class="text-[11px] text-muted-foreground font-medium">Minimal Variant - Inline Waveform</p>
              <div class="flex flex-wrap gap-4">
                <ProcessingIndicator variant="minimal" status="thinking" />
                <ProcessingIndicator variant="minimal" status="processing" showElapsed />
                <ProcessingIndicator variant="minimal" status="loading" />
              </div>
            </div>
          </PanelContent>
        </Panel>
      </div>
    </div>
  );
}
