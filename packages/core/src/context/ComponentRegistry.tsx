import { createSignal, type Accessor, type Component } from 'solid-js';
import { createSimpleContext } from './createSimpleContext';
import type { ThemeContextValue } from './ThemeContext';
import type { LayoutContextValue } from './LayoutContext';
import type { Command, CommandContextValue } from './CommandContext';
import type { NotificationContextValue } from './NotificationContext';
import { useTheme } from './ThemeContext';
import { useLayout } from './LayoutContext';
import { useCommand } from './CommandContext';
import { useNotification } from './NotificationContext';
import { debouncedSave, load, remove } from '../utils/persist';

/**
 * Component registration system for pluggable architecture
 * Designed to match `.design.md` 8.x: contributions + lifecycle + explicit mount/unmount.
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

export interface ComponentContext {
  protocol?: unknown;
  theme: ThemeContextValue;
  layout: LayoutContextValue;
  commands: CommandContextValue;
  notifications: NotificationContextValue;
  storage: ComponentStorage;
  logger: Logger;
}

export interface CommandContribution {
  id: string;
  title: string;
  description?: string;
  icon?: Component<{ class?: string }>;
  keybind?: string;
  category?: string;
  execute: (ctx: ComponentContext) => void | Promise<void>;
}

export interface StatusBarContribution {
  id: string;
  position: 'left' | 'right';
  order?: number;
  component: Component;
}

export interface FloeComponent {
  id: string;
  name: string;
  icon?: Component<{ class?: string }>;
  description?: string;

  component: Component;

  sidebar?: {
    order?: number;
    badge?: () => number | string | undefined;
  };

  commands?: CommandContribution[];
  statusBar?: StatusBarContribution[];

  onMount?: (context: ComponentContext) => void | Promise<void>;
  onUnmount?: () => void | Promise<void>;
}

export interface ComponentRegistryValue {
  register: (component: FloeComponent) => void;
  registerAll: (componentList: FloeComponent[]) => void;
  unregister: (componentId: string) => Promise<void>;

  mount: (componentId: string, context: ComponentContext) => Promise<void>;
  unmount: (componentId: string) => Promise<void>;
  mountAll: (contextFactory: (componentId: string) => ComponentContext) => Promise<void>;
  unmountAll: () => Promise<void>;

  components: Accessor<Map<string, FloeComponent>>;
  mountedComponents: Accessor<Set<string>>;
  sidebarItems: Accessor<Array<FloeComponent & { order: number }>>;
  allCommands: Accessor<CommandContribution[]>;
  statusBarItems: Accessor<StatusBarContribution[]>;

  getComponent: (id: string) => FloeComponent | undefined;
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

function createComponentStorage(componentId: string): ComponentStorage {
  const prefix = `component:${componentId}:`;
  return {
    get: (key, defaultValue) => load(prefix + key, defaultValue),
    set: (key, value) => debouncedSave(prefix + key, value),
    remove: (key) => setTimeout(() => remove(prefix + key), 0),
  };
}

export function useComponentContextFactory() {
  const theme = useTheme();
  const layout = useLayout();
  const commands = useCommand();
  const notifications = useNotification();

  return (componentId: string, extra?: Pick<ComponentContext, 'protocol'>): ComponentContext => ({
    protocol: extra?.protocol,
    theme,
    layout,
    commands,
    notifications,
    storage: createComponentStorage(componentId),
    logger: createLogger(componentId),
  });
}

export const { Provider: ComponentRegistryProvider, use: useComponentRegistry } =
  createSimpleContext<ComponentRegistryValue>({
    name: 'ComponentRegistry',
    init: createComponentRegistry,
  });

export function createComponentRegistry(): ComponentRegistryValue {
  const [components, setComponents] = createSignal<Map<string, FloeComponent>>(new Map());
  const [mountedComponents, setMountedComponents] = createSignal<Set<string>>(new Set());

  // Per-component cleanup (currently: registered commands)
  const disposers = new Map<string, () => void>();

  const register = (component: FloeComponent) => {
    setComponents((prev) => new Map(prev).set(component.id, component));
  };

  const registerAll = (componentList: FloeComponent[]) => {
    setComponents((prev) => {
      const next = new Map(prev);
      componentList.forEach((c) => next.set(c.id, c));
      return next;
    });
  };

  const mount = async (componentId: string, context: ComponentContext) => {
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

  const mountAll = async (contextFactory: (componentId: string) => ComponentContext) => {
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
  const sidebarItems: Accessor<Array<FloeComponent & { order: number }>> = () => {
    const items: Array<FloeComponent & { order: number }> = [];
    for (const comp of components().values()) {
      if (comp.sidebar) {
        items.push({ ...comp, order: comp.sidebar.order ?? 100 });
      }
    }
    return items.sort((a, b) => a.order - b.order);
  };

  const allCommands: Accessor<CommandContribution[]> = () => {
    const cmds: CommandContribution[] = [];
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
