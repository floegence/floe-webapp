import { createMemo, createSignal, onCleanup, onMount, splitProps, type JSX } from 'solid-js';
import { SurfaceFloatingLayer, type SurfaceFloatingLayerProps } from './SurfaceFloatingLayer';
import { readSurfaceSafeArea, resolveFloatingBoundary } from './surfaceFloatingBoundary';
import { resolveSurfacePortalHost, resolveSurfacePortalScale } from './surfacePortalScope';
import { startPointerSession, type PointerSessionController } from './pointerSession';
import {
  insetSurfaceFloatingPanelGeometry,
  resolveSurfaceFloatingPanelBounds,
  resolveSurfaceFloatingPanelInset,
  resolveSurfaceFloatingPanelPosition,
  resolveSurfaceFloatingPanelSnap,
  resolveSurfaceFloatingPanelSnapThreshold,
  type SurfaceFloatingPanelGeometry,
  type SurfaceFloatingPanelBoundaryInsets,
  type SurfaceFloatingPanelPosition,
} from './surfaceFloatingPanelGeometry';

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
  /** Non-interactive client/CSS viewport pixel insets, such as app chrome or a composer. */
  boundaryInsets?: SurfaceFloatingPanelBoundaryInsets;
  /** Snap the panel to the nearest safe boundary edge after a committed pointer drag. */
  snapToEdge?: boolean;
  /** Maximum client/CSS viewport pixel distance that enables snapping. Defaults to Infinity. */
  snapThreshold?: number;
  /** Client/CSS viewport pixel gap between the panel and its safe boundary. Defaults to 8px. */
  snapInset?: number;
  /** Called with client/CSS viewport coordinates after a committed position change. */
  onPositionChange?: (position: SurfaceFloatingPanelPosition) => void;
}

/** A draggable, bottom-end anchored panel using the shared surface portal boundary.
 * Content owns its dimensions and collapsed presentation; the panel preserves its
 * relative placement as either changes. Drag handles never intercept content input.
 * Geometry stays in client/CSS viewport coordinates; projected surfaces are converted
 * only when the shared floating layer renders.
 */
export function SurfaceFloatingPanel(props: SurfaceFloatingPanelProps) {
  const [local, rest] = splitProps(props, [
    'children',
    'owner',
    'boundary',
    'style',
    'snapToEdge',
    'boundaryInsets',
    'snapThreshold',
    'snapInset',
    'onPositionChange',
  ]);
  let anchor: HTMLSpanElement | undefined;
  let layer: HTMLDivElement | undefined;
  let session: PointerSessionController | undefined;
  let suppressClick = false;
  let snapAnimationTimer: ReturnType<typeof setTimeout> | undefined;
  let previousTransition: string | null = null;
  const safeArea = readSurfaceSafeArea();
  const [mounted, setMounted] = createSignal(false);
  const [placement, setPlacement] = createSignal({ x: 1, y: 1 });
  const [geometry, setGeometry] = createSignal<
    SurfaceFloatingPanelGeometry & {
      scaleX: number;
      scaleY: number;
    }
  >({
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
  const panelInset = () => resolveSurfaceFloatingPanelInset(local.snapInset);
  const bounds = createMemo(() => resolveSurfaceFloatingPanelBounds(geometry(), panelInset()));
  const snapAnimationDuration = () => {
    const ownerWindow = owner()?.ownerDocument.defaultView;
    return ownerWindow?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 180;
  };
  const measure = () => {
    if (!layer) return;
    const host = resolveSurfacePortalHost({ owner: owner() });
    const boundary = resolveFloatingBoundary(host, local.boundary, safeArea);
    const scale = resolveSurfacePortalScale(host);
    const rect = layer.getBoundingClientRect();
    const safeGeometry = insetSurfaceFloatingPanelGeometry(
      {
        left: boundary?.left ?? 0,
        top: boundary?.top ?? 0,
        width: boundary?.width ?? 0,
        height: boundary?.height ?? 0,
        panelWidth: rect.width,
        panelHeight: rect.height,
      },
      local.boundaryInsets
    );
    const next = {
      ...safeGeometry,
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
  const position = createMemo(() => resolveSurfaceFloatingPanelPosition(bounds(), placement()));
  const move = (x: number, y: number) => {
    const currentBounds = bounds();
    const fraction = (value: number, axis: { min: number; room: number }) =>
      axis.room > 0 ? Math.max(0, Math.min(1, value / axis.room)) : 0;
    setPlacement({
      x: fraction(x - currentBounds.x.min, currentBounds.x),
      y: fraction(y - currentBounds.y.min, currentBounds.y),
    });
  };
  const notifyPositionChange = (next = position()) => {
    local.onPositionChange?.(next);
  };
  const clearSnapAnimation = () => {
    if (snapAnimationTimer !== undefined) {
      clearTimeout(snapAnimationTimer);
      snapAnimationTimer = undefined;
    }
    if (layer && previousTransition !== null) {
      layer.style.transition = previousTransition;
      previousTransition = null;
    }
  };
  const beginMovement = () => {
    // A new gesture starts at the visible position, even during an unfinished snap.
    const rendered = snapAnimationTimer !== undefined ? layer?.getBoundingClientRect() : undefined;
    clearSnapAnimation();
    measure();
    if (rendered) move(rendered.left, rendered.top);
  };
  const snapToNearestEdge = () => {
    const snapped = resolveSurfaceFloatingPanelSnap(
      position(),
      bounds(),
      resolveSurfaceFloatingPanelSnapThreshold(local.snapThreshold)
    );
    if (!snapped) {
      notifyPositionChange(position());
      return;
    }

    const current = position();
    if (current.x === snapped.position.x && current.y === snapped.position.y) {
      notifyPositionChange(current);
      return;
    }

    clearSnapAnimation();
    const duration = snapAnimationDuration();
    if (layer) {
      previousTransition = layer.style.transition;
      layer.style.transition = duration ? `left ${duration}ms ease-out, top ${duration}ms ease-out` : 'none';
    }
    move(snapped.position.x, snapped.position.y);
    notifyPositionChange(snapped.position);
    snapAnimationTimer = setTimeout(() => {
      if (layer && previousTransition !== null) {
        layer.style.transition = previousTransition;
      }
      previousTransition = null;
      snapAnimationTimer = undefined;
    }, duration);
  };
  const handle: SurfaceFloatingPanelHandleProps = {
    style: { 'touch-action': 'none', 'user-select': 'none' },
    onPointerDown: (event) => {
      if (event.button !== 0 || session) return;
      event.stopPropagation();
      beginMovement();
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
          if (commit) {
            update(snapshot.latestClientX, snapshot.latestClientY);
            if (moved && local.snapToEdge) snapToNearestEdge();
            else if (moved) notifyPositionChange(position());
          } else setPlacement(initialPlacement);
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
      beginMovement();
      const p = position();
      const step = event.shiftKey ? 40 : 10;
      move(p.x + delta[0]! * step, p.y + delta[1]! * step);
      notifyPositionChange(position());
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
      clearSnapAnimation();
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
            'max-width': `${Math.max(0, geometry().width - panelInset() * 2) / Math.max(0.01, geometry().scaleX)}px`,
            'max-height': `${Math.max(0, geometry().height - panelInset() * 2) / Math.max(0.01, geometry().scaleY)}px`,
            visibility: geometry().width <= 16 || geometry().height <= 16 ? 'hidden' : undefined,
          }}
        >
          {local.children(handle)}
        </SurfaceFloatingLayer>
      )}
    </>
  );
}
