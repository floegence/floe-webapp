import { createEffect, createSignal, onCleanup, splitProps, type JSX } from 'solid-js';
import { SurfaceFloatingLayer } from '../ui/SurfaceFloatingLayer';
import {
  resolveSurfacePortalBoundaryRect,
  resolveSurfacePortalHost,
} from '../ui/surfacePortalScope';
import { cn } from '../../utils/cn';

export interface WorkbenchDockPopoverSurfaceProps extends Omit<
  JSX.HTMLAttributes<HTMLDivElement>,
  'children' | 'class' | 'style' | 'ref'
> {
  owner: Element;
  estimatedSize?: Readonly<{ width: number; height: number }>;
  gap?: number;
  boundaryPadding?: number;
  class?: string;
  style?: JSX.CSSProperties;
  children: JSX.Element;
  surfaceRef?: (element: HTMLDivElement) => void;
  onOwnerDisconnect?: () => void;
}

const DEFAULT_SIZE = { width: 320, height: 320 } as const;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

/**
 * Surface-aware companion panel anchored above a Workbench Dock item.
 * It owns viewport projection and clamping while the caller owns panel content.
 */
export function WorkbenchDockPopoverSurface(props: WorkbenchDockPopoverSurfaceProps) {
  const [local, rest] = splitProps(props, [
    'owner',
    'estimatedSize',
    'gap',
    'boundaryPadding',
    'class',
    'style',
    'children',
    'surfaceRef',
    'onOwnerDisconnect',
  ]);
  const [position, setPosition] = createSignal({ x: 0, y: 0 });
  const [arrowLeft, setArrowLeft] = createSignal(DEFAULT_SIZE.width / 2);
  const [ready, setReady] = createSignal(false);
  const [surfaceRevision, setSurfaceRevision] = createSignal(0);
  let surfaceElement: HTMLDivElement | undefined;
  let ownerDisconnectReported = false;

  const readPositioningOptions = () => ({
    owner: local.owner,
    estimatedSize: local.estimatedSize ?? DEFAULT_SIZE,
    gap: Math.max(0, local.gap ?? 16),
    boundaryPadding: Math.max(0, local.boundaryPadding ?? 12),
    onOwnerDisconnect: local.onOwnerDisconnect,
  });

  const updatePosition = (options: ReturnType<typeof readPositioningOptions>) => {
    const owner = options.owner;
    if (!owner.isConnected) {
      setReady(false);
      if (!ownerDisconnectReported) {
        ownerDisconnectReported = true;
        options.onOwnerDisconnect?.();
      }
      return;
    }
    ownerDisconnectReported = false;
    const fallbackSize = options.estimatedSize;
    const width = surfaceElement?.offsetWidth || fallbackSize.width;
    const height = surfaceElement?.offsetHeight || fallbackSize.height;
    const gap = options.gap;
    const padding = options.boundaryPadding;
    const ownerRect = owner.getBoundingClientRect();
    const boundary = resolveSurfacePortalBoundaryRect(resolveSurfacePortalHost({ owner }));
    const minimumX = boundary.left + padding;
    const maximumX = Math.max(minimumX, boundary.right - padding - width);
    const minimumY = boundary.top + padding;
    const maximumY = Math.max(minimumY, boundary.bottom - padding - height);
    const ownerCenterX = ownerRect.left + ownerRect.width / 2;
    const x = clamp(ownerCenterX - width / 2, minimumX, maximumX);
    const y = clamp(ownerRect.top - gap - height, minimumY, maximumY);
    setPosition({ x, y });
    setArrowLeft(clamp(ownerCenterX - x, 18, Math.max(18, width - 18)));
    setReady(Boolean(surfaceElement));
  };

  createEffect(() => {
    surfaceRevision();
    const positioningOptions = readPositioningOptions();
    const owner = positioningOptions.owner;
    let animationFrame = window.requestAnimationFrame(() => updatePosition(positioningOptions));
    const scheduleUpdate = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => updatePosition(positioningOptions));
    };
    const resizeObserver =
      typeof ResizeObserver === 'function' ? new ResizeObserver(scheduleUpdate) : null;
    resizeObserver?.observe(owner);
    if (surfaceElement) resizeObserver?.observe(surfaceElement);
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('scroll', scheduleUpdate, true);
    onCleanup(() => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate, true);
    });
  });

  return (
    <SurfaceFloatingLayer
      owner={local.owner}
      position={position()}
      estimatedSize={local.estimatedSize ?? DEFAULT_SIZE}
      clamp={false}
      class="workbench-dock-popover-layer"
      style={{ visibility: ready() ? 'visible' : 'hidden' }}
    >
      <div
        ref={(element) => {
          surfaceElement = element;
          local.surfaceRef?.(element);
          setSurfaceRevision((revision) => revision + 1);
        }}
        {...rest}
        class={cn('workbench-dock-popover workbench-dock-material', local.class)}
        style={local.style}
      >
        {local.children}
      </div>
      <span
        class="workbench-dock-popover__arrow"
        style={{ left: `${arrowLeft()}px` }}
        aria-hidden="true"
      />
    </SurfaceFloatingLayer>
  );
}
