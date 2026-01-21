/**
 * Keybind utilities for parsing and matching keyboard shortcuts
 */

export interface ParsedKeybind {
  mod: boolean; // Cmd on Mac, Ctrl on Windows/Linux
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  key: string;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

/**
 * Parse a keybind string like "mod+k" or "ctrl+shift+p"
 */
export function parseKeybind(keybind: string): ParsedKeybind {
  const parts = keybind.toLowerCase().split('+');
  const key = parts.pop() || '';

  return {
    mod: parts.includes('mod'),
    ctrl: parts.includes('ctrl'),
    alt: parts.includes('alt'),
    shift: parts.includes('shift'),
    key,
  };
}

/**
 * Check if a keyboard event matches a keybind
 */
export function matchKeybind(event: KeyboardEvent, keybind: string | ParsedKeybind): boolean {
  const parsed = typeof keybind === 'string' ? parseKeybind(keybind) : keybind;

  const modKey = isMac ? event.metaKey : event.ctrlKey;
  const key = event.key.toLowerCase();

  // Handle mod key (Cmd on Mac, Ctrl on Windows)
  if (parsed.mod && !modKey) return false;
  if (!parsed.mod && parsed.ctrl && !event.ctrlKey) return false;

  // Other modifiers
  if (parsed.alt && !event.altKey) return false;
  if (parsed.shift && !event.shiftKey) return false;

  // Key match
  return key === parsed.key;
}

/**
 * Format a keybind for display
 */
export function formatKeybind(keybind: string): string {
  const parsed = parseKeybind(keybind);
  const parts: string[] = [];

  if (parsed.mod) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (parsed.ctrl && !parsed.mod) {
    parts.push(isMac ? '⌃' : 'Ctrl');
  }
  if (parsed.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }
  if (parsed.shift) {
    parts.push(isMac ? '⇧' : 'Shift');
  }

  // Capitalize the key
  const displayKey = parsed.key.length === 1 ? parsed.key.toUpperCase() : capitalize(parsed.key);
  parts.push(displayKey);

  return parts.join(isMac ? '' : '+');
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
