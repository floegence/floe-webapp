import { createEffect, type Accessor } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { createSimpleContext } from './createSimpleContext';
import { debouncedSave, load } from '../utils/persist';

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
  setSidebarActiveTab: (tab: string) => void;
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

const STORAGE_KEY = 'layout';

const DEFAULT_STATE: LayoutStore = {
  sidebar: {
    width: 350,
    activeTab: '',
    collapsed: false,
  },
  terminal: {
    opened: false,
    height: 280,
  },
  isMobile: false,
};

export const { Provider: LayoutProvider, use: useLayout } = createSimpleContext<LayoutContextValue>({
  name: 'Layout',
  init: createLayoutService,
});

export function createLayoutService(): LayoutContextValue {
  const persisted = load<Partial<LayoutStore> & { sidebar?: Partial<SidebarState> & { opened?: boolean } }>(
    STORAGE_KEY,
    {}
  );
  const initialState: LayoutStore = {
    sidebar: {
      width: persisted.sidebar?.width ?? DEFAULT_STATE.sidebar.width,
      activeTab: persisted.sidebar?.activeTab ?? DEFAULT_STATE.sidebar.activeTab,
      collapsed: persisted.sidebar?.collapsed ?? DEFAULT_STATE.sidebar.collapsed,
    },
    terminal: { ...DEFAULT_STATE.terminal, ...persisted.terminal },
    isMobile: DEFAULT_STATE.isMobile,
  };

  const [store, setStore] = createStore<LayoutStore>(initialState);

  // Persist layout changes
  createEffect(() => {
    const state = {
      sidebar: store.sidebar,
      terminal: store.terminal,
    };
    debouncedSave(STORAGE_KEY, state);
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
          s.sidebar.width = Math.max(220, Math.min(480, width));
        })
      ),
    setSidebarActiveTab: (tab: string) =>
      setStore(
        produce((s) => {
          s.sidebar.activeTab = tab;
          // Un-collapse sidebar when selecting a tab
          s.sidebar.collapsed = false;
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
          s.terminal.height = Math.max(150, Math.min(600, height));
        })
      ),

    // Mobile
    isMobile: () => store.isMobile,
    setIsMobile: (mobile: boolean) => setStore('isMobile', mobile),
  };
}
