const STORAGE_PREFIX = 'floe-';

/**
 * Debounced save to localStorage
 */
const saveTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

export function debouncedSave<T>(key: string, value: T, delay = 300): void {
  if (typeof window === 'undefined') return;

  const fullKey = STORAGE_PREFIX + key;

  // Clear existing timeout
  const existing = saveTimeouts.get(fullKey);
  if (existing) clearTimeout(existing);

  // Set new timeout
  saveTimeouts.set(
    fullKey,
    setTimeout(() => {
      try {
        localStorage.setItem(fullKey, JSON.stringify(value));
        saveTimeouts.delete(fullKey);
      } catch (e) {
        console.warn(`Failed to save ${fullKey}:`, e);
      }
    }, delay)
  );
}

/**
 * Load from localStorage
 */
export function load<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;

  const fullKey = STORAGE_PREFIX + key;
  try {
    const stored = localStorage.getItem(fullKey);
    if (stored === null) return defaultValue;
    return JSON.parse(stored) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Save to localStorage immediately (non-debounced)
 */
export function save<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;

  const fullKey = STORAGE_PREFIX + key;
  try {
    localStorage.setItem(fullKey, JSON.stringify(value));
  } catch (e) {
    console.warn(`Failed to save ${fullKey}:`, e);
  }
}

/**
 * Remove from localStorage
 */
export function remove(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_PREFIX + key);
}

/**
 * Clear all Floe storage
 */
export function clearAll(): void {
  if (typeof window === 'undefined') return;

  const keys = Object.keys(localStorage).filter((k) => k.startsWith(STORAGE_PREFIX));
  keys.forEach((k) => localStorage.removeItem(k));
}
