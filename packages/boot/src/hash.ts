export function base64UrlToBase64(s: string): string {
  let out = String(s ?? '').replace(/-/g, '+').replace(/_/g, '/');
  while (out.length % 4 !== 0) out += '=';
  return out;
}

export function parseHashParam(key: string): string | null {
  const normalizedKey = String(key ?? '').trim();
  if (!normalizedKey) return null;

  const rawHash = String(window.location.hash ?? '').trim();
  const fragment = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash;
  if (!fragment) return null;

  try {
    const params = new URLSearchParams(fragment);
    const value = String(params.get(normalizedKey) ?? '').trim();
    return value || null;
  } catch {
    return null;
  }
}

export function parseBase64UrlJsonFromHash<T>(key: string): T | null {
  const encoded = parseHashParam(key);
  if (!encoded) return null;

  try {
    const jsonText = atob(base64UrlToBase64(encoded));
    return (jsonText ? JSON.parse(jsonText) : null) as T;
  } catch {
    return null;
  }
}

export function clearLocationHash(): void {
  try {
    history.replaceState(null, document.title, window.location.pathname + window.location.search);
  } catch {
    // ignore
  }
}
