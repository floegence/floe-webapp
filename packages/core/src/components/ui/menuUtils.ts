export const VIEWPORT_MARGIN = 8;
export const MENU_ITEM_SELECTOR = '[role="menuitem"]:not([disabled]):not([aria-disabled="true"])';

export type MenuFocusMode = 'first' | 'last' | 'selected';

export function calculateMenuPosition(
  triggerRect: DOMRect,
  menuRect: DOMRect,
  align: 'start' | 'center' | 'end'
): { x: number; y: number } {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let x: number;
  switch (align) {
    case 'center':
      x = triggerRect.left + triggerRect.width / 2 - menuRect.width / 2;
      break;
    case 'end':
      x = triggerRect.right - menuRect.width;
      break;
    default:
      x = triggerRect.left;
  }

  let y = triggerRect.bottom + 4;

  if (x + menuRect.width > viewportWidth - VIEWPORT_MARGIN) {
    x = viewportWidth - menuRect.width - VIEWPORT_MARGIN;
  }
  x = Math.max(VIEWPORT_MARGIN, x);

  if (y + menuRect.height > viewportHeight - VIEWPORT_MARGIN) {
    const spaceAbove = triggerRect.top - VIEWPORT_MARGIN;
    const spaceBelow = viewportHeight - triggerRect.bottom - VIEWPORT_MARGIN;

    if (spaceAbove > spaceBelow && spaceAbove >= menuRect.height) {
      y = triggerRect.top - menuRect.height - 4;
    } else {
      y = viewportHeight - menuRect.height - VIEWPORT_MARGIN;
    }
  }

  y = Math.max(VIEWPORT_MARGIN, y);

  return { x, y };
}

export function calculateSubmenuPosition(
  parentRect: DOMRect,
  submenuRect: DOMRect
): { x: number; y: number } {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let x = parentRect.right;
  let y = parentRect.top;

  if (x + submenuRect.width > viewportWidth - VIEWPORT_MARGIN) {
    const leftPosition = parentRect.left - submenuRect.width;
    if (leftPosition >= VIEWPORT_MARGIN) {
      x = leftPosition;
    } else {
      x = viewportWidth - submenuRect.width - VIEWPORT_MARGIN;
    }
  }

  if (y + submenuRect.height > viewportHeight - VIEWPORT_MARGIN) {
    y = viewportHeight - submenuRect.height - VIEWPORT_MARGIN;
  }

  x = Math.max(VIEWPORT_MARGIN, x);
  y = Math.max(VIEWPORT_MARGIN, y);

  return { x, y };
}

export function getWrappedMenuItemIndex(
  length: number,
  currentIndex: number,
  delta: 1 | -1
): number | null {
  if (length <= 0) return null;
  if (currentIndex < 0) return delta > 0 ? 0 : length - 1;
  return (currentIndex + delta + length) % length;
}

export function getMenuItems(root: ParentNode | null | undefined): HTMLElement[] {
  if (!root || typeof HTMLElement === 'undefined') return [];
  return Array.from(root.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR)).filter(
    (item) => item instanceof HTMLElement
  );
}

export function focusMenuItem(
  root: ParentNode | null | undefined,
  mode: MenuFocusMode = 'first'
): boolean {
  const items = getMenuItems(root);
  if (!items.length) return false;

  let target = items[0]!;
  if (mode === 'last') {
    target = items[items.length - 1]!;
  } else if (mode === 'selected') {
    target = items.find((item) => item.getAttribute('data-floe-selected') === 'true') ?? items[0]!;
  }

  target.focus();
  return true;
}

export function moveMenuFocus(
  root: ParentNode | null | undefined,
  current: HTMLElement | null,
  delta: 1 | -1
): boolean {
  const items = getMenuItems(root);
  if (!items.length) return false;
  const currentIndex = current ? items.indexOf(current) : -1;
  const nextIndex = getWrappedMenuItemIndex(items.length, currentIndex, delta);
  if (nextIndex === null) return false;
  items[nextIndex]?.focus();
  return true;
}
