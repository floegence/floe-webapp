import { createEffect, onCleanup, type Accessor } from 'solid-js';
import { lockBodyStyle } from '../utils/bodyStyleLock';
import { deferAfterPaint } from '../utils/defer';
import { getFocusableElements, getFirstFocusableElement } from '../utils/focus';
import { matchKeybind } from '../utils/keybind';

export type OverlayScrollBlockMode = 'none' | 'outside' | 'all';
export type OverlayEscapeCloseMode = 'none' | 'inside' | 'always';

export interface UseOverlayMaskOptions {
  open: Accessor<boolean>;
  root: Accessor<HTMLElement | undefined>;
  onClose?: () => void;
  /** Treat additional nodes as part of the overlay surface (e.g. portaled layers). */
  containsTarget?: (target: EventTarget | null) => boolean;
  /** Optional alternate close path for Escape pressed outside the overlay surface. */
  onEscapeOutside?: () => void;

  /** Lock `document.body` scroll while the overlay is open (default: true). */
  lockBodyScroll?: boolean;

  /** Prevent scroll via wheel events (default: none). */
  blockWheel?: OverlayScrollBlockMode;

  /** Prevent scroll via touch-move events (default: none). */
  blockTouchMove?: OverlayScrollBlockMode;

  /** Keep tab focus within the overlay root (default: true). */
  trapFocus?: boolean;

  /** Close on Escape and never leak to underlying window handlers (default: always). */
  closeOnEscape?: boolean | OverlayEscapeCloseMode;

  /** Stop bubbling keydown events to window-level hotkeys (default: true). */
  blockHotkeys?: boolean;

  /**
   * Allow a small set of global keybinds to continue bubbling to window-level handlers
   * while the overlay is focused. This is primarily used by floating overlays that must
   * preserve one or two shell-owned shortcuts such as their own toggle keybind.
   */
  allowHotkeys?: readonly string[] | Accessor<readonly string[] | undefined>;

  /** Auto-focus on open (default: true). */
  autoFocus?: boolean | { selector?: string };

  /** Restore focus to the previously active element on close (default: true). */
  restoreFocus?: boolean;
}

function isNode(target: unknown): target is Node {
  return typeof Node !== 'undefined' && target instanceof Node;
}

function isWithinOverlayTarget(
  root: HTMLElement | undefined,
  target: EventTarget | null,
  containsTarget?: (target: EventTarget | null) => boolean,
): boolean {
  if (containsTarget) return containsTarget(target);
  if (!root) return false;
  if (!isNode(target)) return false;
  return root.contains(target);
}

function shouldBlockByMode(
  root: HTMLElement | undefined,
  target: EventTarget | null,
  mode: OverlayScrollBlockMode,
  containsTarget?: (target: EventTarget | null) => boolean,
): boolean {
  if (mode === 'none') return false;
  if (mode === 'all') return true;
  // mode === 'outside'
  return !isWithinOverlayTarget(root, target, containsTarget);
}

function resolveAllowedHotkeys(
  allowHotkeys: UseOverlayMaskOptions['allowHotkeys'],
): readonly string[] {
  if (typeof allowHotkeys === 'function') {
    return allowHotkeys() ?? [];
  }
  return allowHotkeys ?? [];
}

function shouldAllowHotkey(
  event: KeyboardEvent,
  allowHotkeys: UseOverlayMaskOptions['allowHotkeys'],
): boolean {
  for (const keybind of resolveAllowedHotkeys(allowHotkeys)) {
    const normalizedKeybind = keybind.trim();
    if (!normalizedKeybind) continue;
    if (matchKeybind(event, normalizedKeybind)) {
      return true;
    }
  }
  return false;
}

export function useOverlayMask(options: UseOverlayMaskOptions): void {
  const lockBodyScroll = () => options.lockBodyScroll !== false;
  const trapFocus = () => options.trapFocus !== false;
  const closeOnEscape = (): OverlayEscapeCloseMode => {
    if (options.closeOnEscape === false) return 'none';
    if (options.closeOnEscape === 'inside') return 'inside';
    if (options.closeOnEscape === 'none') return 'none';
    return 'always';
  };
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
      const closeMode = closeOnEscape();
      if (closeMode === 'none') return;
      const root = options.root();
      const inside = isWithinOverlayTarget(root, isNode(e.target) ? e.target : document.activeElement, options.containsTarget);

      if (closeMode === 'inside') {
        if (inside) {
          e.preventDefault();
          e.stopImmediatePropagation();
          options.onClose?.();
          return;
        }

        if (options.onEscapeOutside) {
          e.preventDefault();
          e.stopImmediatePropagation();
          options.onEscapeOutside();
        }
        return;
      }

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
      if (!isWithinOverlayTarget(root, e.target, options.containsTarget)) return;
      if (shouldAllowHotkey(e, options.allowHotkeys)) return;
      e.stopPropagation();
    };

    const handleWheelCapture = (e: WheelEvent) => {
      const mode = options.blockWheel ?? 'none';
      const root = options.root();
      if (!shouldBlockByMode(root, e.target, mode, options.containsTarget)) return;
      if (e.cancelable) e.preventDefault();
    };
    const handleWheelBubble = (e: WheelEvent) => {
      e.stopPropagation();
    };

    const handleTouchMoveCapture = (e: TouchEvent) => {
      const mode = options.blockTouchMove ?? 'none';
      const root = options.root();
      if (!shouldBlockByMode(root, e.target, mode, options.containsTarget)) return;
      if (e.cancelable) e.preventDefault();
    };

    if (trapFocus()) document.addEventListener('keydown', handleTabTrap, true);
    if (closeOnEscape() !== 'none') window.addEventListener('keydown', handleEscapeCapture, true);
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
      if (closeOnEscape() !== 'none') window.removeEventListener('keydown', handleEscapeCapture, true);
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
