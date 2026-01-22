import { createSignal, createEffect, type Accessor } from 'solid-js';
import { useResolvedFloeConfig } from '../context/FloeConfigContext';

/**
 * Persisted signal using Floe's configured persistence (storage adapter + namespace).
 */
export function usePersisted<T>(key: string, defaultValue: T): [Accessor<T>, (value: T) => void] {
  const floe = useResolvedFloeConfig();
  const initial = floe.persist.load(key, defaultValue);
  const [value, setValue] = createSignal<T>(initial);

  createEffect(() => {
    floe.persist.debouncedSave(key, value());
  });

  return [value as Accessor<T>, setValue];
}
