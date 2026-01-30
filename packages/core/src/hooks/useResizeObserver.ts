import { createEffect, createSignal, onCleanup, type Accessor } from 'solid-js';

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

  createEffect(() => {
    const el = element();
    if (!el) return;

    // Initial measurement: some ResizeObserver implementations may not fire immediately,
    // but charts/layout need the correct width on first paint to avoid "letterboxing".
    const rect = el.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });

    if (typeof ResizeObserver === 'undefined') {
      const handleResize = () => setSize({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height });
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', handleResize);
        onCleanup(() => window.removeEventListener('resize', handleResize));
      }
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(el);
    onCleanup(() => observer.disconnect());
  });

  return size;
}
