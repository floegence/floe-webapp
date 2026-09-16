import { Show, createMemo, createSignal, onCleanup, onMount, splitProps, type JSX } from 'solid-js';
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
  /** Show a quiet marker at the predicted landing edge during dragging. */
  snapPreview?: boolean;
  /** Gentle motion varies from 210–360ms with travel distance. Default: standard (180ms). */
  snapMotion?: 'standard' | 'gentle';
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
    'snapPreview',
    'snapMotion',
    'onPositionChange',
  ]);
  let anchor: HTMLSpanElement | undefined;
  let layer: HTMLDivElement | undefined;
  let session: PointerSessionController | undefined;
  let suppressClick = false;
  let snapAnimation: Animation | undefined;
  const safeArea = readSurfaceSafeArea();
  const [dragging, setDragging] = createSignal(false);
  const [settling, setSettling] = createSignal(false);
  const [direction, setDirection] = createSignal({ x: 0, y: 0 });
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
  const snapAnimationDuration = (distance: number) => {
    const ownerWindow = owner()?.ownerDocument.defaultView;
    if (ownerWindow?.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 0;
    return local.snapMotion === 'gentle' ? Math.round(Math.min(360, Math.max(210, 180 + Math.sqrt(distance) * 12))) : 180;
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
    if (snapAnimation && (next.width !== geometry().width || next.height !== geometry().height
      || next.scaleX !== geometry().scaleX || next.scaleY !== geometry().scaleY)) clearSnapAnimation();
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
    const animation = snapAnimation;
    snapAnimation = undefined;
    animation?.cancel();
    setSettling(false);
  };
  const beginMovement = () => {
    // A new gesture starts at the visible position, even during an unfinished snap.
    const rendered = snapAnimation !== undefined ? layer?.getBoundingClientRect() : undefined;
    clearSnapAnimation();
    measure();
    if (rendered) move(rendered.left, rendered.top);
  };
  const snapTarget = createMemo(() => resolveSurfaceFloatingPanelSnap(
    position(), bounds(), resolveSurfaceFloatingPanelSnapThreshold(local.snapThreshold), direction()
  ));
  const preview = createMemo(() => {
    const target = snapTarget();
    if (!local.snapPreview || !local.snapToEdge || !dragging() || !target) return null;
    const g = geometry();
    const vertical = target.edge === 'left' || target.edge === 'right';
    return {
      edge: target.edge,
      x: target.position.x + (vertical ? (target.edge === 'left' ? -7 : g.panelWidth + 5) : (g.panelWidth - 28) / 2),
      y: target.position.y + (vertical ? (g.panelHeight - 28) / 2 : (target.edge === 'top' ? -7 : g.panelHeight + 5)),
      width: (vertical ? 2 : 28) / g.scaleX,
      height: (vertical ? 28 : 2) / g.scaleY,
    };
  });
  const snapToNearestEdge = () => {
    const snapped = snapTarget();
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
    const duration = snapAnimationDuration(Math.hypot(current.x - snapped.position.x, current.y - snapped.position.y));
    const easing = local.snapMotion === 'gentle' ? 'cubic-bezier(.22,.7,.18,1)' : 'ease-out';
    move(snapped.position.x, snapped.position.y);
    notifyPositionChange(snapped.position);
    if (!duration || !layer?.animate) return;
    const g = geometry();
    const animation = layer.animate([
      { translate: `${(current.x - snapped.position.x) / g.scaleX}px ${(current.y - snapped.position.y) / g.scaleY}px` },
      { translate: '0px 0px' },
    ], { duration, easing });
    snapAnimation = animation;
    setSettling(true);
    void animation.finished.then(() => {
      if (snapAnimation !== animation) return;
      snapAnimation = undefined;
      setSettling(false);
    }).catch(() => {});
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
      setDirection({ x: 0, y: 0 });
      let previous = { x: startX, y: startY };
      let moved = false;
      const update = (x: number, y: number) => {
        const dx = x - startX;
        const dy = y - startY;
        moved ||= Math.hypot(dx, dy) >= 4;
        if (moved) {
          suppressClick = true;
          setDragging(true);
          if (x !== previous.x || y !== previous.y) setDirection({ x: x - previous.x, y: y - previous.y });
          previous = { x, y };
          move(initialPosition.x + dx, initialPosition.y + dy);
        }
      };
      session = startPointerSession({
        pointerEvent: event,
        captureEl: event.currentTarget,
        continueOnCaptureLoss: true,
        interruptionPosition: 'last-held',
        onMove: (next) => {
          next.preventDefault();
          update(next.clientX, next.clientY);
        },
        onEnd: ({ commit, reason, snapshot }) => {
          if (commit || reason === 'pointer_cancel') {
            update(snapshot.latestClientX, snapshot.latestClientY);
            if (moved && local.snapToEdge) snapToNearestEdge();
            else if (moved) notifyPositionChange(position());
          } else setPlacement(initialPlacement);
          suppressClick = moved;
          setDragging(false);
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
    const cancel = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !session) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      session.stop();
    };
    document.addEventListener('keydown', cancel, true);
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const reduceMotion = () => { if (reduced?.matches) clearSnapAnimation(); };
    reduced?.addEventListener?.('change', reduceMotion);
    onCleanup(() => {
      document.removeEventListener('keydown', cancel, true);
      reduced?.removeEventListener?.('change', reduceMotion);
    });
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
      <Show when={preview()}>{(mark) => (
        <SurfaceFloatingLayer owner={owner()} boundary={local.boundary} position={mark()} clamp={false}
          aria-hidden="true" data-floe-panel-snap-preview={mark().edge}
          style={{ width: `${mark().width}px`, height: `${mark().height}px`, 'border-radius': '2px',
            'pointer-events': 'none', border: '1px solid currentColor', 'box-sizing': 'border-box', color: 'var(--muted-foreground, CanvasText)', opacity: 0.55 }}>
          {null}
        </SurfaceFloatingLayer>
      )}</Show>
      {mounted() && (
        <SurfaceFloatingLayer
          {...rest}
          data-floe-panel-dragging={dragging() ? 'true' : undefined}
          data-floe-panel-settling={settling() ? 'true' : undefined}
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
