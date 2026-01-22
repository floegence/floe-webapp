import { For, Show, createMemo, createSignal, type JSX } from 'solid-js';
import {
  Bell,
  Button,
  ConfirmDialog,
  Dialog,
  Dropdown,
  type DropdownItem,
  Files,
  GitBranch,
  Input,
  Loader2,
  LoadingOverlay,
  Moon,
  Panel,
  PanelContent,
  PanelHeader,
  ResizeHandle,
  Search,
  Select,
  Settings,
  Skeleton,
  SnakeLoader,
  Sun,
  Terminal,
  Textarea,
  Tooltip,
  useCommand,
  useLayout,
  useNotification,
  useTheme,
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

export function ShowcasePage(props: ShowcasePageProps) {
  const command = useCommand();
  const notifications = useNotification();
  const theme = useTheme();
  const layout = useLayout();

  const [dialogOpen, setDialogOpen] = createSignal(false);
  const [confirmOpen, setConfirmOpen] = createSignal(false);
  const [confirmLoading, setConfirmLoading] = createSignal(false);
  const [overlayVisible, setOverlayVisible] = createSignal(false);
  const [splitWidth, setSplitWidth] = createSignal(260);

  const [dropdownValue, setDropdownValue] = createSignal('profile');
  const dropdownItems: DropdownItem[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'billing', label: 'Billing' },
    { id: 'separator-1', label: '', separator: true },
    { id: 'team', label: 'Switch team' },
    { id: 'disabled', label: 'Disabled item', disabled: true },
  ];

  const [selectValue, setSelectValue] = createSignal('system');

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
          <Button size="sm" variant="ghost" onClick={() => props.onJumpTo('ui-dialogs')}>
            Jump: Dialogs
          </Button>
          <Button size="sm" variant="ghost" onClick={() => props.onJumpTo('layout-resize')}>
            Jump: Resize
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
          id="layout-resize"
          title="Layout: Panel + ResizeHandle"
          description="Use ResizeHandle to build split panes without blocking UI."
          actions={
            <div class="flex items-center gap-1.5">
              <Button size="sm" variant="outline" onClick={() => props.onOpenFile('core.panel')}>
                View Panel Source
              </Button>
            </div>
          }
        />
        <div class="border border-border rounded-md overflow-hidden h-[280px] flex bg-card">
          <div
            class="h-full shrink-0 border-r border-border bg-muted/20"
            style={{ width: `${splitWidth()}px` }}
          >
            <Panel class="h-full">
              <PanelHeader
                actions={
                  <Button size="sm" variant="ghost" onClick={() => setSplitWidth(260)}>
                    Reset
                  </Button>
                }
              >
                Sidebar (Resizable)
              </PanelHeader>
              <PanelContent class="space-y-1.5">
                <p class="text-[11px] text-muted-foreground">
                  Drag the handle to resize.
                </p>
                <div class="space-y-1">
                  <For each={[1, 2, 3, 4, 5]}>
                    {() => (
                      <div class="h-5 rounded bg-muted/60" />
                    )}
                  </For>
                </div>
              </PanelContent>
            </Panel>
          </div>

          <ResizeHandle
            direction="horizontal"
            onResize={(delta) => setSplitWidth((w) => Math.max(200, Math.min(420, w + delta)))}
          />

          <div class="flex-1 min-w-0">
            <Panel class="h-full">
              <PanelHeader>Content</PanelHeader>
              <PanelContent class="space-y-2">
                <p class="text-[11px] text-muted-foreground">
                  ResizeHandle is throttled with requestAnimationFrame for smooth drag behavior.
                </p>
                <div class="grid grid-cols-2 gap-2">
                  <div class="h-14 rounded bg-muted/30" />
                  <div class="h-14 rounded bg-muted/30" />
                  <div class="h-14 rounded bg-muted/30" />
                  <div class="h-14 rounded bg-muted/30" />
                </div>
              </PanelContent>
            </Panel>
          </div>
        </div>
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
          description="All built-in icons shipped with @floegence/floe-webapp-core."
        />
        <Panel class="border border-border rounded-md overflow-hidden">
          <PanelContent class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            <For each={icons()}>
              {(item) => (
                <div class="flex items-center gap-2 rounded border border-border bg-muted/20 px-2 py-1.5">
                  <item.icon class="w-4 h-4" />
                  <span class="text-[11px]">{item.name}</span>
                </div>
              )}
            </For>
          </PanelContent>
        </Panel>
      </div>
    </div>
  );
}
