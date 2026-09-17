import { Show, createEffect, createSignal, onCleanup, onMount, type JSX } from 'solid-js';
import { SurfaceFloatingLayer } from './SurfaceFloatingLayer';
import { resolveSurfacePortalHost } from './surfacePortalScope';
import { resolveFloatingBoundary } from './surfaceFloatingBoundary';

export interface SurfaceAnchoredLayerProps {
  anchor: HTMLElement | undefined;
  /** Changes when the anchor moves through a transform; no idle polling is used. */
  revision?: unknown;
  /** Screen-space clearance above labels outside the object bounds. */
  topOffset?: number;
  /** Preferred clearance for surface navigation; object visibility takes priority. */
  reservedSpace?: { top: number; narrowTop?: number; bottom: number };
  children: JSX.Element;
  class?: string;
}

/** Object-attached tools remain in screen pixels within the owning surface. */
export function SurfaceAnchoredLayer(props: SurfaceAnchoredLayerProps) {
  const [mounted, setMounted] = createSignal(false);
  const [position, setPosition] = createSignal({ x: 0, y: 0 });
  const [placement, setPlacement] = createSignal('above');
  const [visible, setVisible] = createSignal(false);
  const [width, setWidth] = createSignal(480);
  const [panel, setPanel] = createSignal<HTMLDivElement>();
  let frame: number | undefined;
  const measure = () => {
    frame = undefined;
    const anchor = props.anchor;
    const panelElement = panel();
    if (!anchor || !panelElement) return;
    const bounds = resolveFloatingBoundary(resolveSurfacePortalHost({ owner: anchor }));
    if (!bounds) {
      setVisible(false);
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const maxWidth = Math.max(120, bounds.width - 24);
    setWidth(maxWidth);
    const size = panelElement.getBoundingClientRect();
    const center = (Math.max(bounds.left, rect.left) + Math.min(bounds.right, rect.right)) / 2;
    let x = Math.max(
      bounds.left + 12,
      Math.min(center - size.width / 2, bounds.right - size.width - 12)
    );
    const top = rect.top - (props.topOffset ?? 0);
    const above = top - size.height - 12;
    const padding = props.reservedSpace;
    const minY =
      bounds.top +
      (window.matchMedia('(max-width:760px)').matches
        ? (padding?.narrowTop ?? padding?.top ?? 12)
        : (padding?.top ?? 12));
    const maxY = Math.max(minY, bounds.bottom - (padding?.bottom ?? 12) - size.height);
    const clampY = (value: number) => Math.max(minY, Math.min(value, maxY));
    let y = above;
    let side = 'above';
    if (above < minY) {
      if (rect.bottom + 12 <= maxY) {
        y = rect.bottom + 12;
        side = 'below';
      } else if (above >= bounds.top + 12) {
        side = 'above';
      } else if (rect.bottom + size.height + 12 <= bounds.bottom - 12) {
        y = rect.bottom + 12;
        side = 'below';
      } else if (rect.right + size.width + 24 <= bounds.right) {
        x = rect.right + 12;
        y = clampY(top);
        side = 'right';
      } else if (rect.left - size.width - 24 >= bounds.left) {
        x = rect.left - size.width - 12;
        y = clampY(top);
        side = 'left';
      } else {
        y = clampY(above);
        side = 'edge';
      }
    } else y = Math.min(y, maxY);
    setPlacement(side);
    setPosition({ x: Math.round(x), y: Math.round(y) });
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
    void props.topOffset;
    void props.reservedSpace;
    schedule();
  });
  createEffect(() => {
    const element = panel();
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    onCleanup(() => observer.disconnect());
  });
  onMount(() => {
    setMounted(true);
    const observer =
      typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : undefined;

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
        data-placement={placement()}
        inert={!visible()}
        style={{
          visibility: visible() ? 'visible' : 'hidden',
          'max-width': `${width()}px`,
          'z-index': 60,
        }}
        layerRef={(node) => {
          setPanel(node);
          schedule();
        }}
      >
        {props.children}
      </SurfaceFloatingLayer>
    </Show>
  );
}
