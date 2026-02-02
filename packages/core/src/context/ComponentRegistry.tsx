import { createSignal, type Accessor, type Component } from 'solid-js';
import { createSimpleContext } from './createSimpleContext';
import { useResolvedFloeConfig, type PersistApi } from './FloeConfigContext';
import type { ThemeContextValue } from './ThemeContext';
import type { LayoutContextValue } from './LayoutContext';
import type { Command, CommandContextValue } from './CommandContext';
import type { NotificationContextValue } from './NotificationContext';
import { useTheme } from './ThemeContext';
import { useLayout } from './LayoutContext';
import { useCommand } from './CommandContext';
import { useNotification } from './NotificationContext';
import { deferNonBlocking } from '../utils/defer';

/**
 * Component registration system for pluggable architecture.
 *
 * Public docs: `docs/component-registry.md`
 */

export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export interface ComponentStorage {
  get: <T>(key: string, defaultValue: T) => T;
  set: <T>(key: string, value: T) => void;
  remove: (key: string) => void;
}

export interface ComponentContext<TProtocol = unknown> {
  protocol?: TProtocol;
  theme: ThemeContextValue;
  layout: LayoutContextValue;
  commands: CommandContextValue;
  notifications: NotificationContextValue;
  storage: ComponentStorage;
  logger: Logger;
}

export interface CommandContribution<TProtocol = unknown> {
  id: string;
  title: string;
  description?: string;
  icon?: Component<{ class?: string }>;
  keybind?: string;
  category?: string;
  execute: (ctx: ComponentContext<TProtocol>) => void | Promise<void>;
}

export interface StatusBarContribution {
  id: string;
  position: 'left' | 'right';
  order?: number;
  component: Component;
}

export interface FloeComponent<TProtocol = unknown> {
  id: string;
  name: string;
  icon?: Component<{ class?: string }>;
  description?: string;

  component: Component;

  sidebar?: {
    order?: number;
    badge?: () => number | string | undefined;
    /** When true, this component uses the full content area without sidebar */
    fullScreen?: boolean;
    /** When true, this component is hidden in the activity bar on mobile */
    hiddenOnMobile?: boolean;
  };

  commands?: CommandContribution<TProtocol>[];
  statusBar?: StatusBarContribution[];

  onMount?: (context: ComponentContext<TProtocol>) => void | Promise<void>;
  onUnmount?: () => void | Promise<void>;
}

export interface ComponentRegistryValue<TProtocol = unknown> {
  register: (component: FloeComponent<TProtocol>) => void;
  /** Register multiple components and return a disposer to unregister them. */
  registerAll: (componentList: FloeComponent<TProtocol>[]) => () => void;
  unregister: (componentId: string) => Promise<void>;

  mount: (componentId: string, context: ComponentContext<TProtocol>) => Promise<void>;
  unmount: (componentId: string) => Promise<void>;
  mountAll: (contextFactory: (componentId: string) => ComponentContext<TProtocol>) => Promise<void>;
  unmountAll: () => Promise<void>;

  components: Accessor<Map<string, FloeComponent<TProtocol>>>;
  mountedComponents: Accessor<Set<string>>;
  sidebarItems: Accessor<Array<FloeComponent<TProtocol> & { order: number }>>;
  allCommands: Accessor<CommandContribution<TProtocol>[]>;
  statusBarItems: Accessor<StatusBarContribution[]>;

  getComponent: (id: string) => FloeComponent<TProtocol> | undefined;
}

function createLogger(namespace: string): Logger {
  const prefix = `[${namespace}]`;
  return {
    debug: (...args) => console.debug(prefix, ...args),
    info: (...args) => console.info(prefix, ...args),
    warn: (...args) => console.warn(prefix, ...args),
    error: (...args) => console.error(prefix, ...args),
  };
}

function createComponentStorageWithPersist(persist: PersistApi, componentId: string): ComponentStorage {
  const prefix = `component:${componentId}:`;
  return {
    get: (key, defaultValue) => persist.load(prefix + key, defaultValue),
    set: (key, value) => persist.debouncedSave(prefix + key, value),
    remove: (key) => deferNonBlocking(() => persist.remove(prefix + key)),
  };
}

export function useComponentContextFactory<TProtocol = unknown>() {
  const theme = useTheme();
  const layout = useLayout();
  const commands = useCommand();
  const notifications = useNotification();
  const floe = useResolvedFloeConfig();

  return (
    componentId: string,
    extra?: Pick<ComponentContext<TProtocol>, 'protocol'>
  ): ComponentContext<TProtocol> => ({
    protocol: extra?.protocol,
    theme,
    layout,
    commands,
    notifications,
    storage: createComponentStorageWithPersist(floe.persist, componentId),
    logger: createLogger(componentId),
  });
}

const ComponentRegistryContext = createSimpleContext<ComponentRegistryValue<unknown>>({
  name: 'ComponentRegistry',
  init: createComponentRegistry,
});

export const ComponentRegistryProvider = ComponentRegistryContext.Provider;
export function useComponentRegistry<TProtocol = unknown>(): ComponentRegistryValue<TProtocol> {
  return ComponentRegistryContext.use() as ComponentRegistryValue<TProtocol>;
}

export function createComponentRegistry(): ComponentRegistryValue<unknown> {
  const [components, setComponents] = createSignal<Map<string, FloeComponent<unknown>>>(new Map());
  const [mountedComponents, setMountedComponents] = createSignal<Set<string>>(new Set());

  // Per-component cleanup (currently: registered commands)
  const disposers = new Map<string, () => void>();

  const register = (component: FloeComponent<unknown>) => {
    setComponents((prev) => new Map(prev).set(component.id, component));
  };

  const registerAll = (componentList: FloeComponent<unknown>[]) => {
    const ids = componentList.map((c) => c.id).filter((id) => !!id);
    setComponents((prev) => {
      const next = new Map(prev);
      componentList.forEach((c) => next.set(c.id, c));
      return next;
    });

    // Return disposer for HMR/remount safety: unregistering also unmounts.
    return () => {
      ids.forEach((id) => {
        void unregister(id);
      });
    };
  };

  const mount = async (componentId: string, context: ComponentContext<unknown>) => {
    const component = components().get(componentId);
    if (!component) return;
    if (mountedComponents().has(componentId)) return;

    const cleanup: Array<() => void> = [];
    try {
      if (component.commands?.length) {
        const commands: Command[] = component.commands.map((cmd) => ({
          id: cmd.id,
          title: cmd.title,
          description: cmd.description,
          icon: cmd.icon,
          keybind: cmd.keybind,
          category: cmd.category,
          execute: () => cmd.execute(context),
        }));
        cleanup.push(context.commands.registerAll(commands));
      }

      await component.onMount?.(context);

      if (cleanup.length) {
        disposers.set(componentId, () => cleanup.forEach((fn) => fn()));
      }

      setMountedComponents((prev) => {
        const next = new Set(prev);
        next.add(componentId);
        return next;
      });
    } catch (e) {
      cleanup.forEach((fn) => fn());
      throw e;
    }
  };

  const unmount = async (componentId: string) => {
    const component = components().get(componentId);
    if (!component) return;
    if (!mountedComponents().has(componentId)) return;

    try {
      await component.onUnmount?.();
    } finally {
      disposers.get(componentId)?.();
      disposers.delete(componentId);
      setMountedComponents((prev) => {
        const next = new Set(prev);
        next.delete(componentId);
        return next;
      });
    }
  };

  const unregister = async (componentId: string) => {
    await unmount(componentId);
    setComponents((prev) => {
      const next = new Map(prev);
      next.delete(componentId);
      return next;
    });
  };

  const mountAll = async (contextFactory: (componentId: string) => ComponentContext<unknown>) => {
    for (const id of components().keys()) {
      await mount(id, contextFactory(id));
    }
  };

  const unmountAll = async () => {
    for (const id of mountedComponents()) {
      await unmount(id);
    }
  };

  const getComponent = (id: string) => components().get(id);

  // NOTE: Avoid createMemo here so the registry works consistently in SSR tests.
  // The derived lists are small and cheap to compute on-demand, and remain reactive
  // in the browser because they read from signals.
  const sidebarItems: Accessor<Array<FloeComponent<unknown> & { order: number }>> = () => {
    const items: Array<FloeComponent<unknown> & { order: number }> = [];
    for (const comp of components().values()) {
      if (comp.sidebar) {
        items.push({ ...comp, order: comp.sidebar.order ?? 100 });
      }
    }
    return items.sort((a, b) => a.order - b.order);
  };

  const allCommands: Accessor<CommandContribution<unknown>[]> = () => {
    const cmds: CommandContribution<unknown>[] = [];
    for (const comp of components().values()) {
      if (comp.commands) cmds.push(...comp.commands);
    }
    return cmds;
  };

  const statusBarItems: Accessor<StatusBarContribution[]> = () => {
    const items: StatusBarContribution[] = [];
    for (const comp of components().values()) {
      if (comp.statusBar) items.push(...comp.statusBar);
    }
    return items;
  };

  return {
    register,
    registerAll,
    unregister,

    mount,
    unmount,
    mountAll,
    unmountAll,

    components,
    mountedComponents,
    sidebarItems,
    allCommands,
    statusBarItems,

    getComponent,
  };
}
