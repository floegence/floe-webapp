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
