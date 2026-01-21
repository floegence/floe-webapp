import { onCleanup, onMount } from 'solid-js';
import { matchKeybind } from '../utils/keybind';

/**
 * Global keybind listener
 */
export function useKeybind(keybind: string, callback: () => void): void {
  onMount(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (matchKeybind(e, keybind)) {
        e.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handleKeydown);
    onCleanup(() => window.removeEventListener('keydown', handleKeydown));
  });
}
