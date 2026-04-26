import {
  Show,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  onCleanup,
  untrack,
  type JSX,
} from 'solid-js';
import { Portal } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { Button } from './Button';
import { X } from '../icons';
import { useResolvedFloeConfig } from '../../context/FloeConfigContext';
import { useOverlayMask } from '../../hooks/useOverlayMask';
import { DIALOG_SURFACE_BOUNDARY_ATTR, type ResolvedDialogSurfaceHost } from './dialogSurfaceScope';
import { LOCAL_INTERACTION_SURFACE_ATTR } from './localInteractionSurface';
import {
  isSurfacePortalMode,
  projectSurfacePortalRect,
  resolveSurfacePortalBoundaryRect,
  resolveSurfacePortalHost,
  resolveSurfacePortalMount,
  type SurfacePortalBoundaryRect,
} from './surfacePortalScope';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Dialog title - can be a string or JSX element for custom headers */
  title?: string | JSX.Element;
  description?: string;
  children: JSX.Element;
  footer?: JSX.Element;
  class?: string;
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
  const baseId = createUniqueId();
  const titleId = () => `dialog-${baseId}-title`;
  const descriptionId = () => `dialog-${baseId}-description`;
  let dialogRef: HTMLDivElement | undefined;
  const [ownerAnchor, setOwnerAnchor] = createSignal<HTMLElement | null>(null);
  const [ownerAnchorReadyVersion, setOwnerAnchorReadyVersion] = createSignal(0);
  const [surfaceGeometryVersion, setSurfaceGeometryVersion] = createSignal(0);
  const isMountedOpen = () => props.open && Boolean(ownerAnchor()) && ownerAnchorReadyVersion() > 0;
  const setDialogOwnerAnchor = (element: HTMLElement): void => {
    setOwnerAnchor(element);
    scheduleDialogOwnerAnchorReady(() => {
      if (untrack(ownerAnchor) === element) {
        setOwnerAnchorReadyVersion((value) => value + 1);
      }
    });
  };
  const surfaceHost = createMemo<ResolvedDialogSurfaceHost>(() =>
    isMountedOpen()
      ? resolveSurfacePortalHost({ owner: ownerAnchor() })
      : { host: null, boundaryHost: null, mountHost: null, mode: 'global' }
  );
  const dialogBoundaryId = () => `dialog-boundary-${baseId}`;
  const isSurfaceMode = () => isSurfacePortalMode(surfaceHost());
  const portalMount = () => resolveSurfacePortalMount(surfaceHost());
  const readProjectedBoundaryRectForHost = (host: ResolvedDialogSurfaceHost) =>
    projectSurfacePortalRect(resolveSurfacePortalBoundaryRect(host), host);
  const readProjectedBoundaryRect = () => readProjectedBoundaryRectForHost(surfaceHost());
  const projectedBoundaryRect = createMemo(() => {
    surfaceGeometryVersion();
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
    if (!isMountedOpen() || !isSurfacePortalMode(currentHost) || typeof window === 'undefined') {
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
    open: isMountedOpen,
    root: () => dialogRef,
    containsTarget: (target) => isSurfaceMode() && isWithinDialogBoundary(target),
    onClose: () => props.onOpenChange(false),
    lockBodyScroll: () => !isSurfaceMode(),
    trapFocus: true,
    closeOnEscape: () => (isSurfaceMode() ? 'inside' : true),
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
      <Show when={isMountedOpen()}>
        <Portal mount={portalMount()}>
          <div
            data-floe-dialog-overlay-root={baseId}
            data-floe-dialog-mode={isSurfaceMode() ? 'surface' : 'global'}
            {...{ [LOCAL_INTERACTION_SURFACE_ATTR]: isSurfaceMode() ? 'true' : undefined }}
            class={cn(
              isSurfaceMode() ? 'absolute z-20 box-border p-3' : 'fixed inset-0 box-border z-50 p-4'
            )}
            style={
              isSurfaceMode()
                ? {
                    left: `${projectedBoundaryRect().left}px`,
                    top: `${projectedBoundaryRect().top}px`,
                    width: `${projectedBoundaryRect().width}px`,
                    height: `${projectedBoundaryRect().height}px`,
                  }
                : undefined
            }
          >
            {/* Backdrop */}
            <div
              data-floe-dialog-backdrop={baseId}
              {...{ [DIALOG_SURFACE_BOUNDARY_ATTR]: dialogBoundaryId() }}
              class={cn(
                'absolute inset-0 cursor-pointer animate-in fade-in',
                isSurfaceMode()
                  ? 'bg-background/72 backdrop-blur-[2px]'
                  : 'bg-background/80 backdrop-blur-sm'
              )}
              onClick={() => props.onOpenChange(false)}
            />

            {/* Dialog */}
            <div class="relative z-[1] flex h-full w-full items-center justify-center">
              <div
                ref={dialogRef}
                data-floe-dialog-panel={baseId}
                {...{ [DIALOG_SURFACE_BOUNDARY_ATTR]: dialogBoundaryId() }}
                class={cn(
                  isSurfaceMode()
                    ? 'flex max-h-[calc(100%-1rem)] w-[min(32rem,calc(100%-1rem))] max-w-[calc(100%-1rem)] flex-col'
                    : 'w-full max-w-md max-h-[85vh]',
                  'bg-card text-card-foreground rounded-md shadow-lg',
                  'border border-border',
                  'animate-in fade-in zoom-in-95',
                  'flex flex-col',
                  props.class
                )}
                role="dialog"
                aria-modal={isSurfaceMode() ? undefined : 'true'}
                aria-labelledby={props.title ? titleId() : undefined}
                aria-describedby={props.description ? descriptionId() : undefined}
                tabIndex={-1}
              >
                {/* Header */}
                <Show when={props.title || props.description}>
                  <div class="flex items-start justify-between p-3 border-b border-border">
                    <div>
                      <Show when={props.title}>
                        <h2 id={titleId()} class="text-sm font-semibold">
                          {props.title}
                        </h2>
                      </Show>
                      <Show when={props.description}>
                        <p id={descriptionId()} class="mt-0.5 text-xs text-muted-foreground">
                          {props.description}
                        </p>
                      </Show>
                    </div>
                    <Button
                      variant="ghost-destructive"
                      size="icon"
                      class="h-6 w-6 -mr-1"
                      onClick={() => props.onOpenChange(false)}
                      aria-label="Close"
                    >
                      <X class="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Show>

                {/* Content */}
                <div class="flex-1 overflow-auto overscroll-contain p-3">{props.children}</div>

                {/* Footer */}
                <Show when={props.footer}>
                  <div class="flex items-center justify-end gap-2 p-3 border-t border-border">
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
  /** Description displayed under title (header area). Use children for content area. */
  description?: string;
  /** Custom content in the dialog body. If not provided, an empty placeholder is used. */
  children?: JSX.Element;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  const floe = useResolvedFloeConfig();
  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={props.title}
      description={props.description}
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
      {props.children ?? <div />}
    </Dialog>
  );
}
