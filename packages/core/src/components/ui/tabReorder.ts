import { createEffect, createSignal, onCleanup } from 'solid-js';
import { startPointerSession, type PointerSessionController } from './pointerSession';

type Item = { id: string; disabled?: boolean };
type Slot = { id: string; element: HTMLElement; left: number; width: number };

/** Preview order with transforms; only a completed drop changes host-owned order. */
export function createTabReorder(options: {
  items: () => Item[];
  onReorder: () => ((ids: string[]) => void) | undefined;
  container: () => HTMLElement | undefined;
  elements: Map<string, HTMLElement>;
}) {
  const [dragging, setDragging] = createSignal<string>();
  let session: PointerSessionController | undefined;
  let source: string | undefined;
  let slots: Slot[] = [];
  let proposed: string[] = [];
  let pointerX = 0;
  let startX = 0;
  let startScroll = 0;
  let scale = 1;
  let frame = 0;
  let suppress = false;
  let clickTimer: ReturnType<typeof setTimeout> | undefined;
  let owner: Document | undefined;
  const animations = new Map<HTMLElement, Animation>();

  const clearMotion = (element: HTMLElement) => {
    delete element.dataset.floeTabMotion;
    element.style.removeProperty('--floe-tab-offset');
  };
  const stopAnimations = () => {
    for (const [element, animation] of animations) {
      animation.cancel(); clearMotion(element);
    }
    animations.clear();
  };
  const measure = () => {
    const rail = options.container();
    if (!rail) return;
    const bounds = rail.getBoundingClientRect();
    scale = rail.offsetWidth > 0 && bounds.width > 0 ? bounds.width / rail.offsetWidth : 1;
    startScroll = rail.scrollLeft;
    slots = options.items().flatMap(item => {
      const element = options.elements.get(item.id);
      if (!element) return [];
      const rect = element.getBoundingClientRect();
      return [{ id: item.id, element, left: (rect.left - bounds.left) / scale + startScroll, width: rect.width / scale }];
    });
  };
  const paint = () => {
    const rail = options.container();
    const held = slots.find(slot => slot.id === source);
    if (!rail || !held) return;
    const first = slots[0]; const last = slots.at(-1)!;
    const left = Math.max(first.left, Math.min(last.left + last.width - held.width,
      held.left + (pointerX - startX) / scale + rail.scrollLeft - startScroll));
    const others = slots.filter(slot => slot !== held);
    const gap = slots.length > 1 ? slots[1].left - first.left - first.width : 0;
    // Compare candidate resting positions after removing the held tab. Original
    // neighbor centers can make the last slot unreachable for a wider tab.
    let insertion = 0;
    let candidate = first.left;
    for (const slot of others) {
      const next = candidate + slot.width + gap;
      if (left >= (candidate + next) / 2) insertion += 1;
      candidate = next;
    }
    const ordered = [...others]; ordered.splice(insertion, 0, held);
    proposed = ordered.map(slot => slot.id);
    let position = first.left;
    for (const slot of ordered) {
      slot.element.dataset.floeTabMotion = slot === held ? 'dragging' : 'neighbor';
      slot.element.style.setProperty('--floe-tab-offset', `${(slot === held ? left : position) - slot.left}px`);
      position += slot.width + gap;
    }
  };
  const scrollFrame = () => {
    frame = 0;
    const rail = options.container();
    if (!dragging() || !rail) return;
    const rect = rail.getBoundingClientRect();
    const distance = pointerX < rect.left + 28 ? pointerX - rect.left - 28
      : pointerX > rect.right - 28 ? pointerX - rect.right + 28 : 0;
    if (distance) rail.scrollLeft += Math.sign(distance) * Math.min(12, Math.abs(distance) / 3) / scale;
    paint();
    frame = requestAnimationFrame(scrollFrame);
  };
  const cancelKey = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.preventDefault(); event.stopPropagation();
    session?.stop({ commit: false });
  };
  const end = (commit: boolean) => {
    const didDrag = Boolean(dragging());
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (didDrag) paint();
    const resting = slots.map(slot => ({ element: slot.element, rect: slot.element.getBoundingClientRect() }));
    owner?.defaultView?.removeEventListener('keydown', cancelKey, true);
    session = undefined; source = undefined; setDragging(undefined);
    // Snapshot visible positions before the host moves tab DOM nodes. Panels stay host-owned.
    if (commit && didDrag && proposed.join('\0') !== options.items().map(item => item.id).join('\0')) options.onReorder()?.(proposed);
    for (const { element } of resting) clearMotion(element);
    if (didDrag) {
      suppress = true;
      if (clickTimer !== undefined) clearTimeout(clickTimer);
      clickTimer = setTimeout(() => { suppress = false; }, 0);
      const reduced = owner?.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (!reduced) for (const { element, rect } of resting) {
        if (!element.isConnected || typeof element.animate !== 'function') continue;
        const next = element.getBoundingClientRect();
        const dx = (rect.left - next.left) / scale;
        if (Math.abs(dx) < 0.5) continue;
        element.dataset.floeTabMotion = 'settling';
        const animation = element.animate([
          { transform: `translate3d(${dx}px, 0, 0)` }, { transform: 'translate3d(0, 0, 0)' },
        ], { duration: 180, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
        animations.set(element, animation);
        animation.onfinish = () => {
          if (animations.get(element) !== animation) return;
          animations.delete(element); clearMotion(element);
        };
      }
    }
    slots = []; proposed = [];
  };
  const start = (event: PointerEvent, item: Item) => {
    if (!options.onReorder() || item.disabled || event.button !== 0 || session) return;
    if ((event.target as Element)?.closest('button, a, input, [contenteditable="true"]')) return;
    stopAnimations();
    startX = event.clientX; const startY = event.clientY;
    source = item.id; pointerX = startX;
    owner = (event.currentTarget as HTMLElement).ownerDocument;
    owner.defaultView?.addEventListener('keydown', cancelKey, true);
    session = startPointerSession({
      pointerEvent: event, captureEl: event.currentTarget as HTMLElement, capturePointer: false,
      onMove: move => {
        pointerX = move.clientX;
        if (!dragging() && Math.hypot(move.clientX - startX, move.clientY - startY) < 5) return;
        if (!dragging()) { measure(); setDragging(item.id); session?.capturePointer(); }
        move.preventDefault(); paint();
        if (!frame) frame = requestAnimationFrame(scrollFrame);
      },
      onEnd: event => end(event.commit && (event.reason === 'pointer_up' || event.reason === 'buttons_released')),
    });
  };
  const keyDown = (event: KeyboardEvent, item: Item) => {
    if (!options.onReorder() || item.disabled || !event.altKey || !event.shiftKey || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return false;
    event.preventDefault(); event.stopPropagation(); stopAnimations();
    const ids = options.items().map(candidate => candidate.id);
    const from = ids.indexOf(item.id); const to = from + (event.key === 'ArrowLeft' ? -1 : 1);
    if (to >= 0 && to < ids.length) {
      [ids[from], ids[to]] = [ids[to], ids[from]];
      options.onReorder()?.(ids);
      options.elements.get(item.id)?.focus({ preventScroll: true });
      options.elements.get(item.id)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    return true;
  };
  createEffect(() => {
    const items = options.items(); const callback = options.onReorder();
    if (source && (!callback || !items.some(item => item.id === source && !item.disabled)
      || (slots.length && items.map(item => item.id).join('\0') !== slots.map(slot => slot.id).join('\0')))) session?.stop({ commit: false });
  });
  onCleanup(() => {
    session?.stop({ commit: false }); stopAnimations();
    if (frame) cancelAnimationFrame(frame);
    if (clickTimer !== undefined) clearTimeout(clickTimer);
    owner?.defaultView?.removeEventListener('keydown', cancelKey, true);
  });
  return { start, keyDown, dragging, suppressClick: () => suppress };
}
