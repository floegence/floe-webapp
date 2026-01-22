import { onCleanup, onMount, type JSX } from 'solid-js';
import type { DeepPartial, FloeConfig } from '../context/FloeConfigContext';
import { useComponentContextFactory, useComponentRegistry, type ComponentContext, type FloeComponent } from '../context/ComponentRegistry';
import { NotificationContainer } from '../context/NotificationContext';
import { Shell, type ShellProps } from '../components/layout/Shell';
import { CommandPalette } from '../components/ui/CommandPalette';
import { FloeProvider, type FloeProviderProps } from './FloeProvider';

export interface FloeAppProps<TProtocol = unknown> {
  children: JSX.Element;

  /** Global Floe configuration (storage, keybinds, strings, defaults). */
  config?: DeepPartial<FloeConfig>;

  /** Optional extra providers (e.g. protocol/router) to wrap the inner tree after ThemeProvider. */
  wrapAfterTheme?: FloeProviderProps['wrapAfterTheme'];

  /** Components to register into the ComponentRegistry (sidebar/commands/status). */
  components?: FloeComponent<TProtocol>[];

  /**
   * Optional protocol resolver to inject into ComponentContext.protocol.
   * Use this with wrapAfterTheme + ProtocolProvider:
   *   getProtocol={useProtocol}
   */
  getProtocol?: () => TProtocol;

  /**
   * Optional hook to customize the per-component context (e.g. inject protocol).
   * Tip: resolve external contexts (like useProtocol()) in your component body and close over them here.
   */
  createComponentContext?: (
    id: string,
    base: ComponentContext<TProtocol>
  ) => ComponentContext<TProtocol>;

  /** Shell props (except children). */
  shell?: Omit<ShellProps, 'children'>;

  /** Whether to render CommandPalette (default: true). */
  enableCommandPalette?: boolean;

  /** Whether to render NotificationContainer (default: true). */
  enableNotifications?: boolean;
}

function FloeAppInner<TProtocol = unknown>(props: FloeAppProps<TProtocol>) {
  const registry = useComponentRegistry<TProtocol>();
  const createCtx = useComponentContextFactory<TProtocol>();

  // eslint-disable-next-line solid/reactivity -- protocol resolver is expected to be static for the app lifetime.
  const protocol = props.getProtocol?.();

  // Register early so Shell can be driven by the registry on the first render.
  // eslint-disable-next-line solid/reactivity -- components are expected to be static for the app lifetime.
  if (props.components?.length) {
    // eslint-disable-next-line solid/reactivity -- components are expected to be static for the app lifetime.
    registry.registerAll(props.components);
  }

  onMount(() => {
    // eslint-disable-next-line solid/reactivity -- context factory intentionally closes over reactive contexts.
    void registry.mountAll((id) => {
      const base = createCtx(id, { protocol });
      return props.createComponentContext ? props.createComponentContext(id, base) : base;
    });
  });

  onCleanup(() => {
    void registry.unmountAll();
  });

  return (
    <>
      <Shell {...props.shell}>{props.children}</Shell>
      {props.enableCommandPalette !== false && <CommandPalette />}
      {props.enableNotifications !== false && <NotificationContainer />}
    </>
  );
}

/**
 * All-in-one Floe app wrapper (Provider + registry wiring + Shell + overlays).
 *
 * This is the recommended entrypoint for downstream apps.
 */
export function FloeApp<TProtocol = unknown>(props: FloeAppProps<TProtocol>) {
  return (
    <FloeProvider config={props.config} wrapAfterTheme={props.wrapAfterTheme}>
      <FloeAppInner {...props} />
    </FloeProvider>
  );
}
