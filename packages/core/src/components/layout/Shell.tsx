import { Show, For, createEffect, createMemo, createSignal, type JSX } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { useLayout } from '../../context/LayoutContext';
import { useResolvedFloeConfig } from '../../context/FloeConfigContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { cn } from '../../utils/cn';
import { useComponentRegistry } from '../../context/ComponentRegistry';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomBar } from './BottomBar';
import { MobileTabBar } from './MobileTabBar';
import { ActivityBar, type ActivityBarItem } from './ActivityBar';
import { ResizeHandle } from './ResizeHandle';

export interface ShellProps {
  children: JSX.Element;
  logo?: JSX.Element;
  activityItems?: ActivityBarItem[];
  activityBottomItems?: ActivityBarItem[];
  topBarActions?: JSX.Element;
  bottomBarItems?: JSX.Element;
  sidebarContent?: (activeTab: string) => JSX.Element;
  terminalPanel?: JSX.Element;
  class?: string;
}

/**
 * Main application shell with VSCode-style layout
 * - Activity Bar (leftmost)
 * - Sidebar (collapsible)
 * - Main content area
 * - Terminal panel (bottom, collapsible)
 * - Top Bar
 * - Bottom Bar (status)
 */
export function Shell(props: ShellProps) {
  const layout = useLayout();
  const floe = useResolvedFloeConfig();
  const isMobile = useMediaQuery(floe.config.layout.mobileQuery);
  const [mobileSidebarOpen, setMobileSidebarOpen] = createSignal(false);
  const registry = (() => {
    try {
      return useComponentRegistry();
    } catch {
      return null;
    }
  })();

  // Sync media-query state to LayoutContext so feature components can rely on `useLayout().isMobile()`.
  createEffect(() => {
    const mobile = isMobile();
    if (layout.isMobile() !== mobile) {
      layout.setIsMobile(mobile);
    }
  });

  // Close mobile sidebar when switching to desktop
  createEffect(() => {
    if (!isMobile()) {
      setMobileSidebarOpen(false);
    }
  });

  const activityItems = createMemo<ActivityBarItem[]>(() => {
    if (props.activityItems) return props.activityItems;
    if (!registry) return [];

    return registry.sidebarItems()
      .filter((c) => !!c.icon)
      // Hide components marked as hiddenOnMobile when on mobile
      .filter((c) => !(isMobile() && c.sidebar?.hiddenOnMobile))
      .map((c) => ({
        id: c.id,
        icon: c.icon!,
        label: c.name,
        badge: c.sidebar?.badge,
      }));
  });

  const renderSidebarContent = (activeId: string): JSX.Element | undefined => {
    if (props.sidebarContent) return props.sidebarContent(activeId);
    if (!registry) return undefined;

    const comp = registry.getComponent(activeId);
    if (!comp?.sidebar) return undefined;
    // Don't render sidebar content for fullScreen components
    if (comp.sidebar.fullScreen) return undefined;
    return <Dynamic component={comp.component} />;
  };

  // Check if active component is fullScreen (should hide sidebar)
  const isFullScreen = createMemo(() => {
    if (!registry) return false;
    const comp = registry.getComponent(layout.sidebarActiveTab());
    return comp?.sidebar?.fullScreen ?? false;
  });

  const bottomBarContent = createMemo<JSX.Element | undefined>(() => {
    if (props.bottomBarItems) return props.bottomBarItems;
    if (!registry) return undefined;

    const items = [...registry.statusBarItems()].sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
    const left = items.filter((i) => i.position === 'left');
    const right = items.filter((i) => i.position === 'right');

    return (
      <>
        <div class="flex items-center gap-2">
          <For each={left}>
            {(item) => <Dynamic component={item.component} />}
          </For>
        </div>
        <div class="flex items-center gap-2">
          <For each={right}>
            {(item) => <Dynamic component={item.component} />}
          </For>
        </div>
      </>
    );
  });

  // Ensure the active tab always exists when driven by registry items.
  createEffect(() => {
    const items = activityItems();
    if (!items.length) return;

    const active = layout.sidebarActiveTab();
    if (!active || !items.some((i) => i.id === active)) {
      layout.setSidebarActiveTab(items[0].id);
    }
  });

  // Handle mobile tab selection - toggle sidebar
  const handleMobileTabSelect = (id: string) => {
    if (layout.sidebarActiveTab() === id && mobileSidebarOpen()) {
      // Same tab clicked, close sidebar
      setMobileSidebarOpen(false);
    } else {
      // Different tab or sidebar closed, open sidebar
      layout.setSidebarActiveTab(id);
      setMobileSidebarOpen(true);
    }
  };

  return (
    <div
      class={cn(
        // Use dvh when supported to avoid mobile browser UI causing layout jumps.
        'h-screen h-[100dvh] w-full flex flex-col overflow-hidden',
        'bg-background text-foreground',
        // Prevent overscroll on the shell container
        'overscroll-none',
        props.class
      )}
    >
      {/* Top Bar */}
      <TopBar logo={props.logo} actions={props.topBarActions} />

      {/* Main area */}
      <div class="flex-1 min-h-0 flex overflow-hidden relative">
        {/* Desktop: Activity Bar + Sidebar */}
        <Show when={!isMobile()}>
          {/* Activity Bar */}
          <Show when={activityItems().length > 0}>
            <ActivityBar
              items={activityItems()}
              bottomItems={props.activityBottomItems}
              activeId={layout.sidebarActiveTab()}
              onActiveChange={layout.setSidebarActiveTab}
              collapsed={layout.sidebarCollapsed()}
              onCollapsedChange={layout.setSidebarCollapsed}
            />
          </Show>

          {/* Sidebar - hidden when collapsed or when fullScreen component is active */}
          <Show when={!layout.sidebarCollapsed() && !isFullScreen()}>
            <Sidebar
              width={layout.sidebarWidth()}
              resizer={
                <ResizeHandle
                  direction="horizontal"
                  onResize={(delta) => layout.setSidebarWidth(layout.sidebarWidth() + delta)}
                />
              }
            >
              {renderSidebarContent(layout.sidebarActiveTab())}
            </Sidebar>
          </Show>
        </Show>

        {/* Mobile: Sidebar as overlay */}
        <Show when={isMobile() && mobileSidebarOpen()}>
          {/* Backdrop */}
          <div
            class="absolute inset-0 z-40 bg-background/80 backdrop-blur-sm cursor-pointer"
            onClick={() => setMobileSidebarOpen(false)}
          />
          {/* Sidebar panel */}
          <div
            class={cn(
              'absolute left-0 top-0 bottom-0 z-50 w-80 max-w-[85vw]',
              'bg-sidebar border-r border-sidebar-border',
              'shadow-xl',
              'animate-in slide-in-from-left duration-200'
            )}
          >
            <div class="h-full overflow-auto overscroll-contain">
              {renderSidebarContent(layout.sidebarActiveTab())}
            </div>
          </div>
        </Show>

        {/* Content area */}
        <div class="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Main content - always visible, allows overscroll bounce */}
          <main class="flex-1 min-h-0 overflow-auto overscroll-contain">
            {props.children}
          </main>

          {/* Terminal panel (desktop only) */}
          <Show when={!isMobile() && layout.terminalOpened() && props.terminalPanel}>
            <div
              class="relative shrink-0 border-t border-border bg-terminal-background overflow-hidden"
              style={{ height: `${layout.terminalHeight()}px` }}
            >
              <ResizeHandle
                direction="vertical"
                onResize={(delta) => layout.setTerminalHeight(layout.terminalHeight() - delta)}
              />
              {props.terminalPanel}
            </div>
          </Show>
        </div>
      </div>

      {/* Bottom Bar / Mobile Tab Bar */}
      <Show when={!isMobile()}>
        <BottomBar>{bottomBarContent()}</BottomBar>
      </Show>
      <Show when={isMobile() && activityItems().length > 0}>
        <MobileTabBar
          items={activityItems()}
          activeId={mobileSidebarOpen() ? layout.sidebarActiveTab() : ''}
          onSelect={handleMobileTabSelect}
        />
      </Show>
    </div>
  );
}
