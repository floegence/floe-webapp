import { Show, createMemo, type JSX } from 'solid-js';
import { Portal } from 'solid-js/web';
import { deferNonBlocking } from '../../utils/defer';
import { useOverlayMask } from '../../hooks/useOverlayMask';
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

  useOverlayMask({
    open: () => props.open,
    root: () => rootRef,
    onClose: close,
    lockBodyScroll: true,
    trapFocus: true,
    closeOnEscape: true,
    blockHotkeys: true,
    // Launchpad uses wheel deltas for pagination, so we block default scrolling unconditionally.
    blockWheel: 'all',
    // iOS: prevent touch scroll bleed (Launchpad is full-screen and does not need native scrolling).
    blockTouchMove: 'all',
    autoFocus: { selector: '.launchpad-search input' },
    restoreFocus: true,
  });

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
