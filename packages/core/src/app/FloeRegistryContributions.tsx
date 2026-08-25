import { createEffect, onCleanup } from 'solid-js';
import {
  useComponentContextFactory,
  useComponentRegistry,
  type ComponentContext,
  type FloeComponent,
} from '../context/ComponentRegistry';

export interface FloeRegistryContributionsProps<TProtocol = unknown> {
  /** Reactive contribution inventory. Membership is reconciled by stable component id. */
  components?: readonly FloeComponent<TProtocol>[];

  /** Optional protocol resolver to inject into ComponentContext.protocol. */
  getProtocol?: () => TProtocol;

  /** Optional hook to customize the per-component context. */
  createComponentContext?: (
    id: string,
    base: ComponentContext<TProtocol>
  ) => ComponentContext<TProtocol>;

  /** Receives validation or lifecycle failures without poisoning later reconciliation. */
  onError?: (error: unknown) => void;
}

type ContributionRecord<TProtocol> = {
  current: FloeComponent<TProtocol>;
  mountedDefinition?: FloeComponent<TProtocol>;
  wrapper: FloeComponent<TProtocol>;
};

function stableContribution<TProtocol>(
  initial: FloeComponent<TProtocol>
): ContributionRecord<TProtocol> {
  const record = {} as ContributionRecord<TProtocol>;
  record.current = initial;
  record.wrapper = {
    get id() {
      return record.current.id;
    },
    get name() {
      return record.current.name;
    },
    get icon() {
      return record.current.icon;
    },
    get description() {
      return record.current.description;
    },
    get component() {
      return record.current.component;
    },
    get sidebar() {
      return record.current.sidebar;
    },
    get commands() {
      return record.current.commands;
    },
    get statusBar() {
      return record.current.statusBar;
    },
    async onMount(context) {
      const definition = record.current;
      record.mountedDefinition = definition;
      await definition.onMount?.(context);
    },
    async onUnmount() {
      const definition = record.mountedDefinition;
      try {
        await definition?.onUnmount?.();
      } finally {
        record.mountedDefinition = undefined;
      }
    },
  };
  return record;
}

function indexContributions<TProtocol>(
  components: readonly FloeComponent<TProtocol>[]
): Map<string, FloeComponent<TProtocol>> {
  const desired = new Map<string, FloeComponent<TProtocol>>();
  for (const component of components) {
    const id = component.id.trim();
    if (!id) throw new Error('FloeRegistryContributions requires a non-empty component id.');
    if (id !== component.id) {
      throw new Error(`FloeRegistryContributions component id must be canonical: ${component.id}`);
    }
    if (desired.has(id)) {
      throw new Error(`FloeRegistryContributions received duplicate component id: ${id}`);
    }
    desired.set(id, component);
  }
  return desired;
}

/**
 * Dynamically projects host-neutral Floe components into the shared registry.
 *
 * Reconciliation is serialized so an id is fully unmounted and unregistered
 * before a later operation for that id begins. Updating a retained id refreshes
 * its registry projection without restarting its lifecycle, preserving existing
 * KeepAlive views and component-local state.
 */
export function FloeRegistryContributions<TProtocol = unknown>(
  props: FloeRegistryContributionsProps<TProtocol>
) {
  const registry = useComponentRegistry<TProtocol>();
  const createContext = useComponentContextFactory<TProtocol>();
  const records = new Map<string, ContributionRecord<TProtocol>>();
  let stopped = false;
  let lifecycleTail: Promise<void> = Promise.resolve();
  let reportError = (error: unknown) => console.error('[FloeRegistryContributions]', error);

  const enqueue = (operation: () => Promise<void>) => {
    lifecycleTail = lifecycleTail.then(operation).catch((error: unknown) => {
      reportError(error);
    });
  };

  createEffect(() => {
    const components = [...(props.components ?? [])];
    const getProtocol = props.getProtocol;
    const customizeContext = props.createComponentContext;
    reportError = props.onError ?? ((error) => console.error('[FloeRegistryContributions]', error));

    enqueue(async () => {
      if (stopped) return;
      const desired = indexContributions(components);

      for (const id of [...records.keys()]) {
        if (desired.has(id)) continue;
        await registry.unregister(id);
        records.delete(id);
      }

      for (const [id, component] of desired) {
        let record = records.get(id);
        if (!record) {
          if (registry.getComponent(id)) {
            throw new Error(
              `FloeRegistryContributions cannot replace an existing registry component: ${id}`
            );
          }
          record = stableContribution(component);
          records.set(id, record);
        } else {
          record.current = component;
        }

        registry.register(record.wrapper);
        if (registry.mountedComponents().has(id)) continue;

        const base = createContext(id, { protocol: getProtocol?.() });
        await registry.mount(id, customizeContext ? customizeContext(id, base) : base);
      }
    });
  });

  onCleanup(() => {
    stopped = true;
    enqueue(async () => {
      for (const id of [...records.keys()]) {
        await registry.unregister(id);
        records.delete(id);
      }
    });
  });

  return null;
}
