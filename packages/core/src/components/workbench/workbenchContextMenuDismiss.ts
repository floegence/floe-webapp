export const WORKBENCH_CONTEXT_MENU_ATTR = 'data-floe-workbench-context-menu';

function matchesWorkbenchContextMenuNode(node: unknown): boolean {
  if (!node || typeof node !== 'object') return false;
  const candidate = node as { dataset?: Record<string, string | undefined> };
  return candidate.dataset?.floeWorkbenchContextMenu === 'true';
}

function isEventInsideWorkbenchContextMenu(event: Event): boolean {
  if (typeof event.composedPath === 'function') {
    for (const node of event.composedPath()) {
      if (matchesWorkbenchContextMenuNode(node)) {
        return true;
      }
    }
  }

  const target = event.target;
  if (typeof Element !== 'undefined' && target instanceof Element) {
    return target.closest(`[${WORKBENCH_CONTEXT_MENU_ATTR}="true"]`) !== null;
  }

  return false;
}

export function installWorkbenchContextMenuDismissListeners(options: {
  ownerWindow: Window;
  onDismiss: () => void;
}): () => void {
  const handlePointerDown = (event: PointerEvent) => {
    if (isEventInsideWorkbenchContextMenu(event)) return;
    options.onDismiss();
  };

  const handleEscape = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    options.onDismiss();
  };

  const handleViewportChange = () => {
    options.onDismiss();
  };

  options.ownerWindow.addEventListener('pointerdown', handlePointerDown, true);
  options.ownerWindow.addEventListener('keydown', handleEscape, true);
  options.ownerWindow.addEventListener('resize', handleViewportChange);
  options.ownerWindow.addEventListener('scroll', handleViewportChange, true);

  return () => {
    options.ownerWindow.removeEventListener('pointerdown', handlePointerDown, true);
    options.ownerWindow.removeEventListener('keydown', handleEscape, true);
    options.ownerWindow.removeEventListener('resize', handleViewportChange);
    options.ownerWindow.removeEventListener('scroll', handleViewportChange, true);
  };
}
