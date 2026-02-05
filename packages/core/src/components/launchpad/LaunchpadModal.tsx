import { Show, createEffect, createMemo, onCleanup, type JSX } from 'solid-js';
import { Portal } from 'solid-js/web';
import { lockBodyStyle } from '../../utils/bodyStyleLock';
import { deferNonBlocking } from '../../utils/defer';
import { Launchpad, type LaunchpadItemData } from './Launchpad';

export interface LaunchpadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  items: LaunchpadItemData[];
  additionalItems?: LaunchpadItemData[];
  itemsPerPage?: number;
  columns?: number;
  showSearch?: boolean;
  class?: string;
  style?: JSX.CSSProperties;

  /** Called after the modal reacts (closes first when closeOnSelect is enabled). */
  onSelect?: (item: LaunchpadItemData) => void;

  /**
   * Whether to close the modal when an item is selected (default: true).
   * Use a function for per-item control.
   */
  closeOnSelect?: boolean | ((item: LaunchpadItemData) => boolean);
}

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(',');

  return Array.from(root.querySelectorAll(selector)).filter((el): el is HTMLElement => el instanceof HTMLElement);
}

/**
 * Modal wrapper for Launchpad.
 *
 * Guarantees "mask semantics":
 * - Wheel keeps Launchpad pagination working but prevents background scroll.
 * - Escape closes the modal and does not leak to underlying global shortcuts.
 */
export function LaunchpadModal(props: LaunchpadModalProps) {
  let rootRef: HTMLDivElement | undefined;

  const onOpenChange = createMemo(() => props.onOpenChange);
  const onSelect = createMemo(() => props.onSelect);

  const close = () => onOpenChange()(false);

  // Enforce a single side-effect channel: LaunchpadItemData.onClick is ignored in modal mode.
  const items = createMemo<LaunchpadItemData[]>(() => props.items.map((item) => ({ ...item, onClick: undefined })));
  const additionalItems = createMemo<LaunchpadItemData[] | undefined>(() =>
    props.additionalItems?.map((item) => ({ ...item, onClick: undefined }))
  );

  const shouldCloseOnSelect = (item: LaunchpadItemData) => {
    const rule = props.closeOnSelect;
    if (typeof rule === 'function') return rule(item);
    return rule !== false;
  };

  const handleSelect = (item: LaunchpadItemData) => {
    if (shouldCloseOnSelect(item)) close();
    const cb = onSelect();
    if (!cb) return;
    // UI-first: let the close paint first, then run user logic.
    deferNonBlocking(() => cb(item));
  };

  createEffect(() => {
    if (!props.open) return;
    if (typeof document === 'undefined') return;

    const prevActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Prevent body scroll (helps on iOS). Note: Shell's main scroller is not body,
    // so we also block wheel/touchmove below.
    const unlockBody = lockBodyStyle({ overflow: 'hidden' });

    const focusFirst = () => {
      const root = rootRef;
      if (!root) return;

      const search = root.querySelector<HTMLInputElement>('.launchpad-search input');
      if (search) {
        search.focus();
        return;
      }

      const focusables = getFocusableElements(root);
      const target = focusables[0] ?? root;
      target.focus();
    };

    // Defer focus so Portal content is mounted.
    setTimeout(focusFirst, 0);

    // Trap Tab within the modal (mirrors Dialog behavior).
    const handleTabTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const root = rootRef;
      if (!root) return;

      const focusables = getFocusableElements(root);
      if (!focusables.length) {
        e.preventDefault();
        root.focus();
        return;
      }

      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;

      if (e.shiftKey) {
        if (active === first || !active || !root.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    // Escape should close only the modal and never reach underlying document/window handlers.
    const handleEscapeCapture = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      close();
    };

    // Block global shortcuts registered on window (bubble) without breaking typing.
    // This runs after the target has handled the keydown.
    const handleKeydownBubble = (e: KeyboardEvent) => {
      e.stopPropagation();
    };

    // Prevent background scroll while allowing Launchpad to consume wheel deltas for pagination.
    const handleWheelCapture = (e: WheelEvent) => {
      if (e.cancelable) e.preventDefault();
    };
    const handleWheelBubble = (e: WheelEvent) => {
      e.stopPropagation();
    };

    // iOS: prevent touch scroll bleed.
    const handleTouchMoveCapture = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
    };

    document.addEventListener('keydown', handleTabTrap, true);
    window.addEventListener('keydown', handleEscapeCapture, true);
    document.addEventListener('keydown', handleKeydownBubble);

    document.addEventListener('wheel', handleWheelCapture, { capture: true, passive: false });
    document.addEventListener('wheel', handleWheelBubble);
    document.addEventListener('touchmove', handleTouchMoveCapture, { capture: true, passive: false });

    onCleanup(() => {
      document.removeEventListener('keydown', handleTabTrap, true);
      window.removeEventListener('keydown', handleEscapeCapture, true);
      document.removeEventListener('keydown', handleKeydownBubble);

      document.removeEventListener('wheel', handleWheelCapture, true);
      document.removeEventListener('wheel', handleWheelBubble);
      document.removeEventListener('touchmove', handleTouchMoveCapture, true);

      unlockBody();
      prevActive?.focus();
    });
  });

  return (
    <Show when={props.open}>
      <Portal>
        <div ref={rootRef} role="dialog" aria-modal="true" tabIndex={-1}>
          <Launchpad
            items={items()}
            additionalItems={additionalItems()}
            itemsPerPage={props.itemsPerPage}
            columns={props.columns}
            showSearch={props.showSearch}
            class={props.class}
            style={props.style}
            onItemClick={handleSelect}
            onClose={close}
          />
        </div>
      </Portal>
    </Show>
  );
}
