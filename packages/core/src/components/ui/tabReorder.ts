import { createEffect, createSignal, onCleanup } from 'solid-js';
import { startPointerSession, type PointerSessionController } from './pointerSession';

type Item = { id: string; disabled?: boolean };

/** A drag proposes an insertion; only a completed drop changes host-owned order. */
export function createTabReorder(options: {
  items: () => Item[];
  onReorder: () => ((ids: string[]) => void) | undefined;
  container: () => HTMLElement | undefined;
  elements: Map<string, HTMLElement>;
}) {
  const [dragging, setDragging] = createSignal<string>();
  const [before, setBefore] = createSignal<string>();
  const [after, setAfter] = createSignal<string>();
  let session: PointerSessionController | undefined;
  let source: string | undefined;
  let pointerX = 0;
  let frame = 0;
  let suppress = false;
  let clickTimer: ReturnType<typeof setTimeout> | undefined;
  let owner: Document | undefined;

  const ordered = (id: string, beforeId: string | undefined) => {
    const ids = options.items().map(item => item.id).filter(candidate => candidate !== id);
    const index = beforeId ? ids.indexOf(beforeId) : ids.length;
    ids.splice(index < 0 ? ids.length : index, 0, id);
    return ids;
  };
  const updateInsertion = () => {
    const candidates = options.items().filter(item => item.id !== source);
    const target = candidates.find(item => {
      const rect = options.elements.get(item.id)?.getBoundingClientRect();
      return rect && pointerX < rect.left + rect.width / 2;
    });
    setBefore(target?.id);
    setAfter(target ? undefined : candidates.at(-1)?.id);
  };
  const scrollFrame = () => {
    frame = 0;
    const rail = options.container();
    if (!dragging() || !rail) return;
    const rect = rail.getBoundingClientRect();
    const distance = pointerX < rect.left + 28 ? pointerX - rect.left - 28
      : pointerX > rect.right - 28 ? pointerX - rect.right + 28 : 0;
    if (distance) rail.scrollLeft += Math.sign(distance) * Math.min(12, Math.abs(distance) / 3);
    updateInsertion();
    frame = requestAnimationFrame(scrollFrame);
  };
  const cancelKey = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.preventDefault(); event.stopPropagation();
    session?.stop({ commit: false });
  };
  const end = (commit: boolean) => {
    const id = source;
    const didDrag = Boolean(dragging());
    const ids = id && didDrag ? ordered(id, before()) : undefined;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    owner?.defaultView?.removeEventListener('keydown', cancelKey, true);
    session = undefined; source = undefined;
    setDragging(undefined); setBefore(undefined); setAfter(undefined);
    if (didDrag) {
      suppress = true;
      clickTimer = setTimeout(() => { suppress = false; }, 0);
    }
    if (commit && ids && ids.join('\0') !== options.items().map(item => item.id).join('\0')) {
      options.onReorder()?.(ids);
    }
  };
  const start = (event: PointerEvent, item: Item) => {
    if (!options.onReorder() || item.disabled || event.button !== 0 || session) return;
    if ((event.target as Element)?.closest('button, a, input, [contenteditable="true"]')) return;
    const startX = event.clientX; const startY = event.clientY;
    source = item.id; pointerX = startX;
    owner = (event.currentTarget as HTMLElement).ownerDocument;
    owner.defaultView?.addEventListener('keydown', cancelKey, true);
    session = startPointerSession({
      pointerEvent: event, captureEl: event.currentTarget as HTMLElement, capturePointer: false,
      onMove: move => {
        pointerX = move.clientX;
        if (!dragging() && Math.hypot(move.clientX - startX, move.clientY - startY) < 5) return;
        if (!dragging()) { setDragging(item.id); session?.capturePointer(); }
        move.preventDefault();
        updateInsertion();
        if (!frame) frame = requestAnimationFrame(scrollFrame);
      },
      onEnd: event => end(event.commit && (event.reason === 'pointer_up' || event.reason === 'buttons_released')),
    });
  };
  const keyDown = (event: KeyboardEvent, item: Item) => {
    if (!options.onReorder() || item.disabled || !event.altKey || !event.shiftKey || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return false;
    event.preventDefault(); event.stopPropagation();
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
    if (source && (!callback || !items.some(item => item.id === source && !item.disabled))) session?.stop({ commit: false });
  });
  onCleanup(() => {
    session?.stop({ commit: false });
    if (frame) cancelAnimationFrame(frame);
    if (clickTimer !== undefined) clearTimeout(clickTimer);
    owner?.defaultView?.removeEventListener('keydown', cancelKey, true);
  });
  return { start, keyDown, dragging, before, after, suppressClick: () => suppress };
}
