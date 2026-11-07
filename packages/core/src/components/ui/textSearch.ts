import { batch, createEffect, createSignal, createUniqueId, on, onCleanup, untrack, type Accessor } from 'solid-js';

/** Literal rendered-text matching; inline markup can split a match, blocks cannot. */
export function findTextRanges(root: HTMLElement, query: string): Range[] {
  if (!query) return [];
  const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'giu');
  const ranges: Range[] = [];
  let text = '';
  let nodes: { node: Text; start: number; end: number }[] = [];
  const flush = () => {
    let firstIndex = 0, lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const start = match.index, end = start + match[0].length;
      while (nodes[firstIndex].end <= start) firstIndex++;
      lastIndex = Math.max(firstIndex, lastIndex);
      while (nodes[lastIndex].end < end) lastIndex++;
      const first = nodes[firstIndex], last = nodes[lastIndex];
      const range = root.ownerDocument.createRange();
      range.setStart(first.node, start - first.start);
      range.setEnd(last.node, end - last.start);
      ranges.push(range);
    }
    text = ''; nodes = [];
  };
  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const value = node.textContent ?? '';
      if (value) { nodes.push({ node: node as Text, start: text.length, end: text.length + value.length }); text += value; }
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (node.matches('script,style,button,input,textarea,select,[hidden],[aria-hidden="true"],[data-floe-text-search-exclude]')) { flush(); return; }
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden') return;
    const boundary = !['inline', 'contents'].includes(style.display) || node.tagName === 'BR';
    if (boundary) flush();
    node.childNodes.forEach(visit);
    if (boundary) flush();
  };
  root.childNodes.forEach(visit); flush();
  return ranges;
}

export interface TextSearchOptions {
  content?: Accessor<HTMLElement | undefined>;
  /** External document engines retain ownership of indexing, navigation and highlights. */
  engine?: {
    state: Accessor<{ current: number; total: number }>;
    search: (query: string, direction: -1 | 0 | 1) => void;
    clear: () => void;
  };
  viewport?: Accessor<HTMLElement | undefined>;
  active?: Accessor<boolean>;
  identity?: Accessor<unknown>;
}

export function createTextSearch(options: TextSearchOptions) {
  const [open, setOpen] = createSignal(false);
  const [query, setQuery] = createSignal('');
  const [ranges, setRanges] = createSignal<Range[]>([]);
  const [index, setIndex] = createSignal(0);
  const [revision, setRevision] = createSignal(0);
  const name = 'floe-find-' + createUniqueId().replace(/[^a-zA-Z0-9-]/g, '');
  let input: HTMLInputElement | undefined;
  let returnFocus: HTMLElement | undefined;
  let scheduled = 0;
  let style: HTMLStyleElement | undefined;
  const identity = () => options.identity?.();
  const active = () => options.active?.() !== false;
  const clear = () => { globalThis.CSS?.highlights?.delete(name); globalThis.CSS?.highlights?.delete(name + '-current'); };
  const reveal = (range: Range | undefined) => {
    const viewport = options.viewport?.() ?? options.content?.();
    if (!range || !viewport || !active()) return;
    const bounds = viewport.getBoundingClientRect(), match = range.getBoundingClientRect();
    const scaleX = bounds.width / viewport.offsetWidth || 1, scaleY = bounds.height / viewport.offsetHeight || 1;
    if (match.top < bounds.top + 8 || match.bottom > bounds.bottom - 8) viewport.scrollTop += (match.top - bounds.top - bounds.height / 2) / scaleY;
    if (match.left < bounds.left || match.right > bounds.right) viewport.scrollLeft += (match.left - bounds.left - bounds.width / 2) / scaleX;
  };
  const close = () => {
    setOpen(false); clear(); options.engine?.clear();
    if (active() && returnFocus?.isConnected && !returnFocus.closest('[inert]')) returnFocus.focus({ preventScroll: true });
  };
  const show = (trigger?: HTMLElement) => {
    if (!active()) return;
    if (!open()) returnFocus = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : undefined);
    setOpen(true); queueMicrotask(() => { if (untrack(open) && untrack(active) && input?.isConnected) { input.focus(); input.select(); } });
  };
  const move = (delta: -1 | 1) => {
    if (options.engine) { if (active()) options.engine.search(query(), delta); return; }
    const count = ranges().length;
    if (count) setIndex(value => (value + delta + count) % count);
  };
  createEffect(() => {
    identity();
    batch(() => { setOpen(false); setQuery(''); setIndex(0); });
  });
  createEffect(() => {
    if (!options.engine) return;
    if (open() && active()) options.engine.search(query(), 0);
    else options.engine.clear();
  });
  createEffect(() => {
    const root = options.content?.();
    if (!root || !open() || !active()) return;
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(scheduled); scheduled = requestAnimationFrame(() => setRevision(value => value + 1));
    });
    observer.observe(root, { childList: true, characterData: true, subtree: true });
    onCleanup(() => { observer.disconnect(); cancelAnimationFrame(scheduled); });
  });
  createEffect(() => {
    const root = options.content?.(); void revision();
    const term = query();
    if (!open() || !active()) return;
    const matches = root ? findTextRanges(root, term) : [];
    batch(() => { setRanges(matches); setIndex(value => Math.min(value, Math.max(0, matches.length - 1))); });
  });
  createEffect(on(query, () => setIndex(0)));
  createEffect(() => {
    clear();
    const matches = ranges(), current = matches[index()];
    if (!open() || !active()) return;
    if (typeof Highlight !== 'undefined' && CSS.highlights) {
      if (!style) {
        style = document.createElement('style');
        style.textContent = `::highlight(${name}){background:color-mix(in srgb,var(--warning,#eab308) 35%,transparent);color:inherit}::highlight(${name}-current){background:var(--primary,#2563eb);color:var(--primary-foreground,#fff)}`;
        document.head.append(style);
      }
      const all = new Highlight(); matches.forEach(range => all.add(range));
      CSS.highlights.set(name, all);
      if (current) { const selected = new Highlight(current); selected.priority = 1; CSS.highlights.set(name + '-current', selected); }
    }
    reveal(current);
  });
  onCleanup(() => { clear(); options.engine?.clear(); style?.remove(); cancelAnimationFrame(scheduled); });
  return { open, query, setQuery, show, close, next: () => move(1), previous: () => move(-1),
    count: () => options.engine?.state().total ?? ranges().length, current: () => options.engine?.state().current ?? (ranges().length ? index() + 1 : 0),
    bindInput: (element: HTMLInputElement) => { input = element; },
    onKeyDown: (event: KeyboardEvent) => {
      if (!active() || event.isComposing || event.defaultPrevented) return;
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'f') { event.preventDefault(); event.stopPropagation(); show(); }
      else if (open() && event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
      else if (open() && event.target === input && event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); move(event.shiftKey ? -1 : 1); }
    },
  };
}
export type TextSearchController = ReturnType<typeof createTextSearch>;
