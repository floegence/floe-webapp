import { createSignal, type Accessor } from 'solid-js';

/** Controlled callers remain authoritative; omitted values use local state. */
export function createControllableValue<T>(options: {
  value: Accessor<T | undefined>;
  defaultValue: T;
  onChange: (value: T) => void;
}) {
  const [internal, setInternal] = createSignal<T>(options.defaultValue);
  const value = () => options.value() ?? internal();
  const set = (next: T) => {
    if (Object.is(next, value())) return;
    if (options.value() === undefined) setInternal(() => next);
    options.onChange(next);
  };
  return [value, set] as const;
}
