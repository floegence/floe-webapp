import { createEffect, onCleanup, type Accessor } from 'solid-js';
import { lockBodyStyle } from '../utils/bodyStyleLock';
import { deferAfterPaint } from '../utils/defer';
import { getFocusableElements, getFirstFocusableElement } from '../utils/focus';

export type OverlayScrollBlockMode = 'none' | 'outside' | 'all';

export interface UseOverlayMaskOptions {
  open: Accessor<boolean>;
  root: Accessor<HTMLElement | undefined>;
  onClose?: () => void;

  /** Lock `document.body` scroll while the overlay is open (default: true). */
  lockBodyScroll?: boolean;

  /** Prevent scroll via wheel events (default: none). */
  blockWheel?: OverlayScrollBlockMode;

  /** Prevent scroll via touch-move events (default: none). */
  blockTouchMove?: OverlayScrollBlockMode;

  /** Keep tab focus within the overlay root (default: true). */
  trapFocus?: boolean;

  /** Close on Escape and never leak to underlying window handlers (default: true). */
  closeOnEscape?: boolean;

  /** Stop bubbling keydown events to window-level hotkeys (default: true). */
  blockHotkeys?: boolean;

  /** Auto-focus on open (default: true). */
  autoFocus?: boolean | { selector?: string };

  /** Restore focus to the previously active element on close (default: true). */
  restoreFocus?: boolean;
}

function isNode(target: unknown): target is Node {
  return typeof Node !== 'undefined' && target instanceof Node;
}

function shouldBlockByMode(root: HTMLElement | undefined, target: EventTarget | null, mode: OverlayScrollBlockMode): boolean {
  if (mode === 'none') return false;
  if (mode === 'all') return true;
  // mode === 'outside'
  if (!root) return true;
  if (!isNode(target)) return true;
  return !root.contains(target);
}

export function useOverlayMask(options: UseOverlayMaskOptions): void {
  const lockBodyScroll = () => options.lockBodyScroll !== false;
  const trapFocus = () => options.trapFocus !== false;
  const closeOnEscape = () => options.closeOnEscape !== false;
  const blockHotkeys = () => options.blockHotkeys !== false;
  const restoreFocus = () => options.restoreFocus !== false;

  createEffect(() => {
    if (!options.open()) return;
    if (typeof document === 'undefined') return;

    const prevActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const unlockBody = lockBodyScroll() ? lockBodyStyle({ overflow: 'hidden' }) : null;

    // Focus management is deferred to ensure Portal DOM is mounted and at least one paint is not blocked.
    const focusOnOpen = () => {
      const root = options.root();
      if (!root) return;

      const autofocus = options.autoFocus;
      if (autofocus === false) return;

      const preferredSelector = typeof autofocus === 'object' ? autofocus.selector : undefined;
      const preferred = preferredSelector ? root.querySelector<HTMLElement>(preferredSelector) : null;
      const target =
        preferred ??
        root.querySelector<HTMLElement>('[data-floe-autofocus]') ??
        getFirstFocusableElement(root) ??
        root;

      try {
        target.focus();
      } catch {
        // Ignore focus failures (e.g. detached or non-focusable nodes).
      }
    };

    deferAfterPaint(focusOnOpen);

    const handleTabTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const root = options.root();
      if (!root) return;

      const focusables = getFocusableElements(root);
      if (!focusables.length) {
        e.preventDefault();
        try {
          root.focus();
        } catch {
          // ignore
        }
        return;
      }

      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;

      if (e.shiftKey) {
        if (active === first || !active || !root.contains(active)) {
          e.preventDefault();
          try {
            last.focus();
          } catch {
            // ignore
          }
        }
      } else {
        if (active === last) {
          e.preventDefault();
          try {
            first.focus();
          } catch {
            // ignore
          }
        }
      }
    };

    const handleEscapeCapture = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      options.onClose?.();
    };

    // Stop keydown bubbling to window-level shortcuts, but keep typing behavior intact
    // (the target/input still receives the event; we only block propagation after that).
    const handleKeydownBubble = (e: KeyboardEvent) => {
      const root = options.root();
      if (!root) return;
      if (!blockHotkeys()) return;
      if (!isNode(e.target)) return;
      if (!root.contains(e.target)) return;
      e.stopPropagation();
    };

    const handleWheelCapture = (e: WheelEvent) => {
      const mode = options.blockWheel ?? 'none';
      const root = options.root();
      if (!shouldBlockByMode(root, e.target, mode)) return;
      if (e.cancelable) e.preventDefault();
    };
    const handleWheelBubble = (e: WheelEvent) => {
      e.stopPropagation();
    };

    const handleTouchMoveCapture = (e: TouchEvent) => {
      const mode = options.blockTouchMove ?? 'none';
      const root = options.root();
      if (!shouldBlockByMode(root, e.target, mode)) return;
      if (e.cancelable) e.preventDefault();
    };

    if (trapFocus()) document.addEventListener('keydown', handleTabTrap, true);
    if (closeOnEscape()) window.addEventListener('keydown', handleEscapeCapture, true);
    document.addEventListener('keydown', handleKeydownBubble);

    if ((options.blockWheel ?? 'none') !== 'none') {
      document.addEventListener('wheel', handleWheelCapture, { capture: true, passive: false });
      document.addEventListener('wheel', handleWheelBubble);
    }
    if ((options.blockTouchMove ?? 'none') !== 'none') {
      document.addEventListener('touchmove', handleTouchMoveCapture, { capture: true, passive: false });
    }

    onCleanup(() => {
      if (trapFocus()) document.removeEventListener('keydown', handleTabTrap, true);
      if (closeOnEscape()) window.removeEventListener('keydown', handleEscapeCapture, true);
      document.removeEventListener('keydown', handleKeydownBubble);

      if ((options.blockWheel ?? 'none') !== 'none') {
        document.removeEventListener('wheel', handleWheelCapture, true);
        document.removeEventListener('wheel', handleWheelBubble);
      }
      if ((options.blockTouchMove ?? 'none') !== 'none') {
        document.removeEventListener('touchmove', handleTouchMoveCapture, true);
      }

      unlockBody?.();

      if (restoreFocus() && prevActive && prevActive.isConnected) {
        // Restore focus after unmount/paint to avoid forcing layout in the close stack.
        deferAfterPaint(() => {
          if (typeof document === 'undefined') return;
          const active = document.activeElement;
          if (active && active !== document.body && active !== document.documentElement) return;
          try {
            prevActive.focus();
          } catch {
            // ignore
          }
        });
      }
    });
  });
}
