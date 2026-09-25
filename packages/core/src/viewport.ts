/** Framework-independent visible bounds, in getBoundingClientRect CSS pixels. */
export interface ViewportRect {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

export interface ViewportInsets { top: number; right: number; bottom: number; left: number }

export interface ViewportSnapshot {
  visible: ViewportRect;
  /** Dynamic browser content size before soft-keyboard occlusion. */
  layout: { width: number; height: number };
  safeArea: ViewportInsets;
  keyboardOpen: boolean;
  /** Add to client coordinates before dividing by fixedScale for document-level fixed CSS. */
  fixedOffset: { left: number; top: number };
  /** Effective CSS zoom inherited by a document-body portal. Client bounds stay unscaled. */
  fixedScale: number;
}

export interface ViewportSource {
  width: number;
  height: number;
  fixedOrigin?: { left: number; top: number };
  fixedScale?: number;
  visualViewport?: {
    width: number; height: number; offsetLeft: number; offsetTop: number; scale?: number;
  } | null;
  safeArea: ViewportInsets;
  editing: boolean;
  touch: boolean;
}

const dimension = (value: number | undefined, fallback: number) =>
  Number.isFinite(value) && Number(value) > 0 ? Number(value) : Math.max(0, fallback);

export function resolveViewportSnapshot(source: ViewportSource, previous?: ViewportSnapshot): ViewportSnapshot {
  const visual = source.visualViewport;
  const width = dimension(visual?.width, source.width);
  const normalZoom = Math.abs((visual?.scale ?? 1) - 1) < 0.01;
  const sameLayout = previous?.layout.width === source.width && previous.layout.height === source.height;
  // A native focus pan changes innerHeight independently of the keyboard. Only
  // visual bounds measure occlusion; invalid animation samples retain the last
  // visible height until the browser provides another valid measurement.
  const height = dimension(visual?.height, sameLayout ? previous.visible.height : source.height);
  const origin = source.fixedOrigin ?? { left: 0, top: 0 };
  // Safari can pan fixed surfaces before publishing the matching visual offset.
  // Clamp after converting to client coordinates: clamping the offset alone
  // admits a negative visible origin and moves the entire app off screen.
  const left = Math.max(0, (visual?.offsetLeft || 0) + origin.left);
  const top = Math.max(0, (visual?.offsetTop || 0) + origin.top);
  // Browser chrome changes dvh too. Focus alone (e.g. a hardware keyboard),
  // accessory bars, and pinch zoom are not evidence of a soft keyboard.
  // Focusout precedes the keyboard's closing animation. Keep keyboard chrome
  // hidden until the measured occlusion ends, without retaining editor focus.
  const keyboardOpen = source.touch && (source.editing || (sameLayout && previous.keyboardOpen)) && normalZoom
    && source.height - height > 100;
  return {
    visible: { left, top, width, height, right: left + width, bottom: top + height },
    layout: { width: source.width, height: source.height },
    safeArea: { ...source.safeArea, bottom: keyboardOpen ? 0 : source.safeArea.bottom },
    keyboardOpen,
    fixedOffset: { left: -origin.left, top: -origin.top },
    fixedScale: dimension(source.fixedScale, 1),
  };
}

function editableFocus(document: Document): boolean {
  let element = document.activeElement;
  while (element?.shadowRoot?.activeElement) element = element.shadowRoot.activeElement;
  if (!element || element.matches('[disabled], [readonly], [inputmode="none"]')) return false;
  return element.matches('textarea, input:not([type]), input[type="text"], input[type="search"], input[type="email"], input[type="url"], input[type="tel"], input[type="password"], input[type="number"], [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]');
}

function createProbe(view: Window): HTMLElement {
  const probe = view.document.createElement('div');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100dvh;visibility:hidden;pointer-events:none;box-sizing:border-box;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
  view.document.documentElement.append(probe);
  return probe;
}

function measure(view: Window, probe: HTMLElement, previous?: ViewportSnapshot): ViewportSnapshot {
  const rect = probe.getBoundingClientRect();
  const css = view.getComputedStyle(probe);
  const inset = (value: string) => Math.max(0, Number.parseFloat(value) || 0);
  const zoom = (element: Element | null) => element
    ? dimension(Number.parseFloat(view.getComputedStyle(element).zoom), 1) : 1;
  const rootZoom = zoom(view.document.documentElement);
  return resolveViewportSnapshot({
    width: rect.width || view.innerWidth,
    height: rect.height / rootZoom || view.innerHeight,
    visualViewport: view.visualViewport,
    fixedOrigin: { left: rect.left, top: rect.top },
    fixedScale: rootZoom * zoom(view.document.body),
    safeArea: { top: inset(css.paddingTop), right: inset(css.paddingRight), bottom: inset(css.paddingBottom), left: inset(css.paddingLeft) },
    editing: editableFocus(view.document),
    touch: view.matchMedia?.('(any-pointer: coarse)').matches ?? false,
  }, previous);
}

type Observer = { snapshot: ViewportSnapshot; listeners: Set<(snapshot: ViewportSnapshot) => void>; dispose: () => void };
const observers = new WeakMap<Window, Observer>();

export function readViewportSnapshot(view: Window): ViewportSnapshot {
  const observer = observers.get(view);
  if (observer) return observer.snapshot;
  const probe = createProbe(view);
  try { return measure(view, probe); } finally { probe.remove(); }
}

/** One event-driven measurement owner per Window; releasing the last subscription removes it. */
export function observeViewport(view: Window, listener: (snapshot: ViewportSnapshot) => void): () => void {
  let observer = observers.get(view);
  if (!observer) {
    const probe = createProbe(view);
    let frame = 0;
    let contractionTimer = 0;
    let contraction: ViewportSnapshot | undefined;
    const listeners = new Set<(snapshot: ViewportSnapshot) => void>();
    const current: Observer = { snapshot: measure(view, probe), listeners, dispose: () => {} };
    const publish = () => {
      if (frame) return;
      frame = view.requestAnimationFrame(() => {
        frame = 0;
        for (const notify of listeners) notify(current.snapshot);
      });
    };
    const cancelContraction = () => {
      if (contractionTimer) view.clearTimeout(contractionTimer);
      contractionTimer = 0;
      contraction = undefined;
    };
    const schedule = () => {
      // Measure at the event, not the next frame: native Safari can report the
      // correct keyboard height and a second clipping resize within one frame.
      const next = measure(view, probe, current.snapshot);
      const previous = current.snapshot;
      const contractsKeyboard = next.keyboardOpen && previous.keyboardOpen
        && next.layout.width === previous.layout.width && next.layout.height === previous.layout.height
        && next.visible.height < previous.visible.height;
      if (contractsKeyboard) {
        const sameHeight = contraction?.visible.height === next.visible.height;
        contraction = next;
        if (sameHeight) return;
        if (contractionTimer) view.clearTimeout(contractionTimer);
        // Real touch produced a false 294 -> 65 -> 294px contraction lasting
        // 50ms. Require 100ms of stable height for an additional contraction;
        // initial opening, expansion, dismissal, rotation and zoom stay immediate.
        // This also permits a real keyboard mode change instead of keeping a
        // permanent height floor. No polling or focus manipulation is involved.
        contractionTimer = view.setTimeout(() => {
          contractionTimer = 0;
          if (!contraction) return;
          current.snapshot = contraction;
          contraction = undefined;
          publish();
        }, 100);
        return;
      }
      cancelContraction();
      current.snapshot = next;
      publish();
    };
    const targets: [EventTarget, string][] = [
      [view, 'resize'], [view, 'scroll'], [view, 'orientationchange'],
      [view.document, 'focusin'], [view.document, 'focusout'],
    ];
    if (view.visualViewport) targets.push([view.visualViewport, 'resize'], [view.visualViewport, 'scroll']);
    for (const [target, event] of targets) target.addEventListener(event, schedule);
    // CSS zoom can change without a viewport resize. Observe only document roots,
    // not content mutations or floating geometry writes.
    const zoomObserver = new MutationObserver(schedule);
    for (const root of [view.document.documentElement, view.document.body]) {
      if (root) zoomObserver.observe(root, { attributes: true, attributeFilter: ['class', 'style'] });
    }
    current.dispose = () => {
      for (const [target, event] of targets) target.removeEventListener(event, schedule);
      zoomObserver.disconnect();
      if (frame) view.cancelAnimationFrame(frame);
      cancelContraction();
      probe.remove();
      observers.delete(view);
    };
    observers.set(view, current);
    observer = current;
  }
  observer.listeners.add(listener);
  listener(observer.snapshot);
  const current = observer;
  return () => {
    current.listeners.delete(listener);
    if (current.listeners.size === 0) current.dispose();
  };
}

/** Apply to one top-level application container, not nested content surfaces. */
export function viewportStyle(snapshot: ViewportSnapshot): Record<string, string> {
  const { visible, fixedScale } = snapshot;
  return { position: 'fixed', left: `${(visible.left + snapshot.fixedOffset.left) / fixedScale}px`, top: `${(visible.top + snapshot.fixedOffset.top) / fixedScale}px`,
    width: `${visible.width / fixedScale}px`, height: `${visible.height / fixedScale}px` };
}
