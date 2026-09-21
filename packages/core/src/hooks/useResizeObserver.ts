import { createEffect, createSignal, onCleanup, type Accessor } from 'solid-js';

export interface Size {
  width: number;
  height: number;
}

/**
 * Track the usable content box in local CSS pixels, excluding padding and
 * scrollbars. CSS transforms on the element or its ancestors do not affect it.
 * With preserveWhenHidden, retain the last measurement while there is no rendered
 * box. Real zero-sized boxes still report zero; replacing the element resets it.
 */
export function useResizeObserver(
  element: Accessor<HTMLElement | null | undefined>,
  options: { preserveWhenHidden?: boolean } = {},
): Accessor<Size | null> {
  const [size, setSize] = createSignal<Size | null>(null, {
    equals: (previous, next) => previous?.width === next?.width && previous?.height === next?.height,
  });

  createEffect(() => {
    const el = element();
    setSize(null);
    if (!el) {
      return;
    }
    const measure = () => {
      // A display:none ancestor removes the box; it is not a real resize to zero.
      // Keep this opt-in so consumers that need hidden/zero dimensions retain their contract.
      if (options.preserveWhenHidden && el.getClientRects().length === 0) return;
      const style = el.ownerDocument.defaultView!.getComputedStyle(el);
      const px = (value: string) => Number.parseFloat(value) || 0;
      setSize({
        width: Math.max(0, el.clientWidth - px(style.paddingLeft) - px(style.paddingRight)),
        height: Math.max(0, el.clientHeight - px(style.paddingTop) - px(style.paddingBottom)),
      });
    };
    measure();

    if (typeof ResizeObserver === 'undefined') {
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', measure);
        onCleanup(() => window.removeEventListener('resize', measure));
      }
      return;
    }

    const observer = new ResizeObserver(measure);

    observer.observe(el);
    onCleanup(() => observer.disconnect());
  });

  return size;
}
