import { onCleanup, onMount, type JSX } from 'solid-js';
import { useComponentContextFactory, useComponentRegistry, type ComponentContext, type FloeComponent } from '../context/ComponentRegistry';

export interface FloeRegistryRuntimeProps<TProtocol = unknown> {
  children: JSX.Element;

  /** Components to register into the ComponentRegistry (sidebar/commands/status). */
  components?: FloeComponent<TProtocol>[];

  /** Optional protocol resolver to inject into ComponentContext.protocol. */
  getProtocol?: () => TProtocol;

  /** Optional hook to customize the per-component context (e.g. inject protocol). */
  createComponentContext?: (
    id: string,
    base: ComponentContext<TProtocol>
  ) => ComponentContext<TProtocol>;
}

/**
 * Registry lifecycle wrapper (register + mount + cleanup) without forcing a Shell.
 *
 * Use this when you want full control over layout (Portal/EnvApp shells),
 * while still using Floe's ComponentRegistry features (commands, status items, etc).
 */
export function FloeRegistryRuntime<TProtocol = unknown>(props: FloeRegistryRuntimeProps<TProtocol>) {
  const registry = useComponentRegistry<TProtocol>();
  const createCtx = useComponentContextFactory<TProtocol>();

  // eslint-disable-next-line solid/reactivity -- protocol resolver is expected to be static for the runtime lifetime.
  const protocol = props.getProtocol?.();

  // eslint-disable-next-line solid/reactivity -- components are expected to be static for the runtime lifetime.
  const unregister = props.components?.length ? registry.registerAll(props.components) : () => {};

  onMount(() => {
    // eslint-disable-next-line solid/reactivity -- context factory intentionally closes over reactive contexts.
    void registry.mountAll((id) => {
      const base = createCtx(id, { protocol });
      return props.createComponentContext ? props.createComponentContext(id, base) : base;
    });
  });

  onCleanup(() => {
    void registry.unmountAll();
    unregister();
  });

  return <>{props.children}</>;
}
