export interface ShouldIgnoreHotkeysOptions {
  ignoreWhenTyping?: boolean;
  /**
   * Allow hotkeys when the typing element is within a matching container.
   * Useful for opt-in areas like code editors.
   */
  allowWhenTypingWithin?: string;
}

export function isTypingElement(el: Element | null): boolean {
  if (!el) return false;
  // SSR / non-DOM environments.
  if (typeof HTMLElement === 'undefined') return false;
  if (!(el instanceof HTMLElement)) return false;

  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (el.isContentEditable) return true;
  // Some editors use role="textbox" on non-input elements.
  if (el.getAttribute('role') === 'textbox') return true;
  return false;
}

export function shouldIgnoreHotkeys(e: KeyboardEvent, options: ShouldIgnoreHotkeysOptions = {}): boolean {
  const { ignoreWhenTyping = false, allowWhenTypingWithin } = options;
  if (!ignoreWhenTyping) return false;

  const el =
    (e.target as Element | null) ??
    (typeof document !== 'undefined' ? document.activeElement : null);

  if (!isTypingElement(el)) return false;

  if (allowWhenTypingWithin && el instanceof Element && el.closest(allowWhenTypingWithin)) {
    return false;
  }

  return true;
}

