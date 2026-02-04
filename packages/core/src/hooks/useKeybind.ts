import { onCleanup, onMount, type Accessor } from 'solid-js';
import { matchKeybind } from '../utils/keybind';
import { shouldIgnoreHotkeys } from '../utils/dom';

export interface UseKeybindOptions {
  /** Whether the listener is enabled (default: true). */
  enabled?: Accessor<boolean>;
  /**
   * Ignore hotkeys while typing in inputs/textareas/selects/contenteditable (default: true).
   * This prevents keybinds from breaking editors and text inputs.
   */
  ignoreWhenTyping?: boolean;
  /** Allow hotkeys within matching containers even while typing (opt-in). */
  allowWhenTypingWithin?: string;
  /** Whether to call preventDefault() when the keybind matches (default: true). */
  preventDefault?: boolean;
}

/**
 * Global keybind listener
 */
export function useKeybind(keybind: string, callback: () => void, options: UseKeybindOptions = {}): void {
  onMount(() => {
    if (typeof window === 'undefined') return;

    const enabled = options.enabled ?? (() => true);
    const preventDefault = options.preventDefault ?? true;
    const ignoreWhenTyping = options.ignoreWhenTyping ?? true;

    const handleKeydown = (e: KeyboardEvent) => {
      if (!enabled()) return;
      if (shouldIgnoreHotkeys(e, { ignoreWhenTyping, allowWhenTypingWithin: options.allowWhenTypingWithin })) {
        return;
      }
      if (matchKeybind(e, keybind)) {
        if (preventDefault) e.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handleKeydown);
    onCleanup(() => window.removeEventListener('keydown', handleKeydown));
  });
}
