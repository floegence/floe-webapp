import { children, onCleanup, onMount, type Component, type JSX } from 'solid-js';

/**
 * Create content once under its owner's lifetime, then mount it in one location
 * at a time. Placement changes preserve native scroll offsets as well as nodes.
 * Disclosure, focus, and business state remain owned by the caller.
 */
export function createRetainedContent(render: () => JSX.Element): Component {
  const content = children(render);
  let scroll: Array<{ element: HTMLElement; left: number; top: number }> = [];
  return () => {
    onMount(() => {
      for (const { element, left, top } of scroll) {
        element.scrollLeft = left;
        element.scrollTop = top;
      }
    });
    onCleanup(() => {
      if (typeof HTMLElement === 'undefined') return;
      const roots = content.toArray().filter((node): node is HTMLElement => node instanceof HTMLElement);
      scroll = roots.flatMap(root => [root, ...root.querySelectorAll<HTMLElement>('*')])
        .filter(element => element.scrollTop !== 0 || element.scrollLeft !== 0)
        .map(element => ({ element, left: element.scrollLeft, top: element.scrollTop }));
    });
    return content();
  };
}
