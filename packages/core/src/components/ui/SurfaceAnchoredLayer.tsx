import { Show, createEffect, createSignal, onCleanup, onMount, type JSX } from 'solid-js';
import { SurfaceFloatingLayer } from './SurfaceFloatingLayer';
import { resolveSurfacePortalHost } from './surfacePortalScope';
import { resolveFloatingBoundary } from './surfaceFloatingBoundary';

export interface SurfaceAnchoredLayerProps {
  anchor: HTMLElement | undefined;
  /** Changes when the anchor moves through a transform; no idle polling is used. */
  revision?: unknown;
  children: JSX.Element;
  class?: string;
}

/** Object-attached tools remain in screen pixels within the owning surface. */
export function SurfaceAnchoredLayer(props: SurfaceAnchoredLayerProps) {
  const [mounted, setMounted] = createSignal(false);
  const [position, setPosition] = createSignal({ x: 0, y: 0 });
  const [visible, setVisible] = createSignal(false);
  const [width, setWidth] = createSignal(480);
  let panel: HTMLDivElement | undefined;
  let frame: number | undefined;
  const measure = () => {
    frame = undefined;
    const anchor = props.anchor;
    if (!anchor || !panel) return;
    const bounds = resolveFloatingBoundary(resolveSurfacePortalHost({ owner: anchor }));
    if (!bounds) {
      setVisible(false);
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const maxWidth = Math.max(120, bounds.width - 24);
    setWidth(maxWidth);
    const size = panel.getBoundingClientRect();
    const x = Math.max(bounds.left + 12, Math.min(rect.left, bounds.right - size.width - 12));
    const above = rect.top - size.height - 12;
    const y =
      above >= bounds.top + 12
        ? above
        : Math.max(bounds.top + 12, Math.min(rect.bottom + 12, bounds.bottom - size.height - 12));
    setPosition({ x, y });
    setVisible(
      rect.right > bounds.left &&
        rect.left < bounds.right &&
        rect.bottom > bounds.top &&
        rect.top < bounds.bottom
    );
  };
  const schedule = () => {
    if (frame === undefined && typeof requestAnimationFrame === 'function')
      frame = requestAnimationFrame(measure);
  };
  createEffect(() => {
    void props.anchor;
    void props.revision;
    schedule();
  });
  onMount(() => {
    setMounted(true);
    const observer =
      typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : undefined;
    if (panel) observer?.observe(panel);
    const boundary = resolveSurfacePortalHost({ owner: props.anchor }).boundaryHost;
    if (boundary) observer?.observe(boundary);
    // Canvas movement is a transform on an ancestor in the world compositor.
    const transforms = new MutationObserver(schedule);
    let ancestor = props.anchor?.parentElement;
    while (ancestor) {
      transforms.observe(ancestor, { attributes: true, attributeFilter: ['style'] });
      if (ancestor === boundary) break;
      ancestor = ancestor.parentElement;
    }
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    schedule();
    onCleanup(() => {
      observer?.disconnect();
      transforms.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
    });
  });
  onCleanup(() => {
    if (frame !== undefined) cancelAnimationFrame(frame);
  });
  return (
    <Show when={mounted() && props.anchor}>
      <SurfaceFloatingLayer
        owner={props.anchor}
        position={position()}
        class={props.class}
        style={{
          visibility: visible() ? 'visible' : 'hidden',
          'max-width': `${width()}px`,
          'z-index': 60,
        }}
        layerRef={(node) => {
          panel = node;
          schedule();
        }}
      >
        {props.children}
      </SurfaceFloatingLayer>
    </Show>
  );
}
