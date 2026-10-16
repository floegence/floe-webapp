import { For, createMemo, type Accessor, type JSX } from 'solid-js';

export interface KeyedForProps<T, K extends string | number> {
  each: readonly T[] | null | undefined;
  by: (item: T) => K;
  children: (item: Accessor<T>, index: Accessor<number>) => JSX.Element;
  fallback?: JSX.Element;
}

/** Retain list owners by semantic identity while observing replacement values. */
export function KeyedFor<T, K extends string | number>(props: KeyedForProps<T, K>): JSX.Element {
  const snapshot = createMemo(() => {
    const values = new Map<K, T>();
    const keys: K[] = [];
    for (const item of props.each ?? []) {
      const key = props.by(item);
      if (values.has(key)) throw new Error('KeyedFor requires unique keys');
      values.set(key, item);
      keys.push(key);
    }
    return { values, keys };
  });
  // IMPORTANT: retained nodes must read the current item, including callbacks
  // and disabled state. Capturing the first object silently executes stale work.
  return <For each={snapshot().keys} fallback={props.fallback}>{(key, index) =>
    // Render callbacks receive accessors intentionally; the child owns their reads.
    // eslint-disable-next-line solid/reactivity
    props.children(() => snapshot().values.get(key)!, index)
  }</For>;
}
