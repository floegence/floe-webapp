import {
  Show,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  splitProps,
  type JSX,
} from 'solid-js';
import { SurfaceFloatingLayer } from './SurfaceFloatingLayer';
import { resolveSurfacePortalHost } from './surfacePortalScope';
import { resolveFloatingBoundary } from './surfaceFloatingBoundary';
import { observeViewport } from '../../viewport';

export interface SurfaceAnchoredLayerProps extends Omit<
  JSX.HTMLAttributes<HTMLDivElement>,
  'children' | 'class' | 'style' | 'ref'
> {
  anchor: HTMLElement | undefined;
  /** Changes when the anchor moves through a transform; no idle polling is used. */
  revision?: unknown;
  /** Screen-space clearance above labels outside the object bounds. */
  topOffset?: number;
  /** Preferred clearance for surface navigation; object visibility takes priority. */
  reservedSpace?: { top: number; narrowTop?: number; bottom: number };
  /** Auto places object tools above/below; side panels prefer the requested side and flip when needed. */
  placement?: 'auto' | 'right' | 'left';
  gap?: number;
  children: JSX.Element;
  class?: string;
  style?: JSX.CSSProperties;
  layerRef?: (element: HTMLDivElement) => void;
  onAnchorDisconnect?: () => void;
}

/** Object-attached tools remain in screen pixels within the owning surface. */
export function SurfaceAnchoredLayer(props: SurfaceAnchoredLayerProps) {
  const [local, rest] = splitProps(props, [
    'anchor',
    'revision',
    'topOffset',
    'reservedSpace',
    'placement',
    'gap',
    'children',
    'class',
    'style',
    'layerRef',
    'onAnchorDisconnect',
  ]);
  const [mounted, setMounted] = createSignal(false);
  const [position, setPosition] = createSignal({ x: 0, y: 0 });
  const [placement, setPlacement] = createSignal('above');
  const [visible, setVisible] = createSignal(false);
  const [width, setWidth] = createSignal(480);
  const [panel, setPanel] = createSignal<HTMLDivElement>();
  let frame: number | undefined;
  let disconnectReported = false;
  const [anchorPoint, setAnchorPoint] = createSignal({ x: 0, y: 0 });
  const [maxHeight, setMaxHeight] = createSignal(0);
  const measure = () => {
    frame = undefined;
    const anchor = local.anchor;
    const panelElement = panel();
    if (!anchor || !panelElement) return;
    if (!anchor.isConnected) {
      setVisible(false);
      if (!disconnectReported) local.onAnchorDisconnect?.();
      disconnectReported = true;
      return;
    }
    disconnectReported = false;
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
    const top = rect.top - (local.topOffset ?? 0);
    const gap = Math.max(0, local.gap ?? 12);
    const above = top - size.height - gap;
    const padding = local.reservedSpace;
    const minY =
      bounds.top +
      (window.matchMedia('(max-width:760px)').matches
        ? (padding?.narrowTop ?? padding?.top ?? 12)
        : (padding?.top ?? 12));
    const maxY = Math.max(minY, bounds.bottom - (padding?.bottom ?? 12) - size.height);
    const clampY = (value: number) => Math.max(minY, Math.min(value, maxY));
    setMaxHeight(Math.max(0, bounds.bottom - (padding?.bottom ?? 12) - minY));
    let y = above;
    let side = 'above';
    if (local.placement === 'right' || local.placement === 'left') {
      const fitsRight = rect.right + gap + size.width <= bounds.right - 12;
      const fitsLeft = rect.left - gap - size.width >= bounds.left + 12;
      side = local.placement;
      if (side === 'right' && !fitsRight && fitsLeft) side = 'left';
      else if (side === 'left' && !fitsLeft && fitsRight) side = 'right';
      x = Math.max(
        bounds.left + 12,
        Math.min(
          side === 'right' ? rect.right + gap : rect.left - size.width - gap,
          bounds.right - size.width - 12
        )
      );
      y = clampY(rect.top + rect.height / 2 - size.height / 2);
    } else if (above < minY) {
      if (rect.bottom + gap <= maxY) {
        y = rect.bottom + gap;
        side = 'below';
      } else if (above >= bounds.top + 12) {
        side = 'above';
      } else if (rect.bottom + size.height + gap <= bounds.bottom - 12) {
        y = rect.bottom + gap;
        side = 'below';
      } else if (rect.right + size.width + gap + 12 <= bounds.right) {
        x = rect.right + gap;
        y = clampY(top);
        side = 'right';
      } else if (rect.left - size.width - gap - 12 >= bounds.left) {
        x = rect.left - size.width - gap;
        y = clampY(top);
        side = 'left';
      } else {
        y = clampY(above);
        side = 'edge';
      }
    } else y = Math.min(y, maxY);
    setAnchorPoint({
      x: Math.max(18, Math.min(rect.left + rect.width / 2 - x, Math.max(18, size.width - 18))),
      y: Math.max(18, Math.min(rect.top + rect.height / 2 - y, Math.max(18, size.height - 18))),
    });
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
    void local.anchor;
    void local.revision;
    void local.topOffset;
    void local.reservedSpace;
    void local.placement;
    void local.gap;
    schedule();
  });
  createEffect(() => {
    const element = panel();
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    onCleanup(() => observer.disconnect());
  });
  onMount(() => setMounted(true));
  createEffect(() => {
    if (!mounted()) return;
    const anchor = local.anchor;
    const observer =
      typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : undefined;

    const boundary = resolveSurfacePortalHost({ owner: anchor }).boundaryHost;
    if (boundary) observer?.observe(boundary);
    if (anchor) observer?.observe(anchor);
    // Canvas movement is a transform on an ancestor in the world compositor.
    const transforms = new MutationObserver(schedule);
    if (anchor) transforms.observe(anchor, { attributes: true, attributeFilter: ['style'] });
    let ancestor = anchor?.parentElement;
    while (ancestor) {
      transforms.observe(ancestor, {
        attributes: true,
        attributeFilter: ['style'],
        childList: true,
      });
      if (ancestor === boundary) break;
      ancestor = ancestor.parentElement;
    }
    const stopViewport = observeViewport(window, schedule);
    window.addEventListener('scroll', schedule, true);
    schedule();
    onCleanup(() => {
      observer?.disconnect();
      transforms.disconnect();
      stopViewport();
      window.removeEventListener('scroll', schedule, true);
    });
  });
  onCleanup(() => {
    if (frame !== undefined) cancelAnimationFrame(frame);
  });
  return (
    <Show when={mounted() && local.anchor}>
      <SurfaceFloatingLayer
        {...rest}
        owner={local.anchor}
        position={position()}
        class={local.class}
        data-placement={placement()}
        inert={!visible()}
        style={{
          ...local.style,
          '--floe-anchored-layer-anchor-x': `${anchorPoint().x}px`,
          '--floe-anchored-layer-anchor-y': `${anchorPoint().y}px`,
          '--floe-anchored-layer-max-height': `${maxHeight()}px`,
          visibility: visible() ? 'visible' : 'hidden',
          'max-width': `${width()}px`,
          'z-index': local.style?.['z-index'] ?? 60,
        }}
        layerRef={(node) => {
          setPanel(node);
          local.layerRef?.(node);
          schedule();
        }}
      >
        {local.children}
      </SurfaceFloatingLayer>
    </Show>
  );
}
