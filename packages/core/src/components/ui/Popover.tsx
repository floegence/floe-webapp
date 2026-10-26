import {
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  type Accessor,
  type JSX,
} from 'solid-js';
import { Portal } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { calculateMenuPosition, type MenuBoundaryRect } from './menuUtils';
import { LOCAL_INTERACTION_SURFACE_ATTR } from './localInteractionSurface';
import {
  isSurfacePortalMode,
  projectSurfacePortalPosition,
  resolveSurfacePortalBoundaryRect,
  resolveSurfacePortalHost,
  resolveSurfacePortalMount,
  type ResolvedSurfacePortalHost,
} from './surfacePortalScope';
import { createFloatingPresence } from './floatingPresence';
import { useOverlayMask } from '../../hooks/useOverlayMask';

export type PopoverPlacement = 'bottom-start' | 'bottom-center' | 'bottom-end' | 'top-start' | 'top-center' | 'top-end';

export interface PopoverProps {
  /** The element that opens the panel. It keeps its own layout and semantics. */
  trigger: JSX.Element;
  children: JSX.Element | ((close: () => void) => JSX.Element);
  /** Controlled visibility. Omit for uncontrolled use with `defaultOpen`. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  placement?: PopoverPlacement;
  /** Accessible name for the panel. */
  ariaLabel?: string;
  /** Panel width in CSS pixels. Content can still shrink below it. */
  width?: number;
  class?: string;
  /** Reset the trigger boundary onto an input surface instead of a plain button. */
  triggerInputSurface?: boolean;
  /**
   * Panel content that owns its own pointer semantics, such as a native text
   * selection, still closes on outside pointer input.
   */
  closeOnEscape?: boolean;
}

let popoverIdSeq = 0;

/**
 * A non-modal anchored panel.
 *
 * Unlike Dropdown it carries no menu semantics: the panel is a plain labelled
 * region, so it can host forms, previews, or reading content. Placement,
 * portal ownership, and exit motion reuse the same primitives as the menu so
 * both layers move and dismiss identically.
 */
export function Popover(props: PopoverProps) {
  const isControlled = () => props.open !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = createSignal(props.defaultOpen ?? false);
  const open: Accessor<boolean> = () => (isControlled() ? Boolean(props.open) : uncontrolledOpen());

  const setOpen = (next: boolean) => {
    if (!isControlled()) setUncontrolledOpen(next);
    if (next !== open()) props.onOpenChange?.(next);
  };

  const presence = createFloatingPresence({ open, element: () => panelRef });
  const [position, setPosition] = createSignal({ x: -9999, y: -9999 });
  let triggerRef: HTMLDivElement | undefined;
  let panelRef: HTMLDivElement | undefined;

  const popoverId = `floe-popover-${(popoverIdSeq += 1)}`;
  const panelId = `${popoverId}-panel`;

  const surfaceHost = createMemo<ResolvedSurfacePortalHost>(() =>
    presence.mounted()
      ? resolveSurfacePortalHost({ owner: triggerRef })
      : { host: null, boundaryHost: null, mountHost: null, mode: 'global' }
  );
  const mount = () => resolveSurfacePortalMount(surfaceHost());
  const isSurfaceMode = () => isSurfacePortalMode(surfaceHost());
  const boundaryRect = (): MenuBoundaryRect => resolveSurfacePortalBoundaryRect(surfaceHost());
  const project = (point: { x: number; y: number }) =>
    projectSurfacePortalPosition(point, surfaceHost());

  type Side = 'top' | 'bottom';
  type Align = 'start' | 'center' | 'end';
  const side = (): Side => ((props.placement ?? 'bottom-start').startsWith('top') ? 'top' : 'bottom');
  const align = (): Align =>
    (props.placement ?? 'bottom-start').slice(side() === 'top' ? 5 : 7) as Align;

  const close = () => setOpen(false);

  useOverlayMask({
    open: presence.mounted,
    root: () => panelRef,
    containsTarget: (target) => {
      const element = target instanceof Element ? target : document.activeElement;
      if (element?.closest(`[data-floe-popover="${popoverId}"]`)) return true;
      return Boolean(triggerRef?.contains(element ?? null));
    },
    onClose: () => setOpen(false),
    onEscapeOutside: () => setOpen(false),
    lockBodyScroll: false,
    trapFocus: false,
    autoFocus: false,
    restoreFocus: false,
    blockHotkeys: false,
    closeOnEscape: () => (props.closeOnEscape === false ? false : 'inside'),
    escapeKeyPhase: 'bubble',
  });

  const updatePosition = () => {
    if (!triggerRef || !panelRef) return;
    const base = calculateMenuPosition(
      triggerRef.getBoundingClientRect(),
      panelRef.getBoundingClientRect(),
      align(),
      boundaryRect()
    );
    // `calculateMenuPosition` places the panel below the trigger. A top
    // placement mirrors it across the trigger's own height.
    if (side() === 'top') {
      const triggerRect = triggerRef.getBoundingClientRect();
      const panelRect = panelRef.getBoundingClientRect();
      setPosition({ x: base.x, y: triggerRect.top - panelRect.height - 6 });
      return;
    }
    setPosition(base);
  };

  createEffect(() => {
    if (!presence.mounted()) {
      setPosition({ x: -9999, y: -9999 });
      return;
    }
    const frame = requestAnimationFrame(updatePosition);
    const reposition = () => updatePosition();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    onCleanup(() => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    });
  });

  return (
    <div class="relative inline-flex" data-floe-popover={popoverId}>
      <div
        ref={triggerRef}
        class="inline-flex"
        data-floe-popover-trigger=""
        data-floe-input-surface={props.triggerInputSurface ? 'true' : undefined}
        data-floe-surface={props.triggerInputSurface ? 'inset' : undefined}
        aria-haspopup="dialog"
        aria-expanded={open()}
        aria-controls={presence.mounted() ? panelId : undefined}
        onClick={() => setOpen(!open())}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open()) {
            event.stopPropagation();
            setOpen(false);
          }
        }}
      >
        {props.trigger}
      </div>

      <Show when={presence.mounted()}>
        <Portal mount={mount()}>
          <div
            ref={panelRef}
            id={panelId}
            class={cn(
              isSurfaceMode() ? 'absolute z-20' : 'fixed z-50',
              'bg-popover text-popover-foreground',
              'rounded-panel border border-[var(--floe-line)]',
              'shadow-[var(--floe-window-shadow)]',
              'floe-floating-presence floe-floating-menu',
              props.class
            )}
            data-floe-popover-panel=""
            data-floating-presence={presence.state()}
            aria-hidden={presence.exiting() ? 'true' : undefined}
            role="dialog"
            aria-label={props.ariaLabel}
            aria-modal="false"
            data-floe-surface="floating"
            style={{
              left: `${project(position()).x}px`,
              top: `${project(position()).y}px`,
              'min-width': props.width ? `${props.width}px` : undefined,
              'max-width': 'min(calc(100vw - 24px), 420px)',
            }}
            {...{
              [LOCAL_INTERACTION_SURFACE_ATTR]: isSurfaceMode() ? 'true' : undefined,
            }}
          >
            {typeof props.children === 'function'
              ? (props.children as (close: () => void) => JSX.Element)(close)
              : props.children}
          </div>
        </Portal>
      </Show>
    </div>
  );
}
