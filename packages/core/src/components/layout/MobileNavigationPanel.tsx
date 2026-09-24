import { Show, createEffect, createMemo, createUniqueId, onCleanup, untrack, type JSX } from 'solid-js';
import { useOverlayMask } from '../../hooks/useOverlayMask';
import { createFloatingPresence } from '../ui/floatingPresence';
import { cn } from '../../utils/cn';
import { deferAfterPaint } from '../../utils/defer';
import { X } from '../icons';

export interface MobileNavigationPanelProps {
  id: string;
  open: boolean;
  title: string;
  children: JSX.Element;
  onOpenChange: (open: boolean) => void;
  trigger?: HTMLElement | null;
  /** Null allows content with its own identity and close controls. */
  header?: JSX.Element;
  closeLabel?: string;
  class?: string;
  contentClass?: string;
  onKeyDown?: JSX.EventHandler<HTMLDivElement, KeyboardEvent>;
  onPresenceChange?: (present: boolean) => void;
}

/** Shell-owned navigation surface; its backdrop never covers the bottom navigation. */
export function MobileNavigationPanel(props: MobileNavigationPanelProps & {
  navigation: () => HTMLElement | undefined;
}) {
  const titleId = `mobile-navigation-${createUniqueId()}`;
  const presence = createFloatingPresence({ open: () => props.open, exitDurationMs: 180 });
  let panel: HTMLDivElement | undefined;
  let restoreTarget: HTMLElement | null = null;
  const dismiss = () => {
    restoreTarget = props.trigger ?? null;
    props.onOpenChange(false);
  };
  createEffect(() => {
    const present = presence.mounted();
    props.onPresenceChange?.(present);
    if (!present && restoreTarget) {
      const target = restoreTarget;
      restoreTarget = null;
      if (target.isConnected && !target.closest('[hidden], [inert]')) target.focus({ preventScroll: true });
    }
  });
  onCleanup(() => props.onPresenceChange?.(false));
  const openPanelId = createMemo(() => props.open ? props.id : null);
  createEffect(() => {
    const id = openPanelId();
    if (id === null) return;
    restoreTarget = null;
    let currentEntry = true;
    onCleanup(() => { currentEntry = false; });
    // Explicit entry also moves focus from the still-interactive navigation trigger.
    // Content updates must not schedule entry focus again while this panel stays open.
    deferAfterPaint(() => untrack(() => {
      if (!currentEntry || !props.open || props.id !== id || !panel?.isConnected) return;
      const active = panel.ownerDocument.activeElement;
      if (active && panel.contains(active)) return;
      (panel.querySelector<HTMLElement>('[data-floe-autofocus]') ?? panel).focus({ preventScroll: true });
    }));
  });
  useOverlayMask({
    open: presence.mounted,
    root: () => panel,
    focusRoots: () => [panel, props.navigation()].filter((node): node is HTMLElement => Boolean(node)),
    containsTarget: (target) => target instanceof Node && Boolean(panel?.contains(target) || props.navigation()?.contains(target)),
    onClose: dismiss,
    lockBodyScroll: false,
    trapFocus: true,
    blockWheel: 'outside',
    blockTouchMove: 'outside',
    escapeKeyPhase: 'bubble',
    autoFocus: false,
    restoreFocus: false,
  });
  // Keep callers' content owners alive while the chrome enters and leaves.
  const content = createMemo(() => props.children);
  return <Show when={presence.mounted()}>
    <div data-floe-mobile-navigation-overlay data-floating-presence={presence.state()}
      class="absolute inset-0 z-50 overflow-hidden p-2">
      <div class="absolute inset-0 floe-floating-presence floe-floating-backdrop floe-bottom-drawer-backdrop"
        data-floe-mobile-navigation-backdrop data-floating-presence={presence.state()}
        onClick={() => { if (props.open) dismiss(); }} />
      <div class="relative pointer-events-none flex h-full min-h-0 items-end justify-center">
        <div ref={panel} id={props.id} role="dialog" aria-labelledby={titleId} tabIndex={-1}
          data-floe-mobile-navigation-panel data-floe-surface="floating" data-floe-surface-portal-layer="true"
          data-floating-presence={presence.state()} inert={presence.exiting()}
          aria-hidden={presence.exiting() ? 'true' : undefined}
          class={cn('pointer-events-auto relative flex min-h-0 w-full max-w-[640px] flex-col border border-border bg-card text-card-foreground shadow-xl floe-floating-presence floe-bottom-drawer-panel', props.class)}
          style={{ 'max-height': 'min(680px, 86%)', 'border-radius': '24px' }}
          onKeyDown={(event) => props.onKeyDown?.(event)}>
          <Show when={props.header === undefined} fallback={<><h2 id={titleId} class="sr-only">{props.title}</h2>{props.header}</>}>
            <header class="flex shrink-0 items-center gap-2 border-b px-4 py-2">
              <h2 id={titleId} class="min-w-0 flex-1 text-base font-semibold">{props.title}</h2>
              <button type="button" data-floe-autofocus aria-label={props.closeLabel ?? 'Close'}
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={dismiss}><X class="h-5 w-5" /></button>
            </header>
          </Show>
          <div class={cn('flex min-h-0 flex-col overflow-auto overscroll-contain', props.contentClass)}>{content()}</div>
        </div>
      </div>
    </div>
  </Show>;
}
