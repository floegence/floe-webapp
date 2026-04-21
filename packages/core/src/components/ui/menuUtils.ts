export const VIEWPORT_MARGIN = 8;
export const MENU_ITEM_SELECTOR = '[role="menuitem"]:not([disabled]):not([aria-disabled="true"])';
export type MenuBoundaryRect = Readonly<{
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}>;

export type MenuFocusMode = 'first' | 'last' | 'selected';

export function resolveViewportMenuBoundaryRect(): MenuBoundaryRect {
  if (typeof window === 'undefined') {
    return {
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
    };
  }

  return {
    left: 0,
    top: 0,
    right: window.innerWidth,
    bottom: window.innerHeight,
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

function resolveMenuBoundaryRect(boundaryRect?: MenuBoundaryRect): MenuBoundaryRect {
  return boundaryRect ?? resolveViewportMenuBoundaryRect();
}

export function clampMenuPosition(
  anchor: Readonly<{ x: number; y: number }>,
  menuRect: Readonly<{ width: number; height: number }>,
  boundaryRect?: MenuBoundaryRect
): { x: number; y: number } {
  const boundary = resolveMenuBoundaryRect(boundaryRect);
  let x = anchor.x;
  let y = anchor.y;

  if (x + menuRect.width > boundary.right - VIEWPORT_MARGIN) {
    x = boundary.right - menuRect.width - VIEWPORT_MARGIN;
  }
  if (y + menuRect.height > boundary.bottom - VIEWPORT_MARGIN) {
    y = boundary.bottom - menuRect.height - VIEWPORT_MARGIN;
  }

  return {
    x: Math.max(boundary.left + VIEWPORT_MARGIN, x),
    y: Math.max(boundary.top + VIEWPORT_MARGIN, y),
  };
}

export function calculateMenuPosition(
  triggerRect: DOMRect,
  menuRect: DOMRect,
  align: 'start' | 'center' | 'end',
  boundaryRect?: MenuBoundaryRect
): { x: number; y: number } {
  const boundary = resolveMenuBoundaryRect(boundaryRect);

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

  if (x + menuRect.width > boundary.right - VIEWPORT_MARGIN) {
    x = boundary.right - menuRect.width - VIEWPORT_MARGIN;
  }
  x = Math.max(boundary.left + VIEWPORT_MARGIN, x);

  if (y + menuRect.height > boundary.bottom - VIEWPORT_MARGIN) {
    const spaceAbove = triggerRect.top - boundary.top - VIEWPORT_MARGIN;
    const spaceBelow = boundary.bottom - triggerRect.bottom - VIEWPORT_MARGIN;

    if (spaceAbove > spaceBelow && spaceAbove >= menuRect.height) {
      y = triggerRect.top - menuRect.height - 4;
    } else {
      y = boundary.bottom - menuRect.height - VIEWPORT_MARGIN;
    }
  }

  y = Math.max(boundary.top + VIEWPORT_MARGIN, y);

  return { x, y };
}

export function calculateSubmenuPosition(
  parentRect: DOMRect,
  submenuRect: DOMRect,
  boundaryRect?: MenuBoundaryRect
): { x: number; y: number } {
  const boundary = resolveMenuBoundaryRect(boundaryRect);

  let x = parentRect.right;
  let y = parentRect.top;

  if (x + submenuRect.width > boundary.right - VIEWPORT_MARGIN) {
    const leftPosition = parentRect.left - submenuRect.width;
    if (leftPosition >= boundary.left + VIEWPORT_MARGIN) {
      x = leftPosition;
    } else {
      x = boundary.right - submenuRect.width - VIEWPORT_MARGIN;
    }
  }

  if (y + submenuRect.height > boundary.bottom - VIEWPORT_MARGIN) {
    y = boundary.bottom - submenuRect.height - VIEWPORT_MARGIN;
  }

  x = Math.max(boundary.left + VIEWPORT_MARGIN, x);
  y = Math.max(boundary.top + VIEWPORT_MARGIN, y);

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
