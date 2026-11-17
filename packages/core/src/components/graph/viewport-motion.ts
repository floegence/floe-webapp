import { createSignal, onCleanup, onMount, untrack, type Setter } from 'solid-js';
import type { GraphViewport } from './types';

/** A controlled camera: direct input interrupts motion at the currently painted viewport. */
export function createGraphViewport(initial: GraphViewport) {
  const [viewport, write] = createSignal(initial);
  const [moving, setMoving] = createSignal(false);
  let frame = 0;
  let target: GraphViewport | undefined;
  const cancel = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    target = undefined;
    setMoving(false);
  };
  const setViewport: Setter<GraphViewport> = (value) => {
    cancel();
    return write(value);
  };
  const animateTo = (next: GraphViewport) => {
    cancel();
    const from = untrack(viewport);
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      (from.x === next.x && from.y === next.y && from.scale === next.scale)
    ) {
      write(next);
      return;
    }
    target = next;
    const start = performance.now();
    setMoving(true);
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 280);
      const eased = 1 - Math.pow(1 - progress, 3);
      write({
        x: from.x + (next.x - from.x) * eased,
        y: from.y + (next.y - from.y) * eased,
        scale: from.scale + (next.scale - from.scale) * eased,
      });
      if (progress < 1) frame = requestAnimationFrame(tick);
      else {
        write(next);
        cancel();
      }
    };
    frame = requestAnimationFrame(tick);
  };
  onMount(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const settle = () => {
      if (media.matches && target) setViewport(target);
    };
    media.addEventListener('change', settle);
    onCleanup(() => media.removeEventListener('change', settle));
  });
  onCleanup(cancel);
  return { viewport, setViewport, animateTo, moving };
}
