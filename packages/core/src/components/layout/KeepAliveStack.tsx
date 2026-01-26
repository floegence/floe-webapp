import { For, createEffect, createMemo, createSignal, untrack, type Accessor, type JSX } from 'solid-js';
import { ViewActivationProvider } from '../../context/ViewActivationContext';
import { cn } from '../../utils/cn';

export interface KeepAliveView {
  id: string;
  render: () => JSX.Element;
  class?: string;
}

export interface KeepAliveStackProps {
  views: KeepAliveView[];
  activeId: string;
  class?: string;

  /** When true, a view is mounted only after its first activation (default: true). */
  lazyMount?: boolean;

  /** When true, mounted views stay mounted after deactivation (default: true). */
  keepMounted?: boolean;
}

function normalizeId(id: unknown): string {
  return String(id ?? '').trim();
}

function normalizeViewOrder(views: KeepAliveView[]): string[] {
  const order: string[] = [];
  const seen = new Set<string>();

  for (const raw of views) {
    const id = normalizeId(raw?.id);
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    order.push(id);
  }

  return order;
}

function buildViewMap(order: string[], views: KeepAliveView[]): Map<string, KeepAliveView> {
  const allowed = new Set(order);
  const byId = new Map<string, KeepAliveView>();
  for (const v of views) {
    const id = normalizeId(v?.id);
    if (!id) continue;
    if (!allowed.has(id)) continue;
    if (byId.has(id)) continue;
    byId.set(id, v);
  }
  return byId;
}

function KeepAliveItem(props: {
  id: string;
  active: Accessor<boolean>;
  class?: string;
  children: JSX.Element;
}) {
  const [activationSeq, setActivationSeq] = createSignal(0);
  let prevActive = false;

  createEffect(() => {
    const next = props.active();
    if (next && !prevActive) {
      setActivationSeq((v) => v + 1);
    }
    prevActive = next;
  });

  const value = untrack(() => ({ id: props.id, active: props.active, activationSeq }));

  return (
    <ViewActivationProvider value={value}>
      <div class={props.class} style={{ display: props.active() ? 'block' : 'none' }}>
        {props.children}
      </div>
    </ViewActivationProvider>
  );
}

export function KeepAliveStack(props: KeepAliveStackProps) {
  const lazyMount = () => props.lazyMount !== false;
  const keepMounted = () => props.keepMounted !== false;

  const viewOrder = createMemo(() => normalizeViewOrder(props.views));
  const [cachedById, setCachedById] = createSignal<Map<string, KeepAliveView>>(
    untrack(() => buildViewMap(normalizeViewOrder(props.views), props.views))
  );
  const activeId = createMemo(() => normalizeId(props.activeId));

  // Keep a stable render function per id across parent re-renders.
  createEffect(() => {
    const order = viewOrder();
    const incoming = props.views;

    setCachedById((prev) => {
      let changed = false;
      const next = new Map(prev);
      const allowed = new Set(order);

      // Prune removed views.
      for (const id of next.keys()) {
        if (!allowed.has(id)) {
          next.delete(id);
          changed = true;
        }
      }

      // Add new views (do not overwrite existing entries).
      for (const v of incoming) {
        const id = normalizeId(v?.id);
        if (!id) continue;
        if (!allowed.has(id)) continue;
        if (next.has(id)) continue;
        next.set(id, v);
        changed = true;
      }

      return changed ? next : prev;
    });
  });

  const viewIndex = createMemo(() => ({ order: viewOrder(), byId: cachedById() }));

  const initialMounted = (): Set<string> => {
    if (!keepMounted()) return new Set();
    if (!lazyMount()) return new Set(viewIndex().order);
    const id = activeId();
    if (!id) return new Set();
    if (!viewIndex().byId.has(id)) return new Set();
    return new Set([id]);
  };

  const [mounted, setMounted] = createSignal<Set<string>>(initialMounted());

  // Keep the mounted set aligned with the declared views (no dangling ids).
  createEffect(() => {
    if (!keepMounted()) return;
    const allowed = new Set(viewIndex().order);
    setMounted((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (!allowed.has(id)) {
          changed = true;
          continue;
        }
        next.add(id);
      }
      return changed ? next : prev;
    });
  });

  // Lazy-mount views on first activation.
  createEffect(() => {
    if (!keepMounted()) return;
    if (!lazyMount()) return;
    const id = activeId();
    if (!id) return;
    if (!viewIndex().byId.has(id)) return;

    setMounted((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  });

  const renderedIds = createMemo<string[]>(() => {
    const order = viewIndex().order;
    const id = activeId();

    if (!keepMounted()) {
      if (!id) return [];
      return viewIndex().byId.has(id) ? [id] : [];
    }
    if (!lazyMount()) return order;

    const m = mounted();
    return order.filter((x) => m.has(x) || x === id);
  });

  const hasActiveView = createMemo(() => {
    const id = activeId();
    if (!id) return false;
    return viewIndex().byId.has(id);
  });

  return (
    <div
      class={cn('relative h-full min-h-0 w-full', props.class)}
      style={{ display: hasActiveView() ? 'block' : 'none' }}
    >
      <For each={renderedIds()}>
        {(id) => {
          const view = () => cachedById().get(id);
          const isActive = () => activeId() === id;

          return (
            <KeepAliveItem id={id} active={isActive} class={cn('absolute inset-0', view()?.class)}>
              {view()?.render()}
            </KeepAliveItem>
          );
        }}
      </For>
    </div>
  );
}
