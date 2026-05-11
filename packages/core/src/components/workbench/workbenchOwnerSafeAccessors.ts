import { createEffect, createSignal, untrack, type Accessor } from 'solid-js';

export function createOwnerSafePropAccessor<T>(read: () => T): Accessor<T> {
  const [value, setValue] = createSignal<T>(untrack(read));

  createEffect(() => {
    setValue(() => read());
  });

  return value;
}
