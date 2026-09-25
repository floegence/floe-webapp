const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

/** Native editors that can request a software keyboard. */
export function isKeyboardEditingElement(element: Element | null): element is HTMLElement {
  if (!element || typeof (element as HTMLElement).focus !== 'function'
    || element.matches(':disabled, [readonly], [inputmode="none"]')) return false;
  return element.matches('textarea, input:not([type]), input[type="text"], input[type="search"], input[type="email"], input[type="url"], input[type="tel"], input[type="password"], input[type="number"], [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]');
}

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
