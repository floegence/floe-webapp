import { createSignal, createEffect, on, type Accessor } from 'solid-js';

/**
 * Debounced signal value
 */
export function useDebounce<T>(value: Accessor<T>, delay: number): Accessor<T> {
  const [debouncedValue, setDebouncedValue] = createSignal<T>(value());

  createEffect(
    on(value, (v) => {
      const timeout = setTimeout(() => setDebouncedValue(() => v), delay);
      return () => clearTimeout(timeout);
    })
  );

  return debouncedValue as Accessor<T>;
}
