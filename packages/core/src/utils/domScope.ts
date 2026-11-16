/** Resolve the actual control while document listeners see a retargeted shadow host. */
export function composedEventTarget(event: Event): EventTarget | null {
  return event.composedPath()[0] ?? event.target;
}

export function deepActiveElement(root: Document | ShadowRoot): Element | null {
  let active = root.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}

export function composedParent(node: Node): Node | null {
  if (node instanceof Element && node.assignedSlot) return node.assignedSlot;
  return node.parentNode ?? (node instanceof ShadowRoot ? node.host : null);
}

export function composedContains(root: Node, target: EventTarget | null): boolean {
  if (typeof Node === 'undefined') return false;
  for (let node = target instanceof Node ? target : null; node; node = composedParent(node)) {
    if (node === root) return true;
  }
  return false;
}

export function composedClosest(target: EventTarget | null, selector: string): Element | null {
  if (typeof Node === 'undefined') return null;
  for (let node = target instanceof Node ? target : null; node; node = composedParent(node)) {
    if (node instanceof Element && node.matches(selector)) return node;
  }
  return null;
}
