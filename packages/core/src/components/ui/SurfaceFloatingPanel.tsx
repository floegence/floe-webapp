import { createMemo, createSignal, onCleanup, onMount, splitProps, type JSX } from 'solid-js';
import { SurfaceFloatingLayer, type SurfaceFloatingLayerProps } from './SurfaceFloatingLayer';
import { readSurfaceSafeArea, resolveFloatingBoundary } from './surfaceFloatingBoundary';
import { resolveSurfacePortalHost, resolveSurfacePortalScale } from './surfacePortalScope';
import { startPointerSession, type PointerSessionController } from './pointerSession';

export type SurfaceFloatingPanelHandleProps = Pick<
  JSX.ButtonHTMLAttributes<HTMLButtonElement>,
  'onPointerDown' | 'onKeyDown' | 'style'
> & {
  'oncapture:click': JSX.EventHandler<HTMLButtonElement, MouseEvent>;
};

export interface SurfaceFloatingPanelProps extends Omit<
  SurfaceFloatingLayerProps,
  'position' | 'estimatedSize' | 'clamp' | 'children' | 'layerRef'
> {
  /** Spread these props on a dedicated grip or collapsed launcher button. */
  children: (handle: SurfaceFloatingPanelHandleProps) => JSX.Element;
}

/** A draggable, bottom-end anchored panel using the shared surface portal boundary.
 * Content owns its dimensions and collapsed presentation; the panel preserves its
 * relative placement as either changes. Drag handles never intercept content input.
 */
export function SurfaceFloatingPanel(props: SurfaceFloatingPanelProps) {
  const [local, rest] = splitProps(props, ['children', 'owner', 'boundary', 'style']);
  let anchor: HTMLSpanElement | undefined;
  let layer: HTMLDivElement | undefined;
  let session: PointerSessionController | undefined;
  let suppressClick = false;
  const safeArea = readSurfaceSafeArea();
  const [mounted, setMounted] = createSignal(false);
  const [placement, setPlacement] = createSignal({ x: 1, y: 1 });
  const [geometry, setGeometry] = createSignal({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    panelWidth: 0,
    panelHeight: 0,
    scaleX: 1,
    scaleY: 1,
  });
  const owner = () => local.owner ?? anchor;
  const measure = () => {
    if (!layer) return;
    const host = resolveSurfacePortalHost({ owner: owner() });
    const boundary = resolveFloatingBoundary(host, local.boundary, safeArea);
    const scale = resolveSurfacePortalScale(host);
    const rect = layer.getBoundingClientRect();
    const next = {
      left: boundary?.left ?? 0,
      top: boundary?.top ?? 0,
      width: boundary?.width ?? 0,
      height: boundary?.height ?? 0,
      panelWidth: rect.width,
      panelHeight: rect.height,
      scaleX: scale.x,
      scaleY: scale.y,
    };
    setGeometry((previous) =>
      Object.keys(next).every(
        (key) => next[key as keyof typeof next] === previous[key as keyof typeof next]
      )
        ? previous
        : next
    );
  };
  const position = createMemo(() => {
    const g = geometry();
    const p = placement();
    return {
      x: g.left + 8 + p.x * Math.max(0, g.width - g.panelWidth - 16),
      y: g.top + 8 + p.y * Math.max(0, g.height - g.panelHeight - 16),
    };
  });
  const move = (x: number, y: number) => {
    const g = geometry();
    const fraction = (value: number, room: number) =>
      room > 0 ? Math.max(0, Math.min(1, value / room)) : 0;
    setPlacement({
      x: fraction(x - g.left - 8, g.width - g.panelWidth - 16),
      y: fraction(y - g.top - 8, g.height - g.panelHeight - 16),
    });
  };
  const handle: SurfaceFloatingPanelHandleProps = {
    style: { 'touch-action': 'none', 'user-select': 'none' },
    onPointerDown: (event) => {
      if (event.button !== 0 || session) return;
      event.stopPropagation();
      measure();
      const initialPlacement = placement();
      const initialPosition = position();
      const startX = event.clientX;
      const startY = event.clientY;
      suppressClick = false;
      let moved = false;
      const update = (x: number, y: number) => {
        const dx = x - startX;
        const dy = y - startY;
        moved ||= Math.hypot(dx, dy) >= 4;
        if (moved) move(initialPosition.x + dx, initialPosition.y + dy);
      };
      session = startPointerSession({
        pointerEvent: event,
        captureEl: event.currentTarget,
        onMove: (next) => {
          next.preventDefault();
          update(next.clientX, next.clientY);
        },
        onEnd: ({ commit, snapshot }) => {
          if (commit) update(snapshot.latestClientX, snapshot.latestClientY);
          else setPlacement(initialPlacement);
          suppressClick = moved;
          session = undefined;
        },
      });
    },
    'oncapture:click': (event) => {
      if (suppressClick && event.detail !== 0) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      suppressClick = false;
    },
    onKeyDown: (event) => {
      const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[
        event.key
      ];
      if (!delta) return;
      event.preventDefault();
      event.stopPropagation();
      measure();
      const p = position();
      const step = event.shiftKey ? 40 : 10;
      move(p.x + delta[0]! * step, p.y + delta[1]! * step);
    },
  };
  onMount(() => {
    setMounted(true);
    let frame = 0;
    // Also observe projected transforms, which do not emit ResizeObserver events.
    // Only changed geometry publishes reactive state; content is never remounted.
    const update = () => {
      measure();
      frame = requestAnimationFrame(update);
    };
    update();
    onCleanup(() => {
      cancelAnimationFrame(frame);
      session?.stop();
    });
  });
  return (
    <>
      <span ref={anchor} hidden />
      {mounted() && (
        <SurfaceFloatingLayer
          {...rest}
          owner={owner()}
          boundary={local.boundary}
          position={position()}
          clamp={false}
          layerRef={(element) => {
            layer = element;
          }}
          style={{
            ...local.style,
            'max-width': `${Math.max(0, geometry().width - 16) / geometry().scaleX}px`,
            'max-height': `${Math.max(0, geometry().height - 16) / geometry().scaleY}px`,
            visibility: geometry().width <= 16 || geometry().height <= 16 ? 'hidden' : undefined,
          }}
        >
          {local.children(handle)}
        </SurfaceFloatingLayer>
      )}
    </>
  );
}
