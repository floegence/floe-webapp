import { observeViewport, type ViewportSnapshot } from '../../viewport';
import { createMemo, createSignal, onMount, onCleanup, splitProps, type JSX } from 'solid-js';
import { Portal } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { LOCAL_INTERACTION_SURFACE_ATTR } from './localInteractionSurface';
import { clampMenuPosition } from './menuUtils';
import {
  readSurfaceSafeArea,
  resolveFloatingBoundary,
  type SurfaceFloatingBoundary,
} from './surfaceFloatingBoundary';
import {
  isSurfacePortalMode,
  projectSurfacePortalPosition,
  resolveSurfacePortalHost,
  resolveSurfacePortalMount,
  SURFACE_FLOATING_LAYER_ATTR,
  type SurfacePortalBoundaryRect,
} from './surfacePortalScope';

export type SurfaceFloatingLayerPosition = Readonly<{
  x: number;
  y: number;
}>;

export type SurfaceFloatingLayerSize = Readonly<{
  width: number;
  height: number;
}>;

export interface SurfaceFloatingLayerProps extends Omit<
  JSX.HTMLAttributes<HTMLDivElement>,
  'children' | 'class' | 'style' | 'ref'
> {
  position: SurfaceFloatingLayerPosition;
  /** Stable trigger or anchor used to resolve the owning projected surface. */
  owner?: Element | null;
  boundary?: SurfaceFloatingBoundary;
  estimatedSize?: SurfaceFloatingLayerSize;
  clamp?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children: JSX.Element;
  layerRef?: (element: HTMLDivElement) => void;
}

function emptyBoundaryRect(): SurfacePortalBoundaryRect {
  return {
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
  };
}

/**
 * Surface-aware floating layer for point-anchored overlays such as context menus.
 */
export function SurfaceFloatingLayer(props: SurfaceFloatingLayerProps) {
  const [local, rest] = splitProps(props, [
    'position',
    'owner',
    'boundary',
    'estimatedSize',
    'clamp',
    'class',
    'style',
    'children',
    'layerRef',
  ]);
  const [viewport, setViewport] = createSignal<ViewportSnapshot>();
  onMount(() => onCleanup(observeViewport(window, setViewport)));
  const surfaceHost = createMemo(() => resolveSurfacePortalHost({ owner: local.owner ?? null }));
  const isSurfaceMode = () => isSurfacePortalMode(surfaceHost());
  const safeArea = createMemo(() => {
    void local.position;
    return viewport()?.safeArea ?? readSurfaceSafeArea();
  });
  const boundaryRect = () =>
    resolveFloatingBoundary(surfaceHost(), local.boundary, safeArea()) ?? emptyBoundaryRect();
  const shouldClamp = () => local.clamp !== false && Boolean(local.estimatedSize);
  const resolvedPosition = createMemo(() => {
    const position = local.position;
    if (!shouldClamp() || !local.estimatedSize) return position;
    return clampMenuPosition(position, local.estimatedSize, boundaryRect());
  });
  const projectedPosition = () => {
    const position = projectSurfacePortalPosition(resolvedPosition(), surfaceHost());
    const offset = viewport()?.fixedOffset;
    return isSurfaceMode() || !offset ? position : { x: position.x + offset.left, y: position.y + offset.top };
  };
  const layerStyle = () => ({
    ...(local.style ?? {}),
    ...(local.boundary !== undefined && (boundaryRect().width <= 16 || boundaryRect().height <= 16)
      ? { visibility: 'hidden' as const, 'pointer-events': 'none' as const }
      : {}),
    left: `${projectedPosition().x}px`,
    top: `${projectedPosition().y}px`,
  });

  return (
    <Portal mount={resolveSurfacePortalMount(surfaceHost())}>
      <div
        ref={local.layerRef}
        {...rest}
        class={cn(isSurfaceMode() ? 'absolute z-20' : 'fixed z-50', local.class)}
        style={layerStyle()}
        {...{ [SURFACE_FLOATING_LAYER_ATTR]: 'true' }}
        {...{ [LOCAL_INTERACTION_SURFACE_ATTR]: isSurfaceMode() ? 'true' : undefined }}
      >
        {local.children}
      </div>
    </Portal>
  );
}
