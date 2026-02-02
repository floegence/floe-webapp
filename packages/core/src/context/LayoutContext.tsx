import { createEffect, type Accessor } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { createSimpleContext } from './createSimpleContext';
import { useResolvedFloeConfig } from './FloeConfigContext';

interface SidebarState {
  width: number;
  activeTab: string;
  collapsed: boolean;
}

interface TerminalState {
  opened: boolean;
  height: number;
}

interface LayoutStore {
  sidebar: SidebarState;
  terminal: TerminalState;
  isMobile: boolean;
}

export interface LayoutContextValue {
  // Sidebar
  sidebarWidth: Accessor<number>;
  sidebarActiveTab: Accessor<string>;
  sidebarCollapsed: Accessor<boolean>;
  setSidebarWidth: (width: number) => void;
  setSidebarActiveTab: (tab: string, opts?: { openSidebar?: boolean }) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapse: () => void;

  // Terminal
  terminalOpened: Accessor<boolean>;
  terminalHeight: Accessor<number>;
  toggleTerminal: () => void;
  setTerminalHeight: (height: number) => void;

  // Mobile
  isMobile: Accessor<boolean>;
  setIsMobile: (mobile: boolean) => void;
}

export const { Provider: LayoutProvider, use: useLayout } = createSimpleContext<LayoutContextValue>({
  name: 'Layout',
  init: createLayoutService,
});

export function createLayoutService(): LayoutContextValue {
  const floe = useResolvedFloeConfig();
  const cfg = () => floe.config.layout;

  type PersistedLayoutStore = {
    sidebar?: Partial<SidebarState>;
    terminal?: Partial<TerminalState>;
  };

  // Check initial mobile state synchronously based on media query
  const getInitialMobile = (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(cfg().mobileQuery).matches;
  };

  const persisted = floe.persist.load<PersistedLayoutStore>(cfg().storageKey, {});
  const initialState: LayoutStore = {
    sidebar: {
      width: persisted.sidebar?.width ?? cfg().sidebar.defaultWidth,
      activeTab: persisted.sidebar?.activeTab ?? cfg().sidebar.defaultActiveTab,
      collapsed: persisted.sidebar?.collapsed ?? cfg().sidebar.defaultCollapsed,
    },
    terminal: {
      opened: persisted.terminal?.opened ?? cfg().terminal.defaultOpened,
      height: persisted.terminal?.height ?? cfg().terminal.defaultHeight,
    },
    isMobile: getInitialMobile(),
  };

  const [store, setStore] = createStore<LayoutStore>(initialState);

  // Persist layout changes
  createEffect(() => {
    const state = {
      sidebar: store.sidebar,
      terminal: store.terminal,
    };
    floe.persist.debouncedSave(cfg().storageKey, state);
  });

  return {
    // Sidebar accessors
    sidebarWidth: () => store.sidebar.width,
    sidebarActiveTab: () => store.sidebar.activeTab,
    sidebarCollapsed: () => store.sidebar.collapsed,

    // Sidebar actions
    setSidebarWidth: (width: number) =>
      setStore(
        produce((s) => {
          s.sidebar.width = Math.max(cfg().sidebar.clamp.min, Math.min(cfg().sidebar.clamp.max, width));
        })
      ),
    setSidebarActiveTab: (tab: string, opts?: { openSidebar?: boolean }) =>
      setStore(
        produce((s) => {
          s.sidebar.activeTab = tab;
          // Default: VSCode-style. Allow consumers to opt out (e.g. Shell sidebarMode="hidden").
          const open = opts?.openSidebar !== false;
          if (open) s.sidebar.collapsed = false;
        })
      ),
    setSidebarCollapsed: (collapsed: boolean) =>
      setStore(
        produce((s) => {
          s.sidebar.collapsed = collapsed;
        })
      ),
    toggleSidebarCollapse: () =>
      setStore(
        produce((s) => {
          s.sidebar.collapsed = !s.sidebar.collapsed;
        })
      ),

    // Terminal accessors
    terminalOpened: () => store.terminal.opened,
    terminalHeight: () => store.terminal.height,

    // Terminal actions
    toggleTerminal: () =>
      setStore(
        produce((s) => {
          s.terminal.opened = !s.terminal.opened;
        })
      ),
    setTerminalHeight: (height: number) =>
      setStore(
        produce((s) => {
          s.terminal.height = Math.max(cfg().terminal.clamp.min, Math.min(cfg().terminal.clamp.max, height));
        })
      ),

    // Mobile
    isMobile: () => store.isMobile,
    setIsMobile: (mobile: boolean) => setStore('isMobile', mobile),
  };
}
