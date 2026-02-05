import { createMemo, untrack, type Accessor } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { useLayout } from '../context/LayoutContext';
import { useComponentRegistry, type FloeComponent } from '../context/ComponentRegistry';
import { KeepAliveStack, type KeepAliveStackProps, type KeepAliveView } from '../components/layout/KeepAliveStack';

export interface ActivityAppsMainProps<TProtocol = unknown> {
  class?: string;

  /** Override the active id (default: LayoutContext.sidebarActiveTab). */
  activeId?: Accessor<string>;

  /**
   * Explicit view list (advanced).
   * When provided, the registry is not required.
   */
  views?: KeepAliveView[];

  /**
   * Registry-driven filter (default: sidebar.fullScreen === true OR sidebar.renderIn === 'main').
   * Only used when `views` is not provided.
   */
  include?: (component: FloeComponent<TProtocol>) => boolean;

  /** Forwarded to KeepAliveStack (default: true). */
  lazyMount?: KeepAliveStackProps['lazyMount'];

  /** Forwarded to KeepAliveStack (default: true). */
  keepMounted?: KeepAliveStackProps['keepMounted'];
}

function defaultInclude<TProtocol>(component: FloeComponent<TProtocol>): boolean {
  return component.sidebar?.fullScreen === true || component.sidebar?.renderIn === 'main';
}

export function ActivityAppsMain<TProtocol = unknown>(props: ActivityAppsMainProps<TProtocol>) {
  const layout = useLayout();
  const registry = (() => {
    try {
      return useComponentRegistry<TProtocol>();
    } catch {
      return null;
    }
  })();

  const hasExplicitViews = untrack(() => Boolean(props.views));
  if (!hasExplicitViews && !registry) {
    throw new Error('ActivityAppsMain requires ComponentRegistryProvider when `views` is not provided.');
  }

  const activeId = () => (props.activeId ? props.activeId() : layout.sidebarActiveTab());

  const viewsFromRegistry = createMemo<KeepAliveView[]>(() => {
    if (!registry) return [];
    const shouldInclude = props.include ?? defaultInclude<TProtocol>;

    return registry
      .sidebarItems()
      .filter((c) => shouldInclude(c))
      .map((c) => ({
        id: c.id,
        render: () => <Dynamic component={c.component} />,
      }));
  });

  const views = () => props.views ?? viewsFromRegistry();

  return (
    <KeepAliveStack
      views={views()}
      activeId={activeId()}
      lazyMount={props.lazyMount}
      keepMounted={props.keepMounted}
      class={props.class}
    />
  );
}
