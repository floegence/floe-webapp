import { createSignal, onCleanup, onMount, type Accessor } from 'solid-js';

/**
 * Reactive media query hook
 */
export function useMediaQuery(query: string): Accessor<boolean> {
  const [matches, setMatches] = createSignal(false);

  onMount(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    onCleanup(() => mediaQuery.removeEventListener('change', handleChange));
  });

  return matches;
}
