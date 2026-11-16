import { createEffect, createSignal, onCleanup } from 'solid-js';
import { startPointerSession, type PointerSessionController } from '../ui/pointerSession';

export type BarDropPosition = Readonly<{ key: string; edge: 'before' | 'after'; order: string[] }>;

/** A placement proposal only; owners commit order after a completed gesture. */
export function barDropPosition(
  keys: readonly string[], source: string, elements: ReadonlyMap<string, HTMLElement>,
  axis: 'x' | 'y', coordinate: number,
): BarDropPosition | undefined {
  const remaining = keys.filter(key => key !== source && elements.has(key));
  if (!keys.includes(source) || !remaining.length) return undefined;
  let index = remaining.findIndex(key => {
    const element = elements.get(key)!;
    const bounds = element.getBoundingClientRect();
    const transform = getComputedStyle(element).transform;
    const matrix = typeof DOMMatrix === 'function' ? new DOMMatrix(transform === 'none' ? undefined : transform) : undefined;
    return coordinate < (axis === 'x' ? bounds.left - (matrix?.m41 ?? 0) + bounds.width / 2 : bounds.top - (matrix?.m42 ?? 0) + bounds.height / 2);
  });
  if (index < 0) index = remaining.length;
  const order = [...remaining]; order.splice(index, 0, source);
  return { key: remaining[Math.min(index, remaining.length - 1)], edge: index === remaining.length ? 'after' : 'before', order };
}

export function keyboardBarOrder(keys: readonly string[], source: string, event: KeyboardEvent, axis: 'x' | 'y'): string[] | undefined {
  if (!event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey || event.isComposing) return;
  const direction = event.key === (axis === 'x' ? 'ArrowLeft' : 'ArrowUp') ? -1
    : event.key === (axis === 'x' ? 'ArrowRight' : 'ArrowDown') ? 1 : 0;
  const index = keys.indexOf(source);
  if (!direction || index < 0) return;
  event.preventDefault(); event.stopPropagation();
  const next = Math.max(0, Math.min(keys.length - 1, index + direction));
  if (index === next) return;
  const order = [...keys]; order.splice(index, 1); order.splice(next, 0, source);
  return order;
}

/** Activity rails own their pointer session; Dock shares the proposal with its canvas gesture. */
export function createBarReorder(options: {
  keys: () => readonly string[];
  elements: Map<string, HTMLElement>;
  onReorder: () => ((keys: string[]) => void) | undefined;
  container: () => HTMLElement | undefined;
}) {
  const [dragging, setDragging] = createSignal<string>();
  const [position, setPosition] = createSignal<BarDropPosition>();
  let session: PointerSessionController | undefined;
  let suppressClick = false;
  let clickTimer: ReturnType<typeof setTimeout> | undefined;
  const cancel = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !session) return;
    event.preventDefault(); event.stopPropagation(); session.stop({ commit: false });
  };
  createEffect(() => {
    options.keys(); options.onReorder();
    session?.stop({ commit: false });
  });
  onCleanup(() => { session?.stop({ commit: false }); if (clickTimer) clearTimeout(clickTimer); });
  const commit = (key: string, order: string[]) => {
    options.onReorder()?.(order);
    options.elements.get(key)?.focus({ preventScroll: true });
  };
  return {
    dragging, position,
    keyDown(key: string, event: KeyboardEvent) {
      if (!options.onReorder()) return;
      const order = keyboardBarOrder(options.keys(), key, event, 'y');
      if (order) commit(key, order);
    },
    consumeClick() { if (!suppressClick) return false; suppressClick = false; return true; },
    begin(key: string, event: PointerEvent) {
      if (event.button !== 0 || !options.onReorder() || !options.keys().includes(key)) return;
      session?.stop({ commit: false });
      const owner = event.currentTarget as HTMLElement;
      const startY = event.clientY;
      const startX = event.clientX;
      let moved = false;
      const update = (x: number, y: number) => {
        moved ||= Math.hypot(x - startX, y - startY) >= 5;
        if (!moved) return;
        setDragging(key);
        const rect = options.container()?.getBoundingClientRect();
        setPosition(rect && x >= rect.left - 24 && x <= rect.right + 24 && y >= rect.top && y <= rect.bottom
          ? barDropPosition(options.keys(), key, options.elements, 'y', y) : undefined);
      };
      owner.ownerDocument.addEventListener('keydown', cancel, true);
      session = startPointerSession({ pointerEvent: event, captureEl: owner,
        onMove: point => update(point.clientX, point.clientY),
        onEnd: ({ commit: accepted, snapshot }) => {
          update(snapshot.latestClientX, snapshot.latestClientY);
          const proposal = position();
          session = undefined;
          owner.ownerDocument.removeEventListener('keydown', cancel, true);
          setDragging(undefined); setPosition(undefined);
          if (moved) {
            suppressClick = true;
            if (clickTimer) clearTimeout(clickTimer);
            clickTimer = setTimeout(() => { suppressClick = false; }, 0);
          }
          if (accepted && moved && proposal) commit(key, proposal.order);
        },
      });
    },
  };
}

/** Keyed layout motion survives pin/unpin, reorder and interrupted previews. */
export function createBarLayoutMotion(options: {
  keys: () => readonly string[];
  elements: Map<string, HTMLElement>;
  preview: () => readonly string[] | undefined;
  axis: 'x' | 'y';
}) {
  const previous = new Map<string, { left: number; top: number }>();
  const animations = new Map<string, Animation>();
  let initialized = false;
  createEffect(() => {
    const keys = [...options.keys()];
    const preview = options.preview();
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const positions = new Map(keys.flatMap(key => {
      const element = options.elements.get(key);
      if (!element) return [];
      const rect = element.getBoundingClientRect();
      const transform = getComputedStyle(element).transform;
      const matrix = typeof DOMMatrix === 'function' ? new DOMMatrix(transform === 'none' ? undefined : transform) : undefined;
      return [[key, { left: rect.left - (matrix?.m41 ?? 0), top: rect.top - (matrix?.m42 ?? 0), dx: matrix?.m41 ?? 0, dy: matrix?.m42 ?? 0 }] as const];
    }));
    for (const key of keys) {
      const element = options.elements.get(key), position = positions.get(key);
      if (!element || !position) continue;
      const before = previous.get(key);
      const slotKey = preview ? keys[preview.indexOf(key)] : key;
      const slot = positions.get(slotKey) ?? position;
      const dx = options.axis === 'x' ? slot.left - position.left : 0;
      const dy = options.axis === 'y' ? slot.top - position.top : 0;
      animations.get(key)?.cancel(); animations.delete(key);
      element.style.transform = dx || dy ? `translate3d(${dx}px, ${dy}px, 0)` : '';
      if (!reduced && initialized && typeof element.animate === 'function') {
        const fromX = before ? before.left - position.left + position.dx : dx;
        const fromY = before ? before.top - position.top + position.dy : dy;
        if (!before || Math.abs(fromX - dx) + Math.abs(fromY - dy) > .5) {
          const animation = element.animate([
            { transform: `translate3d(${fromX}px, ${fromY}px, 0)`, opacity: before ? 1 : 0 },
            { transform: `translate3d(${dx}px, ${dy}px, 0)`, opacity: 1 },
          ], { duration: 180, easing: 'cubic-bezier(0.33, 1, 0.68, 1)' });
          animations.set(key, animation);
          animation.onfinish = () => { if (animations.get(key) === animation) animations.delete(key); };
        }
      }
      previous.set(key, { left: position.left, top: position.top });
    }
    for (const key of previous.keys()) if (!keys.includes(key)) {
      previous.delete(key); animations.get(key)?.cancel(); animations.delete(key);
    }
    initialized = true;
  });
  onCleanup(() => { for (const animation of animations.values()) animation.cancel(); });
}
