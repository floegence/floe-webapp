import { untrack, createSignal, onCleanup, onMount, type JSX } from 'solid-js';
import { observeViewport, viewportStyle, type ViewportSnapshot } from '../../viewport';
import { isKeyboardEditingElement } from '../../utils/focus';

export interface AppViewportProps {
  children: JSX.Element;
  class?: string;
  onViewportChange?: (viewport: ViewportSnapshot) => void;
}

/** A stable document-level host that follows browser chrome and the soft keyboard. */
export function AppViewport(props: AppViewportProps) {
  const [viewport, setViewport] = createSignal<ViewportSnapshot>();
  let root: HTMLDivElement | undefined;
  const applicationStyle = () => {
    const snapshot = viewport();
    if (!snapshot) return { height: '100dvh' };
    const style = viewportStyle(snapshot);
    const scale = root?.ownerDocument.defaultView?.visualViewport?.scale ?? 1;
    // The document origin is owned below. Reapplying Safari's delayed visual
    // offset after normalizing native scroll would move the application twice.
    return Math.abs(scale - 1) < 0.01 ? { ...style, left: '0px', top: '0px' } : style;
  };
  onMount(() => {
    const view = root?.ownerDocument.defaultView;
    if (!view) return;
    const focusPointerEditor = (event: MouseEvent) => {
      if (event.button !== 0 || event.defaultPrevented
        || !view.matchMedia('(any-pointer: coarse)').matches
        || Math.abs((view.visualViewport?.scale ?? 1) - 1) >= 0.01) return;
      const target = event.target;
      if (!(target instanceof Element) || !isKeyboardEditingElement(target)
        || target.matches(':focus') || target.closest('[inert]')) return;
      // Safari's default focus pans the document before viewport events arrive.
      // Touch compatibility mousedown occurs after the finger is released, so
      // acquiring the same editor here avoids both native panning and moving the
      // click target mid-gesture. Body portals share this document ownership.
      // Keep the default action for native caret placement.
      target.focus({ preventScroll: true });
    };
    view.document.addEventListener('mousedown', focusPointerEditor);
    // This document-level host owns the viewport; reading scroll belongs to
    // its children. Safari can retain a native focus pan and under-report the
    // keyboard viewport until the document returns to its origin. Translating
    // the host alone leaves that stale viewport (and a blank strip) in place.
    const restoreDocumentOrigin = () => {
      if (Math.abs((view.visualViewport?.scale ?? 1) - 1) >= 0.01) return;
      if (view.scrollX || view.scrollY) view.scrollTo({ left: 0, top: 0, behavior: 'instant' });
    };
    view.addEventListener('scroll', restoreDocumentOrigin);
    view.visualViewport?.addEventListener('resize', restoreDocumentOrigin);
    restoreDocumentOrigin();
    onCleanup(() => {
      view.document.removeEventListener('mousedown', focusPointerEditor);
      view.removeEventListener('scroll', restoreDocumentOrigin);
      view.visualViewport?.removeEventListener('resize', restoreDocumentOrigin);
    });
    onCleanup(observeViewport(view, (snapshot) => {
      setViewport(snapshot);
      untrack(() => props.onViewportChange?.(snapshot));
    }));
  });
  return <div ref={root} class={props.class} data-floe-app-viewport=""
    data-keyboard-open={viewport()?.keyboardOpen || undefined}
    style={{ position: 'fixed', inset: '0', overflow: 'hidden', 'min-height': '0',
      ...applicationStyle() }}>
    {props.children}
  </div>;
}
