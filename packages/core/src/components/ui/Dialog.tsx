import {
  Show,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  onCleanup,
  onMount,
  untrack,
  type JSX,
} from 'solid-js';
import { Portal } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { Button } from './Button';
import { X } from '../icons';
import { useResolvedFloeConfig } from '../../context/FloeConfigContext';
import { useOverlayMask } from '../../hooks/useOverlayMask';
import {
  DIALOG_SURFACE_BOUNDARY_ATTR,
  DIALOG_SURFACE_HOST_ATTR,
  SURFACE_PORTAL_LAYER_ATTR,
  type ResolvedDialogSurfaceHost,
} from './dialogSurfaceScope';
import { LOCAL_INTERACTION_SURFACE_ATTR } from './localInteractionSurface';
import {
  isSurfacePortalMode,
  projectSurfacePortalRect,
  resolveSurfacePortalBoundaryRect,
  resolveSurfacePortalHost,
  resolveSurfacePortalMount,
  type SurfacePortalBoundaryRect,
} from './surfacePortalScope';
import { createFloatingPresence } from './floatingPresence';
import { useDialogPlacement } from './DialogPlacementContext';
import { observeViewport, viewportStyle, type ViewportSnapshot } from '../../viewport';
import { resolveFloatingBoundary } from './surfaceFloatingBoundary';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Dialog title - can be a string or JSX element for custom headers */
  title?: string | JSX.Element;
  /** Plain-text guidance rendered at the start of the body, never in the header. */
  bodyDescription?: string;
  /** Localized accessible name for the close button. */
  closeLabel?: string;
  /** Whether clicking the backdrop requests dismissal. Defaults to true. */
  closeOnBackdropClick?: boolean;
  /** Bubble lets nested inputs consume Escape before the dialog handles it. */
  escapeKeyPhase?: 'capture' | 'bubble';
  onKeyDown?: JSX.EventHandler<HTMLDivElement, KeyboardEvent>;
  children: JSX.Element;
  footer?: JSX.Element;
  class?: string;
  /** Drawers retain the same modal, visible-viewport and surface-placement contract. */
  presentation?: 'dialog' | 'bottom-drawer' | 'side-drawer';
  /** Undefined uses the default header; null leaves only the accessible title. */
  header?: JSX.Element;
  contentClass?: string;
  /** Includes the exit animation, so hosts can retain background input isolation. */
  onPresenceChange?: (present: boolean) => void;
  /** Optional stacking layer for global dialogs. Overrides the placement provider default. */
  globalZIndex?: number;
}

const DIALOG_OWNER_ANCHOR_STYLE: JSX.CSSProperties = {
  display: 'none',
};

function scheduleDialogOwnerAnchorReady(callback: () => void): void {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(callback);
    return;
  }
  void Promise.resolve().then(callback);
}

function surfacePortalRectKey(rect: SurfacePortalBoundaryRect): string {
  return `${rect.left}|${rect.top}|${rect.right}|${rect.bottom}|${rect.width}|${rect.height}`;
}

function requestSurfacePortalFrame(callback: FrameRequestCallback): number {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    return window.requestAnimationFrame(callback);
  }
  return window.setTimeout(() => callback(Date.now()), 16);
}

function cancelSurfacePortalFrame(frameHandle: number): void {
  if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
    window.cancelAnimationFrame(frameHandle);
    return;
  }
  window.clearTimeout(frameHandle);
}

/**
 * Modal dialog component
 */
export function Dialog(props: DialogProps) {
  const placement = useDialogPlacement();
  const [viewport, setViewport] = createSignal<ViewportSnapshot>();
  onMount(() => onCleanup(observeViewport(window, setViewport)));
  const baseId = createUniqueId();
  const titleId = () => `dialog-${baseId}-title`;
  const descriptionId = () => `dialog-${baseId}-description`;
  let dialogRef: HTMLDivElement | undefined;
  const [ownerAnchor, setOwnerAnchor] = createSignal<HTMLElement | null>(null);
  const [ownerAnchorReadyVersion, setOwnerAnchorReadyVersion] = createSignal(0);
  const [surfaceGeometryVersion, setSurfaceGeometryVersion] = createSignal(0);
  const isSideDrawer = () => props.presentation === 'side-drawer';
  const isBottomDrawer = () => props.presentation === 'bottom-drawer';
  const isMountedOpen = () => props.open && Boolean(ownerAnchor()) && ownerAnchorReadyVersion() > 0;
  const dialogPresence = createFloatingPresence({
    open: isMountedOpen,
    get exitDurationMs() {
      return isBottomDrawer() ? 180 : 160;
    },
  });
  const isPresenceMounted = () =>
    dialogPresence.mounted() && Boolean(ownerAnchor()) && ownerAnchorReadyVersion() > 0;
  createEffect(() => props.onPresenceChange?.(isPresenceMounted()));
  onCleanup(() => props.onPresenceChange?.(false));
  const setDialogOwnerAnchor = (element: HTMLElement): void => {
    setOwnerAnchor(element);
    scheduleDialogOwnerAnchorReady(() => {
      if (untrack(ownerAnchor) === element) {
        setOwnerAnchorReadyVersion((value) => value + 1);
      }
    });
  };
  const surfaceHost = createMemo<ResolvedDialogSurfaceHost>(() =>
    isPresenceMounted()
      ? resolveSurfacePortalHost({ owner: ownerAnchor() })
      : { host: null, boundaryHost: null, mountHost: null, mode: 'global' }
  );
  const dialogBoundaryId = () => `dialog-boundary-${baseId}`;
  const isSurfaceMode = () => placement.mode() === 'auto' && isSurfacePortalMode(surfaceHost());
  const portalMount = () =>
    isSurfaceMode() ? resolveSurfacePortalMount(surfaceHost()) : undefined;
  const globalZIndex = () => props.globalZIndex ?? placement.globalZIndex();
  const readProjectedBoundaryRectForHost = (host: ResolvedDialogSurfaceHost) =>
    projectSurfacePortalRect(
      resolveFloatingBoundary(host, undefined, untrack(viewport)?.safeArea) ?? resolveSurfacePortalBoundaryRect(host), host);
  const readProjectedBoundaryRect = () => readProjectedBoundaryRectForHost(surfaceHost());
  const projectedBoundaryRect = createMemo(() => {
    surfaceGeometryVersion();
    viewport();
    return readProjectedBoundaryRect();
  });

  const isWithinDialogBoundary = (target: EventTarget | null) => {
    if (typeof Element !== 'undefined' && target instanceof Element) {
      return Boolean(target.closest(`[${DIALOG_SURFACE_BOUNDARY_ATTR}="${dialogBoundaryId()}"]`));
    }
    if (typeof Node !== 'undefined' && target instanceof Node) {
      return Boolean(
        target.parentElement?.closest(`[${DIALOG_SURFACE_BOUNDARY_ATTR}="${dialogBoundaryId()}"]`)
      );
    }
    return false;
  };

  createEffect(() => {
    const currentHost = surfaceHost();
    if (!isPresenceMounted() || !isSurfaceMode() || typeof window === 'undefined') {
      return;
    }

    let disposed = false;
    let frameHandle: number | null = null;
    let lastGeometryKey = surfacePortalRectKey(readProjectedBoundaryRectForHost(currentHost));

    const syncGeometry = () => {
      if (disposed || !isSurfacePortalMode(currentHost)) {
        return;
      }

      const nextGeometryKey = surfacePortalRectKey(readProjectedBoundaryRectForHost(currentHost));
      if (nextGeometryKey === lastGeometryKey) {
        return;
      }
      lastGeometryKey = nextGeometryKey;
      setSurfaceGeometryVersion((value) => value + 1);
    };

    const requestNextFrame = () => {
      if (disposed) {
        return;
      }

      frameHandle = requestSurfacePortalFrame(() => {
        syncGeometry();
        requestNextFrame();
      });
    };

    requestNextFrame();

    onCleanup(() => {
      disposed = true;
      if (frameHandle !== null) {
        cancelSurfacePortalFrame(frameHandle);
      }
    });
  });

  useOverlayMask({
    open: isPresenceMounted,
    root: () => dialogRef,
    containsTarget: isWithinDialogBoundary,
    onClose: () => props.onOpenChange(false),
    lockBodyScroll: () => !isSurfaceMode(),
    trapFocus: true,
    closeOnEscape: () => (isSurfaceMode() ? 'inside' : true),
    escapeKeyPhase: () => props.escapeKeyPhase ?? 'capture',
    blockHotkeys: true,
    // Block scroll bleed outside the dialog while keeping the dialog content scrollable.
    blockWheel: () => (isSurfaceMode() ? 'none' : 'outside'),
    blockTouchMove: () => (isSurfaceMode() ? 'none' : 'outside'),
    restoreFocus: true,
  });

  return (
    <>
      <span
        ref={setDialogOwnerAnchor}
        aria-hidden="true"
        data-floe-dialog-owner-anchor={baseId}
        style={DIALOG_OWNER_ANCHOR_STYLE}
      />
      <Show when={isPresenceMounted()}>
        <Portal mount={portalMount()}>
          <div
            data-floe-dialog-overlay-root={baseId}
            data-floe-dialog-mode={isSurfaceMode() ? 'surface' : 'global'}
            data-floe-dialog-presentation={props.presentation ?? 'dialog'}
            data-floating-presence={dialogPresence.state()}
            aria-hidden={dialogPresence.exiting() ? 'true' : undefined}
            {...{ [LOCAL_INTERACTION_SURFACE_ATTR]: 'true' }}
            {...{
              [SURFACE_PORTAL_LAYER_ATTR]: 'true',
              [DIALOG_SURFACE_BOUNDARY_ATTR]: dialogBoundaryId(),
            }}
            class={cn(
              isSurfaceMode()
                ? 'absolute z-20 box-border p-3'
                : cn('fixed box-border p-4', globalZIndex() === undefined && 'z-50'),
              isBottomDrawer() && 'floe-bottom-drawer-overlay',
              isSideDrawer() && 'floe-side-drawer-overlay',
              dialogPresence.exiting() && !isBottomDrawer() && 'pointer-events-none'
            )}
            style={
              isSurfaceMode()
                ? {
                    left: `${projectedBoundaryRect().left}px`,
                    top: `${projectedBoundaryRect().top}px`,
                    width: `${projectedBoundaryRect().width}px`,
                    height: `${projectedBoundaryRect().height}px`,
                  }
                : {
                    ...(viewport() ? viewportStyle(viewport()!) : { inset: '0' }),
                    '--floe-dialog-safe-top': `${(viewport()?.safeArea.top ?? 0) / (viewport()?.fixedScale ?? 1)}px`,
                    '--floe-dialog-safe-right': `${(viewport()?.safeArea.right ?? 0) / (viewport()?.fixedScale ?? 1)}px`,
                    '--floe-dialog-safe-bottom': `${(viewport()?.safeArea.bottom ?? 0) / (viewport()?.fixedScale ?? 1)}px`,
                    '--floe-dialog-safe-left': `${(viewport()?.safeArea.left ?? 0) / (viewport()?.fixedScale ?? 1)}px`,
                    'padding-top': 'max(var(--floe-dialog-gap-y, 1rem), var(--floe-dialog-safe-top))',
                    'padding-right': 'max(var(--floe-dialog-gap-x, 1rem), var(--floe-dialog-safe-right))',
                    'padding-bottom': 'max(var(--floe-dialog-gap-y, 1rem), var(--floe-dialog-safe-bottom))',
                    'padding-left': 'max(var(--floe-dialog-gap-x, 1rem), var(--floe-dialog-safe-left))',
                    'z-index': globalZIndex(),
                  }
            }
          >
            {/* Backdrop */}
            <div
              data-floe-dialog-backdrop={baseId}
              {...{ [DIALOG_SURFACE_BOUNDARY_ATTR]: dialogBoundaryId() }}
              data-floating-presence={dialogPresence.state()}
              class={cn(
                'absolute inset-0 floe-floating-presence floe-floating-backdrop',
                props.closeOnBackdropClick === false ? 'cursor-default' : 'cursor-pointer',
                isBottomDrawer()
                  ? 'floe-bottom-drawer-backdrop'
                  : isSurfaceMode()
                    ? 'bg-background/72 backdrop-blur-[2px]'
                    : 'bg-background/80 backdrop-blur-sm'
              )}
              onClick={() => {
                if (!dialogPresence.exiting() && props.closeOnBackdropClick !== false)
                  props.onOpenChange(false);
              }}
            />

            {/* Dialog */}
            <div
              class={cn(
                'pointer-events-none relative z-[1] flex h-full w-full',
                isSideDrawer() ? 'items-stretch justify-end' : isBottomDrawer() ? 'items-end justify-center' : 'items-center justify-center'
              )}
            >
              <div
                ref={dialogRef}
                data-floe-dialog-panel={baseId}
                data-floe-surface="floating"
                {...{
                  [DIALOG_SURFACE_BOUNDARY_ATTR]: dialogBoundaryId(),
                  [DIALOG_SURFACE_HOST_ATTR]: 'true',
                }}
                class={cn(
                  isSurfaceMode()
                    ? 'flex max-h-[calc(100%-1rem)] w-[min(32rem,calc(100%-1rem))] max-w-[calc(100%-1rem)] flex-col'
                    : 'w-full max-w-md',
                  'bg-card text-card-foreground rounded-md shadow-lg',
                  'border border-border',
                  'floe-floating-presence',
                  isBottomDrawer() ? 'floe-bottom-drawer-panel' : isSideDrawer() ? 'floe-side-drawer-panel' : 'floe-floating-dialog-panel',
                  'pointer-events-auto flex flex-col',
                  props.class
                )}
                style={{ 'max-height': '100%', 'min-height': '0', 'min-width': '0' }}
                data-floating-presence={dialogPresence.state()}
                inert={isBottomDrawer() && dialogPresence.exiting()}
                role="dialog"
                aria-modal={isSurfaceMode() ? undefined : 'true'}
                aria-labelledby={props.title ? titleId() : undefined}
                aria-describedby={props.bodyDescription ? descriptionId() : undefined}
                onKeyDown={(event) => props.onKeyDown?.(event)}
                tabIndex={-1}
              >
                {/* Header */}
                <Show
                  when={props.header === undefined}
                  fallback={
                    <>
                      <Show when={props.title}>
                        <h2 id={titleId()} class="sr-only">
                          {props.title}
                        </h2>
                      </Show>
                      {props.header}
                    </>
                  }
                >
                  <Show when={props.title}>
                    <div
                      data-floe-dialog-header
                      class="flex shrink-0 items-start justify-between p-3 border-b border-border"
                    >
                      <div>
                        <Show when={props.title}>
                          <h2 id={titleId()} class="text-sm font-semibold">
                            {props.title}
                          </h2>
                        </Show>
                      </div>
                      <Button
                        variant="ghost-destructive"
                        size="icon"
                        class="-my-2 -mr-2 h-[46px] w-[46px] shrink-0 sm:my-0 sm:-mr-1 sm:h-6 sm:w-6"
                        onClick={() => props.onOpenChange(false)}
                        aria-label={props.closeLabel ?? 'Close'}
                      >
                        <X class="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </Show>
                </Show>

                {/* Content */}
                <div
                  data-floe-dialog-body
                  class={cn(
                    'min-h-0 flex-1 overflow-auto overscroll-contain p-3',
                    props.contentClass
                  )}
                >
                  <Show when={props.bodyDescription}>
                    <p
                      id={descriptionId()}
                      class="mb-3 shrink-0 text-[length:var(--floe-type-body)] leading-[var(--floe-line-body)] text-muted-foreground last:mb-0"
                    >
                      {props.bodyDescription}
                    </p>
                  </Show>
                  {props.children}
                </div>

                {/* Footer */}
                <Show when={props.footer}>
                  <div
                    data-floe-dialog-footer
                    class="flex shrink-0 items-center justify-end gap-2 p-3 border-t border-border"
                  >
                    {props.footer}
                  </div>
                </Show>
              </div>
            </div>
          </div>
        </Portal>
      </Show>
    </>
  );
}

/**
 * Confirm dialog helper
 */
export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Plain-text guidance rendered in the body; use children for rich content. */
  bodyDescription?: string;
  /** Optional custom content after the body description. */
  children?: JSX.Element;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  /** Optional stacking layer for the underlying global dialog. */
  globalZIndex?: number;
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  const floe = useResolvedFloeConfig();
  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={props.title}
      bodyDescription={props.bodyDescription}
      globalZIndex={props.globalZIndex}
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => props.onOpenChange(false)}
            disabled={props.loading}
          >
            {props.cancelText ?? floe.config.strings.confirmDialog.cancel}
          </Button>
          <Button
            variant={props.variant === 'destructive' ? 'destructive' : 'primary'}
            onClick={props.onConfirm}
            loading={props.loading}
          >
            {props.confirmText ?? floe.config.strings.confirmDialog.confirm}
          </Button>
        </>
      }
    >
      {props.children}
    </Dialog>
  );
}
