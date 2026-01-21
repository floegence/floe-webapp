import { createSignal, createEffect, type Accessor } from 'solid-js';
import { load, debouncedSave } from '../utils/persist';

/**
 * Persisted signal with localStorage
 */
export function usePersisted<T>(key: string, defaultValue: T): [Accessor<T>, (value: T) => void] {
  const initial = load(key, defaultValue);
  const [value, setValue] = createSignal<T>(initial);

  createEffect(() => {
    debouncedSave(key, value());
  });

  return [value as Accessor<T>, setValue];
}
