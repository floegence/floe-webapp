import { createContext, createEffect, createMemo, onCleanup, useContext, type JSX } from 'solid-js';

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
   * Preset persistence/edit policy.
   *
   * - `mutable` (default): preset layouts can be edited and persisted as full layouts (legacy behavior).
   * - `immutable`: preset layouts are treated as read-only templates; layout structure always comes from
   *   `FloeDeckConfig.presets`, and only widget `state` is persisted per preset layout.
   */
  presetsMode?: 'mutable' | 'immutable';
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
  /**
   * Flush pending debounced saves immediately.
   *
   * Note: This is primarily used to ensure the latest state is persisted on page refresh/close,
   * while keeping debounced persistence in the hot interaction path.
   */
  flush?: () => void;
  /** Cleanup pending timers (best-effort). */
  dispose?: () => void;
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

  type PendingSave = { timer: ReturnType<typeof setTimeout>; value: unknown };
  const pending = new Map<string, PendingSave>();

  const flush = () => {
    if (!enabled()) return;
    for (const [fullKey, entry] of pending.entries()) {
      clearTimeout(entry.timer);
      try {
        adapter!.setItem(fullKey, JSON.stringify(entry.value));
      } catch (e) {
        console.warn(`Failed to save ${fullKey}:`, e);
      }
    }
    pending.clear();
  };

  const dispose = () => {
    try {
      flush();
    } finally {
      for (const entry of pending.values()) {
        clearTimeout(entry.timer);
      }
      pending.clear();
    }
  };

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

      const existing = pending.get(fullKey);
      if (existing) clearTimeout(existing.timer);

      const timer = setTimeout(() => {
        const current = pending.get(fullKey);
        // Avoid races if a newer debouncedSave overwrote this timer.
        if (!current || current.timer !== timer) return;
        pending.delete(fullKey);

        try {
          adapter!.setItem(fullKey, JSON.stringify(current.value));
        } catch (e) {
          console.warn(`Failed to save ${fullKey}:`, e);
        }
      }, delayMs);

      pending.set(fullKey, { timer, value });
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
    flush,
    dispose,
  };
}

/**
 * Install page lifecycle listeners that flush pending debounced saves.
 *
 * Keep this side-effect separate from createPersist() so importing the module does not
 * register global listeners (important for testability and predictable composition).
 */
export function installPersistFlushListeners(persist: Pick<PersistApi, 'flush'>): () => void {
  if (typeof window === 'undefined') return () => {};

  const safeFlush = () => {
    try {
      persist.flush?.();
    } catch {
      // ignore
    }
  };

  const onPageHide = () => safeFlush();
  const onBeforeUnload = () => safeFlush();
  const onVisibilityChange = () => {
    try {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') safeFlush();
    } catch {
      // ignore
    }
  };

  try {
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onBeforeUnload);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }
  } catch {
    // ignore
    return () => {};
  }

  return () => {
    try {
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onBeforeUnload);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    } catch {
      // ignore
    }
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

  // Ensure pending debounced saves are not lost when the page is refreshed/closed.
  // Also keep global listeners scoped to the provider lifecycle.
  createEffect(() => {
    const p = persist();
    const enabled = merged().storage.enabled;
    const uninstall = enabled ? installPersistFlushListeners(p) : () => {};
    onCleanup(() => {
      uninstall();
      p.dispose?.();
    });
  });

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
