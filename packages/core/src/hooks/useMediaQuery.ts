import { createEffect, createSignal, onCleanup, type Accessor } from 'solid-js';

/** Observe a query synchronously, including reactive configuration changes. */
export function useMediaQuery(query: string | Accessor<string>): Accessor<boolean> {
  const resolve = () => typeof query === 'function' ? query() : query;
  const [matches, setMatches] = createSignal(
    typeof window !== 'undefined' && window.matchMedia(resolve()).matches,
  );
  createEffect(() => {
    const value = resolve();
    if (typeof window === 'undefined') return;
    const media = window.matchMedia(value);
    setMatches(media.matches);
    const changed = (event: MediaQueryListEvent) => setMatches(event.matches);
    media.addEventListener('change', changed);
    onCleanup(() => media.removeEventListener('change', changed));
  });
  return matches;
}
