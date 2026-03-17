export const FLOE_TOUCH_SURFACE_ATTR = 'data-floe-touch-surface';
export const FLOE_TOUCH_SURFACE_VALUE = 'true';

export const preventTouchSurfaceNativeInteraction = (event: Event) => {
  event.preventDefault();
};

export const preventTouchSurfacePointerDown = (event: PointerEvent) => {
  event.preventDefault();
};

export const floeTouchSurfaceAttrs = {
  [FLOE_TOUCH_SURFACE_ATTR]: FLOE_TOUCH_SURFACE_VALUE,
  onContextMenu: preventTouchSurfaceNativeInteraction,
  onSelectStart: preventTouchSurfaceNativeInteraction,
} as const;
