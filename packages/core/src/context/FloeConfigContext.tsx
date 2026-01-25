import { createContext, createMemo, useContext, type JSX } from 'solid-js';

export interface FloeStorageAdapter {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  /**
   * Optional key listing for clearAll(). When not provided, clearAll becomes a no-op.
   * This keeps custom adapters minimal while still supporting localStorage.
   */
  keys?: () => string[];
}

export interface FloeStorageConfig {
  /** Namespace prefix for all persisted keys. */
  namespace: string;
  /** Disable all persistence when false. */
  enabled: boolean;
  /** Storage adapter (defaults to localStorage when available). */
  adapter?: FloeStorageAdapter;
}

export interface FloeCommandsConfig {
  /** Whether to install the global keydown listener. */
  enableGlobalKeybinds: boolean;
  /**
   * When true, global keybinds are ignored while typing in form fields or contenteditable,
   * unless the active element is inside an opt-in container (see allowWhenTypingWithin).
   */
  ignoreWhenTyping: boolean;
  /** CSS selector to opt-in global keybinds while typing (e.g. code editor). */
  allowWhenTypingWithin: string;

  palette: {
    /** Keybind to toggle the command palette. */
    keybind: string;
    enabled: boolean;
  };

  save: {
    /**
     * Whether to intercept the browser default save dialog (Cmd/Ctrl+S).
     * When enabled, we still only run a command when saveCommandId exists.
     */
    enabled: boolean;
    keybind: string;
    /** Registered command id to run on save (default: file.save). */
    commandId: string;
    /**
     * When true, preventDefault even if no save command is registered.
     * This matches VSCode-style behavior for apps that manage their own saving.
     */
    preventDefaultWhenNoHandler: boolean;
  };
}

export interface FloeLayoutConfig {
  storageKey: string;
  mobileQuery: string;
  sidebar: {
    defaultWidth: number;
    clamp: { min: number; max: number };
    defaultActiveTab: string;
    defaultCollapsed: boolean;
  };
  terminal: {
    defaultOpened: boolean;
    defaultHeight: number;
    clamp: { min: number; max: number };
  };
}

export interface FloeThemeConfig {
  storageKey: string;
  defaultTheme: 'light' | 'dark' | 'system';
}

export interface FloeDeckConfig {
  storageKey: string;
  /**
   * Optional deck presets to seed the initial layouts list.
   * When provided, these layouts are treated as (potentially) read-only presets
   * depending on `isPreset`.
   */
  presets?: FloeDeckPresetLayout[];
  /**
   * Optional default active layout id when there is no persisted active layout.
   * If the id does not exist, the deck will fall back to the first available layout.
   */
  defaultActiveLayoutId?: string;
}

export interface FloeDeckPresetLayout {
  id: string;
  name: string;
  widgets: FloeDeckPresetWidget[];
  /** When true, the layout is treated as a preset (rename/delete disabled by default UI). */
  isPreset?: boolean;
}

export interface FloeDeckPresetWidget {
  id: string;
  type: string;
  position: { col: number; row: number; colSpan: number; rowSpan: number };
  config?: Record<string, unknown>;
  title?: string;
}

export interface FloeStrings {
  topBar: {
    searchPlaceholder: string;
  };
  commandPalette: {
    placeholder: string;
    empty: string;
    esc: string;
  };
  confirmDialog: {
    cancel: string;
    confirm: string;
  };
  statusIndicator: {
    connected: string;
    disconnected: string;
    connecting: string;
    error: string;
  };
}

export interface FloeConfig {
  storage: FloeStorageConfig;
  commands: FloeCommandsConfig;
  layout: FloeLayoutConfig;
  theme: FloeThemeConfig;
  deck: FloeDeckConfig;
  strings: FloeStrings;
}

export interface PersistApi {
  key: (key: string) => string;
  load: <T>(key: string, defaultValue: T) => T;
  save: <T>(key: string, value: T) => void;
  debouncedSave: <T>(key: string, value: T, delayMs?: number) => void;
  remove: (key: string) => void;
  clearAll: () => void;
}

export interface FloeConfigValue {
  config: FloeConfig;
  persist: PersistApi;
}

export type DeepPartial<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer U)[]
    ? readonly DeepPartial<U>[]
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T;

export const DEFAULT_FLOE_CONFIG: FloeConfig = {
  storage: {
    namespace: 'floe',
    enabled: true,
    adapter: undefined,
  },
  commands: {
    enableGlobalKeybinds: true,
    ignoreWhenTyping: true,
    allowWhenTypingWithin: '[data-floe-hotkeys="allow"]',
    palette: { enabled: true, keybind: 'mod+k' },
    save: {
      enabled: true,
      keybind: 'mod+s',
      commandId: 'file.save',
      preventDefaultWhenNoHandler: true,
    },
  },
  layout: {
    storageKey: 'layout',
    mobileQuery: '(max-width: 767px)',
    sidebar: {
      defaultWidth: 350,
      clamp: { min: 220, max: 480 },
      defaultActiveTab: '',
      defaultCollapsed: false,
    },
    terminal: {
      defaultOpened: false,
      defaultHeight: 280,
      clamp: { min: 150, max: 600 },
    },
  },
  theme: {
    storageKey: 'theme',
    defaultTheme: 'system',
  },
  deck: {
    storageKey: 'deck',
  },
  strings: {
    topBar: {
      searchPlaceholder: 'Search commands...',
    },
    commandPalette: {
      placeholder: 'Type a command or search...',
      empty: 'No commands found',
      esc: 'esc',
    },
    confirmDialog: {
      cancel: 'Cancel',
      confirm: 'Confirm',
    },
    statusIndicator: {
      connected: 'Connected',
      disconnected: 'Disconnected',
      connecting: 'Connecting',
      error: 'Error',
    },
  },
};

function createLocalStorageAdapter(): FloeStorageAdapter | undefined {
  if (typeof window === 'undefined') return undefined;
  return {
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
    removeItem: (key) => localStorage.removeItem(key),
    keys: () => Object.keys(localStorage),
  };
}

function createPersist(storage: FloeStorageConfig): PersistApi {
  const adapter = storage.adapter ?? createLocalStorageAdapter();
  const prefix = storage.namespace ? `${storage.namespace}-` : '';

  const key = (k: string) => `${prefix}${k}`;
  const enabled = () => storage.enabled && !!adapter;

  const saveTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

  return {
    key,
    load: (k, defaultValue) => {
      if (!enabled()) return defaultValue;
      try {
        const stored = adapter!.getItem(key(k));
        if (stored === null) return defaultValue;
        return JSON.parse(stored) as typeof defaultValue;
      } catch {
        return defaultValue;
      }
    },
    save: (k, value) => {
      if (!enabled()) return;
      try {
        adapter!.setItem(key(k), JSON.stringify(value));
      } catch (e) {
        console.warn(`Failed to save ${key(k)}:`, e);
      }
    },
    debouncedSave: (k, value, delayMs = 300) => {
      if (!enabled()) return;
      const fullKey = key(k);

      const existing = saveTimeouts.get(fullKey);
      if (existing) clearTimeout(existing);

      saveTimeouts.set(
        fullKey,
        setTimeout(() => {
          try {
            adapter!.setItem(fullKey, JSON.stringify(value));
            saveTimeouts.delete(fullKey);
          } catch (e) {
            console.warn(`Failed to save ${fullKey}:`, e);
          }
        }, delayMs)
      );
    },
    remove: (k) => {
      if (!enabled()) return;
      try {
        adapter!.removeItem(key(k));
      } catch {
        // ignore
      }
    },
    clearAll: () => {
      if (!enabled()) return;
      const keys = adapter!.keys?.() ?? [];
      for (const k of keys) {
        if (k.startsWith(prefix)) {
          adapter!.removeItem(k);
        }
      }
    },
  };
}

function mergeDeep<T>(base: T, override?: DeepPartial<T>): T {
  if (!override) return base;
  if (typeof base !== 'object' || base === null) return (override as T) ?? base;
  if (Array.isArray(base)) return (override as T) ?? base;

  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(override as Record<string, unknown>)) {
    if (v === undefined) continue;
    const prev = (base as Record<string, unknown>)[k];
    if (typeof prev === 'object' && prev !== null && typeof v === 'object' && v !== null && !Array.isArray(v)) {
      out[k] = mergeDeep(prev, v as DeepPartial<typeof prev>);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

const FloeConfigContext = createContext<FloeConfigValue>();

export interface FloeConfigProviderProps {
  config?: DeepPartial<FloeConfig>;
  children: JSX.Element;
}

export function FloeConfigProvider(props: FloeConfigProviderProps) {
  const merged = createMemo<FloeConfig>(() => mergeDeep<FloeConfig>(DEFAULT_FLOE_CONFIG, props.config));
  const persist = createMemo(() => createPersist(merged().storage));
  const value = createMemo<FloeConfigValue>(() => ({ config: merged(), persist: persist() }));
  // eslint-disable-next-line solid/reactivity -- context values are expected to be static for the app lifetime.
  return <FloeConfigContext.Provider value={value()}>{props.children}</FloeConfigContext.Provider>;
}

export function useFloeConfig(): FloeConfigValue {
  const ctx = useContext(FloeConfigContext);
  if (!ctx) {
    throw new Error('FloeConfigContext not found. Make sure to wrap your app with FloeConfigProvider (or FloeProvider).');
  }
  return ctx;
}

const DEFAULT_PERSIST = createPersist(DEFAULT_FLOE_CONFIG.storage);
const DEFAULT_VALUE: FloeConfigValue = { config: DEFAULT_FLOE_CONFIG, persist: DEFAULT_PERSIST };

/**
 * Safe accessor for internal services/tests. When the provider is missing,
 * we fall back to DEFAULT_FLOE_CONFIG instead of throwing.
 */
export function useResolvedFloeConfig(): FloeConfigValue {
  return useContext(FloeConfigContext) ?? DEFAULT_VALUE;
}
