import { untrack, createSignal, onCleanup, onMount, type JSX } from 'solid-js';
import { observeViewport, viewportStyle, type ViewportSnapshot } from '../../viewport';

export interface AppViewportProps {
  children: JSX.Element;
  class?: string;
  onViewportChange?: (viewport: ViewportSnapshot) => void;
}

/** A stable document-level host that follows browser chrome and the soft keyboard. */
export function AppViewport(props: AppViewportProps) {
  const [viewport, setViewport] = createSignal<ViewportSnapshot>();
  let root: HTMLDivElement | undefined;
  onMount(() => {
    const view = root?.ownerDocument.defaultView;
    if (!view) return;
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
      ...(viewport() ? viewportStyle(viewport()!) : { height: '100dvh' }) }}>
    {props.children}
  </div>;
}
