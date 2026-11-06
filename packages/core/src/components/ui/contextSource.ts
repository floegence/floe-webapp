export interface ContextSource<T> {
  id: string;
  element: HTMLElement;
  read: () => T;
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
  let active: ContextSource<T> | undefined;
  let selection = '';
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
    let result: ContextSource<T> | undefined;
    for (const source of sources.values()) {
      if (
        source.element.isConnected &&
        source.element.contains(target) &&
        (!result || result.element.contains(source.element))
      )
        result = source;
    }
    return result;
  };
  const activate = (source: ContextSource<T> | undefined) => {
    if (!source?.element.isConnected) return;
    if (source !== active) selection = '';
    active = source;
    selection = readSelection(source);
  };
  const onInteraction = (event: Event) => {
    // Preserve selection before an outside control takes focus.
    if (active && active.element.contains(doc.activeElement)) selection = readSelection(active);
    activate(resolve(event.target));
  };
  const onSelection = () => {
    if (active && active.element.contains(doc.activeElement)) selection = readSelection(active);
  };
  doc.addEventListener('pointerdown', onInteraction, true);
  doc.addEventListener('focusin', onInteraction, true);
  doc.addEventListener('selectionchange', onSelection);
  return {
    register(source: ContextSource<T>): () => void {
      sources.set(source.id, source);
      return () => {
        if (sources.get(source.id) === source) sources.delete(source.id);
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
      const source = (target ? resolve(target) : undefined) ?? active;
      if (!source?.element.isConnected || sources.get(source.id) !== source) return undefined;
      const rect = source.element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return undefined;
      return {
        id: source.id,
        element: source.element,
        value: source.read(),
        selection: readSelection(source) || (source === active ? selection : ''),
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      };
    },
    dispose(): void {
      doc.removeEventListener('pointerdown', onInteraction, true);
      doc.removeEventListener('focusin', onInteraction, true);
      doc.removeEventListener('selectionchange', onSelection);
      sources.clear();
      active = undefined;
      selection = '';
    },
  };
}
