const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

export function getFirstFocusableElement(root: ParentNode): HTMLElement | null {
  if (typeof HTMLElement === 'undefined') return null;
  const el = root.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
  return el instanceof HTMLElement ? el : null;
}

export function getFocusableElements(root: ParentNode): HTMLElement[] {
  if (typeof HTMLElement === 'undefined') return [];
  const out: HTMLElement[] = [];
  const nodes = root.querySelectorAll(FOCUSABLE_SELECTOR);
  for (const node of nodes) {
    if (node instanceof HTMLElement) out.push(node);
  }
  return out;
}

