import { createSignal, onCleanup, onMount, type Accessor } from 'solid-js';

export interface Size {
  width: number;
  height: number;
}

/**
 * Track element dimensions
 */
export function useResizeObserver(
  element: Accessor<HTMLElement | null | undefined>
): Accessor<Size | null> {
  const [size, setSize] = createSignal<Size | null>(null);

  onMount(() => {
    const el = element();
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(el);
    onCleanup(() => observer.disconnect());
  });

  return size;
}
