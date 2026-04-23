import { createMemo, splitProps, type JSX } from 'solid-js';
import { Portal } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { LOCAL_INTERACTION_SURFACE_ATTR } from './localInteractionSurface';
import { clampMenuPosition } from './menuUtils';
import {
  isSurfacePortalMode,
  projectSurfacePortalPosition,
  resolveSurfacePortalBoundaryRect,
  resolveSurfacePortalHost,
  resolveSurfacePortalMount,
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

export interface SurfaceFloatingLayerProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'children' | 'class' | 'style' | 'ref'> {
  position: SurfaceFloatingLayerPosition;
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
    'estimatedSize',
    'clamp',
    'class',
    'style',
    'children',
    'layerRef',
  ]);
  const surfaceHost = createMemo(() => resolveSurfacePortalHost());
  const isSurfaceMode = () => isSurfacePortalMode(surfaceHost());
  const boundaryRect = () => resolveSurfacePortalBoundaryRect(surfaceHost()) ?? emptyBoundaryRect();
  const shouldClamp = () => local.clamp !== false && Boolean(local.estimatedSize);
  const resolvedPosition = createMemo(() => {
    const position = local.position;
    if (!shouldClamp() || !local.estimatedSize) return position;
    return clampMenuPosition(position, local.estimatedSize, boundaryRect());
  });
  const projectedPosition = () => projectSurfacePortalPosition(resolvedPosition(), surfaceHost());
  const layerStyle = () => ({
    ...(local.style ?? {}),
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
        {...{ [LOCAL_INTERACTION_SURFACE_ATTR]: isSurfaceMode() ? 'true' : undefined }}
      >
        {local.children}
      </div>
    </Portal>
  );
}
