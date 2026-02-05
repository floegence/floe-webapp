import { For, Show, createMemo, createSignal, type JSX } from 'solid-js';
import { PropsTable, CodeSnippet, UsageGuidelines } from '../components/docs';
import {
  buttonDoc,
  inputDoc,
  numberInputDoc,
  affixInputDoc,
  tabsDoc,
  cardDoc,
  dialogDoc,
  dropdownDoc,
  selectDoc,
  tooltipDoc,
  formDoc,
  // Loading components
  skeletonDoc,
  snakeLoaderDoc,
  loadingOverlayDoc,
  // Block components
  highlightBlockDoc,
  quoteBlockDoc,
  // Picker components
  directoryPickerDoc,
  directoryInputDoc,
  fileSavePickerDoc,
  fileBrowserDoc,
  // Window components
  floatingWindowDoc,
  // Status components
  processingIndicatorDoc,
  // Chart components
  lineChartDoc,
  barChartDoc,
  pieChartDoc,
  // Command
  commandPaletteDoc,
  // Stepper & Wizard
  stepperDoc,
  wizardDoc,
  useWizardDoc,
  // Radio & Switch
  radioDoc,
  switchDoc,
  // SegmentedControl
  segmentedControlDoc,
  // Checkbox
  checkboxDoc,
  // Pagination
  paginationDoc,
  // Progress
  linearProgressDoc,
} from '../data/componentDocs';
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
  DirectoryInput,
  Dropdown,
  type DropdownItem,
  FileBrowser,
  type FileItem,
  Files,
  FileSavePicker,
  FloatingWindow,
  GitBranch,
  Input,
  NumberInput,
  AffixInput,
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
  // Form components
  Form,
  FormField,
  FormLabel,
  FormDescription,
  FormMessage,
  FormActions,
  FormSection,
  FormDivider,
  FormRow,
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
  // Charts
  LineChart,
  AreaChart,
  DataBarChart,
  DataPieChart,
  MonitoringChart,
  // Stepper & Wizard
  Stepper,
  useWizard,
  type StepItem,
  // Radio & Switch
  RadioGroup,
  RadioOption,
  Switch,
  // SegmentedControl
  SegmentedControl,
  // Checkbox
  Checkbox,
  CheckboxGroup,
  // Pagination
  Pagination,
  // Progress
  LinearProgress,
  CircularProgress,
  SegmentedProgress,
  StepsProgress,
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
  Copy,
  Paste,
  CopyCheck,
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
  PasteIcon,
  CopyCheckIcon,
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
} from '@floegence/floe-webapp-core/full';

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

// Interactive Wizard Demo Component
function WizardDemo() {
  const wizard = useWizard({ totalSteps: 3 });

  const steps: StepItem[] = [
    { id: 'account', label: 'Account', description: 'Setup your account' },
    { id: 'profile', label: 'Profile', description: 'Personal information' },
    { id: 'finish', label: 'Finish', description: 'Review and confirm' },
  ];

  return (
    <div class="space-y-4">
      <Stepper
        steps={steps}
        currentStep={wizard.currentStep()}
        onStepClick={(index) => wizard.goToStep(index)}
      />

      <div class="p-4 border border-border rounded-md bg-muted/30 min-h-[100px]">
        <Show when={wizard.currentStep() === 0}>
          <div class="space-y-2">
            <h4 class="text-sm font-medium">Step 1: Account Setup</h4>
            <p class="text-xs text-muted-foreground">Create your account credentials.</p>
            <Input placeholder="Email address" class="max-w-xs" />
          </div>
        </Show>
        <Show when={wizard.currentStep() === 1}>
          <div class="space-y-2">
            <h4 class="text-sm font-medium">Step 2: Profile Information</h4>
            <p class="text-xs text-muted-foreground">Tell us about yourself.</p>
            <Input placeholder="Full name" class="max-w-xs" />
          </div>
        </Show>
        <Show when={wizard.currentStep() === 2}>
          <div class="space-y-2">
            <h4 class="text-sm font-medium">Step 3: Review & Confirm</h4>
            <p class="text-xs text-muted-foreground">Review your information and complete setup.</p>
            <p class="text-xs">All steps completed. Ready to finish!</p>
          </div>
        </Show>
      </div>

      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={wizard.prevStep}
          disabled={wizard.isFirstStep()}
        >
          Previous
        </Button>
        <Button
          size="sm"
          onClick={wizard.nextStep}
          disabled={wizard.isLastStep()}
        >
          Next
        </Button>
        <Show when={wizard.isLastStep()}>
          <Button size="sm" variant="primary" onClick={() => wizard.goToStep(0)}>
            Start Over
          </Button>
        </Show>
        <span class="ml-auto text-xs text-muted-foreground">
          Step {wizard.currentStep() + 1} of {steps.length}
        </span>
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
  const [directoryInputValue, setDirectoryInputValue] = createSignal('');

  const [dropdownValue, setDropdownValue] = createSignal('profile');
  const dropdownItems: DropdownItem[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'billing', label: 'Billing' },
    { id: 'separator-1', label: '', separator: true },
    { id: 'team', label: 'Switch team' },
    { id: 'disabled', label: 'Disabled item', disabled: true },
  ];

  const [selectValue, setSelectValue] = createSignal('system');

  // NumberInput demo state
  const [numberValue, setNumberValue] = createSignal(50);
  const [stepValue, setStepValue] = createSignal(25);
  const [buttonOnlyValue, setButtonOnlyValue] = createSignal(5);

  // AffixInput demo state
  const [protocol, setProtocol] = createSignal('https');
  const [unit, setUnit] = createSignal('px');
  const [tld, setTld] = createSignal('com');

  // Radio demo state
  const [radioValue, setRadioValue] = createSignal('option1');
  const [planValue, setPlanValue] = createSignal('free');

  // Switch demo state
  const [switchValue, setSwitchValue] = createSignal(false);
  const [darkModeSwitch, setDarkModeSwitch] = createSignal(true);

  // Checkbox demo state
  const [checkboxValues, setCheckboxValues] = createSignal<string[]>(['option1']);
  const [singleCheckbox, setSingleCheckbox] = createSignal(false);

  // Pagination demo state
  const [currentPage, setCurrentPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal(10);

  // Progress demo state
  const [progressValue, setProgressValue] = createSignal(65);

  // Dropdown with custom content state
  const [dropdownQuantity, setDropdownQuantity] = createSignal(5);
  const [zoomLevel, setZoomLevel] = createSignal(100);

  // Cascade dropdown items
  const cascadeItems: DropdownItem[] = [
    {
      id: 'edit',
      label: 'Edit',
      children: [
        { id: 'cut', label: 'Cut' },
        { id: 'copy', label: 'Copy' },
        { id: 'paste', label: 'Paste' },
      ],
    },
    {
      id: 'view',
      label: 'View',
      children: [
        { id: 'zoom-in', label: 'Zoom In' },
        { id: 'zoom-out', label: 'Zoom Out' },
        { id: 'sep', label: '', separator: true },
        { id: 'fullscreen', label: 'Fullscreen' },
      ],
    },
    { id: 'sep-1', label: '', separator: true },
    { id: 'settings', label: 'Settings' },
  ];

  // File menu items with nested structure
  const fileMenuItems: DropdownItem[] = [
    {
      id: 'new',
      label: 'New',
      children: [
        { id: 'new-file', label: 'File' },
        { id: 'new-folder', label: 'Folder' },
        { id: 'new-project', label: 'Project' },
      ],
    },
    { id: 'open', label: 'Open' },
    {
      id: 'open-recent',
      label: 'Open Recent',
      children: [
        { id: 'recent-1', label: 'project-a.ts' },
        { id: 'recent-2', label: 'styles.css' },
        { id: 'recent-3', label: 'index.html' },
        { id: 'sep', label: '', separator: true },
        { id: 'clear-recent', label: 'Clear Recent' },
      ],
    },
    { id: 'sep-1', label: '', separator: true },
    { id: 'save', label: 'Save' },
    { id: 'save-as', label: 'Save As...' },
    { id: 'sep-2', label: '', separator: true },
    {
      id: 'export',
      label: 'Export',
      children: [
        { id: 'export-pdf', label: 'PDF' },
        { id: 'export-png', label: 'PNG' },
        { id: 'export-svg', label: 'SVG' },
      ],
    },
  ];

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
    { name: 'Copy', icon: Copy },
    { name: 'Paste', icon: Paste },
    { name: 'CopyCheck', icon: CopyCheck },
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
    { name: 'PasteIcon', icon: PasteIcon },
    { name: 'CopyCheckIcon', icon: CopyCheckIcon },
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

        {/* Button Documentation */}
        <UsageGuidelines
          whenToUse={buttonDoc.usage.whenToUse}
          bestPractices={buttonDoc.usage.bestPractices}
          avoid={buttonDoc.usage.avoid}
        />
        <CodeSnippet
          title="Button.tsx"
          code={buttonDoc.examples[0].code}
          language="tsx"
        />
        <PropsTable props={buttonDoc.props} componentName="Button" />
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

        {/* Tabs Documentation */}
        <UsageGuidelines
          whenToUse={tabsDoc.usage.whenToUse}
          bestPractices={tabsDoc.usage.bestPractices}
          avoid={tabsDoc.usage.avoid}
        />
        <CodeSnippet
          title="Tabs.tsx"
          code={tabsDoc.examples[0].code}
          language="tsx"
        />
        <PropsTable props={tabsDoc.props} componentName="Tabs" />
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

        {/* Card Documentation */}
        <UsageGuidelines
          whenToUse={cardDoc.usage.whenToUse}
          bestPractices={cardDoc.usage.bestPractices}
          avoid={cardDoc.usage.avoid}
        />
        <CodeSnippet
          title="Card.tsx"
          code={cardDoc.examples[0].code}
          language="tsx"
        />
        <PropsTable props={cardDoc.props} componentName="Card" />
      </div>

      <div class="space-y-4">
        <SectionHeader
          id="ui-inputs"
          title="Inputs"
          description="Text inputs, number inputs, and inputs with prefix/suffix support."
          actions={
            <div class="flex items-center gap-1.5">
              <Button size="sm" variant="outline" onClick={() => props.onOpenFile('core.input')}>
                View Source
              </Button>
            </div>
          }
        />

        {/* Basic Input & Textarea */}
        <h3 class="text-xs font-medium text-muted-foreground">Basic Input & Textarea</h3>
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

        {/* Input Documentation */}
        <UsageGuidelines
          whenToUse={inputDoc.usage.whenToUse}
          bestPractices={inputDoc.usage.bestPractices}
          avoid={inputDoc.usage.avoid}
        />
        <CodeSnippet
          title="Input.tsx"
          code={inputDoc.examples[0].code}
          language="tsx"
        />
        <PropsTable props={inputDoc.props} componentName="Input" />

        {/* NumberInput */}
        <div class="pt-4 border-t border-border">
          <h3 class="text-xs font-medium mb-3">NumberInput</h3>
          <Panel class="border border-border rounded-md overflow-hidden">
            <PanelContent class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="space-y-1">
                  <label class="text-xs text-muted-foreground">Default (0-100)</label>
                  <NumberInput
                    value={numberValue()}
                    onChange={(v) => {
                      setNumberValue(v);
                      notifications.info('Value Changed', `New value: ${v}`);
                    }}
                    min={0}
                    max={100}
                  />
                </div>
                <div class="space-y-1">
                  <label class="text-xs text-muted-foreground">Step by 5</label>
                  <NumberInput
                    value={stepValue()}
                    onChange={(v) => {
                      setStepValue(v);
                      notifications.info('Step Value', `Value: ${v}`);
                    }}
                    min={0}
                    max={50}
                    step={5}
                  />
                </div>
                <div class="space-y-1">
                  <label class="text-xs text-muted-foreground">Button Only (inputDisabled)</label>
                  <NumberInput
                    value={buttonOnlyValue()}
                    onChange={(v) => {
                      setButtonOnlyValue(v);
                      notifications.info('Button Click', `Value: ${v}`);
                    }}
                    min={1}
                    max={10}
                    inputDisabled
                  />
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="space-y-1">
                  <label class="text-xs text-muted-foreground">Small</label>
                  <NumberInput value={5} onChange={() => {}} size="sm" min={0} max={10} />
                </div>
                <div class="space-y-1">
                  <label class="text-xs text-muted-foreground">Medium</label>
                  <NumberInput value={5} onChange={() => {}} size="md" min={0} max={10} />
                </div>
                <div class="space-y-1">
                  <label class="text-xs text-muted-foreground">Large</label>
                  <NumberInput value={5} onChange={() => {}} size="lg" min={0} max={10} />
                </div>
                <div class="space-y-1">
                  <label class="text-xs text-muted-foreground">Disabled</label>
                  <NumberInput
                    value={10}
                    onChange={() => {}}
                    disabled
                  />
                </div>
              </div>
            </PanelContent>
          </Panel>

          <div class="mt-4">
            <UsageGuidelines
              whenToUse={numberInputDoc.usage.whenToUse}
              bestPractices={numberInputDoc.usage.bestPractices}
              avoid={numberInputDoc.usage.avoid}
            />
            <CodeSnippet
              title="NumberInput.tsx"
              code={numberInputDoc.examples[0].code}
              language="tsx"
            />
            <PropsTable props={numberInputDoc.props} componentName="NumberInput" />
          </div>
        </div>

        {/* AffixInput */}
        <div class="pt-4 border-t border-border">
          <h3 class="text-xs font-medium mb-3">AffixInput</h3>
          <Panel class="border border-border rounded-md overflow-hidden">
            <PanelContent class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label class="text-xs text-muted-foreground">Fixed prefix & suffix</label>
                  <AffixInput
                    prefix="https://"
                    suffix=".com"
                    placeholder="domain"
                    onInput={(e) => {
                      const val = (e.target as HTMLInputElement).value;
                      if (val) notifications.info('Domain Input', `https://${val}.com`);
                    }}
                  />
                </div>
                <div class="space-y-1">
                  <label class="text-xs text-muted-foreground">Currency input</label>
                  <AffixInput
                    prefix="$"
                    placeholder="0.00"
                    type="number"
                    onInput={(e) => {
                      const val = (e.target as HTMLInputElement).value;
                      if (val) notifications.info('Amount', `$${val}`);
                    }}
                  />
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label class="text-xs text-muted-foreground">Selectable protocol</label>
                  <AffixInput
                    prefixOptions={[
                      { value: 'https', label: 'https://' },
                      { value: 'http', label: 'http://' },
                      { value: 'ftp', label: 'ftp://' },
                    ]}
                    prefixValue={protocol()}
                    onPrefixChange={(v) => {
                      setProtocol(v);
                      notifications.info('Protocol Changed', `Protocol: ${v}://`);
                    }}
                    placeholder="example.com"
                  />
                </div>
                <div class="space-y-1">
                  <label class="text-xs text-muted-foreground">Selectable unit suffix</label>
                  <AffixInput
                    suffixOptions={[
                      { value: 'px', label: 'px' },
                      { value: 'rem', label: 'rem' },
                      { value: 'em', label: 'em' },
                      { value: '%', label: '%' },
                    ]}
                    suffixValue={unit()}
                    onSuffixChange={(v) => {
                      setUnit(v);
                      notifications.info('Unit Changed', `Unit: ${v}`);
                    }}
                    placeholder="16"
                    type="number"
                  />
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label class="text-xs text-muted-foreground">Both selectable</label>
                  <AffixInput
                    prefixOptions={[
                      { value: 'https', label: 'https://' },
                      { value: 'http', label: 'http://' },
                    ]}
                    prefixValue={protocol()}
                    onPrefixChange={(v) => {
                      setProtocol(v);
                      notifications.info('Protocol', `${v}://`);
                    }}
                    suffixOptions={[
                      { value: 'com', label: '.com' },
                      { value: 'org', label: '.org' },
                      { value: 'net', label: '.net' },
                    ]}
                    suffixValue={tld()}
                    onSuffixChange={(v) => {
                      setTld(v);
                      notifications.info('TLD Changed', `.${v}`);
                    }}
                    placeholder="domain"
                  />
                </div>
                <div class="space-y-1">
                  <label class="text-xs text-muted-foreground">Disabled</label>
                  <AffixInput
                    prefix="@"
                    placeholder="username"
                    disabled
                  />
                </div>
              </div>
            </PanelContent>
          </Panel>

          <div class="mt-4">
            <UsageGuidelines
              whenToUse={affixInputDoc.usage.whenToUse}
              bestPractices={affixInputDoc.usage.bestPractices}
              avoid={affixInputDoc.usage.avoid}
            />
            <CodeSnippet
              title="AffixInput.tsx"
              code={affixInputDoc.examples[0].code}
              language="tsx"
            />
            <PropsTable props={affixInputDoc.props} componentName="AffixInput" />
          </div>
        </div>
      </div>

      {/* Radio Button */}
      <div class="space-y-4">
        <SectionHeader
          id="ui-radio"
          title="Radio"
          description="Radio button group for selecting a single option from a list. Supports multiple visual variants."
          actions={
            <Button size="sm" variant="outline" onClick={() => props.onOpenFile('core.radio')}>
              View Source
            </Button>
          }
        />
        <Panel class="border border-border rounded-md overflow-hidden">
          <PanelContent class="space-y-6">
            {/* Default Variant */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">Default Variant</h4>
              <RadioGroup
                value={radioValue()}
                onChange={(v) => {
                  setRadioValue(v);
                  notifications.info('Radio Selected', `Selected: ${v}`);
                }}
              >
                <RadioOption value="option1" label="Option 1" />
                <RadioOption value="option2" label="Option 2" />
                <RadioOption value="option3" label="Option 3" />
              </RadioGroup>
            </div>

            {/* Button Variant */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">Button Variant (Segmented Control)</h4>
              <RadioGroup
                value={radioValue()}
                onChange={setRadioValue}
                variant="button"
                orientation="horizontal"
              >
                <RadioOption value="option1" label="Option 1" />
                <RadioOption value="option2" label="Option 2" />
                <RadioOption value="option3" label="Option 3" />
              </RadioGroup>
            </div>

            {/* Card Variant */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">Card Variant</h4>
              <RadioGroup
                value={planValue()}
                onChange={(v) => {
                  setPlanValue(v);
                  notifications.info('Plan Selected', `Selected: ${v}`);
                }}
                variant="card"
              >
                <RadioOption value="free" label="Free" description="For personal use, limited features" />
                <RadioOption value="pro" label="Pro" description="For professionals, all features" />
                <RadioOption value="team" label="Team" description="For teams, unlimited users" />
              </RadioGroup>
            </div>

            {/* Tile Variant */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">Tile Variant</h4>
              <RadioGroup
                value={radioValue()}
                onChange={setRadioValue}
                variant="tile"
                orientation="horizontal"
              >
                <RadioOption value="option1" label="Home" icon={Home} />
                <RadioOption value="option2" label="Settings" icon={Settings} />
                <RadioOption value="option3" label="Files" icon={Files} />
              </RadioGroup>
            </div>

            {/* Sizes */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">Sizes</h4>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label class="text-[10px] text-muted-foreground mb-2 block">Small</label>
                  <RadioGroup value="a" onChange={() => {}} size="sm">
                    <RadioOption value="a" label="Small A" />
                    <RadioOption value="b" label="Small B" />
                  </RadioGroup>
                </div>
                <div>
                  <label class="text-[10px] text-muted-foreground mb-2 block">Medium</label>
                  <RadioGroup value="a" onChange={() => {}} size="md">
                    <RadioOption value="a" label="Medium A" />
                    <RadioOption value="b" label="Medium B" />
                  </RadioGroup>
                </div>
                <div>
                  <label class="text-[10px] text-muted-foreground mb-2 block">Large</label>
                  <RadioGroup value="a" onChange={() => {}} size="lg">
                    <RadioOption value="a" label="Large A" />
                    <RadioOption value="b" label="Large B" />
                  </RadioGroup>
                </div>
              </div>
            </div>

            {/* Disabled */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">Disabled</h4>
              <RadioGroup value="option1" onChange={() => {}} disabled>
                <RadioOption value="option1" label="Disabled option 1" />
                <RadioOption value="option2" label="Disabled option 2" />
              </RadioGroup>
            </div>
          </PanelContent>
        </Panel>
        <UsageGuidelines
          whenToUse={radioDoc.usage.whenToUse}
          bestPractices={radioDoc.usage.bestPractices}
          avoid={radioDoc.usage.avoid}
        />
        <CodeSnippet
          title="Radio.tsx"
          code={radioDoc.examples[0].code}
          language="tsx"
        />
        <PropsTable props={radioDoc.props} componentName="RadioGroup" />
      </div>

      {/* Switch */}
      <div class="space-y-4">
        <SectionHeader
          id="ui-switch"
          title="Switch"
          description="Toggle switch for binary on/off states."
          actions={
            <Button size="sm" variant="outline" onClick={() => props.onOpenFile('core.switch')}>
              View Source
            </Button>
          }
        />
        <Panel class="border border-border rounded-md overflow-hidden">
          <PanelContent class="space-y-6">
            {/* Basic Switch */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">Basic Switch</h4>
              <div class="flex flex-col gap-3">
                <Switch
                  checked={switchValue()}
                  onChange={(v) => {
                    setSwitchValue(v);
                    notifications.info('Switch Toggled', v ? 'Enabled' : 'Disabled');
                  }}
                  label="Enable notifications"
                />
                <Switch
                  checked={darkModeSwitch()}
                  onChange={setDarkModeSwitch}
                  label="Dark mode"
                  description="Use dark theme for the interface"
                />
              </div>
            </div>

            {/* Label positions */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">Label Positions</h4>
              <div class="flex flex-col gap-3">
                <Switch
                  checked={true}
                  onChange={() => {}}
                  label="Label on right (default)"
                  labelPosition="right"
                />
                <Switch
                  checked={true}
                  onChange={() => {}}
                  label="Label on left"
                  labelPosition="left"
                />
              </div>
            </div>

            {/* Sizes */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">Sizes</h4>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Switch
                  checked={true}
                  onChange={() => {}}
                  label="Small"
                  size="sm"
                />
                <Switch
                  checked={true}
                  onChange={() => {}}
                  label="Medium"
                  size="md"
                />
                <Switch
                  checked={true}
                  onChange={() => {}}
                  label="Large"
                  size="lg"
                />
              </div>
            </div>

            {/* States */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">States</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Switch
                  checked={false}
                  onChange={() => {}}
                  label="Unchecked"
                />
                <Switch
                  checked={true}
                  onChange={() => {}}
                  label="Checked"
                />
                <Switch
                  checked={false}
                  onChange={() => {}}
                  label="Disabled unchecked"
                  disabled
                />
                <Switch
                  checked={true}
                  onChange={() => {}}
                  label="Disabled checked"
                  disabled
                />
              </div>
            </div>
          </PanelContent>
        </Panel>
        <UsageGuidelines
          whenToUse={switchDoc.usage.whenToUse}
          bestPractices={switchDoc.usage.bestPractices}
          avoid={switchDoc.usage.avoid}
        />
        <CodeSnippet
          title="Switch.tsx"
          code={switchDoc.examples[0].code}
          language="tsx"
        />
        <PropsTable props={switchDoc.props} componentName="Switch" />
      </div>

      {/* SegmentedControl */}
      <div class="space-y-4">
        <SectionHeader
          id="ui-segmented-control"
          title="SegmentedControl"
          description="A toggle button group for switching between mutually exclusive options like view modes (UI/JSON) or filters."
          actions={
            <Button size="sm" variant="outline" onClick={() => props.onOpenFile('core.segmented-control')}>
              View Source
            </Button>
          }
        />
        <Panel class="border border-border rounded-md overflow-hidden">
          <PanelContent class="space-y-6">
            {/* Basic */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">Basic Usage</h4>
              <SegmentedControl
                value="ui"
                onChange={() => {}}
                options={[
                  { value: 'ui', label: 'UI' },
                  { value: 'json', label: 'JSON' },
                ]}
              />
            </div>

            {/* Multiple Options */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">Multiple Options</h4>
              <SegmentedControl
                value="list"
                onChange={() => {}}
                options={[
                  { value: 'list', label: 'List' },
                  { value: 'grid', label: 'Grid' },
                  { value: 'gallery', label: 'Gallery' },
                ]}
              />
            </div>

            {/* Sizes */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">Sizes</h4>
              <div class="flex flex-col gap-3">
                <SegmentedControl
                  value="a"
                  onChange={() => {}}
                  size="sm"
                  options={[
                    { value: 'a', label: 'Small' },
                    { value: 'b', label: 'Option' },
                  ]}
                />
                <SegmentedControl
                  value="a"
                  onChange={() => {}}
                  size="md"
                  options={[
                    { value: 'a', label: 'Medium' },
                    { value: 'b', label: 'Option' },
                  ]}
                />
                <SegmentedControl
                  value="a"
                  onChange={() => {}}
                  size="lg"
                  options={[
                    { value: 'a', label: 'Large' },
                    { value: 'b', label: 'Option' },
                  ]}
                />
              </div>
            </div>

            {/* With Icons */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">With Icons</h4>
              <SegmentedControl
                value="code"
                onChange={() => {}}
                options={[
                  { value: 'code', label: 'Code', icon: Code },
                  { value: 'preview', label: 'Preview', icon: Eye },
                ]}
              />
            </div>

            {/* Disabled */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">States</h4>
              <div class="flex flex-col gap-3">
                <SegmentedControl
                  value="a"
                  onChange={() => {}}
                  disabled
                  options={[
                    { value: 'a', label: 'Disabled' },
                    { value: 'b', label: 'Control' },
                  ]}
                />
                <SegmentedControl
                  value="a"
                  onChange={() => {}}
                  options={[
                    { value: 'a', label: 'Normal' },
                    { value: 'b', label: 'Disabled Option', disabled: true },
                  ]}
                />
              </div>
            </div>
          </PanelContent>
        </Panel>
        <UsageGuidelines
          whenToUse={segmentedControlDoc.usage.whenToUse}
          bestPractices={segmentedControlDoc.usage.bestPractices}
          avoid={segmentedControlDoc.usage.avoid}
        />
        <CodeSnippet
          title="SegmentedControl.tsx"
          code={segmentedControlDoc.examples[0].code}
          language="tsx"
        />
        <PropsTable props={segmentedControlDoc.props} componentName="SegmentedControl" />
      </div>

      {/* Checkbox */}
      <div class="space-y-4">
        <SectionHeader
          id="ui-checkbox"
          title="Checkbox"
          description="Checkbox component for multi-select options. Supports multiple visual variants like Radio."
          actions={
            <Button size="sm" variant="outline" onClick={() => props.onOpenFile('core.checkbox')}>
              View Source
            </Button>
          }
        />
        <Panel class="border border-border rounded-md overflow-hidden">
          <PanelContent class="space-y-6">
            {/* Basic Checkbox */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">Standalone Checkbox</h4>
              <div class="flex flex-col gap-2">
                <Checkbox
                  checked={singleCheckbox()}
                  onChange={(v) => {
                    setSingleCheckbox(v);
                    notifications.info('Checkbox', v ? 'Checked' : 'Unchecked');
                  }}
                  label="Accept terms and conditions"
                />
                <Checkbox
                  checked={true}
                  onChange={() => {}}
                  label="With description"
                  description="This option has additional information"
                />
                <Checkbox
                  indeterminate
                  label="Indeterminate state"
                />
              </div>
            </div>

            {/* CheckboxGroup - Default */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">CheckboxGroup - Default</h4>
              <CheckboxGroup
                value={checkboxValues()}
                onChange={(v) => {
                  setCheckboxValues(v);
                  notifications.info('Selection Changed', `Selected: ${v.join(', ')}`);
                }}
              >
                <Checkbox value="option1" label="Option 1" />
                <Checkbox value="option2" label="Option 2" />
                <Checkbox value="option3" label="Option 3" />
              </CheckboxGroup>
            </div>

            {/* CheckboxGroup - Button Variant */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">Button Variant (Multi-select)</h4>
              <CheckboxGroup
                value={checkboxValues()}
                onChange={setCheckboxValues}
                variant="button"
                orientation="horizontal"
              >
                <Checkbox value="option1" label="Option 1" />
                <Checkbox value="option2" label="Option 2" />
                <Checkbox value="option3" label="Option 3" />
              </CheckboxGroup>
            </div>

            {/* CheckboxGroup - Card Variant */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">Card Variant</h4>
              <CheckboxGroup
                value={checkboxValues()}
                onChange={setCheckboxValues}
                variant="card"
              >
                <Checkbox value="option1" label="Notifications" description="Receive email notifications" />
                <Checkbox value="option2" label="Updates" description="Get product updates" />
                <Checkbox value="option3" label="Marketing" description="Receive marketing emails" />
              </CheckboxGroup>
            </div>

            {/* CheckboxGroup - Tile Variant */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">Tile Variant</h4>
              <CheckboxGroup
                value={checkboxValues()}
                onChange={setCheckboxValues}
                variant="tile"
                orientation="horizontal"
              >
                <Checkbox value="option1" label="Home" icon={Home} />
                <Checkbox value="option2" label="Settings" icon={Settings} />
                <Checkbox value="option3" label="Files" icon={Files} />
              </CheckboxGroup>
            </div>

            {/* Sizes */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">Sizes</h4>
              <div class="flex items-center gap-6">
                <Checkbox checked={true} onChange={() => {}} label="Small" size="sm" />
                <Checkbox checked={true} onChange={() => {}} label="Medium" size="md" />
                <Checkbox checked={true} onChange={() => {}} label="Large" size="lg" />
              </div>
            </div>

            {/* Disabled */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">Disabled</h4>
              <div class="flex items-center gap-4">
                <Checkbox checked={false} onChange={() => {}} label="Unchecked disabled" disabled />
                <Checkbox checked={true} onChange={() => {}} label="Checked disabled" disabled />
              </div>
            </div>
          </PanelContent>
        </Panel>
        <UsageGuidelines
          whenToUse={checkboxDoc.usage.whenToUse}
          bestPractices={checkboxDoc.usage.bestPractices}
          avoid={checkboxDoc.usage.avoid}
        />
        <CodeSnippet
          title="Checkbox.tsx"
          code={checkboxDoc.examples[0].code}
          language="tsx"
        />
        <PropsTable props={checkboxDoc.props} componentName="Checkbox" />
      </div>

      {/* Pagination */}
      <div class="space-y-4">
        <SectionHeader
          id="ui-pagination"
          title="Pagination"
          description="Navigation component for paginated content. Multiple variants for different use cases."
          actions={
            <Button size="sm" variant="outline" onClick={() => props.onOpenFile('core.pagination')}>
              View Source
            </Button>
          }
        />
        <Panel class="border border-border rounded-md overflow-hidden">
          <PanelContent class="space-y-6">
            {/* Default Pagination */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">Default Pagination</h4>
              <Pagination
                page={currentPage()}
                totalPages={20}
                onChange={(p) => {
                  setCurrentPage(p);
                  notifications.info('Page Changed', `Page: ${p}`);
                }}
              />
            </div>

            {/* With First/Last & Jump */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">With First/Last & Jump To</h4>
              <Pagination
                page={currentPage()}
                totalPages={20}
                onChange={setCurrentPage}
                showFirstLast
                showJumpTo
              />
            </div>

            {/* With Page Size */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">With Page Size Selector</h4>
              <Pagination
                page={currentPage()}
                totalPages={20}
                onChange={setCurrentPage}
                showPageSize
                pageSize={pageSize()}
                pageSizes={[10, 20, 50, 100]}
                onPageSizeChange={(s) => {
                  setPageSize(s);
                  notifications.info('Page Size', `${s} items per page`);
                }}
                totalItems={200}
              />
            </div>

            {/* Simple Variant */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">Simple Variant</h4>
              <Pagination
                page={currentPage()}
                totalPages={20}
                onChange={setCurrentPage}
                variant="simple"
              />
            </div>

            {/* Minimal Variant */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">Minimal Variant</h4>
              <Pagination
                page={currentPage()}
                totalPages={20}
                onChange={setCurrentPage}
                variant="minimal"
                showFirstLast
              />
            </div>

            {/* Sizes */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">Sizes</h4>
              <div class="flex flex-col gap-4">
                <div>
                  <label class="text-[10px] text-muted-foreground mb-2 block">Small</label>
                  <Pagination page={5} totalPages={10} onChange={() => {}} size="sm" />
                </div>
                <div>
                  <label class="text-[10px] text-muted-foreground mb-2 block">Medium</label>
                  <Pagination page={5} totalPages={10} onChange={() => {}} size="md" />
                </div>
                <div>
                  <label class="text-[10px] text-muted-foreground mb-2 block">Large</label>
                  <Pagination page={5} totalPages={10} onChange={() => {}} size="lg" />
                </div>
              </div>
            </div>
          </PanelContent>
        </Panel>
        <UsageGuidelines
          whenToUse={paginationDoc.usage.whenToUse}
          bestPractices={paginationDoc.usage.bestPractices}
          avoid={paginationDoc.usage.avoid}
        />
        <CodeSnippet
          title="Pagination.tsx"
          code={paginationDoc.examples[0].code}
          language="tsx"
        />
        <PropsTable props={paginationDoc.props} componentName="Pagination" />
      </div>

      {/* Progress */}
      <div class="space-y-4">
        <SectionHeader
          id="ui-progress"
          title="Progress"
          description="Progress indicators for loading states and task completion. Linear, circular, segmented, and step variants."
          actions={
            <Button size="sm" variant="outline" onClick={() => props.onOpenFile('core.progress')}>
              View Source
            </Button>
          }
        />
        <Panel class="border border-border rounded-md overflow-hidden">
          <PanelContent class="space-y-6">
            {/* Linear Progress */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">Linear Progress</h4>
              <div class="space-y-4">
                <LinearProgress value={progressValue()} showLabel />
                <div class="flex gap-2">
                  <Button size="xs" onClick={() => setProgressValue(Math.max(0, progressValue() - 10))}>-10%</Button>
                  <Button size="xs" onClick={() => setProgressValue(Math.min(100, progressValue() + 10))}>+10%</Button>
                </div>
              </div>
            </div>

            {/* Linear Progress Variants */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">Colors</h4>
              <div class="space-y-3">
                <LinearProgress value={80} color="primary" />
                <LinearProgress value={65} color="success" />
                <LinearProgress value={50} color="warning" />
                <LinearProgress value={35} color="error" />
                <LinearProgress value={70} color="info" />
              </div>
            </div>

            {/* Striped & Animated */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">Striped & Animated</h4>
              <div class="space-y-3">
                <LinearProgress value={75} striped />
                <LinearProgress value={60} striped animated />
              </div>
            </div>

            {/* Indeterminate */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">Indeterminate (Loading)</h4>
              <LinearProgress indeterminate />
            </div>

            {/* With Buffer */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">With Buffer</h4>
              <LinearProgress value={45} buffer={70} />
            </div>

            {/* Sizes */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">Sizes</h4>
              <div class="space-y-3">
                <div>
                  <label class="text-[10px] text-muted-foreground mb-1 block">Small</label>
                  <LinearProgress value={60} size="sm" />
                </div>
                <div>
                  <label class="text-[10px] text-muted-foreground mb-1 block">Medium</label>
                  <LinearProgress value={60} size="md" />
                </div>
                <div>
                  <label class="text-[10px] text-muted-foreground mb-1 block">Large</label>
                  <LinearProgress value={60} size="lg" />
                </div>
              </div>
            </div>

            {/* Circular Progress */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">Circular Progress</h4>
              <div class="flex items-center gap-4">
                <CircularProgress value={progressValue()} showLabel size="sm" />
                <CircularProgress value={progressValue()} showLabel size="md" />
                <CircularProgress value={progressValue()} showLabel size="lg" />
                <CircularProgress value={progressValue()} showLabel size={80} strokeWidth={6} />
              </div>
            </div>

            {/* Circular Colors */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">Circular Colors</h4>
              <div class="flex items-center gap-4">
                <CircularProgress value={75} showLabel color="primary" />
                <CircularProgress value={75} showLabel color="success" />
                <CircularProgress value={75} showLabel color="warning" />
                <CircularProgress value={75} showLabel color="error" />
                <CircularProgress indeterminate color="info" />
              </div>
            </div>

            {/* Segmented Progress */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">Segmented Progress</h4>
              <div class="space-y-3">
                <SegmentedProgress value={progressValue()} segments={5} showLabel />
                <SegmentedProgress value={80} segments={10} color="success" />
                <SegmentedProgress value={40} segments={4} color="warning" gap={4} />
              </div>
            </div>

            {/* Steps Progress */}
            <div class="space-y-3">
              <h4 class="text-xs font-medium text-muted-foreground">Steps Progress</h4>
              <StepsProgress
                current={2}
                steps={['Account', 'Profile', 'Review', 'Complete']}
              />
            </div>
          </PanelContent>
        </Panel>
        <UsageGuidelines
          whenToUse={linearProgressDoc.usage.whenToUse}
          bestPractices={linearProgressDoc.usage.bestPractices}
          avoid={linearProgressDoc.usage.avoid}
        />
        <CodeSnippet
          title="Progress.tsx"
          code={linearProgressDoc.examples[0].code}
          language="tsx"
        />
        <PropsTable props={linearProgressDoc.props} componentName="LinearProgress" />
      </div>

      {/* Form Components */}
      <div class="space-y-4">
        <SectionHeader
          id="ui-forms"
          title="Form"
          description="Composable form components for accessible forms with validation."
          actions={
            <Button size="sm" variant="outline" onClick={() => props.onOpenFile('core.form')}>
              View Source
            </Button>
          }
        />
        <Panel class="border border-border rounded-md overflow-hidden">
          <PanelContent>
            <Form class="max-w-md" onSubmit={() => {
              setTimeout(async () => {
                await new Promise(r => setTimeout(r, 1000));
                notifications.success('Form submitted', 'Your data has been saved.');
              }, 0);
            }}>
              <FormSection title="Account Information" description="Create your account credentials">
                <FormField>
                  <FormLabel required>Email</FormLabel>
                  <Input type="email" placeholder="you@example.com" autocomplete="email" />
                  <FormDescription>We'll never share your email with anyone.</FormDescription>
                </FormField>

                <FormField>
                  <FormLabel required>Password</FormLabel>
                  <Input type="password" placeholder="Enter a strong password" autocomplete="new-password" />
                </FormField>
              </FormSection>

              <FormDivider label="optional" />

              <FormSection title="Profile" description="Tell us about yourself">
                <FormRow cols={2}>
                  <FormField>
                    <FormLabel>First Name</FormLabel>
                    <Input placeholder="John" />
                  </FormField>
                  <FormField>
                    <FormLabel>Last Name</FormLabel>
                    <Input placeholder="Doe" />
                  </FormField>
                </FormRow>

                <FormField>
                  <FormLabel>Bio</FormLabel>
                  <Textarea placeholder="Tell us about yourself..." rows={3} />
                </FormField>
              </FormSection>

              <FormActions align="end">
                <Button variant="outline" type="button">Cancel</Button>
                <Button type="submit">Create Account</Button>
              </FormActions>
            </Form>
          </PanelContent>
        </Panel>

        {/* Validation Example */}
        <div class="pt-4 border-t border-border">
          <h3 class="text-xs font-medium mb-3">Form with Validation Errors</h3>
          <Panel class="border border-border rounded-md overflow-hidden">
            <PanelContent>
              <Form class="max-w-sm">
                <FormField>
                  <FormLabel required>Username</FormLabel>
                  <Input value="ab" class="border-error" />
                  <FormMessage error="Username must be at least 3 characters" />
                </FormField>

                <FormField>
                  <FormLabel required>Email</FormLabel>
                  <Input type="email" value="invalid-email" class="border-error" autocomplete="email" />
                  <FormMessage error="Please enter a valid email address" />
                </FormField>

                <FormActions>
                  <Button type="submit" disabled>Submit</Button>
                </FormActions>
              </Form>
            </PanelContent>
          </Panel>
        </div>

        {/* Form Documentation */}
        <UsageGuidelines
          whenToUse={formDoc.usage.whenToUse}
          bestPractices={formDoc.usage.bestPractices}
          avoid={formDoc.usage.avoid}
        />
        <CodeSnippet
          title="Form.tsx"
          code={formDoc.examples[0].code}
          language="tsx"
        />
        <PropsTable props={formDoc.props} componentName="Form" />
      </div>

      {/* ============================================================
          STEPPER & WIZARD SECTION
          ============================================================ */}
      <div class="space-y-4">
        <SectionHeader
          id="ui-stepper"
          title="Stepper & Wizard"
          description="Multi-step progress indicators and wizard components for guided workflows."
          actions={
            <Button size="sm" variant="outline" onClick={() => props.onOpenFile('core.stepper')}>
              View Source
            </Button>
          }
        />

        {/* Stepper Variants */}
        <h3 class="text-xs font-medium text-muted-foreground">Stepper Variants</h3>
        <Panel class="border border-border rounded-md overflow-hidden">
          <PanelContent class="space-y-6">
            {/* Default Variant */}
            <div class="space-y-2">
              <p class="text-[11px] text-muted-foreground font-medium">Default</p>
              <Stepper
                steps={[
                  { id: 'details', label: 'Details' },
                  { id: 'config', label: 'Configuration' },
                  { id: 'review', label: 'Review' },
                  { id: 'complete', label: 'Complete' },
                ]}
                currentStep={1}
              />
            </div>

            {/* Minimal Variant */}
            <div class="space-y-2">
              <p class="text-[11px] text-muted-foreground font-medium">Minimal</p>
              <Stepper
                variant="minimal"
                steps={[
                  { id: 's1', label: 'Step 1' },
                  { id: 's2', label: 'Step 2' },
                  { id: 's3', label: 'Step 3' },
                ]}
                currentStep={2}
              />
            </div>

            {/* Dots Variant */}
            <div class="space-y-2">
              <p class="text-[11px] text-muted-foreground font-medium">Dots</p>
              <Stepper
                variant="dots"
                steps={[
                  { id: 'account', label: 'Account' },
                  { id: 'profile', label: 'Profile' },
                  { id: 'settings', label: 'Settings' },
                  { id: 'done', label: 'Done' },
                ]}
                currentStep={0}
              />
            </div>
          </PanelContent>
        </Panel>

        {/* Stepper Sizes */}
        <div class="pt-4 border-t border-border">
          <h3 class="text-xs font-medium mb-3">Stepper Sizes</h3>
          <Panel class="border border-border rounded-md overflow-hidden">
            <PanelContent class="space-y-4">
              <div class="space-y-2">
                <p class="text-[11px] text-muted-foreground">Small</p>
                <Stepper
                  size="sm"
                  steps={[{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }]}
                  currentStep={1}
                />
              </div>
              <div class="space-y-2">
                <p class="text-[11px] text-muted-foreground">Medium (default)</p>
                <Stepper
                  size="md"
                  steps={[{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }]}
                  currentStep={1}
                />
              </div>
              <div class="space-y-2">
                <p class="text-[11px] text-muted-foreground">Large</p>
                <Stepper
                  size="lg"
                  steps={[{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }]}
                  currentStep={1}
                />
              </div>
            </PanelContent>
          </Panel>
        </div>

        {/* Interactive Wizard Example */}
        <div class="pt-4 border-t border-border">
          <h3 class="text-xs font-medium mb-3">Interactive Wizard</h3>
          <Panel class="border border-border rounded-md overflow-hidden">
            <PanelContent>
              <WizardDemo />
            </PanelContent>
          </Panel>
        </div>

        {/* Stepper Documentation */}
        <UsageGuidelines
          whenToUse={stepperDoc.usage.whenToUse}
          bestPractices={stepperDoc.usage.bestPractices}
          avoid={stepperDoc.usage.avoid}
        />
        <CodeSnippet
          title="Stepper.tsx"
          code={stepperDoc.examples[0].code}
          language="tsx"
        />
        <PropsTable props={stepperDoc.props} componentName="Stepper" />

        {/* Wizard Documentation */}
        <h3 class="text-xs font-medium text-muted-foreground mt-6">Wizard Component</h3>
        <CodeSnippet
          title="Wizard.tsx"
          code={wizardDoc.examples[0].code}
          language="tsx"
        />
        <PropsTable props={wizardDoc.props} componentName="Wizard" />

        {/* useWizard Hook Documentation */}
        <h3 class="text-xs font-medium text-muted-foreground mt-6">useWizard Hook</h3>
        <CodeSnippet
          title="useWizard.ts"
          code={useWizardDoc.examples[0].code}
          language="tsx"
        />
        <PropsTable props={useWizardDoc.props} componentName="useWizard" />
      </div>

      <div class="space-y-4">
        <SectionHeader
          id="ui-menus"
          title="Dropdown & Select"
          description="Menu items, cascade submenus, custom content, and a Select wrapper."
          actions={
            <Button size="sm" variant="outline" onClick={() => props.onOpenFile('core.dropdown')}>
              View Source
            </Button>
          }
        />

        {/* Basic Dropdown & Select */}
        <h3 class="text-xs font-medium text-muted-foreground">Basic Dropdown & Select</h3>
        <Panel class="border border-border rounded-md overflow-hidden">
          <PanelContent class="flex flex-wrap items-start gap-4">
            <div class="space-y-1.5">
              <p class="text-[11px] text-muted-foreground">Dropdown</p>
              <Dropdown
                value={dropdownValue()}
                onSelect={(id) => {
                  setDropdownValue(id);
                  notifications.info('Selection Changed', `Selected: ${id}`);
                }}
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
                onChange={(v) => {
                  setSelectValue(v);
                  notifications.info('Theme Changed', `Theme set to: ${v}`);
                }}
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

        {/* Cascade Dropdown */}
        <div class="pt-4 border-t border-border">
          <h3 class="text-xs font-medium mb-3">Cascade Dropdown</h3>
          <Panel class="border border-border rounded-md overflow-hidden">
            <PanelContent class="flex flex-wrap items-start gap-4">
              <div class="space-y-1.5">
                <p class="text-[11px] text-muted-foreground">With Submenus</p>
                <Dropdown
                  onSelect={(id) => {
                    notifications.info('Action Selected', `You clicked: ${id}`);
                  }}
                  items={cascadeItems}
                  trigger={
                    <Button variant="outline">
                      Actions
                    </Button>
                  }
                />
              </div>
              <div class="space-y-1.5">
                <p class="text-[11px] text-muted-foreground">File Menu Style</p>
                <Dropdown
                  onSelect={(id) => {
                    notifications.info('File Action', `Action: ${id}`);
                  }}
                  items={fileMenuItems}
                  trigger={
                    <Button variant="outline">
                      File
                    </Button>
                  }
                />
              </div>
            </PanelContent>
          </Panel>
        </div>

        {/* Dropdown with Custom Content */}
        <div class="pt-4 border-t border-border">
          <h3 class="text-xs font-medium mb-3">Dropdown with Custom Content</h3>
          <Panel class="border border-border rounded-md overflow-hidden">
            <PanelContent class="flex flex-wrap items-start gap-4">
              <div class="space-y-1.5">
                <p class="text-[11px] text-muted-foreground">With NumberInput</p>
                <Dropdown
                  onSelect={() => {}}
                  items={[
                    {
                      id: 'quantity',
                      label: 'Quantity',
                      content: () => (
                        <div class="space-y-1">
                          <label class="text-xs text-muted-foreground">Quantity</label>
                          <NumberInput
                            value={dropdownQuantity()}
                            onChange={(v) => {
                              setDropdownQuantity(v);
                              notifications.info('Quantity Changed', `New quantity: ${v}`);
                            }}
                            min={1}
                            max={99}
                            size="sm"
                            inputDisabled
                          />
                        </div>
                      ),
                      keepOpen: true,
                    },
                    { id: 'sep', label: '', separator: true },
                    { id: 'apply', label: 'Apply' },
                    { id: 'reset', label: 'Reset to Default' },
                  ]}
                  trigger={
                    <Button variant="outline">
                      Settings ({dropdownQuantity()})
                    </Button>
                  }
                />
              </div>
              <div class="space-y-1.5">
                <p class="text-[11px] text-muted-foreground">Zoom Control</p>
                <Dropdown
                  onSelect={(id) => {
                    if (id === 'fit') {
                      setZoomLevel(100);
                      notifications.info('Zoom Reset', 'Zoom set to 100%');
                    }
                  }}
                  items={[
                    {
                      id: 'zoom-control',
                      label: 'Zoom',
                      content: () => (
                        <div class="flex items-center gap-2">
                          <span class="text-xs text-muted-foreground w-12">Zoom</span>
                          <NumberInput
                            value={zoomLevel()}
                            onChange={(v) => {
                              setZoomLevel(v);
                              notifications.info('Zoom Changed', `Zoom: ${v}%`);
                            }}
                            min={25}
                            max={400}
                            step={25}
                            size="sm"
                          />
                          <span class="text-xs text-muted-foreground">%</span>
                        </div>
                      ),
                      keepOpen: true,
                    },
                    { id: 'sep', label: '', separator: true },
                    { id: 'fit', label: 'Fit to Window' },
                  ]}
                  trigger={
                    <Button variant="outline">
                      Zoom: {zoomLevel()}%
                    </Button>
                  }
                />
              </div>
            </PanelContent>
          </Panel>
        </div>

        {/* Dropdown Documentation */}
        <UsageGuidelines
          whenToUse={dropdownDoc.usage.whenToUse}
          bestPractices={dropdownDoc.usage.bestPractices}
          avoid={dropdownDoc.usage.avoid}
        />
        <CodeSnippet
          title="Dropdown.tsx"
          code={dropdownDoc.examples[0].code}
          language="tsx"
        />
        <PropsTable props={dropdownDoc.props} componentName="Dropdown" />

        {/* Select Documentation */}
        <div class="pt-4 border-t border-border">
          <h3 class="text-xs font-medium mb-3">Select Component</h3>
          <UsageGuidelines
            whenToUse={selectDoc.usage.whenToUse}
            bestPractices={selectDoc.usage.bestPractices}
            avoid={selectDoc.usage.avoid}
          />
          <CodeSnippet
            title="Select.tsx"
            code={selectDoc.examples[0].code}
            language="tsx"
            class="mt-3"
          />
          <PropsTable props={selectDoc.props} componentName="Select" class="mt-3" />
        </div>
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

        {/* Tooltip Documentation */}
        <UsageGuidelines
          whenToUse={tooltipDoc.usage.whenToUse}
          bestPractices={tooltipDoc.usage.bestPractices}
          avoid={tooltipDoc.usage.avoid}
        />
        <CodeSnippet
          title="Tooltip.tsx"
          code={tooltipDoc.examples[0].code}
          language="tsx"
        />
        <PropsTable props={tooltipDoc.props} componentName="Tooltip" />
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

        {/* Dialog Documentation */}
        <UsageGuidelines
          whenToUse={dialogDoc.usage.whenToUse}
          bestPractices={dialogDoc.usage.bestPractices}
          avoid={dialogDoc.usage.avoid}
        />
        <CodeSnippet
          title="Dialog.tsx"
          code={dialogDoc.examples[0].code}
          language="tsx"
        />
        <PropsTable props={dialogDoc.props} componentName="Dialog" />
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

        {/* DirectoryPicker Documentation */}
        <UsageGuidelines
          whenToUse={directoryPickerDoc.usage.whenToUse}
          bestPractices={directoryPickerDoc.usage.bestPractices}
          avoid={directoryPickerDoc.usage.avoid}
        />
        <CodeSnippet
          title="DirectoryPicker.tsx"
          code={directoryPickerDoc.examples[0].code}
          language="tsx"
        />
        <PropsTable props={directoryPickerDoc.props} componentName="DirectoryPicker" />
      </div>

      {/* DirectoryInput Section */}
      <div class="space-y-4">
        <SectionHeader
          id="ui-directory-input"
          title="Directory Input"
          description="Form-compatible input for selecting directories. Shows selected path and opens a picker dialog when clicked."
        />

        {/* Basic Usage */}
        <Panel class="border border-border rounded-md overflow-hidden">
          <PanelContent class="space-y-4">
            <h3 class="text-xs font-medium">Basic Usage & Size Variants</h3>
            <div class="flex flex-col gap-3 max-w-md">
              <DirectoryInput
                value={directoryInputValue()}
                onChange={setDirectoryInputValue}
                files={demoFileBrowserData}
                placeholder="Select project directory..."
                helperText="Choose the root directory for your project."
              />
              <DirectoryInput
                value={directoryInputValue()}
                onChange={setDirectoryInputValue}
                files={demoFileBrowserData}
                size="sm"
                placeholder="Small size"
              />
              <DirectoryInput
                value={directoryInputValue()}
                onChange={setDirectoryInputValue}
                files={demoFileBrowserData}
                size="lg"
                placeholder="Large size"
              />
              <DirectoryInput
                files={demoFileBrowserData}
                disabled
                placeholder="Disabled input"
              />
              <DirectoryInput
                files={demoFileBrowserData}
                error="Directory is required"
                placeholder="With error state"
              />
            </div>
            <p class="text-[11px] text-muted-foreground">
              Selected: {directoryInputValue() || '(none)'}
            </p>
          </PanelContent>
        </Panel>

        {/* Form Integration Example */}
        <div class="pt-4 border-t border-border">
          <h3 class="text-xs font-medium mb-3">Form Integration</h3>
          <Panel class="border border-border rounded-md overflow-hidden">
            <PanelContent>
              <Form class="max-w-md" onSubmit={() => {
                notifications.success('Project Created', `Created project at ${directoryInputValue()}`);
              }}>
                <FormSection title="Project Settings" description="Configure your new project">
                  <FormField>
                    <FormLabel required>Project Name</FormLabel>
                    <Input placeholder="my-awesome-project" />
                    <FormDescription>A unique name for your project.</FormDescription>
                  </FormField>

                  <FormField>
                    <FormLabel required>Project Directory</FormLabel>
                    <DirectoryInput
                      value={directoryInputValue()}
                      onChange={setDirectoryInputValue}
                      files={demoFileBrowserData}
                      placeholder="Select project location..."
                    />
                    <FormDescription>Where your project files will be stored.</FormDescription>
                  </FormField>

                  <FormRow cols={2}>
                    <FormField>
                      <FormLabel>Template</FormLabel>
                      <Select
                        value="blank"
                        onChange={() => {}}
                        options={[
                          { value: 'blank', label: 'Blank Project' },
                          { value: 'react', label: 'React App' },
                          { value: 'node', label: 'Node.js Server' },
                        ]}
                      />
                    </FormField>
                    <FormField>
                      <FormLabel>Visibility</FormLabel>
                      <Select
                        value="private"
                        onChange={() => {}}
                        options={[
                          { value: 'private', label: 'Private' },
                          { value: 'public', label: 'Public' },
                        ]}
                      />
                    </FormField>
                  </FormRow>
                </FormSection>

                <FormActions align="end">
                  <Button variant="outline" type="button">Cancel</Button>
                  <Button type="submit" disabled={!directoryInputValue()}>Create Project</Button>
                </FormActions>
              </Form>
            </PanelContent>
          </Panel>
        </div>

        {/* DirectoryInput Documentation */}
        <UsageGuidelines
          whenToUse={directoryInputDoc.usage.whenToUse}
          bestPractices={directoryInputDoc.usage.bestPractices}
          avoid={directoryInputDoc.usage.avoid}
        />
        <CodeSnippet
          title="DirectoryInput.tsx"
          code={directoryInputDoc.examples[0].code}
          language="tsx"
        />
        <PropsTable props={directoryInputDoc.props} componentName="DirectoryInput" />
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

        {/* FileSavePicker Documentation */}
        <UsageGuidelines
          whenToUse={fileSavePickerDoc.usage.whenToUse}
          bestPractices={fileSavePickerDoc.usage.bestPractices}
          avoid={fileSavePickerDoc.usage.avoid}
        />
        <CodeSnippet
          title="FileSavePicker.tsx"
          code={fileSavePickerDoc.examples[0].code}
          language="tsx"
        />
        <PropsTable props={fileSavePickerDoc.props} componentName="FileSavePicker" />
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

        {/* FloatingWindow Documentation */}
        <UsageGuidelines
          whenToUse={floatingWindowDoc.usage.whenToUse}
          bestPractices={floatingWindowDoc.usage.bestPractices}
          avoid={floatingWindowDoc.usage.avoid}
        />
        <CodeSnippet
          title="FloatingWindow.tsx"
          code={floatingWindowDoc.examples[0].code}
          language="tsx"
        />
        <PropsTable props={floatingWindowDoc.props} componentName="FloatingWindow" />
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

        {/* CommandPalette Documentation */}
        <UsageGuidelines
          whenToUse={commandPaletteDoc.usage.whenToUse}
          bestPractices={commandPaletteDoc.usage.bestPractices}
          avoid={commandPaletteDoc.usage.avoid}
        />
        <CodeSnippet
          title="CommandPalette.tsx"
          code={commandPaletteDoc.examples[0].code}
          language="tsx"
        />
        <PropsTable props={commandPaletteDoc.props} componentName="CommandPalette" />
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

        {/* FileBrowser Documentation */}
        <UsageGuidelines
          whenToUse={fileBrowserDoc.usage.whenToUse}
          bestPractices={fileBrowserDoc.usage.bestPractices}
          avoid={fileBrowserDoc.usage.avoid}
        />
        <CodeSnippet
          title="FileBrowser.tsx"
          code={fileBrowserDoc.examples[0].code}
          language="tsx"
        />
        <PropsTable props={fileBrowserDoc.props} componentName="FileBrowser" />
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

        {/* Loading Documentation */}
        <UsageGuidelines
          whenToUse={loadingOverlayDoc.usage.whenToUse}
          bestPractices={loadingOverlayDoc.usage.bestPractices}
          avoid={loadingOverlayDoc.usage.avoid}
        />
        <CodeSnippet
          title="Loading Components"
          code={skeletonDoc.examples[0].code}
          language="tsx"
        />
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <PropsTable props={skeletonDoc.props} componentName="Skeleton" />
          <PropsTable props={snakeLoaderDoc.props} componentName="SnakeLoader" />
          <PropsTable props={loadingOverlayDoc.props} componentName="LoadingOverlay" />
        </div>
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

        {/* QuoteBlock Documentation */}
        <UsageGuidelines
          whenToUse={quoteBlockDoc.usage.whenToUse}
          bestPractices={quoteBlockDoc.usage.bestPractices}
          avoid={quoteBlockDoc.usage.avoid}
        />
        <CodeSnippet
          title="QuoteBlock.tsx"
          code={quoteBlockDoc.examples[0].code}
          language="tsx"
        />
        <PropsTable props={quoteBlockDoc.props} componentName="QuoteBlock" />
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

        {/* HighlightBlock Documentation */}
        <UsageGuidelines
          whenToUse={highlightBlockDoc.usage.whenToUse}
          bestPractices={highlightBlockDoc.usage.bestPractices}
          avoid={highlightBlockDoc.usage.avoid}
        />
        <CodeSnippet
          title="HighlightBlock.tsx"
          code={highlightBlockDoc.examples[0].code}
          language="tsx"
        />
        <PropsTable props={highlightBlockDoc.props} componentName="HighlightBlock" />
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

        {/* ProcessingIndicator Documentation */}
        <UsageGuidelines
          whenToUse={processingIndicatorDoc.usage.whenToUse}
          bestPractices={processingIndicatorDoc.usage.bestPractices}
          avoid={processingIndicatorDoc.usage.avoid}
        />
        <CodeSnippet
          title="ProcessingIndicator.tsx"
          code={processingIndicatorDoc.examples[0].code}
          language="tsx"
        />
        <PropsTable props={processingIndicatorDoc.props} componentName="ProcessingIndicator" />
      </div>

      <div class="space-y-4">
        <SectionHeader
          id="ui-charts"
          title="Charts"
          description="Professional data visualization components with animations and responsive design."
        />

        {/* Line Chart */}
        <div class="space-y-2">
          <p class="text-[11px] text-muted-foreground font-medium">Line Chart - Trend Visualization</p>
          <Panel class="border border-border rounded-md overflow-hidden">
            <PanelContent>
              <LineChart
                title="Weekly Performance"
                series={[
                  { name: 'Revenue', data: [120, 180, 150, 220, 280, 260, 340] },
                  { name: 'Users', data: [80, 120, 140, 160, 200, 180, 240] },
                ]}
                labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
                height={220}
                showArea
                variant="gradient"
              />
            </PanelContent>
          </Panel>
        </div>

        {/* Area Chart */}
        <div class="space-y-2">
          <p class="text-[11px] text-muted-foreground font-medium">Area Chart - Volume Data</p>
          <Panel class="border border-border rounded-md overflow-hidden">
            <PanelContent>
              <AreaChart
                title="Traffic Overview"
                series={[
                  { name: 'Page Views', data: [450, 520, 480, 610, 580, 720, 680, 750, 800, 720, 680, 640] },
                ]}
                labels={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']}
                height={200}
              />
            </PanelContent>
          </Panel>
        </div>

        {/* Bar Chart */}
        <div class="space-y-2">
          <p class="text-[11px] text-muted-foreground font-medium">Bar Chart - Categorical Comparison</p>
          <Panel class="border border-border rounded-md overflow-hidden">
            <PanelContent>
              <DataBarChart
                title="Sales by Region"
                data={[
                  { label: 'North', value: 420 },
                  { label: 'South', value: 380 },
                  { label: 'East', value: 510 },
                  { label: 'West', value: 290 },
                  { label: 'Central', value: 340 },
                ]}
                height={200}
                variant="gradient"
              />
            </PanelContent>
          </Panel>
        </div>

        {/* Pie Charts */}
        <div class="space-y-2">
          <p class="text-[11px] text-muted-foreground font-medium">Pie & Donut Charts - Proportions</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Panel class="border border-border rounded-md overflow-hidden">
              <PanelContent>
                <DataPieChart
                  title="Market Share"
                  data={[
                    { label: 'Product A', value: 35 },
                    { label: 'Product B', value: 25 },
                    { label: 'Product C', value: 20 },
                    { label: 'Others', value: 20 },
                  ]}
                  size={160}
                />
              </PanelContent>
            </Panel>
            <Panel class="border border-border rounded-md overflow-hidden">
              <PanelContent>
                <DataPieChart
                  title="Resource Usage"
                  data={[
                    { label: 'CPU', value: 45 },
                    { label: 'Memory', value: 30 },
                    { label: 'Storage', value: 15 },
                    { label: 'Network', value: 10 },
                  ]}
                  size={160}
                  innerRadius={0.6}
                />
              </PanelContent>
            </Panel>
          </div>
        </div>

        {/* Monitoring Chart */}
        <div class="space-y-2">
          <p class="text-[11px] text-muted-foreground font-medium">Monitoring Chart - Real-time Dashboard</p>
          <p class="text-[10px] text-muted-foreground">
            Live updating chart for monitoring metrics. The chart updates automatically with simulated data.
          </p>
          <Panel class="border border-border rounded-md overflow-hidden">
            <PanelContent>
              <MonitoringChart
                title="System Metrics"
                series={[
                  { name: 'CPU Usage', data: [45, 52, 48, 61, 55, 58, 62, 54, 49, 53] },
                  { name: 'Memory', data: [72, 68, 75, 71, 69, 74, 76, 73, 70, 72] },
                ]}
                labels={['10s', '9s', '8s', '7s', '6s', '5s', '4s', '3s', '2s', '1s']}
                height={200}
                realtime
                updateInterval={2000}
                maxPoints={15}
                onUpdate={() => ({
                  values: [
                    Math.round(40 + Math.random() * 30),
                    Math.round(65 + Math.random() * 15),
                  ],
                  label: 'now',
                })}
              />
            </PanelContent>
          </Panel>
        </div>

        {/* Charts Documentation */}
        <UsageGuidelines
          whenToUse={lineChartDoc.usage.whenToUse}
          bestPractices={lineChartDoc.usage.bestPractices}
          avoid={lineChartDoc.usage.avoid}
        />
        <CodeSnippet
          title="Charts"
          code={lineChartDoc.examples[0].code}
          language="tsx"
        />
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <PropsTable props={lineChartDoc.props} componentName="LineChart" />
          <PropsTable props={barChartDoc.props} componentName="DataBarChart" />
          <PropsTable props={pieChartDoc.props} componentName="DataPieChart" />
        </div>
      </div>
    </div>
  );
}
