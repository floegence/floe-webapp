import { createEffect, createMemo, createSignal, onCleanup, untrack } from 'solid-js';
import { startPointerSession, type PointerSessionController } from '../ui/pointerSession';

export type BarDropPosition = Readonly<{ key: string; edge: 'before' | 'after'; order: string[] }>;
export type BarDragTranslation = Readonly<{ key: string; x: number; y: number }>;
export const sameBarDropPosition = (a: BarDropPosition | undefined, b: BarDropPosition | undefined) =>
  a === b || Boolean(a && b && a.key === b.key && a.edge === b.edge && a.order.length === b.order.length && a.order.every((key, index) => key === b.order[index]));

/** Read untransformed slots once per gesture, never from animated neighbors on each move. */
export function measureBarSlots(elements: ReadonlyMap<string, HTMLElement>, axis: 'x' | 'y'): ReadonlyMap<string, number> {
  return new Map([...elements].map(([key, element]) => {
    const rect = element.getBoundingClientRect();
    const transform = getComputedStyle(element).transform;
    const matrix = typeof DOMMatrix === 'function' ? new DOMMatrix(transform === 'none' ? undefined : transform) : undefined;
    return [key, axis === 'x' ? rect.left - (matrix?.m41 ?? 0) + rect.width / 2 : rect.top - (matrix?.m42 ?? 0) + rect.height / 2];
  }));
}

/** A placement proposal only; owners commit order after a completed gesture. */
export function barDropPosition(
  keys: readonly string[], source: string, elements: ReadonlyMap<string, HTMLElement>,
  axis: 'x' | 'y', coordinate: number,
  slots?: ReadonlyMap<string, number>,
): BarDropPosition | undefined {
  const remaining = keys.filter(key => key !== source && elements.has(key));
  if (!keys.includes(source) || !remaining.length) return undefined;
  let index = remaining.findIndex(key => {
    if (slots?.has(key)) return coordinate < slots.get(key)!;
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
  const [position, setPosition] = createSignal<BarDropPosition | undefined>(undefined, { equals: sameBarDropPosition });
  const [translation, setTranslation] = createSignal<BarDragTranslation>();
  let session: PointerSessionController | undefined;
  let suppressClick = false;
  let scrollFrame = 0;
  const cancel = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !session) return;
    event.preventDefault(); event.stopPropagation(); session.stop({ commit: false });
  };
  createEffect(() => {
    options.keys(); options.onReorder();
    session?.stop({ commit: false });
  });
  onCleanup(() => session?.stop({ commit: false }));
  const commit = (key: string, order: string[]) => {
    options.onReorder()?.(order);
    options.elements.get(key)?.focus({ preventScroll: true });
  };
  return {
    dragging, position, translation,
    keyDown(key: string, event: KeyboardEvent) {
      if (!options.onReorder()) return;
      const order = keyboardBarOrder(options.keys(), key, event, 'y');
      if (order) commit(key, order);
    },
    consumeClick(event: MouseEvent) {
      const suppressed = suppressClick && event.detail !== 0;
      suppressClick = false;
      return suppressed;
    },
    begin(key: string, event: PointerEvent) {
      if (event.button !== 0) return;
      suppressClick = false;
      if (!options.onReorder() || !options.keys().includes(key)) return;
      session?.stop({ commit: false });
      const owner = event.currentTarget as HTMLElement;
      const startY = event.clientY;
      const startX = event.clientX;
      const rail = options.container();
      const startScroll = rail?.scrollTop ?? 0;
      const slots = measureBarSlots(options.elements, 'y');
      const transform = getComputedStyle(owner).transform;
      const initial = typeof DOMMatrix === 'function' ? new DOMMatrix(transform === 'none' ? undefined : transform) : undefined;
      const ownerRect = owner.getBoundingClientRect();
      let pointerX = startX, pointerY = startY;
      let moved = false;
      const update = (x: number, y: number) => {
        pointerX = x; pointerY = y;
        moved ||= Math.hypot(x - startX, y - startY) >= 5;
        if (!moved) return;
        setDragging(key);
        const rect = options.container()?.getBoundingClientRect();
        const scrollDelta = (rail?.scrollTop ?? 0) - startScroll;
        const top = rect ? Math.max(rect.top, Math.min(rect.bottom - ownerRect.height, ownerRect.top + y - startY)) : ownerRect.top + y - startY;
        setTranslation({ key, x: 0, y: top - ownerRect.top + (initial?.m42 ?? 0) + scrollDelta });
        setPosition(rect && x >= rect.left - 24 && x <= rect.right + 24 && y >= rect.top && y <= rect.bottom
          ? barDropPosition(options.keys(), key, options.elements, 'y', y + scrollDelta, slots) : undefined);
      };
      const scroll = () => {
        const rail = options.container();
        if (moved && rail) {
          const rect = rail.getBoundingClientRect();
          const distance = pointerY < rect.top + 28 ? pointerY - rect.top - 28
            : pointerY > rect.bottom - 28 ? pointerY - rect.bottom + 28 : 0;
          if (pointerX >= rect.left - 24 && pointerX <= rect.right + 24 && pointerY >= rect.top - 24 && pointerY <= rect.bottom + 24 && distance) {
            const before = rail.scrollTop;
            rail.scrollTop += Math.sign(distance) * Math.min(10, Math.abs(distance) / 3);
            if (rail.scrollTop !== before) update(pointerX, pointerY);
          }
        }
        scrollFrame = requestAnimationFrame(scroll);
      };
      scrollFrame = requestAnimationFrame(scroll);
      owner.ownerDocument.addEventListener('keydown', cancel, true);
      session = startPointerSession({ pointerEvent: event, captureEl: owner,
        onMove: point => update(point.clientX, point.clientY),
        onEnd: ({ commit: accepted, snapshot, reason }) => {
          accepted &&= reason === 'pointer_up' || reason === 'buttons_released';
          update(snapshot.latestClientX, snapshot.latestClientY);
          const proposal = position();
          cancelAnimationFrame(scrollFrame);
          session = undefined;
          owner.ownerDocument.removeEventListener('keydown', cancel, true);
          setDragging(undefined); setTranslation(undefined); setPosition(undefined);
          // A canceled press still produces a native click on pointer release.
          // Retain suppression until that click or the next explicit press.
          suppressClick = moved || !accepted;
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
  drag?: () => BarDragTranslation | undefined;
}) {
  const previous = new Map<string, { left: number; top: number; scrollX: number; scrollY: number }>();
  const animations = new Map<string, Animation>();
  const readScroll = (element: HTMLElement) => {
    let scrollX = 0, scrollY = 0;
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      scrollX += parent.scrollLeft; scrollY += parent.scrollTop;
    }
    return { scrollX, scrollY };
  };
  // Remember the last presented scroll offset. Layout may synchronously clamp it
  // when a row disappears; that clamp must not teleport retained icons first.
  const rememberScroll = (event: Event) => {
    for (const [key, before] of previous) {
      const element = options.elements.get(key);
      if (element && event.target instanceof Node && event.target.contains(element))
        previous.set(key, { ...before, ...readScroll(element) });
    }
  };
  if (typeof document !== 'undefined') {
    document.addEventListener('scroll', rememberScroll, true);
    onCleanup(() => document.removeEventListener('scroll', rememberScroll, true));
  }
  let initialized = false;
  let revision = 0;
  const dragKey = createMemo(() => options.drag?.()?.key);
  createEffect(() => {
    const drag = options.drag?.();
    if (!drag) return;
    const element = options.elements.get(drag.key);
    animations.get(drag.key)?.cancel(); animations.delete(drag.key);
    if (element) element.style.transform = `translate3d(${drag.x}px, ${drag.y}px, 0)`;
  });
  createEffect(() => {
    const keys = [...options.keys()];
    const preview = options.preview();
    const dragging = dragKey();
    const currentRevision = ++revision;
    // Child trigger refs settle after parent effects; sample after that boundary.
    queueMicrotask(() => {
      if (revision !== currentRevision) return;
      const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      const positions = new Map(keys.flatMap(key => {
        const element = options.elements.get(key);
        if (!element) return [];
        const rect = element.getBoundingClientRect();
        const transform = getComputedStyle(element).transform;
        const matrix = typeof DOMMatrix === 'function' ? new DOMMatrix(transform === 'none' ? undefined : transform) : undefined;
        // Scroll is viewport movement, not a layout change to animate.
        const { scrollX, scrollY } = readScroll(element);
        return [[key, { left: rect.left + scrollX - (matrix?.m41 ?? 0), top: rect.top + scrollY - (matrix?.m42 ?? 0), scrollX, scrollY, dx: matrix?.m41 ?? 0, dy: matrix?.m42 ?? 0 }] as const];
      }));
      for (const key of keys) {
        const element = options.elements.get(key), position = positions.get(key);
        if (!element || !position) continue;
        const before = previous.get(key);
        if (dragging === key) {
          previous.set(key, position);
          const drag = untrack(() => options.drag?.());
          if (drag) element.style.transform = `translate3d(${drag.x}px, ${drag.y}px, 0)`;
          continue;
        }
        const slotKey = preview ? keys[preview.indexOf(key)] : key;
        const slot = positions.get(slotKey) ?? position;
        const dx = options.axis === 'x' ? slot.left - position.left : 0;
        const dy = options.axis === 'y' ? slot.top - position.top : 0;
        animations.get(key)?.cancel(); animations.delete(key);
        element.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
        if (!reduced && initialized && typeof element.animate === 'function') {
          const fromX = before ? before.left - before.scrollX - position.left + position.scrollX + position.dx : dx;
          const fromY = before ? before.top - before.scrollY - position.top + position.scrollY + position.dy : dy;
          if (!before || Math.abs(fromX - dx) + Math.abs(fromY - dy) > .5) {
            const animation = element.animate([
              { transform: `translate3d(${fromX}px, ${fromY}px, 0)`, ...(!before ? { opacity: 0 } : {}) },
              { transform: `translate3d(${dx}px, ${dy}px, 0)`, ...(!before ? { opacity: 1 } : {}) },
            ], { duration: 180, easing: 'cubic-bezier(0.33, 1, 0.68, 1)' });
            animations.set(key, animation);
            animation.onfinish = () => { if (animations.get(key) === animation) animations.delete(key); };
          }
        }
        previous.set(key, position);
      }
      for (const key of previous.keys()) if (!keys.includes(key)) {
        previous.delete(key); animations.get(key)?.cancel(); animations.delete(key);
      }
      initialized = true;
    });
  });
  onCleanup(() => { revision += 1; for (const animation of animations.values()) animation.cancel(); });
}
