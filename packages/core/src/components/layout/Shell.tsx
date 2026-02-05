import { Show, For, createEffect, createMemo, createSignal, type JSX } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { useLayout } from '../../context/LayoutContext';
import { useResolvedFloeConfig } from '../../context/FloeConfigContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { cn } from '../../utils/cn';
import { deferNonBlocking } from '../../utils/defer';
import { useComponentRegistry } from '../../context/ComponentRegistry';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { TopBarIconButton } from './TopBarIconButton';
import { BottomBar } from './BottomBar';
import { MobileTabBar } from './MobileTabBar';
import { ActivityBar, type ActivityBarItem } from './ActivityBar';
import { ResizeHandle } from './ResizeHandle';
import { resolveMobileTabActiveId, resolveMobileTabSelect } from './mobileTabs';
import { KeepAliveStack, type KeepAliveView } from './KeepAliveStack';

export interface ShellProps {
  children: JSX.Element;
  logo?: JSX.Element;
  activityItems?: ActivityBarItem[];
  activityBottomItems?: ActivityBarItem[];
  /**
   * Where to render `activityBottomItems` on mobile.
   *
   * The ActivityBar isn't rendered on mobile (MobileTabBar is used instead),
   * so bottom items are hidden unless explicitly enabled.
   *
   * - `hidden` (default): do not render bottom items on mobile.
   * - `topBar`: render them as icon buttons in the TopBar actions area.
   */
  activityBottomItemsMobileMode?: 'hidden' | 'topBar';
  topBarActions?: JSX.Element;
  bottomBarItems?: JSX.Element;
  sidebarContent?: (activeTab: string) => JSX.Element;
  /**
   * Sidebar rendering mode.
   *
   * - `auto` (default): render Sidebar unless collapsed/fullScreen.
   * - `hidden`: never render Sidebar (useful for Portal-style shells).
   */
  sidebarMode?: 'auto' | 'hidden';
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
  const sidebarHidden = () => props.sidebarMode === 'hidden';
  const registry = (() => {
    try {
      return useComponentRegistry();
    } catch {
      return null;
    }
  })();
  const setSidebarActiveTab = (id: string, opts?: { openSidebar?: boolean }) => {
    const fullScreen = registry?.getComponent(id)?.sidebar?.fullScreen ?? false;
    const openSidebar = sidebarHidden() ? false : (opts?.openSidebar ?? !fullScreen);
    layout.setSidebarActiveTab(id, { openSidebar });
  };

  // Sidebar is a structural part of the layout. When disabled, force-close the mobile drawer.
  createEffect(() => {
    if (sidebarHidden()) setMobileSidebarOpen(false);
  });

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
        collapseBehavior: c.sidebar?.fullScreen ? 'preserve' : 'toggle',
      }));
  });

  // Keep sidebar panels mounted after first activation to preserve state and avoid remount thrash
  // when switching between activity tabs (VSCode-like behavior on desktop).
  const sidebarViews = createMemo<KeepAliveView[]>(() => {
    if (sidebarHidden()) return [];
    if (props.sidebarContent) return [];
    if (!registry) return [];

    return registry.sidebarItems()
      // Keep behavior consistent with activity items: hide panels marked as hiddenOnMobile.
      .filter((c) => !(isMobile() && c.sidebar?.hiddenOnMobile))
      // Tabs rendered in the main content area should not render inside the sidebar.
      .filter((c) => c.sidebar?.fullScreen !== true && c.sidebar?.renderIn !== 'main')
      .map((c) => ({
        id: c.id,
        render: () => <Dynamic component={c.component} />,
      }));
  });

  const renderSidebarContent = (activeId: string): JSX.Element | undefined => {
    if (sidebarHidden()) return undefined;
    if (props.sidebarContent) return props.sidebarContent(activeId);
    if (!registry) return undefined;

    return <KeepAliveStack views={sidebarViews()} activeId={activeId} />;
  };

  // Check if active component is fullScreen (should hide sidebar)
  const isFullScreen = createMemo(() => {
    if (sidebarHidden()) return true;
    if (!registry) return false;
    const comp = registry.getComponent(layout.sidebarActiveTab());
    return comp?.sidebar?.fullScreen ?? false;
  });

  // Main-view tabs should appear as active on mobile even when the overlay is closed.
  // (Example: a page tab that also has a sidebar panel.)
  const activeIsPage = createMemo(() => {
    if (sidebarHidden()) return true;
    if (!registry) return false;
    const comp = registry.getComponent(layout.sidebarActiveTab());
    if (!comp?.sidebar) return false;
    return comp.sidebar.fullScreen === true || comp.sidebar.renderIn === 'main';
  });

  // FullScreen components are navigated as pages on mobile (no overlay).
  createEffect(() => {
    if (isMobile() && isFullScreen()) {
      setMobileSidebarOpen(false);
    }
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

  // Set default active tab when items are available and none is selected.
  // We intentionally do NOT reset if the stored ID isn't in items yet,
  // because components may register dynamically after initial load.
  // This preserves the user's selection across page refreshes.
  createEffect(() => {
    const items = activityItems();
    if (!items.length) return;

    const active = layout.sidebarActiveTab();
    // Only auto-select first item if no active tab is set
    if (!active) {
      // Skip "action" items that provide a custom click handler (e.g. opening a modal).
      const firstTab = items.find((item) => !item.onClick);
      if (!firstTab) return;
      setSidebarActiveTab(firstTab.id);
    }
  });

  // Handle mobile tab selection - toggle sidebar
  const handleMobileTabSelect = (id: string) => {
    const clickedIsFullScreen = sidebarHidden() ? true : (registry?.getComponent(id)?.sidebar?.fullScreen ?? false);
    const { nextActiveId, nextMobileSidebarOpen } = resolveMobileTabSelect({
      clickedId: id,
      activeId: layout.sidebarActiveTab(),
      mobileSidebarOpen: mobileSidebarOpen(),
      clickedIsFullScreen,
    });

    if (layout.sidebarActiveTab() !== nextActiveId) {
      setSidebarActiveTab(nextActiveId);
    }
    setMobileSidebarOpen(nextMobileSidebarOpen);
  };

  const handleMobileBottomItemClick = (item: ActivityBarItem) => {
    if (item.onClick) {
      // UI response first: defer to avoid blocking paint.
      deferNonBlocking(() => item.onClick!());
      return;
    }
    handleMobileTabSelect(item.id);
  };

  const effectiveTopBarActions = createMemo<JSX.Element | undefined>(() => {
    const base = props.topBarActions;
    if (!isMobile()) return base;

    const mode = props.activityBottomItemsMobileMode ?? 'hidden';
    if (mode !== 'topBar') return base;

    const items = props.activityBottomItems ?? [];
    if (!items.length) return base;

    return (
      <>
        <For each={items}>
          {(item) => (
            <TopBarIconButton label={item.label} onClick={() => handleMobileBottomItemClick(item)}>
              <Dynamic component={item.icon} class="w-4 h-4" />
            </TopBarIconButton>
          )}
        </For>
        {base}
      </>
    );
  });

  const effectiveSidebarCollapsed = () => (sidebarHidden() ? true : layout.sidebarCollapsed());

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
      <TopBar logo={props.logo} actions={effectiveTopBarActions()} />

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
              onActiveChange={setSidebarActiveTab}
              collapsed={effectiveSidebarCollapsed()}
              onCollapsedChange={sidebarHidden() ? undefined : layout.setSidebarCollapsed}
            />
          </Show>

          {/* Sidebar - CSS-hidden when collapsed or when fullScreen component is active, DOM stays mounted */}
          <Show when={!sidebarHidden()}>
            <Sidebar
              width={layout.sidebarWidth()}
              collapsed={layout.sidebarCollapsed() || isFullScreen()}
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

        {/* Mobile: Sidebar as collapsible drawer */}
        <Show when={isMobile() && mobileSidebarOpen() && !sidebarHidden()}>
          {/* Backdrop - semi-transparent to show content behind */}
          <div
            class="absolute inset-0 z-40 bg-black/30 cursor-pointer"
            onClick={() => setMobileSidebarOpen(false)}
          />
          {/* Sidebar drawer - narrower width, drawer style */}
          <div
            class={cn(
              'absolute left-0 top-0 bottom-0 z-50',
              'w-72 max-w-[80vw]',
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
          activeId={resolveMobileTabActiveId({
            activeId: layout.sidebarActiveTab(),
            mobileSidebarOpen: mobileSidebarOpen(),
            activeIsFullScreen: isFullScreen(),
            activeIsPage: activeIsPage(),
          })}
          onSelect={handleMobileTabSelect}
        />
      </Show>
    </div>
  );
}
