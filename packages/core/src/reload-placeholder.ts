export interface ReloadPlaceholderOptions {
  /** Session-only presentation storage; never put resource data in this record. */
  storageKey: string;
  /** Optional session-storage identity to isolate navigation between environments. */
  scopeStorageKey?: string;
}

export interface ReloadPlaceholder {
  active(): boolean;
  /** Keep the matching content placeholder while the live shell becomes usable. */
  restrictTo(element: Element): void;
  finish(): void;
  /** Capture only anonymous geometry on pagehide, from the current authorized view. */
  arm(root: Element, surfaces: string): void;
  /** Explicit revocation discards the placeholder and its session record. */
  clear(): void;
}

declare global {
  interface Window { __floeReloadPlaceholder?: ReloadPlaceholder }
}

// This function is serialized into HTML. Keep all runtime dependencies inside it.
function installReloadPlaceholder(options: ReloadPlaceholderOptions): void {
  type Box = [number, number, number, number, number, string, string];
  type Layout = { version: 1; scope: string; width: number; height: number; background: string; boxes: Box[]; scroll: [string, number, number][] };
  const doc = document;
  const maxBytes = 48000;
  const maxBoxes = 240;
  const scope = () => options.scopeStorageKey ? sessionStorage.getItem(options.scopeStorageKey) ?? '' : '';
  const color = (value: unknown): value is string => typeof value === 'string' && value.length <= 120
    && !/[;{}<>\\]|url\(|var\(/i.test(value) && CSS.supports('color', value);
  let layer: HTMLDivElement | undefined;
  let root: Element | undefined;
  let surfaces = '';
  let restore: Layout | undefined;
  try {
    const text = sessionStorage.getItem(options.storageKey);
    const value = text && text.length <= maxBytes ? JSON.parse(text) as Layout : undefined;
    if (value?.version === 1 && value.scope === scope() && value.width === innerWidth && value.height === innerHeight
      && color(value.background) && Array.isArray(value.scroll) && value.scroll.length <= 12
      && value.scroll.every(entry => Array.isArray(entry) && entry.length === 3 && /^[a-z0-9-]{1,48}$/.test(entry[0])
        && entry.slice(1).every(number => typeof number === 'number' && Number.isFinite(number) && number >= 0 && number <= 10000000))
      && Array.isArray(value.boxes) && value.boxes.length > 0 && value.boxes.length <= maxBoxes
      && value.boxes.every(box => Array.isArray(box) && box.length === 7
        && box.slice(0, 5).every(number => typeof number === 'number' && Number.isFinite(number) && number >= 0 && number <= 20000)
        && color(box[5]) && color(box[6]))) restore = value;
  } catch { /* Storage failures cannot stop the application. */ }

  const mount = () => {
    if (!restore || !doc.body) return;
    layer = doc.createElement('div');
    layer.dataset.floeReloadPlaceholder = '';
    layer.setAttribute('aria-hidden', 'true');
    layer.inert = true;
    Object.assign(layer.style, { position: 'fixed', inset: '0', zIndex: '2147483000', overflow: 'hidden',
      backgroundColor: restore.background, pointerEvents: 'none', contain: 'strict' });
    for (const [x, y, width, height, radius, fill, border] of restore.boxes) {
      const box = doc.createElement('div');
      Object.assign(box.style, { position: 'absolute', left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${height}px`,
        borderRadius: `${radius}px`, backgroundColor: fill, border: `1px solid ${border}`, boxSizing: 'border-box' });
      layer.append(box);
    }
    doc.body.append(layer);
  };
  const pendingMount = new MutationObserver(() => { if (doc.body) { pendingMount.disconnect(); mount(); } });
  if (doc.body) mount(); else if (restore) pendingMount.observe(doc.documentElement, { childList: true });
  const finish = () => {
    pendingMount.disconnect();
    for (const [id, left, top] of restore?.scroll ?? []) {
      const element = doc.querySelector(`[data-floe-reload-scroll="${id}"]`);
      if (element) { element.scrollLeft = left; element.scrollTop = top; }
    }
    restore = undefined; layer?.remove(); layer = undefined;
  };
  const clear = () => {
    root = undefined;
    finish();
    try { sessionStorage.removeItem(options.storageKey); } catch { /* Best effort. */ }
  };

  const capture = () => {
    if (!root?.isConnected || layer) return;
    const boxes: Box[] = [];
    const background = getComputedStyle(doc.body).backgroundColor;
    if (!color(background)) return;
    const rect = (element: Element) => {
      const bounds = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return bounds.width && bounds.height && bounds.bottom > 0 && bounds.right > 0
        && bounds.top < innerHeight && bounds.left < innerWidth && style.visibility === 'visible' ? bounds : null;
    };
    const add = (bounds: DOMRect, fill: string, border = 'transparent', radius = 3) => {
      if (boxes.length >= maxBoxes || !color(fill) || !color(border)) return;
      const x = Math.max(0, bounds.x), y = Math.max(0, bounds.y);
      const width = Math.min(innerWidth, bounds.right) - x, height = Math.min(innerHeight, bounds.bottom) - y;
      if (width <= 0 || height <= 0) return;
      boxes.push([x, y, width, height, Math.max(0, Math.min(radius, 100)), fill, border]);
    };
    for (const element of root.querySelectorAll(surfaces)) {
      const bounds = rect(element);
      if (!bounds) continue;
      const style = getComputedStyle(element);
      add(bounds, style.backgroundColor, style.borderTopStyle === 'none' ? 'transparent' : style.borderTopColor, parseFloat(style.borderRadius) || 0);
    }
    const shade = getComputedStyle(root).color;
    // Alpha is applied to a resolved color, never to HTML, URLs, text or input values.
    const mask = color(shade) ? `color-mix(in srgb, ${shade} 9%, ${background})` : '#d4d4d4';
    for (const element of root.querySelectorAll('img,svg,input,textarea,canvas,video')) {
      const bounds = rect(element);
      if (bounds) add(bounds, mask, 'transparent', Math.min(bounds.height / 4, 8));
    }
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const range = doc.createRange();
    let node: Node | null;
    let visited = 0;
    while ((node = walker.nextNode()) && boxes.length < maxBoxes && visited++ < 12000) {
      const parent = node.parentElement;
      if (!parent || parent.closest('script,style,textarea,svg,[aria-hidden="true"]') || !rect(parent)) continue;
      range.selectNodeContents(node);
      for (const bounds of range.getClientRects()) {
        if (bounds.width < 2) continue;
        add(new DOMRect(bounds.x, bounds.y + bounds.height * .22, bounds.width, bounds.height * .56), mask);
      }
    }
    if (!boxes.length) return;
    try {
      const scroll: Layout['scroll'] = [];
      for (const element of root.querySelectorAll('[data-floe-reload-scroll]')) {
        const id = element.getAttribute('data-floe-reload-scroll')!;
        if (/^[a-z0-9-]{1,48}$/.test(id) && scroll.length < 12 && rect(element)) scroll.push([id, element.scrollLeft, element.scrollTop]);
      }
      const value: Layout = { version: 1, scope: scope(), width: innerWidth, height: innerHeight, background, boxes, scroll };
      const text = JSON.stringify(value);
      if (text.length <= maxBytes) sessionStorage.setItem(options.storageKey, text);
    } catch { /* A denied or full store does not interfere with document navigation. */ }
  };
  window.__floeReloadPlaceholder = {
    active: () => !!restore,
    restrictTo(element) {
      if (!layer) return;
      const box = element.getBoundingClientRect();
      layer.style.clipPath = `inset(${Math.max(0, box.top)}px ${Math.max(0, innerWidth - box.right)}px ${Math.max(0, innerHeight - box.bottom)}px ${Math.max(0, box.left)}px)`;
    },
    finish,
    arm(element, selector) { root = element; surfaces = selector; },
    clear,
  };
  window.addEventListener('pagehide', capture);
  window.addEventListener('resize', finish, { once: true });
  window.addEventListener('pageshow', event => { if (event.persisted) finish(); });
}

/** Insert before external scripts/styles. It restores anonymous layout, never cached facts. */
export function createReloadPlaceholderScript(options: ReloadPlaceholderOptions): string {
  const encoded = JSON.stringify(options).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
  return `;(${installReloadPlaceholder.toString()})(${encoded});`;
}

export function getReloadPlaceholder(): ReloadPlaceholder | undefined {
  return typeof window === 'undefined' ? undefined : window.__floeReloadPlaceholder;
}
