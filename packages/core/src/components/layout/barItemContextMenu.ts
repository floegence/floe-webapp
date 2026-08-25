export type BarItemContextMenuSource = 'pointer' | 'keyboard';

export type BarItemContextMenuRequest = Readonly<{
  /** Concrete bar button that owns the requested menu. */
  trigger: HTMLButtonElement;
  /** Viewport-space menu anchor. Pointer requests preserve the exact pointer position. */
  clientX: number;
  clientY: number;
  source: BarItemContextMenuSource;
}>;

export type BarItemContextMenuHandler = (request: BarItemContextMenuRequest) => void;

export function isBarItemContextMenuKey(event: KeyboardEvent): boolean {
  return event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10');
}

export function keyboardBarItemContextMenuRequest(
  trigger: HTMLButtonElement
): BarItemContextMenuRequest {
  const rect = trigger.getBoundingClientRect();
  return {
    trigger,
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
    source: 'keyboard',
  };
}
