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

export function clearLocationHash(): void {
  try {
    history.replaceState(null, document.title, window.location.pathname + window.location.search);
  } catch {
    // ignore
  }
}
