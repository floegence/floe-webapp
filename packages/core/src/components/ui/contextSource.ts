export interface ContextSource<T> {
  id: string;
  element: HTMLElement;
  read: (target?: EventTarget | null) => T;
  /** An unavailable inner owner remains a boundary; never substitute its parent. */
  enabled?: () => boolean;
  /** Navigation and chrome can be targets without becoming active reading sources. */
  activateOnInteraction?: boolean;
}

export interface ContextSourceSnapshot<T> {
  id: string;
  element: HTMLElement;
  value: T;
  selection: string;
  rect: Readonly<{ x: number; y: number; width: number; height: number }>;
}

/** Connection-local readers. Opening a menu or prompt never replaces its origin. */
export function createContextSourceRegistry<T>(doc: Document) {
  const sources = new Map<string, ContextSource<T>>();
  const elements = new WeakMap<Node, ContextSource<T>>();
  let active: ContextSource<T> | undefined;
  let selection = '';
  const available = (source: ContextSource<T>) =>
    source.enabled?.() !== false &&
    source.element.isConnected &&
    !source.element.closest('[hidden], [inert], [aria-hidden="true"]');
  const readSelection = (source: ContextSource<T>) => {
    const element = doc.activeElement;
    if (
      element &&
      source.element.contains(element) &&
      (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement)
    ) {
      if (element instanceof HTMLInputElement && element.type === 'password') return '';
      return element.value.slice(element.selectionStart ?? 0, element.selectionEnd ?? 0);
    }
    const selected = doc.getSelection();
    return selected?.anchorNode &&
      selected.focusNode &&
      source.element.contains(selected.anchorNode) &&
      source.element.contains(selected.focusNode)
      ? selected.toString()
      : '';
  };
  const resolve = (target: EventTarget | null) => {
    if (!(target instanceof Node)) return undefined;
    let node: Node | null = target;
    while (node) {
      const source = elements.get(node);
      if (source) return source;
      node = node.parentNode ?? (node instanceof ShadowRoot ? node.host : null);
    }
    return undefined;
  };
  const activate = (source: ContextSource<T> | undefined) => {
    if (!source || !available(source)) return;
    if (source !== active) selection = '';
    active = source;
    selection = readSelection(source);
  };
  const onInteraction = (event: Event) => {
    // Preserve selection before an outside control takes focus.
    if (active) {
      const current = readSelection(active);
      if (current || active.element.contains(doc.activeElement)) selection = current;
    }
    const source = resolve(event.composedPath()[0] ?? event.target);
    if (source?.activateOnInteraction !== false) activate(source);
  };
  const onSelection = () => {
    if (!active) return;
    const current = readSelection(active);
    if (current || active.element.contains(doc.activeElement) || doc.activeElement === doc.body)
      selection = current;
  };
  doc.addEventListener('pointerdown', onInteraction, true);
  doc.addEventListener('focusin', onInteraction, true);
  doc.addEventListener('selectionchange', onSelection);
  return {
    register(source: ContextSource<T>): () => void {
      const previous = sources.get(source.id);
      if (previous && elements.get(previous.element) === previous)
        elements.delete(previous.element);
      sources.set(source.id, source);
      elements.set(source.element, source);
      return () => {
        if (sources.get(source.id) === source) sources.delete(source.id);
        if (elements.get(source.element) === source) elements.delete(source.element);
        if (active === source) {
          active = undefined;
          selection = '';
        }
      };
    },
    /** Hosts may forward activation from their authenticated embedded channel. */
    activate(id: string): void {
      activate(sources.get(id));
    },
    capture(target?: EventTarget | null): ContextSourceSnapshot<T> | undefined {
      const source = target ? resolve(target) : active;
      if (!source || !available(source) || sources.get(source.id) !== source) return undefined;
      const rect = source.element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return undefined;
      return {
        id: source.id,
        element: source.element,
        value: source.read(target),
        selection: readSelection(source) || (source === active ? selection : ''),
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      };
    },
    /** Explicit-target capture never inherits an unrelated or cached selection. */
    captureTarget(target: EventTarget, selectedText = ''): ContextSourceSnapshot<T> | undefined {
      const source = resolve(target);
      if (!source || !available(source) || sources.get(source.id) !== source) return undefined;
      const rect = source.element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return undefined;
      return {
        id: source.id,
        element: source.element,
        value: source.read(target),
        selection: (() => {
          const selected = doc.getSelection();
          // Native selections spanning sibling owners are not owned by this target.
          // Explicit editor adapters can supply a model selection without a DOM range.
          if (
            selectedText &&
            selected?.toString() === selectedText &&
            selected.anchorNode &&
            selected.focusNode &&
            (resolve(selected.anchorNode) !== source || resolve(selected.focusNode) !== source)
          )
            return '';
          return selectedText;
        })(),
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      };
    },
    dispose(): void {
      doc.removeEventListener('pointerdown', onInteraction, true);
      doc.removeEventListener('focusin', onInteraction, true);
      doc.removeEventListener('selectionchange', onSelection);
      for (const source of sources.values()) elements.delete(source.element);
      sources.clear();
      active = undefined;
      selection = '';
    },
  };
}
